/**
 * Unit tests for domain checker utilities
 * NOTE: These are BASIC tests only - no Puppeteer/liveness detection testing
 */

const { isSimilarDomainRedirect } = require('../../lib/checkers/domainChecker');

describe('Domain Checker Utilities', () => {
	describe('isSimilarDomainRedirect', () => {
		test('should return false when ignoreSimilar is false', () => {
			expect(isSimilarDomainRedirect('example.com', 'www.example.com', false)).toBe(false);
			expect(isSimilarDomainRedirect('sub.example.com', 'example.com', false)).toBe(false);
		});

		test('should return true when domains have same base and ignoreSimilar is true', () => {
			expect(isSimilarDomainRedirect('example.com', 'www.example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('www.example.com', 'example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('sub.example.com', 'example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('example.com', 'sub.example.com', true)).toBe(true);
		});

		test('should return false when domains have different base even with ignoreSimilar true', () => {
			expect(isSimilarDomainRedirect('example.com', 'different.com', true)).toBe(false);
			expect(isSimilarDomainRedirect('test.org', 'example.com', true)).toBe(false);
		});

		test('should handle www prefix correctly', () => {
			expect(isSimilarDomainRedirect('www.example.com', 'www.example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('www.test.com', 'test.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('test.com', 'www.test.com', true)).toBe(true);
		});

		test('should handle subdomains correctly', () => {
			expect(isSimilarDomainRedirect('api.example.com', 'www.example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('sub1.example.com', 'sub2.example.com', true)).toBe(true);
			expect(isSimilarDomainRedirect('deep.sub.example.com', 'example.com', true)).toBe(true);
		});

		test('should handle different TLDs correctly', () => {
			expect(isSimilarDomainRedirect('example.com', 'example.org', true)).toBe(false);
			expect(isSimilarDomainRedirect('test.net', 'test.com', true)).toBe(false);
		});
	});
});
