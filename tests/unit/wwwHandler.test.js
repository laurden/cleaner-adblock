/**
 * Unit tests for WWW variant handling
 */

const { expandDomainsWithWww } = require('../../lib/checkers/variants/wwwHandler');

describe('WWW Variant Handling', () => {
	describe('expandDomainsWithWww', () => {
		test('should return single variant when addWww is false', () => {
			const domains = ['example.com', 'test.org'];
			const result = expandDomainsWithWww(domains, false);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ original: 'example.com', variants: ['example.com'] });
			expect(result[1]).toEqual({ original: 'test.org', variants: ['test.org'] });
		});

		test('should add www variant for bare domains when addWww is true', () => {
			const domains = ['example.com', 'test.org'];
			const result = expandDomainsWithWww(domains, true);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				original: 'example.com',
				variants: ['example.com', 'www.example.com'],
			});
			expect(result[1]).toEqual({
				original: 'test.org',
				variants: ['test.org', 'www.test.org'],
			});
		});

		test('should not add www variant for domains already starting with www', () => {
			const domains = ['www.example.com'];
			const result = expandDomainsWithWww(domains, true);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				original: 'www.example.com',
				variants: ['www.example.com'],
			});
		});

		test('should not add www variant for subdomains', () => {
			const domains = ['sub.example.com', 'api.test.org'];
			const result = expandDomainsWithWww(domains, true);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				original: 'sub.example.com',
				variants: ['sub.example.com'],
			});
			expect(result[1]).toEqual({
				original: 'api.test.org',
				variants: ['api.test.org'],
			});
		});

		test('should handle mixed bare domains and subdomains', () => {
			const domains = ['example.com', 'sub.example.com', 'www.test.org', 'bare.net'];
			const result = expandDomainsWithWww(domains, true);

			expect(result).toHaveLength(4);

			// Bare domain - should get www variant
			expect(result[0]).toEqual({
				original: 'example.com',
				variants: ['example.com', 'www.example.com'],
			});

			// Subdomain - should not get www variant
			expect(result[1]).toEqual({
				original: 'sub.example.com',
				variants: ['sub.example.com'],
			});

			// Already has www - should not get additional variant
			expect(result[2]).toEqual({
				original: 'www.test.org',
				variants: ['www.test.org'],
			});

			// Bare domain - should get www variant
			expect(result[3]).toEqual({
				original: 'bare.net',
				variants: ['bare.net', 'www.bare.net'],
			});
		});

		test('should handle empty array', () => {
			const result = expandDomainsWithWww([], true);
			expect(result).toEqual([]);
		});

		test('should handle single domain', () => {
			const result = expandDomainsWithWww(['test.com'], true);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				original: 'test.com',
				variants: ['test.com', 'www.test.com'],
			});
		});
	});
});
