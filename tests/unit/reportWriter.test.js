/**
 * Unit tests for report writing utilities
 */

const fs = require('fs');
const path = require('path');
const { writeDeadDomains, writeRedirectDomains, writeInconclusiveDomains } = require('../../lib/writers/reportWriter');

// Create a temporary test directory
const testOutputDir = path.join(__dirname, '..', 'fixtures', 'test-output');

beforeAll(async () => {
	await fs.promises.mkdir(testOutputDir, { recursive: true });
});

afterAll(async () => {
	// Clean up test output directory
	try {
		const files = await fs.promises.readdir(testOutputDir);
		for (const file of files) {
			await fs.promises.unlink(path.join(testOutputDir, file));
		}
		await fs.promises.rmdir(testOutputDir);
	} catch {
		// Ignore cleanup errors
	}
});

describe('Report Writer', () => {
	describe('writeDeadDomains', () => {
		test('should write dead domains in text format', async () => {
			const deadDomains = [
				{ domain: 'example.com', reason: 'ERR_NAME_NOT_RESOLVED' },
				{ domain: 'test.com', reason: 'HTTP 404' },
			];

			const filePath = path.join(testOutputDir, 'dead_test.txt');
			const filesWritten = await writeDeadDomains(deadDomains, {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(filePath);

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('example.com');
			expect(content).toContain('ERR_NAME_NOT_RESOLVED');
			expect(content).toContain('test.com');
			expect(content).toContain('HTTP 404');
		});

		test('should write dead domains in JSON format', async () => {
			const deadDomains = [{ domain: 'example.com', reason: 'ERR_NAME_NOT_RESOLVED' }];

			const filePath = path.join(testOutputDir, 'dead_test.json');
			const filesWritten = await writeDeadDomains(deadDomains, {
				format: 'json',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(filePath);

			const content = await fs.promises.readFile(filePath, 'utf8');
			const json = JSON.parse(content);
			expect(json.type).toBe('dead');
			expect(json.domains).toHaveLength(1);
			expect(json.domains[0].domain).toBe('example.com');
			expect(json.domains[0].reason).toBe('ERR_NAME_NOT_RESOLVED');
		});

		test('should write dead domains in CSV format', async () => {
			const deadDomains = [
				{ domain: 'example.com', statusCode: null, reason: 'ERR_NAME_NOT_RESOLVED' },
				{ domain: 'test.com', statusCode: 404, reason: 'HTTP 404' },
			];

			const filePath = path.join(testOutputDir, 'dead_test.csv');
			const filesWritten = await writeDeadDomains(deadDomains, {
				format: 'csv',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(filePath);

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('domain,status_code,reason');
			expect(content).toContain('example.com,N/A,ERR_NAME_NOT_RESOLVED');
			expect(content).toContain('test.com,404,HTTP 404');
		});

		test('should write dead domains in all formats', async () => {
			const deadDomains = [{ domain: 'example.com', reason: 'ERR_NAME_NOT_RESOLVED' }];

			const filePath = path.join(testOutputDir, 'dead_all');
			const filesWritten = await writeDeadDomains(deadDomains, {
				format: 'all',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten.length).toBeGreaterThan(1);
			// Should write multiple files for 'all' format
			expect(filesWritten.some(f => f.includes('.txt'))).toBe(true);
			expect(filesWritten.some(f => f.includes('.json'))).toBe(true);
			expect(filesWritten.some(f => f.includes('.csv'))).toBe(true);
		});

		test('should handle empty array', async () => {
			const filePath = path.join(testOutputDir, 'dead_empty.txt');
			const filesWritten = await writeDeadDomains([], {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filePath, 'utf8');
			// Should still include headers even with empty array
			expect(content).toContain('Dead/Non-Existent Domains');
			expect(content).toContain('Total found: 0');
		});
	});

	describe('writeRedirectDomains', () => {
		test('should write redirect domains in text format', async () => {
			const redirectDomains = [
				{
					domain: 'example.com',
					finalDomain: 'example.org',
					finalUrl: 'https://example.org',
				},
			];

			const filePath = path.join(testOutputDir, 'redirect_test.txt');
			const filesWritten = await writeRedirectDomains(redirectDomains, {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(filePath);

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('example.com');
			expect(content).toContain('example.org');
		});

		test('should write redirect domains in JSON format', async () => {
			const redirectDomains = [
				{
					domain: 'example.com',
					finalDomain: 'example.org',
					finalUrl: 'https://example.org',
				},
			];

			const filePath = path.join(testOutputDir, 'redirect_test.json');
			const filesWritten = await writeRedirectDomains(redirectDomains, {
				format: 'json',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filePath, 'utf8');
			const json = JSON.parse(content);
			expect(json.type).toBe('redirect');
			expect(json.domains).toHaveLength(1);
			expect(json.domains[0].domain).toBe('example.com');
			expect(json.domains[0].finalDomain).toBe('example.org');
		});

		test('should handle empty array', async () => {
			const filePath = path.join(testOutputDir, 'redirect_empty.txt');
			const filesWritten = await writeRedirectDomains([], {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filePath, 'utf8');
			// Should still include headers even with empty array
			expect(content).toContain('Redirecting Domains');
			expect(content).toContain('Total found: 0');
		});
	});

	describe('writeInconclusiveDomains', () => {
		test('should write inconclusive domains in text format', async () => {
			const inconclusiveDomains = [
				{ domain: 'example.com', reason: 'Timeout' },
				{ domain: 'test.com', reason: 'Too many redirects' },
			];

			const filePath = path.join(testOutputDir, 'inconclusive_test.txt');
			const filesWritten = await writeInconclusiveDomains(inconclusiveDomains, {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(filePath);

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('example.com');
			expect(content).toContain('Timeout');
			expect(content).toContain('test.com');
			expect(content).toContain('Too many redirects');
		});

		test('should write inconclusive domains in JSON format', async () => {
			const inconclusiveDomains = [{ domain: 'example.com', reason: 'Timeout' }];

			const filePath = path.join(testOutputDir, 'inconclusive_test.json');
			const filesWritten = await writeInconclusiveDomains(inconclusiveDomains, {
				format: 'json',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filePath, 'utf8');
			const json = JSON.parse(content);
			expect(json.type).toBe('inconclusive');
			expect(json.domains).toHaveLength(1);
			expect(json.domains[0].domain).toBe('example.com');
			expect(json.domains[0].reason).toBe('Timeout');
		});

		test('should handle empty array', async () => {
			const filePath = path.join(testOutputDir, 'inconclusive_empty.txt');
			const filesWritten = await writeInconclusiveDomains([], {
				format: 'text',
				filePath,
				includeTimestamp: false,
			});

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filePath, 'utf8');
			// Should still include headers even with empty array
			expect(content).toContain('Inconclusive Domains');
			expect(content).toContain('Total found: 0');
		});
	});
});
