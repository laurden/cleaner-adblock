/**
 * Domain extraction utilities for filter rules
 */

const { isValidDomain } = require('../utils/validators');
const { BARE_DOMAIN_DOT_COUNT } = require('../config/defaults');

/**
 * Extract base domain (handles subdomains)
 * @param {string} domain - Domain to process
 * @returns {string} Base domain
 */
function getBaseDomain(domain) {
	// Remove www. prefix
	domain = domain.replace(/^www\./, '');

	// Split by dots
	const parts = domain.split('.');

	// For domains like example.com, return as-is
	if (parts.length <= 2) {
		return domain;
	}

	// For domains like sub.example.com, return example.com
	// Simple heuristic: take last 2 parts
	return parts.slice(-2).join('.');
}

/**
 * Check if domain is a bare domain (no subdomain)
 * @param {string} domain - Domain to check
 * @returns {boolean} True if bare domain
 */
function isBareDomain(domain) {
	// Remove www. for checking
	const withoutWww = domain.replace(/^www\./, '');
	// Count dots - bare domains have exactly one dot
	const dotCount = (withoutWww.match(/\./g) || []).length;
	return dotCount === BARE_DOMAIN_DOT_COUNT;
}

/**
 * Validate and clean a domain
 * @param {string} domain - Domain to validate and clean
 * @returns {string|null} Cleaned domain or null if invalid
 */
function validateAndCleanDomain(domain) {
	// Skip wildcards
	if (domain.includes('*')) {
		return null;
	}

	// Remove leading dots or tildes
	domain = domain.replace(/^[.~]+/, '');

	// Basic domain validation
	if (!domain || !domain.includes('.') || domain.length < 4) {
		return null;
	}

	// Skip .onion domains and IP addresses
	if (!isValidDomain(domain)) {
		return null;
	}

	return domain;
}

/**
 * Extract domains from a filter list rule line
 * @param {string} line - A single line from the filter list
 * @returns {string[]} Array of extracted domain names
 */
function extractDomains(line) {
	line = line.trim();

	if (!line || line.startsWith('!') || line.startsWith('[')) {
		return [];
	}

	const validDomains = [];

	// Check for Adguard rules (##, #@#, #$#, #%#, #?#, #@$?#)
	const adguardMatch = line.match(/^([^#]+)#[@$%?]*#/);
	if (adguardMatch) {
		const domainPart = adguardMatch[1];
		const domainList = domainPart.split(',').map(d => d.trim());

		for (const domain of domainList) {
			const cleaned = validateAndCleanDomain(domain);
			if (cleaned) {
				validDomains.push(cleaned);
			}
		}

		// Return early for Adguard rules
		if (validDomains.length > 0) {
			return validDomains;
		}
	}

	// Check for network rules with domain= parameter
	const domainMatch = line.match(/domain=([^,\s$]+)/);
	if (domainMatch) {
		const domainList = domainMatch[1].split('|');
		for (let domain of domainList) {
			domain = domain.trim();

			// Skip negated domains
			if (domain.startsWith('~')) {
				continue;
			}

			const cleaned = validateAndCleanDomain(domain);
			if (cleaned) {
				validDomains.push(cleaned);
			}
		}

		// Return early for network rules
		if (validDomains.length > 0) {
			return validDomains;
		}
	}

	// Check for uBlock Origin element hiding/cosmetic rules
	const match = line.match(/^([^#\s]+?)(?:##(?:\+js\()?|#@#|##\^)/);
	if (!match) return validDomains;

	const domainPart = match[1];
	const domainList = domainPart.split(',').map(d => d.trim());

	for (const domain of domainList) {
		const cleaned = validateAndCleanDomain(domain);
		if (cleaned) {
			validDomains.push(cleaned);
		}
	}

	return validDomains;
}

module.exports = {
	extractDomains,
	getBaseDomain,
	isBareDomain,
	validateAndCleanDomain,
};
