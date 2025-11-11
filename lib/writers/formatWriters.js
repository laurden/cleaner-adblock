/**
 * @file formatWriters.js
 * @module formatWriters
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const fs = require('fs');

/**
 * Write dead domains text (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} deadDomains - Parameter deadDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
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
 * Write redirect domains text (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} redirectDomains - Parameter redirectDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
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
 * Write inconclusive domains text (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} inconclusiveDomains - Parameter inconclusiveDomains
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
 */

async function writeInconclusiveDomainsText(filePath, inconclusiveDomains, options = {}) {
	const lines = [`# Inconclusive Domains`, `# These domains were blocked by browser/extension/ISP - unable to verify`];

	if (options.includeTimestamp !== false) {
		lines.push(`# Generated: ${new Date().toISOString()}`);
	}

	lines.push(`# Total found: ${inconclusiveDomains.length}`);
	lines.push(`#`);
	lines.push(`# Reason: ERR_BLOCKED_BY_CLIENT`);
	lines.push(`# This means the request was blocked by:`);
	lines.push(`# - ISP (Internet Service Provider) blocking/filtering`);
	lines.push(`# - Browser security features`);
	lines.push(`# - Browser extensions (ad blockers, security tools)`);
	lines.push(`#`);
	lines.push(`# Note: These domains may or may not be dead - verification was prevented`);
	lines.push(`# Action: Manual verification recommended, or test from different network`);
	lines.push('');

	for (const item of inconclusiveDomains) {
		lines.push(`${item.domain} # ${item.reason}`);
	}

	await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}

/**
 * Write domains j s o n (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} domains - Parameter domains
 * @param {*} type - Parameter type
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
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
 * Write domains c s v (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} domains - Parameter domains
 * @param {*} type - Parameter type
 * @returns {Promise<*>} Promise resolving to result
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
	} else if (type === 'inconclusive') {
		// CSV header for inconclusive domains
		lines.push('domain,status_code,reason');

		for (const item of domains) {
			const domain = escapeCsvField(item.domain);
			const statusCode = item.statusCode !== null ? item.statusCode : 'N/A';
			const reason = escapeCsvField(item.reason);
			lines.push(`${domain},${statusCode},${reason}`);
		}
	}

	await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}

/**
 * Escape csv field
 * @param {*} field - Parameter field
 * @returns {*} Result
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
 * Write domains (async)
 * @param {*} format - Parameter format
 * @param {*} baseFilePath - Parameter baseFilePath
 * @param {*} domains - Parameter domains
 * @param {*} type - Parameter type
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
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
				} else if (type === 'redirect') {
					await writeRedirectDomainsText(filePath, domains, options);
				} else if (type === 'inconclusive') {
					await writeInconclusiveDomainsText(filePath, domains, options);
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

/**
 * Initialize output file (async)
 * @param {*} filePath - Parameter filePath
 * @returns {Promise<*>} Promise resolving to result
 */

async function initializeOutputFile(filePath) {
	await fs.promises.writeFile(filePath, '', 'utf8');
}

/**
 * Append domain to file (async)
 * @param {*} filePath - Parameter filePath
 * @param {*} domain - Parameter domain
 * @returns {Promise<*>} Promise resolving to result
 */

async function appendDomainToFile(filePath, domain) {
	await fs.promises.appendFile(filePath, `${domain}\n`, 'utf8');
}

module.exports = {
	writeDomains,
	writeDeadDomainsText,
	writeRedirectDomainsText,
	writeInconclusiveDomainsText,
	writeDomainsJSON,
	writeDomainsCSV,
	initializeOutputFile,
	appendDomainToFile,
};
