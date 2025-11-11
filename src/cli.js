/**
 * CLI argument parsing and help display
 */

const { validateFilePath, validateTestCount, validateTimeout } = require('./utils/validators');
const { DEFAULT_INPUT_FILE, DEFAULT_TEST_COUNT, TIMEOUT, FORCE_CLOSE_TIMEOUT, CONCURRENCY } = require('./config/defaults');
const { loadConfig } = require('./config/loader');

/**
 * Parse command-line arguments
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<Object>} Parsed configuration
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
		} else if (arg === '--debug') {
			config.debug = true;
		} else if (arg === '--debug-verbose') {
			config.debug = true;
			config.debugVerbose = true;
		} else if (arg === '--debug-network') {
			config.debug = true;
			config.debugNetwork = true;
		} else if (arg === '--debug-browser') {
			config.debug = true;
			config.debugBrowser = true;
		} else if (arg === '--debug-all') {
			config.debug = true;
			config.debugVerbose = true;
			config.debugNetwork = true;
			config.debugBrowser = true;
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
		} else if (arg === '--progress-bar') {
			config.progressBar = true;
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
 * Display help message
 */
function showHelp() {
	console.log(`
Minimal Domain Scanner v1.0.0-refactoring

Purpose:
  Scans filter lists and separates results into two files:
  1. dead_domains.txt - Domains that don't resolve (remove these)
  2. redirect_domains.txt - Domains that redirect (review these)

Usage:
  node cleaner-adblock.js [options]

Options:
  --config=<file>       Config file path (default: src/config/config.js)
  --input=<file>        Input file to scan (default: easylist_specific_hide.txt)
  --output-format=<fmt> Output format: text, json, csv, all (default: text)
  --progress-bar        Show progress bar during scanning
  --quiet               Quiet mode - minimal console output
  --add-www             Check both domain.com and www.domain.com for bare domains
  --ignore-similar      Ignore redirects to subdomains of same base domain
  --timeout=N           Page load timeout in seconds (default: 30, max: 65535)
  --debug               Enable basic debug output
  --debug-verbose       Enable verbose debug output (includes --debug)
  --debug-network       Enable network request/response logging (includes --debug)
  --debug-browser       Enable browser event logging (includes --debug)
  --debug-all           Enable all debug options
  --test-mode           Only test first 5 domains (for quick testing)
  --test-count=N        Only test first N domains (enables test mode)
  --help, -h            Show this help message

Examples:
  node cleaner-adblock.js
  node cleaner-adblock.js --input=my_rules.txt
  node cleaner-adblock.js --add-www --progress-bar
  node cleaner-adblock.js --timeout=60 --output-format=json
  node cleaner-adblock.js --config=my-config.json
  node cleaner-adblock.js --input=my_rules.txt --add-www --ignore-similar
  node cleaner-adblock.js --output-format=all --quiet
  node cleaner-adblock.js --debug --test-mode
  node cleaner-adblock.js --debug-all --test-count=10
  node cleaner-adblock.js --debug-network

Supported Rule Types:
  Cosmetic/Element Hiding (uBlock Origin):
    domain.com##.selector
    domain.com##+js(scriptlet)
    domain.com#@#.selector

  Adguard Rules:
    domain.com##selector (element hiding)
    domain.com#@#selector (exception)
    domain.com#$#selector (CSS injection)
    domain.com#%#//scriptlet(...) (scriptlet)
    domain.com#?#selector (extended CSS)
    domain.com#@$?#selector (extended CSS exception)
    Multiple domains: domain1.com,domain2.com##selector

  Network Rules:
    /path$script,domain=example.com
    ||domain.com^$script,domain=site1.com|site2.com
    Extracts domains from domain= parameter

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
  - Page load timeout: ${TIMEOUT / 1000}s
  - Force-close timeout: ${FORCE_CLOSE_TIMEOUT / 1000}s
  - Concurrent checks: ${CONCURRENCY}
`);
}

module.exports = {
	parseArgs,
	showHelp,
};
