/**
 * Integration tests for basic application flow
 * NOTE: These are basic integration tests without actual domain checking
 */

const fs = require('fs');
const path = require('path');
const { parseDomainsFromFile } = require('../../lib/parsers/fileReader');
const { expandDomainsWithWww } = require('../../lib/checkers/variants/wwwHandler');
const { writeDomains } = require('../../lib/writers/formatWriters');

// Test fixtures
const fixturesDir = path.join(__dirname, '..', 'fixtures');
const outputDir = path.join(fixturesDir, 'integration-output');

beforeAll(async () => {
	// Create output directory
	await fs.promises.mkdir(outputDir, { recursive: true });
});

afterEach(async () => {
	// Clean up output files
	try {
		const files = await fs.promises.readdir(outputDir);
		for (const file of files) {
			await fs.promises.unlink(path.join(outputDir, file));
		}
	} catch {
		// Ignore errors
	}
});

afterAll(async () => {
	// Remove output directory
	try {
		await fs.promises.rmdir(outputDir);
	} catch {
		// Ignore errors
	}
});

describe('Basic Application Flow Integration', () => {
	test('should parse domains from file and prepare for checking', async () => {
		// Step 1: Parse domains from sample rules file
		const sampleFile = path.join(fixturesDir, 'sample-rules.txt');
		const domains = await parseDomainsFromFile(sampleFile);

		// Verify we extracted domains
		expect(domains.length).toBeGreaterThan(0);
		expect(Array.isArray(domains)).toBe(true);

		// Verify domains are sorted and unique
		const sortedDomains = [...domains].sort();
		expect(domains).toEqual(sortedDomains);

		// Step 2: Expand domains with www variants
		const domainObjects = expandDomainsWithWww(domains, true);

		// Verify expansion
		expect(domainObjects.length).toBe(domains.length);
		expect(domainObjects[0]).toHaveProperty('original');
		expect(domainObjects[0]).toHaveProperty('variants');
	});

	test('should write dead domains to output files', async () => {
		const deadDomains = [
			{ domain: 'dead1.com', reason: 'DNS_FAILURE', statusCode: null },
			{ domain: 'dead2.com', reason: 'HTTP_404', statusCode: 404 },
			{ domain: 'dead3.com', reason: 'TIMEOUT', statusCode: null },
		];

		const baseFilePath = path.join(outputDir, 'dead-integration-test');

		// Write in all formats
		const filesWritten = await writeDomains('all', baseFilePath, deadDomains, 'dead', {
			includeTimestamp: false,
		});

		// Verify all files were written
		expect(filesWritten).toHaveLength(3);

		// Verify text file
		const textContent = await fs.promises.readFile(path.join(outputDir, 'dead-integration-test.txt'), 'utf8');
		expect(textContent).toContain('dead1.com');
		expect(textContent).toContain('dead2.com');
		expect(textContent).toContain('dead3.com');

		// Verify JSON file
		const jsonContent = await fs.promises.readFile(path.join(outputDir, 'dead-integration-test.json'), 'utf8');
		const jsonData = JSON.parse(jsonContent);
		expect(jsonData.count).toBe(3);
		expect(jsonData.type).toBe('dead');
		expect(jsonData.domains).toHaveLength(3);

		// Verify CSV file
		const csvContent = await fs.promises.readFile(path.join(outputDir, 'dead-integration-test.csv'), 'utf8');
		expect(csvContent).toContain('domain,status_code,reason');
		expect(csvContent).toContain('dead1.com');
	});

	test('should write redirect domains to output files', async () => {
		const redirectDomains = [
			{ domain: 'old1.com', finalDomain: 'new1.com', finalUrl: 'https://new1.com/', statusCode: 301 },
			{ domain: 'old2.com', finalDomain: 'new2.com', finalUrl: 'https://new2.com/page', statusCode: 302 },
		];

		const baseFilePath = path.join(outputDir, 'redirect-integration-test');

		// Write in all formats
		const filesWritten = await writeDomains('all', baseFilePath, redirectDomains, 'redirect', {
			includeTimestamp: false,
		});

		// Verify all files were written
		expect(filesWritten).toHaveLength(3);

		// Verify text file
		const textContent = await fs.promises.readFile(path.join(outputDir, 'redirect-integration-test.txt'), 'utf8');
		expect(textContent).toContain('old1.com → new1.com');
		expect(textContent).toContain('old2.com → new2.com');

		// Verify JSON file
		const jsonContent = await fs.promises.readFile(path.join(outputDir, 'redirect-integration-test.json'), 'utf8');
		const jsonData = JSON.parse(jsonContent);
		expect(jsonData.count).toBe(2);
		expect(jsonData.type).toBe('redirect');

		// Verify CSV file
		const csvContent = await fs.promises.readFile(path.join(outputDir, 'redirect-integration-test.csv'), 'utf8');
		expect(csvContent).toContain('domain,final_domain,final_url,status_code');
		expect(csvContent).toContain('old1.com');
	});

	test('should handle complete flow: parse → expand → filter → write', async () => {
		// Step 1: Parse domains
		const sampleFile = path.join(fixturesDir, 'sample-rules.txt');
		const domains = await parseDomainsFromFile(sampleFile);

		// Step 2: Expand with www
		const domainObjects = expandDomainsWithWww(domains.slice(0, 3), true);

		// Step 3: Simulate results (normally from domain checking)
		// For this test, just mark them as dead
		const deadDomains = domainObjects.map(obj => ({
			domain: obj.original,
			reason: 'TEST_FAILURE',
			statusCode: null,
		}));

		// Step 4: Write output
		const baseFilePath = path.join(outputDir, 'complete-flow-test');
		const filesWritten = await writeDomains('text', baseFilePath, deadDomains, 'dead', {
			includeTimestamp: false,
		});

		// Verify
		expect(filesWritten).toHaveLength(1);
		const content = await fs.promises.readFile(filesWritten[0], 'utf8');
		expect(content).toContain('Dead/Non-Existent Domains');
		expect(content).toContain('TEST_FAILURE');
	});

	test('should handle empty results gracefully', async () => {
		const baseFilePath = path.join(outputDir, 'empty-results-test');

		// Write empty dead domains
		const filesWritten = await writeDomains('text', baseFilePath, [], 'dead', {
			includeTimestamp: false,
		});

		expect(filesWritten).toHaveLength(1);
		const content = await fs.promises.readFile(filesWritten[0], 'utf8');
		expect(content).toContain('Total found: 0');
	});

	test('should handle www expansion correctly in integration', async () => {
		const domains = ['example.com', 'www.test.com', 'sub.site.org'];

		// With www expansion
		const withWww = expandDomainsWithWww(domains, true);

		// example.com should have 2 variants
		expect(withWww[0].variants).toHaveLength(2);
		expect(withWww[0].variants).toContain('example.com');
		expect(withWww[0].variants).toContain('www.example.com');

		// www.test.com should have 1 variant (already has www)
		expect(withWww[1].variants).toHaveLength(1);

		// sub.site.org should have 1 variant (subdomain)
		expect(withWww[2].variants).toHaveLength(1);

		// Without www expansion
		const withoutWww = expandDomainsWithWww(domains, false);

		// All should have 1 variant
		expect(withoutWww[0].variants).toHaveLength(1);
		expect(withoutWww[1].variants).toHaveLength(1);
		expect(withoutWww[2].variants).toHaveLength(1);
	});
});
