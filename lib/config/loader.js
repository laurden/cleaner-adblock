/**
 * @file loader.js
 * @module loader
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');
const { configSchema } = require('./schema');

/** @constant {*} CONFIG_DIR - config dir */

const CONFIG_DIR = __dirname;
/** @constant {*} CONFIG_FILE - config file */

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
/** @constant {*} CONFIG_EXAMPLE - config example */

const CONFIG_EXAMPLE = path.join(CONFIG_DIR, 'config.json.example');

/**
 * Load config (async)
 * @param {*} customConfigPath - Parameter customConfigPath
 * @returns {Promise<*>} Promise resolving to result
 */

async function loadConfig(customConfigPath) {
	// Determine which config file to use
	let configFile;

	if (customConfigPath) {
		// Security: Validate custom path is within project directory
		const resolved = path.resolve(customConfigPath);
		const projectRoot = path.resolve(__dirname, '../..');

		if (!resolved.startsWith(projectRoot + path.sep)) {
			throw new Error('Security: Config file must be within project directory');
		}

		configFile = resolved;
	} else {
		// Try JSON first, fall back to JS with warning
		if (fs.existsSync(CONFIG_FILE)) {
			configFile = CONFIG_FILE;
		} else {
			// No config file exists
			try {
				await fs.promises.access(CONFIG_EXAMPLE);
				throw new Error(
					`Configuration required: Please copy 'lib/config/config.json.example' to 'lib/config/config.json' and customise your settings.`
				);
			} catch {
				throw new Error(`Configuration files missing: config.json.example not found.`);
			}
		}
	}

	// Check if config file exists
	try {
		await fs.promises.access(configFile);
	} catch {
		throw new Error(`Configuration file not found: ${configFile}`);
	}

	// Load config file based on extension
	let userConfig;
	try {
		const content = await fs.promises.readFile(configFile, 'utf8');
		userConfig = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to load config file '${configFile}': ${error.message}`);
	}

	// Validate config against schema
	const { error, value } = configSchema.validate(userConfig, {
		abortEarly: false, // Show all errors
		allowUnknown: false, // Reject unknown keys for security
	});

	if (error) {
		const messages = error.details.map(d => `  - ${d.message}`).join('\n');
		throw new Error(`Invalid configuration:\n${messages}`);
	}

	// Merge with defaults (schema validation already applied defaults)
	const config = {
		...defaults,
		...value,
	};

	// Convert timeout values from seconds to milliseconds
	// Config files use seconds (user-friendly)
	// Code internally uses milliseconds (precise)
	config.timeout = config.timeout * 1000;
	config.forceCloseTimeout = config.forceCloseTimeout * 1000;

	// SECURITY CHECK: Prevent accidental sandbox disabling
	if (config.disableSandbox === true && config.disableSandboxPlease !== true) {
		console.error('\n❌ CRITICAL SECURITY ERROR ❌');
		console.error('');
		console.error('The browser sandbox should NOT be disabled!');
		console.error('');
		console.error("You have set 'disableSandbox' to 'true' in your configuration file.");
		console.error('This is an EXTREMELY DANGEROUS setting that exposes your system to serious security risks, including:');
		console.error('	- remote code execution (RCE)');
		console.error('	- host system compromise (privilege escalation)');
		console.error('	- data theft (data exfiltration, malware infection)');
		console.error('');
		console.error('The script has been STOPPED to protect your system.');
		console.error('');
		console.error('If you truly understand the risks and still wish to proceed:');
		console.error('	1. make sure you are running in a highly isolated environment');
		console.error("	2. change 'disableSandbox' to 'disableSandboxPlease' in your configuration file");
		console.error("	3. set 'disableSandboxPlease' to 'true'");
		console.error('');
		console.error('This additional step is deliberate to help prevent accidental misuse.');
		console.error('');
		process.exit(1);
	}

	// Security warnings for when sandbox is actually disabled
	if (config.disableSandboxPlease === true) {
		console.warn('\n⚠️ CRITICAL SECURITY WARNING ⚠️');
		console.warn('');
		console.warn('The browser sandbox is DISABLED. This is a security risk!');
		console.warn('');
		console.warn('Only use this in isolated environments (e.g. a dedicated VM or container).');
		console.warn('Your system is vulnerable to browser exploits and other security risks.');
		console.warn('');
	}

	return config;
}

module.exports = {
	loadConfig,
};
