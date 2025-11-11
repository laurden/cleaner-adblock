/**
 * Report writing utilities
 */

const { DEAD_DOMAINS_FILE, REDIRECT_DOMAINS_FILE } = require('../config/defaults');
const { writeDomains } = require('./formatWriters');

/**
 * Write dead domains to file(s) in specified format(s)
 * @param {Array<{domain: string, reason: string}>} deadDomains - Dead domains with reasons
 * @param {Object} options - Options (format, filePath, includeTimestamp, outputStatistics, statistics, quietMode)
 * @returns {Promise<string[]>} Array of file paths written
 */
async function writeDeadDomains(deadDomains, options = {}) {
	const format = options.format || 'text';
	const filePath = options.filePath || DEAD_DOMAINS_FILE;

	const filesWritten = await writeDomains(format, filePath, deadDomains, 'dead', {
		includeTimestamp: options.includeTimestamp,
		outputStatistics: options.outputStatistics,
		statistics: options.statistics,
	});

	if (!options.quietMode) {
		for (const file of filesWritten) {
			console.log(`\n✅ Dead domains written to ${file}`);
		}
	}

	return filesWritten;
}

/**
 * Write redirect domains to file(s) in specified format(s)
 * @param {Array<{domain: string, finalDomain: string, finalUrl: string}>} redirectDomains - Redirecting domains
 * @param {Object} options - Options (format, filePath, includeTimestamp, outputStatistics, statistics, quietMode)
 * @returns {Promise<string[]>} Array of file paths written
 */
async function writeRedirectDomains(redirectDomains, options = {}) {
	const format = options.format || 'text';
	const filePath = options.filePath || REDIRECT_DOMAINS_FILE;

	const filesWritten = await writeDomains(format, filePath, redirectDomains, 'redirect', {
		includeTimestamp: options.includeTimestamp,
		outputStatistics: options.outputStatistics,
		statistics: options.statistics,
	});

	if (!options.quietMode) {
		for (const file of filesWritten) {
			console.log(`✅ Redirect domains written to ${file}`);
		}
	}

	return filesWritten;
}

module.exports = {
	writeDeadDomains,
	writeRedirectDomains,
};
