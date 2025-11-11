/**
 * @file fileReader.js
 * @module fileReader
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const fs = require('fs');
const { extractDomains } = require('./domainExtractor');

/**
 * Parse domains from file (async)
 * @param {*} filePath - Parameter filePath
 * @returns {Promise<*>} Promise resolving to result
 */

async function parseDomainsFromFile(filePath) {
	try {
		await fs.promises.access(filePath);
	} catch {
		throw new Error(`File not found: ${filePath}`);
	}

	let content;
	try {
		content = await fs.promises.readFile(filePath, 'utf8');
	} catch (error) {
		throw new Error(`Failed to read file ${filePath}: ${error.message}`);
	}

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
