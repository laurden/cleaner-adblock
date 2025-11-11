#!/usr/bin/env node
/**
 * Cleaner-Adblock - Domain Scanner for Adblock Filter Lists
 * Main entry point
 */

const puppeteer = require('puppeteer');
const { parseArgs, showHelp } = require('./cli');
const { configure: configureLogger } = require('./utils/logger');
const { parseDomainsFromFile } = require('./parsers/fileReader');
const { expandDomainsWithWww, processDomains } = require('./checkers/domainChecker');
const { writeDeadDomains, writeRedirectDomains } = require('./writers/reportWriter');

/**
 * Main application logic
 */
async function main() {
	let browser = null;

	// Graceful shutdown handler
	const gracefulShutdown = async signal => {
		console.log(`\n\nReceived ${signal}. Gracefully shutting down...`);
		if (browser) {
			try {
				await browser.close();
				console.log('Browser closed successfully.');
			} catch (error) {
				console.error('Error closing browser:', error.message);
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
	console.log('=== Minimal Domain Scanner v1.0.0-refactoring ===\n');
	console.log(`Input file: ${config.inputFile}`);

	if (config.addWww) {
		console.log(`--add-www enabled: Will check both domain.com and www.domain.com for bare domains`);
	}

	if (config.debug) {
		console.log(`Debug mode enabled:`);
		console.log(`  Basic debug: ${config.debug}`);
		console.log(`  Verbose debug: ${config.debugVerbose}`);
		console.log(`  Network debug: ${config.debugNetwork}`);
		console.log(`  Browser debug: ${config.debugBrowser}`);
	}

	if (config.testMode) {
		console.log(`Test mode enabled: Only checking first ${config.testCount} domains`);
	}

	console.log(`Reading domains from ${config.inputFile}...`);

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

	// Apply domain filtering if configured
	let originalCount = domains.length;

	// Filter by includeDomains if specified
	if (config.includeDomains && config.includeDomains.length > 0) {
		const includeSet = new Set(config.includeDomains);
		domains = domains.filter(d => includeSet.has(d));
		if (!config.quietMode) {
			console.log(`Filtered to ${domains.length} domains using includeDomains (from ${originalCount})`);
		}
		originalCount = domains.length;
	}

	// Filter by excludeDomains if specified
	if (config.excludeDomains && config.excludeDomains.length > 0) {
		const excludeSet = new Set(config.excludeDomains);
		domains = domains.filter(d => !excludeSet.has(d));
		if (!config.quietMode) {
			console.log(`Excluded ${originalCount - domains.length} domains using excludeDomains`);
		}
		originalCount = domains.length;
	}

	// Filter by excludePatterns if specified
	if (config.excludePatterns && config.excludePatterns.length > 0) {
		domains = domains.filter(d => {
			return !config.excludePatterns.some(pattern => pattern.test(d));
		});
		if (!config.quietMode) {
			console.log(`Excluded ${originalCount - domains.length} domains using excludePatterns`);
		}
	}

	// Apply test mode if enabled
	if (config.testMode && domains.length > config.testCount) {
		console.log(`TEST MODE: Limiting to first ${config.testCount} domains (from ${domains.length} total)\n`);
		domains = domains.slice(0, config.testCount);
	}

	// Expand domains with www variants if --add-www is enabled
	const domainObjects = expandDomainsWithWww(domains, config.addWww);
	const totalChecks = domainObjects.reduce((sum, obj) => sum + obj.variants.length, 0);

	if (config.addWww) {
		const withWww = domainObjects.filter(obj => obj.variants.length > 1).length;
		console.log(`Expanded to ${totalChecks} total checks (${withWww} domains will try www variant)\n`);
	}

	// Launch browser
	browser = await puppeteer.launch({
		headless: true,
		acceptInsecureCerts: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--ignore-certificate-errors',
			'--ignore-certificate-errors-spki-list',
		],
	});

	console.log('Browser launched. Starting domain checks...\n');

	// Process domains
	const results = await processDomains(browser, domainObjects, config.ignoreSimilar, config.timeout, {
		progressBar: config.progressBar,
		quietMode: config.quietMode,
	});

	// Stop progress bar if it was shown
	const { stopProgress } = require('./utils/progressBar');
	stopProgress(null); // Will be handled by processDomains internally

	// Close browser
	await browser.close();

	// Separate results by type
	const deadDomains = results.filter(r => r.type === 'dead').map(r => r.data);
	const redirectDomains = results.filter(r => r.type === 'redirect').map(r => r.data);

	// Calculate statistics
	const statistics = {
		totalChecked: domains.length,
		deadCount: deadDomains.length,
		redirectCount: redirectDomains.length,
		activeCount: domains.length - deadDomains.length - redirectDomains.length,
		timestamp: new Date().toISOString(),
	};

	// Display summary (unless in quiet mode)
	if (!config.quietMode) {
		console.log(`\n=== Summary ===`);
		console.log(`Total domains checked: ${statistics.totalChecked}`);
		console.log(`Dead/non-existent: ${statistics.deadCount}`);
		console.log(`Redirecting: ${statistics.redirectCount}`);
		console.log(`Active (no issues): ${statistics.activeCount}`);
	}

	// Write results to files
	if (deadDomains.length > 0) {
		await writeDeadDomains(deadDomains, {
			format: config.outputFormat || 'text',
			includeTimestamp: config.includeTimestamp !== false,
			outputStatistics: config.outputStatistics,
			statistics: statistics,
			quietMode: config.quietMode,
		});
		if (!config.quietMode) {
			console.log(`💡 Tip: Remove these ${deadDomains.length} dead domains from your filter list`);
		}
	} else {
		if (!config.quietMode) {
			console.log('\n✅ No dead domains found');
		}
	}

	if (redirectDomains.length > 0) {
		await writeRedirectDomains(redirectDomains, {
			format: config.outputFormat || 'text',
			includeTimestamp: config.includeTimestamp !== false,
			outputStatistics: config.outputStatistics,
			statistics: statistics,
			quietMode: config.quietMode,
		});
		if (!config.quietMode) {
			console.log(`💡 Tip: Review these ${redirectDomains.length} redirecting domains - they may need rule updates`);
		}
	} else {
		if (!config.quietMode) {
			console.log('✅ No redirecting domains found');
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
