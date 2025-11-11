/**
 * Logging utilities
 */

let DEBUG = false;
let DEBUG_VERBOSE = false;
let DEBUG_NETWORK = false;
let DEBUG_BROWSER = false;

/**
 * Configure logger settings
 * @param {Object} options - Logger options
 */
function configure(options = {}) {
	DEBUG = options.debug || false;
	DEBUG_VERBOSE = options.debugVerbose || false;
	DEBUG_NETWORK = options.debugNetwork || false;
	DEBUG_BROWSER = options.debugBrowser || false;
}

/**
 * Log a debug message
 * @param {string} message - Message to log
 * @param {string} level - Log level
 */
function debugLog(message, level = 'DEBUG') {
	if (DEBUG) {
		const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
		console.log(`[${timestamp}] [${level}] ${message}`);
	}
}

/**
 * Log a verbose debug message
 * @param {string} message - Message to log
 */
function debugVerbose(message) {
	if (DEBUG_VERBOSE) {
		debugLog(message, 'VERBOSE');
	}
}

/**
 * Log a network debug message
 * @param {string} message - Message to log
 */
function debugNetwork(message) {
	if (DEBUG_NETWORK) {
		debugLog(message, 'NETWORK');
	}
}

/**
 * Log a browser debug message
 * @param {string} message - Message to log
 */
function debugBrowser(message) {
	if (DEBUG_BROWSER) {
		debugLog(message, 'BROWSER');
	}
}

/**
 * Safely truncate error message without cutting off mid-word
 * @param {string} message - Error message to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated message
 */
function truncateError(message, maxLength = 120) {
	if (message.length <= maxLength) {
		return message;
	}
	return message.substring(0, maxLength) + '...';
}

module.exports = {
	configure,
	debugLog,
	debugVerbose,
	debugNetwork,
	debugBrowser,
	truncateError,
};
