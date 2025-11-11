/**
 * Unit tests for file reading and parsing
 */

const fs = require('fs');
const path = require('path');
const { parseDomainsFromFile } = require('../../src/parsers/fileReader');

// Test fixtures directory
const fixturesDir = path.join(__dirname, '..', 'fixtures');

describe('File Reading and Parsing', () => {
	describe('parseDomainsFromFile', () => {
		test('should parse valid file and extract domains', async () => {
			const sampleFile = path.join(fixturesDir, 'sample-rules.txt');
			const domains = await parseDomainsFromFile(sampleFile);

			// Should extract domains from the sample file
			expect(Array.isArray(domains)).toBe(true);
			expect(domains.length).toBeGreaterThan(0);

			// Should include expected domains from sample-rules.txt
			expect(domains).toContain('example.com');
			expect(domains).toContain('test-site.net');
			expect(domains).toContain('subdomain.example.org');
			expect(domains).toContain('adguard-test.com');
		});

		test('should return unique domains (deduplicate)', async () => {
			// Create a test file with duplicate domains
			const testFile = path.join(fixturesDir, 'duplicates-test.txt');
			const content = `example.com##.ad
example.com##.banner
test.com##.ad
example.com##.popup`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should only have 2 unique domains
				expect(domains).toHaveLength(2);
				expect(domains).toContain('example.com');
				expect(domains).toContain('test.com');
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should return sorted domains alphabetically', async () => {
			// Create a test file with unsorted domains
			const testFile = path.join(fixturesDir, 'unsorted-test.txt');
			const content = `zebra.com##.ad
apple.com##.ad
middle.com##.ad`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should be sorted alphabetically
				expect(domains).toEqual(['apple.com', 'middle.com', 'zebra.com']);
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should handle empty files', async () => {
			// Create an empty test file
			const testFile = path.join(fixturesDir, 'empty-test.txt');
			await fs.promises.writeFile(testFile, '', 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should return empty array
				expect(domains).toEqual([]);
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should handle files with only comments', async () => {
			// Create a test file with only comments
			const testFile = path.join(fixturesDir, 'comments-only-test.txt');
			const content = `! This is a comment
! Another comment
[Adblock Plus 2.0]`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should return empty array
				expect(domains).toEqual([]);
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should throw error for missing files', async () => {
			const nonExistentFile = path.join(fixturesDir, 'does-not-exist.txt');

			await expect(parseDomainsFromFile(nonExistentFile)).rejects.toThrow('File not found');
			await expect(parseDomainsFromFile(nonExistentFile)).rejects.toThrow(nonExistentFile);
		});

		test('should handle files with invalid rules', async () => {
			// Create a test file with invalid rules
			const testFile = path.join(fixturesDir, 'invalid-rules-test.txt');
			const content = `valid.com##.ad
*.wildcard.com##.ad
192.168.1.1##.ad
another-valid.com##.ad`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should only extract valid domains
				expect(domains).toHaveLength(2);
				expect(domains).toContain('valid.com');
				expect(domains).toContain('another-valid.com');
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should handle mixed rule types', async () => {
			// Create a test file with different rule types
			const testFile = path.join(fixturesDir, 'mixed-rules-test.txt');
			const content = `! Comment
cosmetic.com##.ad
adguard.com#$#.style
/ads.js$script,domain=network.com
scriptlet.com##+js(abort)`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should extract from all rule types
				expect(domains).toHaveLength(4);
				expect(domains).toContain('cosmetic.com');
				expect(domains).toContain('adguard.com');
				expect(domains).toContain('network.com');
				expect(domains).toContain('scriptlet.com');
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});

		test('should handle multi-domain rules', async () => {
			// Create a test file with multi-domain rules
			const testFile = path.join(fixturesDir, 'multi-domain-test.txt');
			const content = `domain1.com,domain2.com,domain3.com##.ad`;

			await fs.promises.writeFile(testFile, content, 'utf8');

			try {
				const domains = await parseDomainsFromFile(testFile);

				// Should extract all domains from multi-domain rule
				expect(domains).toHaveLength(3);
				expect(domains).toContain('domain1.com');
				expect(domains).toContain('domain2.com');
				expect(domains).toContain('domain3.com');
			} finally {
				// Clean up test file
				await fs.promises.unlink(testFile);
			}
		});
	});
});
