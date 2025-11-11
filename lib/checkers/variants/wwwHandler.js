/**
 * @file wwwHandler.js
 * @module wwwHandler
 * @description Part of the Cleaner-Adblock domain scanner utility
 */
const { isBareDomain } = require('../../parsers/domainExtractor');

/**
 * Expand domains with www
 * @param {*} domains - Parameter domains
 * @param {*} addWww - Parameter addWww
 * @returns {*} Result
 */
function expandDomainsWithWww(domains, addWww) {
	if (!addWww) {
		return domains.map(d => ({ original: d, variants: [d] }));
	}

	return domains.map(domain => {
		// If domain already starts with www., don't add variant
		if (domain.startsWith('www.')) {
			return { original: domain, variants: [domain] };
		}

		// If domain has subdomain, don't add www
		if (!isBareDomain(domain)) {
			return { original: domain, variants: [domain] };
		}

		// Bare domain without www - check both variants
		return {
			original: domain,
			variants: [domain, `www.${domain}`],
		};
	});
}

module.exports = {
	expandDomainsWithWww,
};
