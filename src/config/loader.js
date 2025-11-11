/**
 * Configuration loader for cleaner-adblock
 * Loads src/config/config.js and merges with defaults.js
 */

const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');

const CONFIG_DIR = __dirname;
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.js');
const CONFIG_EXAMPLE = path.join(CONFIG_DIR, 'config.js.example');

/**
 * Load user configuration from src/config/config.js
 * @returns {Promise<Object>} Merged configuration object
 * @throws {Error} If config.js is missing
 */
async function loadConfig() {
	// Check if config.js exists
	try {
		await fs.promises.access(CONFIG_FILE);
	} catch {
		// config.js doesn't exist, check if example exists
		try {
			await fs.promises.access(CONFIG_EXAMPLE);
			throw new Error(
				`Configuration required: Please rename 'src/config/config.js.example' to 'src/config/config.js' and customize your settings.`
			);
		} catch (innerError) {
			// Neither exists
			throw new Error(`Configuration files missing: Both 'src/config/config.js' and 'src/config/config.js.example' are missing.`);
		}
	}

	// Load config.js
	let userConfig;
	try {
		// Clear require cache to ensure fresh load
		delete require.cache[CONFIG_FILE];
		userConfig = require(CONFIG_FILE);
	} catch (error) {
		throw new Error(`Failed to load config.js: ${error.message}`);
	}

	// Merge with defaults
	const config = { ...defaults, ...userConfig };

	return config;
}

module.exports = {
	loadConfig,
};
