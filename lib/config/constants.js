/**
 * @file constants.js
 * @module constants
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

// UI Configuration
/** @constant {*} PROGRESS_BAR_WIDTH - progress bar width */

const PROGRESS_BAR_WIDTH = 30; // Width of the progress bar in characters
/** @constant {*} ROLLING_OUTPUT_MAX_LINES - rolling output max lines */

const ROLLING_OUTPUT_MAX_LINES = 25; // Maximum lines to display in rolling output
/** @constant {*} ROLLING_OUTPUT_BUFFER - rolling output buffer */

const ROLLING_OUTPUT_BUFFER = 100; // Additional buffer lines beyond max
/** @constant {*} ROLLING_OUTPUT_ABSOLUTE_MAX - rolling output absolute max */

const ROLLING_OUTPUT_ABSOLUTE_MAX = 1000; // Absolute maximum lines to prevent unbounded growth

// Logging
/** @constant {*} _MESSAGE_MAX_LENGTH - error message max length */

const ERROR_MESSAGE_MAX_LENGTH = 120; // Maximum length for truncated error messages

module.exports = {
	// UI
	PROGRESS_BAR_WIDTH,
	ROLLING_OUTPUT_MAX_LINES,
	ROLLING_OUTPUT_BUFFER,
	ROLLING_OUTPUT_ABSOLUTE_MAX,

	// Logging
	ERROR_MESSAGE_MAX_LENGTH,
};
