/**
 * @file cli.js
 * @module cli
 * @description Part of the Cleaner-Adblock domain scanner utility
 */
const { validateFilePath, validateTestCount, validateTimeout } = require('./utils/validators');
const { TIMEOUT, FORCE_CLOSE_TIMEOUT, CONCURRENCY } = require('./config/defaults');
const { loadConfig } = require('./config/loader');

/**
 * Parse args (async)
 * @param {*} args - Parameter args
 * @returns {Promise<*>} Promise resolving to result
 */

async function parseArgs(args) {
	// First, check if user specified a custom config file path
	let configPath = null;
	for (const arg of args) {
		if (arg.startsWith('--config=')) {
			configPath = arg.split('=')[1];
			break;
		}
	}

	// Load config file
	let config;
	try {
		config = await loadConfig(configPath);
	} catch (error) {
		// If config file doesn't exist or has errors, show error and exit
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}

	// Parse command-line arguments (these override config file settings)
	for (const arg of args) {
		// Skip --config since we already processed it
		if (arg.startsWith('--config=')) {
			continue;
		}

		if (arg.startsWith('--input=')) {
			try {
				config.inputFile = validateFilePath(arg.split('=')[1]);
			} catch (error) {
				console.error(`Error: Invalid input file path - ${error.message}`);
				process.exit(1);
			}
		} else if (arg === '--add-www') {
			config.addWww = true;
		} else if (arg === '--ignore-similar') {
			config.ignoreSimilar = true;
		} else if (arg === '--debug' || arg.startsWith('--debug=')) {
			// Parse debug flag with optional values
			let debugTypes = ['basic']; // Default to basic if no value provided

			if (arg.startsWith('--debug=')) {
				const value = arg.split('=')[1];
				if (!value) {
					console.error('Error: --debug requires a value (basic, verbose, network, browser, all) or comma-separated list');
					process.exit(1);
				}
				debugTypes = value.split(',').map(type => type.trim().toLowerCase());
			}

			// Validate debug types
			const validTypes = ['basic', 'verbose', 'network', 'browser', 'all'];
			for (const type of debugTypes) {
				if (!validTypes.includes(type)) {
					console.error(`Error: Invalid debug type '${type}'. Must be one of: ${validTypes.join(', ')}`);
					process.exit(1);
				}
			}

			// Enable debug flags based on types
			config.debug = true; // Always enable basic debug flag

			if (debugTypes.includes('all')) {
				config.debugVerbose = true;
				config.debugNetwork = true;
				config.debugBrowser = true;
			} else {
				if (debugTypes.includes('verbose')) {
					config.debugVerbose = true;
				}
				if (debugTypes.includes('network')) {
					config.debugNetwork = true;
				}
				if (debugTypes.includes('browser')) {
					config.debugBrowser = true;
				}
			}
		} else if (arg === '--test-mode') {
			config.testMode = true;
		} else if (arg.startsWith('--test-count=')) {
			try {
				config.testCount = validateTestCount(arg.split('=')[1]);
				config.testMode = true;
			} catch (error) {
				console.error(`Error: Invalid test count - ${error.message}`);
				process.exit(1);
			}
		} else if (arg.startsWith('--timeout=')) {
			try {
				config.timeout = validateTimeout(arg.split('=')[1]);
			} catch (error) {
				console.error(`Error: Invalid timeout - ${error.message}`);
				process.exit(1);
			}
		} else if (arg === '--quiet') {
			config.quietMode = true;
		} else if (arg.startsWith('--output-format=')) {
			const format = arg.split('=')[1];
			if (!['text', 'json', 'csv', 'all'].includes(format)) {
				console.error(`Error: Invalid output format - must be one of: text, json, csv, all`);
				process.exit(1);
			}
			config.outputFormat = format;
		}
	}

	return config;
}

/**
 * Show help
 * @returns {*} Result
 */

function showHelp() {
	console.log(`
Cleaner AdBlock v1.0.0-refactoring

Purpose:
  Scans filter lists and separates results into two files:
  1. ca-dead-domains.txt - Domains that don't resolve (remove these)
  2. ca-redirect-domains.txt - Domains that redirect (review these)

Usage:
  node cleaner-adblock.js [options]

Options:
  --config=<file>       Config file path (default: lib/config/config.json)
  --input=<file>        Input file to scan (default: example-list.txt)
  --output-format=<fmt> Output format: text, json, csv, all (default: text)
  --quiet               Quiet mode - minimal console output
  --add-www             Check both domain.com and www.domain.com for bare domains
  --ignore-similar      Ignore redirects to subdomains of same base domain
  --timeout=N           Page load timeout in seconds (default: 30, max: 65535)
  --debug[=<types>]     Enable debug output (default: basic)
                        Types: basic, verbose, network, browser, all
                        Multiple types: --debug=basic,verbose
                        Examples: --debug, --debug=basic, --debug=all
  --test-mode           Only test first 5 domains (for quick testing)
  --test-count=N        Only test first N domains (enables test mode)
  --help, -h            Show this help message

--add-www behavior:
  - domain.com → checks both domain.com AND www.domain.com
  - If EITHER works, domain is marked as active
  - sub.domain.com → only checks sub.domain.com (no www added)
  - www.domain.com → only checks www.domain.com (already has www)
  - Works with both cosmetic and network rules!

--ignore-similar behavior:
  - Skips redirects to subdomains of the same base domain
  - example.com → sub.example.com (ignored, same base domain)
  - example.com → different.com (flagged, different domain)
  - Reduces noise from internal subdomain redirects
  - Useful for sites that redirect to CDN/regional subdomains

Dead domains (remove from list):
  - HTTP 404, 410, 5xx errors
  - DNS resolution failures
  - Connection timeouts
  - Network errors
  - HTTP 403 (only if all variants return 403)

Special handling:
  - HTTP 403 Forbidden: If non-www returns 403 but www. works, domain is kept
  - This handles sites like 101soundboards.com where bare domain is blocked
    but www.101soundboards.com works fine

Redirect domains (review):
  - Domains that redirect to different domains
  - May still be valid or may need updating

Configuration:
  - Page load timeout: ${TIMEOUT}s
  - Force-close timeout: ${FORCE_CLOSE_TIMEOUT}s
  - Concurrent checks: ${CONCURRENCY}
`);
}

module.exports = {
	parseArgs,
	showHelp,
};
