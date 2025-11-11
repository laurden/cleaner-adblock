/**
 * File reading and parsing utilities
 */

const fs = require('fs');
const { extractDomains } = require('./domainExtractor');

/**
 * Parse input file and extract unique domains
 * @param {string} filePath - Path to filter list file
 * @returns {Promise<string[]>} Array of unique domains sorted alphabetically
 * @throws {Error} If file not found or cannot be read
 */
async function parseDomainsFromFile(filePath) {
	try {
		await fs.promises.access(filePath);
	} catch {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await fs.promises.readFile(filePath, 'utf8');
	const lines = content.split('\n');
	const domains = new Set();

	for (const line of lines) {
		const extractedDomains = extractDomains(line);
		for (const domain of extractedDomains) {
			domains.add(domain);
		}
	}

	return Array.from(domains).sort();
}

module.exports = {
	parseDomainsFromFile,
};
