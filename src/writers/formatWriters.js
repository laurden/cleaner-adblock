/**
 * Output format writers for different file formats
 */

const fs = require('fs');

/**
 * Write dead domains in text format
 * @param {string} filePath - Output file path
 * @param {Array} deadDomains - Array of dead domain objects
 * @param {Object} options - Options (includeTimestamp, outputStatistics)
 * @returns {Promise<void>}
 */
async function writeDeadDomainsText(filePath, deadDomains, options = {}) {
	const lines = [`# Dead/Non-Existent Domains`, `# These domains don't resolve and should be removed from filter lists`];

	if (options.includeTimestamp !== false) {
		lines.push(`# Generated: ${new Date().toISOString()}`);
	}

	lines.push(`# Total found: ${deadDomains.length}`);
	lines.push(`#`);
	lines.push(`# These domains returned errors:`);
	lines.push(`# - HTTP 404, 410, 5xx (not found/gone/server error)`);
	lines.push(`# - DNS failures (domain doesn't exist)`);
	lines.push(`# - Timeouts (unreachable)`);
	lines.push(`# - Network errors`);
	lines.push('');

	for (const item of deadDomains) {
		lines.push(`${item.domain} # ${item.reason}`);
	}

	await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}

/**
 * Write redirect domains in text format
 * @param {string} filePath - Output file path
 * @param {Array} redirectDomains - Array of redirect domain objects
 * @param {Object} options - Options (includeTimestamp)
 * @returns {Promise<void>}
 */
async function writeRedirectDomainsText(filePath, redirectDomains, options = {}) {
	const lines = [`# Redirecting Domains`, `# These domains redirect to different domains - review for updates`];

	if (options.includeTimestamp !== false) {
		lines.push(`# Generated: ${new Date().toISOString()}`);
	}

	lines.push(`# Total found: ${redirectDomains.length}`);
	lines.push(`#`);
	lines.push(`# Format: original_domain → final_domain`);
	lines.push(`# Note: These domains still work, but redirect elsewhere`);
	lines.push(`# Action: Review if filter rules should be updated`);
	lines.push('');

	for (const item of redirectDomains) {
		lines.push(`${item.domain} → ${item.finalDomain} # ${item.finalUrl}`);
	}

	await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}

/**
 * Write domains in JSON format
 * @param {string} filePath - Output file path
 * @param {Array} domains - Array of domain objects
 * @param {string} type - Type of domains ('dead' or 'redirect')
 * @param {Object} options - Options (includeTimestamp, outputStatistics)
 * @returns {Promise<void>}
 */
async function writeDomainsJSON(filePath, domains, type, options = {}) {
	const output = {
		type,
		count: domains.length,
		domains,
	};

	if (options.includeTimestamp !== false) {
		output.timestamp = new Date().toISOString();
	}

	if (options.outputStatistics && options.statistics) {
		output.statistics = options.statistics;
	}

	await fs.promises.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
}

/**
 * Write domains in CSV format
 * @param {string} filePath - Output file path
 * @param {Array} domains - Array of domain objects
 * @param {string} type - Type of domains ('dead' or 'redirect')
 * @returns {Promise<void>}
 */
async function writeDomainsCSV(filePath, domains, type) {
	const lines = [];

	if (type === 'dead') {
		// CSV header for dead domains
		lines.push('domain,status_code,reason');

		for (const item of domains) {
			const domain = escapeCsvField(item.domain);
			const statusCode = item.statusCode !== null ? item.statusCode : 'N/A';
			const reason = escapeCsvField(item.reason);
			lines.push(`${domain},${statusCode},${reason}`);
		}
	} else if (type === 'redirect') {
		// CSV header for redirect domains
		lines.push('domain,final_domain,final_url,status_code');

		for (const item of domains) {
			const domain = escapeCsvField(item.domain);
			const finalDomain = escapeCsvField(item.finalDomain);
			const finalUrl = escapeCsvField(item.finalUrl);
			const statusCode = item.statusCode !== null ? item.statusCode : 'N/A';
			lines.push(`${domain},${finalDomain},${finalUrl},${statusCode}`);
		}
	}

	await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 * @param {string} field - Field value
 * @returns {string} Escaped field
 */
function escapeCsvField(field) {
	if (!field) return '';

	const stringField = String(field);

	// If field contains comma, quote, or newline, wrap in quotes and escape quotes
	if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
		return `"${stringField.replace(/"/g, '""')}"`;
	}

	return stringField;
}

/**
 * Write domains in requested format(s)
 * @param {string} format - Output format: 'text', 'json', 'csv', or 'all'
 * @param {string} baseFilePath - Base file path (extension will be added)
 * @param {Array} domains - Array of domain objects
 * @param {string} type - Type of domains ('dead' or 'redirect')
 * @param {Object} options - Options (includeTimestamp, outputStatistics, statistics)
 * @returns {Promise<string[]>} Array of file paths written
 */
async function writeDomains(format, baseFilePath, domains, type, options = {}) {
	const filesWritten = [];

	// Remove extension from baseFilePath if present
	const pathWithoutExt = baseFilePath.replace(/\.(txt|json|csv)$/, '');

	const formats = format === 'all' ? ['text', 'json', 'csv'] : [format];

	for (const fmt of formats) {
		let filePath;

		switch (fmt) {
			case 'text':
				filePath = baseFilePath.endsWith('.txt') ? baseFilePath : `${pathWithoutExt}.txt`;

				if (type === 'dead') {
					await writeDeadDomainsText(filePath, domains, options);
				} else {
					await writeRedirectDomainsText(filePath, domains, options);
				}
				break;

			case 'json':
				filePath = `${pathWithoutExt}.json`;
				await writeDomainsJSON(filePath, domains, type, options);
				break;

			case 'csv':
				filePath = `${pathWithoutExt}.csv`;
				await writeDomainsCSV(filePath, domains, type);
				break;

			default:
				throw new Error(`Unknown format: ${fmt}`);
		}

		filesWritten.push(filePath);
	}

	return filesWritten;
}

module.exports = {
	writeDomains,
	writeDeadDomainsText,
	writeRedirectDomainsText,
	writeDomainsJSON,
	writeDomainsCSV,
};
