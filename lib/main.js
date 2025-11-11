#!/usr/bin/env node
/**
 * @file main.js
 * @module main
 * @description Cleaner-Adblock - Main entry point for the domain scanner utility
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const { parseArgs, showHelp } = require('./cli');
const { configure: configureLogger } = require('./utils/logger');
const { parseDomainsFromFile } = require('./parsers/fileReader');
const { expandDomainsWithWww, processDomains } = require('./checkers/domainChecker');
const { writeDeadDomains, writeRedirectDomains, writeInconclusiveDomains } = require('./writers/reportWriter');
const { formatSummaryBox } = require('./utils/treeFormatter');
const { initializeOutputFile, appendDomainToFile } = require('./writers/formatWriters');
const { getFileExtension } = require('./utils/fileHelpers');
const { DEAD_DOMAINS_FILE, REDIRECT_DOMAINS_FILE, INCONCLUSIVE_DOMAINS_FILE } = require('./config/defaults');

/**
 * Download sample file (async)
 * @param {*} filePath - Parameter filePath
 * @returns {Promise<*>} Promise resolving to result
 */

async function downloadSampleFile(filePath) {
	const url = 'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_specific_hide.txt';

	console.log('⬇️ downloading sample file from the EasyList repository...');

	return new Promise((resolve, reject) => {
		https
			.get(url, response => {
				if (response.statusCode !== 200) {
					reject(new Error(`failed to download: HTTP ${response.statusCode}`));
					return;
				}

				let data = '';
				response.on('data', chunk => {
					data += chunk;
				});

				response.on('end', () => {
					try {
						// Split into lines and filter non-empty lines
						const lines = data.split('\n').filter(line => line.trim().length > 0);

						// Get 100 random lines
						const selectedLines = [];
						const usedIndices = new Set();

						while (selectedLines.length < 100 && selectedLines.length < lines.length) {
							const randomIndex = Math.floor(Math.random() * lines.length);
							if (!usedIndices.has(randomIndex)) {
								usedIndices.add(randomIndex);
								selectedLines.push(lines[randomIndex]);
							}
						}

						// Write to file
						fs.writeFileSync(filePath, selectedLines.join('\n') + '\n', 'utf8');
						console.log(`✅ downloaded ${selectedLines.length} sample rules to ${filePath}\n`);
						resolve();
					} catch (error) {
						reject(error);
					}
				});
			})
			.on('error', error => {
				reject(error);
			});
	});
}

/**
 * Main (async)
 * @returns {Promise<*>} Promise resolving to result
 */

