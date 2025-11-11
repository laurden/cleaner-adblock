/**
 * Unit tests for domain extraction utilities
 */

const { extractDomains, getBaseDomain, isBareDomain, validateAndCleanDomain } = require('../../lib/parsers/domainExtractor');

describe('Domain Utilities', () => {
	describe('getBaseDomain', () => {
		test('should extract base domain from subdomain', () => {
			expect(getBaseDomain('sub.example.com')).toBe('example.com');
			expect(getBaseDomain('a.b.example.com')).toBe('example.com');
			expect(getBaseDomain('deep.nested.sub.example.org')).toBe('example.org');
		});

		test('should return domain as-is for bare domains', () => {
			expect(getBaseDomain('example.com')).toBe('example.com');
			expect(getBaseDomain('test.org')).toBe('test.org');
		});

		test('should handle www prefix correctly', () => {
			expect(getBaseDomain('www.example.com')).toBe('example.com');
			expect(getBaseDomain('www.sub.example.com')).toBe('example.com');
		});

		test('should handle single-part domains', () => {
			expect(getBaseDomain('localhost')).toBe('localhost');
		});
	});

	describe('isBareDomain', () => {
		test('should identify bare domains correctly', () => {
			expect(isBareDomain('example.com')).toBe(true);
			expect(isBareDomain('test.org')).toBe(true);
			expect(isBareDomain('site.co.uk')).toBe(false); // Has 2 dots
		});

		test('should identify subdomains correctly', () => {
			expect(isBareDomain('sub.example.com')).toBe(false);
			expect(isBareDomain('a.b.example.com')).toBe(false);
		});

		test('should treat www domains as bare', () => {
			expect(isBareDomain('www.example.com')).toBe(true); // www is stripped
		});

		test('should handle www with subdomain', () => {
			expect(isBareDomain('www.sub.example.com')).toBe(false);
		});
	});

	describe('validateAndCleanDomain', () => {
		test('should accept valid domains', () => {
			expect(validateAndCleanDomain('example.com')).toBe('example.com');
			expect(validateAndCleanDomain('sub.example.org')).toBe('sub.example.org');
		});

		test('should reject wildcards', () => {
			expect(validateAndCleanDomain('*.example.com')).toBe(null);
			expect(validateAndCleanDomain('test*.example.com')).toBe(null);
		});

		test('should remove leading tildes', () => {
			expect(validateAndCleanDomain('~example.com')).toBe('example.com');
			expect(validateAndCleanDomain('~~test.com')).toBe('test.com');
		});

		test('should remove leading dots', () => {
			expect(validateAndCleanDomain('.example.com')).toBe('example.com');
			expect(validateAndCleanDomain('..test.org')).toBe('test.org');
		});

		test('should remove combination of leading tildes and dots', () => {
			expect(validateAndCleanDomain('.~example.com')).toBe('example.com');
			expect(validateAndCleanDomain('~.test.org')).toBe('test.org');
		});

		test('should reject invalid domains', () => {
			expect(validateAndCleanDomain('')).toBe(null);
			expect(validateAndCleanDomain('abc')).toBe(null); // No dot
			expect(validateAndCleanDomain('a.b')).toBe(null); // Too short (< 4 chars)
		});

		test('should reject .onion domains', () => {
			expect(validateAndCleanDomain('example.onion')).toBe(null);
		});

		test('should reject IP addresses', () => {
			expect(validateAndCleanDomain('192.168.1.1')).toBe(null);
			expect(validateAndCleanDomain('10.0.0.1')).toBe(null);
		});

		test('should reject localhost', () => {
			expect(validateAndCleanDomain('localhost')).toBe(null);
		});
	});
});

describe('Domain Extraction', () => {
	describe('extractDomains', () => {
		test('should extract domains from uBlock Origin cosmetic rules', () => {
			expect(extractDomains('example.com##.ad-banner')).toEqual(['example.com']);
			expect(extractDomains('test-site.net##.popup')).toEqual(['test-site.net']);
			expect(extractDomains('subdomain.example.org##.tracker')).toEqual(['subdomain.example.org']);
		});

		test('should extract domains from uBlock Origin exception rules', () => {
			expect(extractDomains('whitelist.com#@#.allowed')).toEqual(['whitelist.com']);
		});

		test('should extract domains from Adguard CSS inject rules', () => {
			expect(extractDomains('adguard-test.com##selector')).toEqual(['adguard-test.com']);
			expect(extractDomains('css-inject.org#$#.custom-style')).toEqual(['css-inject.org']);
		});

		test('should extract domains from network rules', () => {
			// Path-based rule without ||, extracts from domain= parameter
			expect(extractDomains('/ads.js$script,domain=network-test.com')).toEqual(['network-test.com']);
			// Network blocking rule with ||, extracts the blocked domain
			expect(extractDomains('||blocked.example.com^$script,domain=site1.com')).toEqual(['blocked.example.com']);
		});

		test('should handle multi-domain rules', () => {
			const result = extractDomains('multi-domain.com,another-domain.net##.ads');
			expect(result).toHaveLength(2);
			expect(result).toContain('multi-domain.com');
			expect(result).toContain('another-domain.net');
		});

		test('should handle network rules with multiple domains', () => {
			// Network blocking rule with ||, extracts the blocked domain (not the domain= parameter)
			const result = extractDomains('||blocked.example.com^$script,domain=site1.com|site2.org');
			expect(result).toHaveLength(1);
			expect(result).toContain('blocked.example.com');
		});

		test('should skip comments and empty lines', () => {
			expect(extractDomains('! This is a comment')).toEqual([]);
			expect(extractDomains('!! Another comment')).toEqual([]);
			expect(extractDomains('')).toEqual([]);
			expect(extractDomains('   ')).toEqual([]);
			expect(extractDomains('[Adblock Plus 2.0]')).toEqual([]);
		});

		test('should skip wildcards', () => {
			expect(extractDomains('*.wildcard.com##.ad')).toEqual([]);
		});

		test('should skip negated domains in network rules', () => {
			expect(extractDomains('domain=~negated.com')).toEqual([]);
			expect(extractDomains('domain=good.com|~bad.com')).toEqual(['good.com']);
		});

		test('should skip invalid domains', () => {
			expect(extractDomains('.onion-site.onion##.tracker')).toEqual([]);
			expect(extractDomains('192.168.1.1##.local')).toEqual([]);
		});

		test('should handle scriptlet rules', () => {
			expect(extractDomains('scriptlet-site.com##+js(abort-on-property-read)')).toEqual(['scriptlet-site.com']);
		});

		test('should handle procedural cosmetic rules', () => {
			expect(extractDomains('example.com##^.ad-container')).toEqual(['example.com']);
		});

		test('should return empty array for invalid rule formats', () => {
			expect(extractDomains('not-a-valid-rule')).toEqual([]);
			expect(extractDomains('example.com')).toEqual([]); // Just a domain, no rule
		});

		test('should handle mixed valid and invalid domains in multi-domain rules', () => {
			const result = extractDomains('valid.com,*.invalid.com,192.168.1.1##.ad');
			expect(result).toEqual(['valid.com']);
		});
	});
});
