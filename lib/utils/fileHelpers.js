/**
 * @file fileHelpers.js
 * @module fileHelpers
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

/**
 * Get file extension
 * @param {*} format - Parameter format
 * @returns {*} Result
 */

function getFileExtension(format) {
	const extensions = {
		csv: '.csv',
		json: '.json',
		text: '.txt',
		all: '.txt', // default for 'all'
	};
	return extensions[format] || '.txt';
}

module.exports = {
	getFileExtension,
};