async function main() {
	let browser = null;

	// Graceful shutdown handler
	/**
	 * Graceful shutdown (async)
	 * @returns {Promise<*>} Promise resolving to result
	 */

	const gracefulShutdown = async signal => {
		console.log(`\n\nreceived ${signal}. gracefully shutting down...`);
		if (browser) {
			try {
				await browser.close();
				console.log('browser closed successfully.');
			} catch (error) {
				console.error('error closing browser:', error.message);
			}
		}
		process.exit(0);
	};

	// Register signal handlers
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));
	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		console.error('Unhandled Rejection at:', promise, 'reason:', reason);
		gracefulShutdown('UNHANDLED_REJECTION');
	});

	// Parse command-line arguments
	const args = process.argv.slice(2);

	// Show help if requested
	if (args.includes('--help') || args.includes('-h')) {
		showHelp();
		process.exit(0);
	}

	const config = await parseArgs(args);

	// Configure logger
	configureLogger({
		debug: config.debug,
		debugVerbose: config.debugVerbose,
		debugNetwork: config.debugNetwork,
		debugBrowser: config.debugBrowser,
	});

	// Display startup information
	console.log('=== Cleaner AdBlock v1.0.0-r ===\n');
	console.log(`File: ${config.inputFile}`);

	// Auto-download example file if it doesn't exist
	if (config.inputFile === 'example-list.txt' && !fs.existsSync(config.inputFile)) {
		try {
			await downloadSampleFile(config.inputFile);
		} catch (error) {
			console.error(`\n❌ Failed to download sample file: ${error.message}`);
			console.log(`\nYou can manually download from: https://github.com/easylist/easylist`);
			console.log(`Or specify a different input file with --input=<file>\n`);
			process.exit(1);
		}
	}

	// Parse domains from file
	let domains;
	try {
		domains = await parseDomainsFromFile(config.inputFile);
	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);
		console.log(`\nTip: Use --input=<file> to specify a different input file`);
		console.log(`Example: node cleaner-adblock.js --input=my_rules.txt\n`);
		process.exit(1);
	}

	console.log(`Found ${domains.length} unique domains to check\n`);

	// Security: Enforce maximum domains limit
	if (domains.length > config.maxDomains) {
		console.error(`\n❌ Error: Too many domains (${domains.length})`);
		console.error(`   Maximum allowed: ${config.maxDomains}`);
		console.error(`   This limit prevents resource exhaustion attacks.`);
		console.error(`   To increase: set maxDomains in config.json (max: 1000000)\n`);
		process.exit(1);
	}

	// Apply domain filtering if configured
	let originalCount = domains.length;

	// Filter by includeDomains if specified
	if (config.includeDomains && config.includeDomains.length > 0) {
		const includeSet = new Set(config.includeDomains);
		domains = domains.filter(d => includeSet.has(d));
		if (!config.quietMode) {
			console.log(`filtered to ${domains.length} domains using includeDomains (from ${originalCount})`);
		}
		originalCount = domains.length;
	}

	// Filter by excludeDomains if specified
	if (config.excludeDomains && config.excludeDomains.length > 0) {
		const excludeSet = new Set(config.excludeDomains);
		domains = domains.filter(d => !excludeSet.has(d));
		if (!config.quietMode) {
			console.log(`excluded ${originalCount - domains.length} domains using excludeDomains`);
		}
		originalCount = domains.length;
	}

	// Filter by excludePatterns if specified
	if (config.excludePatterns && config.excludePatterns.length > 0) {
		domains = domains.filter(d => {
			return !config.excludePatterns.some(pattern => pattern.test(d));
		});
		if (!config.quietMode) {
			console.log(`excluded ${originalCount - domains.length} domains using excludePatterns`);
		}
	}

	// Apply test mode if enabled
	if (config.testMode && domains.length > config.testCount) {
		console.log(`[TEST MODE] limiting to first ${config.testCount} domains (from ${domains.length} total)\n`);
		domains = domains.slice(0, config.testCount);
	}

	// Expand domains with www variants if --add-www is enabled
	const domainObjects = expandDomainsWithWww(domains, config.addWww);
	const totalChecks = domainObjects.reduce((sum, obj) => sum + obj.variants.length, 0);

	if (config.addWww) {
		const withWww = domainObjects.filter(obj => obj.variants.length > 1).length;
		console.log(`expanded to ${totalChecks} total checks (${withWww} domains will try www variant)\n`);
	}

	// Launch browser
	const browserArgs = ['--disable-dev-shm-usage', '--ignore-certificate-errors', '--ignore-certificate-errors-spki-list'];

	// Security: Only disable sandbox if explicitly configured with the special flag
	// WARNING: This should NEVER be enabled in production unless absolutely necessary
	if (config.disableSandboxPlease) {
		browserArgs.push('--no-sandbox', '--disable-setuid-sandbox');
	}

	browser = await puppeteer.launch({
		headless: true,
		acceptInsecureCerts: true,
		args: browserArgs,
	});

	console.log('browser launched. starting domain checks...\n');

	// Determine output format and file paths
	const outputFormat = config.outputFormat || 'text';
	const supportsRealtime = outputFormat === 'text' || outputFormat === 'csv';

	// Determine file extensions based on format
	const fileExt = getFileExtension(outputFormat);
	const deadDomainsPath = DEAD_DOMAINS_FILE.replace(/\.txt$/, fileExt);
	const redirectDomainsPath = REDIRECT_DOMAINS_FILE.replace(/\.txt$/, fileExt);
	const inconclusiveDomainsPath = INCONCLUSIVE_DOMAINS_FILE.replace(/\.txt$/, fileExt);

	// Initialize empty files for simple domain tracking during processing
	if (supportsRealtime) {
		try {
			await initializeOutputFile(deadDomainsPath);
			await initializeOutputFile(redirectDomainsPath);
			await initializeOutputFile(inconclusiveDomainsPath);
		} catch (error) {
			console.error(`error initializing output files: ${error.message}`);
		}
	}

	// Create callback for simple real-time domain tracking (just write domain names)
	const onResult = supportsRealtime
		? async result => {
				try {
					if (result.type === 'dead') {
						await appendDomainToFile(deadDomainsPath, result.data.domain);
					} else if (result.type === 'redirect') {
						await appendDomainToFile(redirectDomainsPath, result.data.domain);
					} else if (result.type === 'inconclusive') {
						await appendDomainToFile(inconclusiveDomainsPath, result.data.domain);
					}
				} catch (error) {
					// Silently ignore write errors to not interrupt processing
					if (config.debug) {
						console.error(`error writing result: ${error.message}`);
					}
				}
			}
		: null;

	// Process domains
	const results = await processDomains(browser, domainObjects, config.ignoreSimilar, config.timeout, {
		quietMode: config.quietMode,
		forceCloseTimeout: config.forceCloseTimeout,
		concurrency: config.concurrency,
		httpsOnly: config.httpsOnly || false,
		onResult,
	});

	// Close browser
	await browser.close();

	// Separate results by type
	const deadDomains = results.filter(r => r.type === 'dead').map(r => r.data);
	const redirectDomains = results.filter(r => r.type === 'redirect').map(r => r.data);
	const inconclusiveDomains = results.filter(r => r.type === 'inconclusive').map(r => r.data);

	// Calculate statistics
	const statistics = {
		totalChecked: domains.length,
		deadCount: deadDomains.length,
		redirectCount: redirectDomains.length,
		inconclusiveCount: inconclusiveDomains.length,
		activeCount: domains.length - deadDomains.length - redirectDomains.length - inconclusiveDomains.length,
		timestamp: new Date().toISOString(),
	};

	// Display summary (unless in quiet mode)
	if (!config.quietMode) {
		const summaryBox = formatSummaryBox({
			total: statistics.totalChecked,
			dead: statistics.deadCount,
			redirect: statistics.redirectCount,
			inconclusive: statistics.inconclusiveCount,
			active: statistics.activeCount,
		});
		console.log('\n' + summaryBox);
	}

	// Write final formatted files with headers and full details
	// This rewrites the files that were tracking domain names during processing
	if (deadDomains.length > 0) {
		try {
			await writeDeadDomains(deadDomains, {
				format: outputFormat,
				includeTimestamp: config.includeTimestamp !== false,
				outputStatistics: config.outputStatistics,
				statistics: statistics,
				quietMode: config.quietMode,
			});
		} catch (error) {
			console.error(`failed to write dead domains: ${error.message}`);
			throw error;
		}
	}

	if (redirectDomains.length > 0) {
		try {
			await writeRedirectDomains(redirectDomains, {
				format: outputFormat,
				includeTimestamp: config.includeTimestamp !== false,
				outputStatistics: config.outputStatistics,
				statistics: statistics,
				quietMode: config.quietMode,
			});
		} catch (error) {
			console.error(`failed to write redirect domains: ${error.message}`);
			throw error;
		}
	}

	if (inconclusiveDomains.length > 0) {
		try {
			await writeInconclusiveDomains(inconclusiveDomains, {
				format: outputFormat,
				includeTimestamp: config.includeTimestamp !== false,
				outputStatistics: config.outputStatistics,
				statistics: statistics,
				quietMode: config.quietMode,
			});
		} catch (error) {
			console.error(`failed to write inconclusive domains: ${error.message}`);
			throw error;
		}
	}

	// Display completion messages
	if (!config.quietMode) {
		if (deadDomains.length > 0) {
			const ext = getFileExtension(outputFormat);
			console.log(`🔴 dead domains written to ca-dead-domains${ext}`);
		}

		if (redirectDomains.length > 0) {
			const ext = getFileExtension(outputFormat);
			console.log(`↪️ redirect domains written to ca-redirect-domains${ext}`);
		} else {
			console.log('✅ no redirecting domains found');
		}

		if (inconclusiveDomains.length > 0) {
			const ext = getFileExtension(outputFormat);
			console.log(`🚫 inconclusive domains written to ca-inconclusive-domains${ext}`);
		}
	}

	process.exit(0);
}

// Run main function
if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

module.exports = main;
