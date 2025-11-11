/**
 * @file logger.js
 * @module logger
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { ERROR_MESSAGE_MAX_LENGTH } = require('../config/constants');

let DEBUG = false;
let DEBUG_VERBOSE = false;
let DEBUG_NETWORK = false;
let DEBUG_BROWSER = false;

/**
 * Configure
 * @param {*} options - Parameter options
 * @returns {*} Result
 */

function configure(options = {}) {
	DEBUG = options.debug || false;
	DEBUG_VERBOSE = options.debugVerbose || false;
	DEBUG_NETWORK = options.debugNetwork || false;
	DEBUG_BROWSER = options.debugBrowser || false;
}

/**
 * Debug log
 * @param {*} message - Parameter message
 * @param {*} level - Parameter level
 * @returns {*} Result
 */

function debugLog(message, level = 'DEBUG') {
	if (DEBUG) {
		const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
		console.log(`[${timestamp}] [${level}] ${message}`);
	}
}

/**
 * Debug verbose
 * @param {*} message - Parameter message
 * @returns {*} Result
 */

function debugVerbose(message) {
	if (DEBUG_VERBOSE) {
		debugLog(message, 'VERBOSE');
	}
}

/**
 * Debug network
 * @param {*} message - Parameter message
 * @returns {*} Result
 */

function debugNetwork(message) {
	if (DEBUG_NETWORK) {
		debugLog(message, 'NETWORK');
	}
}

/**
 * Debug browser
 * @param {*} message - Parameter message
 * @returns {*} Result
 */

function debugBrowser(message) {
	if (DEBUG_BROWSER) {
		debugLog(message, 'BROWSER');
	}
}

/**
 * Truncate error
 * @param {*} message - Parameter message
 * @param {*} maxLength - Parameter maxLength
 * @returns {*} Result
 */

function truncateError(message, maxLength = ERROR_MESSAGE_MAX_LENGTH) {
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
