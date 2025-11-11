/**
 * @file reportWriter.js
 * @module reportWriter
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { DEAD_DOMAINS_FILE, REDIRECT_DOMAINS_FILE, INCONCLUSIVE_DOMAINS_FILE } = require('../config/defaults');
const { writeDomains } = require('./formatWriters');

/**
 * Write dead domains (async)
 * @param {*} deadDomains - Parameter deadDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
 */

async function writeDeadDomains(deadDomains, options = {}) {
	const format = options.format || 'text';
	const filePath = options.filePath || DEAD_DOMAINS_FILE;

	const filesWritten = await writeDomains(format, filePath, deadDomains, 'dead', {
		includeTimestamp: options.includeTimestamp,
		outputStatistics: options.outputStatistics,
		statistics: options.statistics,
	});

	return filesWritten;
}

/**
 * Write redirect domains (async)
 * @param {*} redirectDomains - Parameter redirectDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
 */

async function writeRedirectDomains(redirectDomains, options = {}) {
	const format = options.format || 'text';
	const filePath = options.filePath || REDIRECT_DOMAINS_FILE;

	const filesWritten = await writeDomains(format, filePath, redirectDomains, 'redirect', {
		includeTimestamp: options.includeTimestamp,
		outputStatistics: options.outputStatistics,
		statistics: options.statistics,
	});

	return filesWritten;
}

/**
 * Write inconclusive domains (async)
 * @param {*} inconclusiveDomains - Parameter inconclusiveDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
 */

async function writeInconclusiveDomains(inconclusiveDomains, options = {}) {
	const format = options.format || 'text';
	const filePath = options.filePath || INCONCLUSIVE_DOMAINS_FILE;

	const filesWritten = await writeDomains(format, filePath, inconclusiveDomains, 'inconclusive', {
		includeTimestamp: options.includeTimestamp,
		outputStatistics: options.outputStatistics,
		statistics: options.statistics,
	});

	return filesWritten;
}

module.exports = {
	writeDeadDomains,
	writeRedirectDomains,
	writeInconclusiveDomains,
};
