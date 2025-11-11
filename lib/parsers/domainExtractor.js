/**
 * @file domainExtractor.js
 * @module domainExtractor
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { isValidDomain } = require('../utils/validators');
const { BARE_DOMAIN_DOT_COUNT } = require('../config/defaults');

/**
 * Get base domain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
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
 * Is bare domain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
 */

function isBareDomain(domain) {
	// Remove www. for checking
	const withoutWww = domain.replace(/^www\./, '');
	// Count dots - bare domains have exactly one dot
	const dotCount = (withoutWww.match(/\./g) || []).length;
	return dotCount === BARE_DOMAIN_DOT_COUNT;
}

/**
 * Validate and clean domain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
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
 * Is i p address
 * @param {*} str - Parameter str
 * @returns {*} Result
 */

function isIPAddress(str) {
	// IPv4 pattern
	const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Pattern.test(str)) {
		return true;
	}
	// IPv6 pattern (basic check)
	if (str.includes(':') && str.split(':').length > 2) {
		return true;
	}
	return false;
}

/**
 * Extract domains
 * @param {*} line - Parameter line
 * @returns {*} Result
 */

function extractDomains(line) {
	line = line.trim();

	if (!line || line.startsWith('!') || line.startsWith('[')) {
		return [];
	}

	// Skip exemption rules (@@)
	if (line.startsWith('@@')) {
		return [];
	}

	const validDomains = [];

	// Check for network blocking rules (||domain^)
	if (line.startsWith('||')) {
		// Remove leading ||
		let rule = line.substring(2);

		// Strip modifiers (everything after ^$)
		const modifierIndex = rule.indexOf('^$');
		if (modifierIndex !== -1) {
			rule = rule.substring(0, modifierIndex);
		}

		// Extract domain part (stop at ^, /, or end)
		let domain = rule;

		// Stop at ^ (end of domain marker)
		const caretIndex = domain.indexOf('^');
		if (caretIndex !== -1) {
			domain = domain.substring(0, caretIndex);
		}

		// Stop at / (path separator)
		const slashIndex = domain.indexOf('/');
		if (slashIndex !== -1) {
			domain = domain.substring(0, slashIndex);
		}

		// Skip IP addresses
		if (isIPAddress(domain)) {
			return [];
		}

		// Validate and clean
		const cleaned = validateAndCleanDomain(domain);
		if (cleaned) {
			validDomains.push(cleaned);
			return validDomains;
		}
	}

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
