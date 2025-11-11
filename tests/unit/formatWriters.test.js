/**
 * Unit tests for output format writers
 */

const fs = require('fs');
const path = require('path');
const {
	writeDomains,
	writeDeadDomainsText,
	writeRedirectDomainsText,
	writeDomainsJSON,
	writeDomainsCSV,
} = require('../../lib/writers/formatWriters');

// Test output directory
const testOutputDir = path.join(__dirname, '..', 'fixtures', 'test-output');

// Setup and teardown
beforeAll(async () => {
	// Create test output directory
	await fs.promises.mkdir(testOutputDir, { recursive: true });
});

afterEach(async () => {
	// Clean up test files after each test
	try {
		const files = await fs.promises.readdir(testOutputDir);
		for (const file of files) {
			await fs.promises.unlink(path.join(testOutputDir, file));
		}
	} catch {
		// Directory might not exist or be empty
	}
});

afterAll(async () => {
	// Remove test output directory
	try {
		await fs.promises.rmdir(testOutputDir);
	} catch {
		// Directory might not be empty
	}
});

describe('Text Format Writers', () => {
	describe('writeDeadDomainsText', () => {
		test('should write dead domains in text format with headers', async () => {
			const deadDomains = [
				{ domain: 'dead1.com', reason: 'DNS_FAILURE', statusCode: null },
				{ domain: 'dead2.com', reason: 'HTTP_404', statusCode: 404 },
			];

			const filePath = path.join(testOutputDir, 'dead-test.txt');
			await writeDeadDomainsText(filePath, deadDomains, { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			const lines = content.split('\n');

			expect(lines[0]).toBe('# Dead/Non-Existent Domains');
			expect(lines[2]).toBe('# Total found: 2');
			expect(content).toContain('dead1.com # DNS_FAILURE');
			expect(content).toContain('dead2.com # HTTP_404');
		});

		test('should include timestamp when includeTimestamp is true', async () => {
			const deadDomains = [{ domain: 'test.com', reason: 'TIMEOUT', statusCode: null }];

			const filePath = path.join(testOutputDir, 'dead-timestamp.txt');
			await writeDeadDomainsText(filePath, deadDomains, { includeTimestamp: true });

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('# Generated:');
		});

		test('should exclude timestamp when includeTimestamp is false', async () => {
			const deadDomains = [{ domain: 'test.com', reason: 'TIMEOUT', statusCode: null }];

			const filePath = path.join(testOutputDir, 'dead-no-timestamp.txt');
			await writeDeadDomainsText(filePath, deadDomains, { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).not.toContain('# Generated:');
		});

		test('should handle empty domain list', async () => {
			const filePath = path.join(testOutputDir, 'dead-empty.txt');
			await writeDeadDomainsText(filePath, [], { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('# Total found: 0');
		});
	});

	describe('writeRedirectDomainsText', () => {
		test('should write redirect domains in text format', async () => {
			const redirectDomains = [
				{ domain: 'old.com', finalDomain: 'new.com', finalUrl: 'https://new.com/', statusCode: 301 },
				{ domain: 'redirect.org', finalDomain: 'target.org', finalUrl: 'https://target.org/page', statusCode: 302 },
			];

			const filePath = path.join(testOutputDir, 'redirect-test.txt');
			await writeRedirectDomainsText(filePath, redirectDomains, { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			const lines = content.split('\n');

			expect(lines[0]).toBe('# Redirecting Domains');
			expect(lines[2]).toBe('# Total found: 2');
			expect(content).toContain('old.com → new.com # https://new.com/');
			expect(content).toContain('redirect.org → target.org # https://target.org/page');
		});

		test('should include timestamp when requested', async () => {
			const redirectDomains = [{ domain: 'test.com', finalDomain: 'new.com', finalUrl: 'https://new.com/', statusCode: 301 }];

			const filePath = path.join(testOutputDir, 'redirect-timestamp.txt');
			await writeRedirectDomainsText(filePath, redirectDomains, { includeTimestamp: true });

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('# Generated:');
		});
	});
});

describe('JSON Format Writer', () => {
	describe('writeDomainsJSON', () => {
		test('should write domains in JSON format', async () => {
			const domains = [
				{ domain: 'test1.com', reason: 'TIMEOUT' },
				{ domain: 'test2.com', reason: 'DNS_FAILURE' },
			];

			const filePath = path.join(testOutputDir, 'test.json');
			await writeDomainsJSON(filePath, domains, 'dead', { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			expect(parsed.type).toBe('dead');
			expect(parsed.count).toBe(2);
			expect(parsed.domains).toHaveLength(2);
			expect(parsed.domains[0].domain).toBe('test1.com');
		});

		test('should include timestamp when requested', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];

			const filePath = path.join(testOutputDir, 'test-timestamp.json');
			await writeDomainsJSON(filePath, domains, 'dead', { includeTimestamp: true });

			const content = await fs.promises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			expect(parsed.timestamp).toBeDefined();
			expect(typeof parsed.timestamp).toBe('string');
		});

		test('should exclude timestamp when includeTimestamp is false', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];

			const filePath = path.join(testOutputDir, 'test-no-timestamp.json');
			await writeDomainsJSON(filePath, domains, 'dead', { includeTimestamp: false });

			const content = await fs.promises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			expect(parsed.timestamp).toBeUndefined();
		});

		test('should include statistics when provided', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const statistics = {
				totalChecked: 10,
				deadCount: 1,
				redirectCount: 2,
				activeCount: 7,
			};

			const filePath = path.join(testOutputDir, 'test-stats.json');
			await writeDomainsJSON(filePath, domains, 'dead', {
				includeTimestamp: false,
				outputStatistics: true,
				statistics,
			});

			const content = await fs.promises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			expect(parsed.statistics).toEqual(statistics);
		});

		test('should not include statistics when outputStatistics is false', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const statistics = { totalChecked: 10 };

			const filePath = path.join(testOutputDir, 'test-no-stats.json');
			await writeDomainsJSON(filePath, domains, 'dead', {
				includeTimestamp: false,
				outputStatistics: false,
				statistics,
			});

			const content = await fs.promises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(content);

			expect(parsed.statistics).toBeUndefined();
		});
	});
});

describe('CSV Format Writer', () => {
	describe('writeDomainsCSV', () => {
		test('should write dead domains in CSV format', async () => {
			const domains = [
				{ domain: 'test1.com', reason: 'TIMEOUT', statusCode: null },
				{ domain: 'test2.com', reason: 'HTTP_404', statusCode: 404 },
			];

			const filePath = path.join(testOutputDir, 'dead.csv');
			await writeDomainsCSV(filePath, domains, 'dead');

			const content = await fs.promises.readFile(filePath, 'utf8');
			const lines = content.split('\n');

			expect(lines[0]).toBe('domain,status_code,reason');
			expect(lines[1]).toBe('test1.com,N/A,TIMEOUT');
			expect(lines[2]).toBe('test2.com,404,HTTP_404');
		});

		test('should write redirect domains in CSV format', async () => {
			const domains = [
				{ domain: 'old.com', finalDomain: 'new.com', finalUrl: 'https://new.com/', statusCode: 301 },
				{ domain: 'redirect.org', finalDomain: 'target.org', finalUrl: 'https://target.org/', statusCode: 302 },
			];

			const filePath = path.join(testOutputDir, 'redirect.csv');
			await writeDomainsCSV(filePath, domains, 'redirect');

			const content = await fs.promises.readFile(filePath, 'utf8');
			const lines = content.split('\n');

			expect(lines[0]).toBe('domain,final_domain,final_url,status_code');
			expect(lines[1]).toBe('old.com,new.com,https://new.com/,301');
			expect(lines[2]).toBe('redirect.org,target.org,https://target.org/,302');
		});

		test('should escape CSV fields with commas', async () => {
			const domains = [{ domain: 'test.com', reason: 'Error, timeout', statusCode: null }];

			const filePath = path.join(testOutputDir, 'csv-comma.csv');
			await writeDomainsCSV(filePath, domains, 'dead');

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('"Error, timeout"');
		});

		test('should escape CSV fields with quotes', async () => {
			const domains = [{ domain: 'test.com', reason: 'Error "quoted"', statusCode: null }];

			const filePath = path.join(testOutputDir, 'csv-quote.csv');
			await writeDomainsCSV(filePath, domains, 'dead');

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('"Error ""quoted"""');
		});

		test('should escape CSV fields with newlines', async () => {
			const domains = [{ domain: 'test.com', reason: 'Error\nNewline', statusCode: null }];

			const filePath = path.join(testOutputDir, 'csv-newline.csv');
			await writeDomainsCSV(filePath, domains, 'dead');

			const content = await fs.promises.readFile(filePath, 'utf8');
			expect(content).toContain('"Error\nNewline"');
		});
	});
});

describe('Multi-format Writer', () => {
	describe('writeDomains', () => {
		test('should write single format (text)', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const baseFilePath = path.join(testOutputDir, 'multi-test.txt');

			const filesWritten = await writeDomains('text', baseFilePath, domains, 'dead', { includeTimestamp: false });

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(baseFilePath);
			expect(await fs.promises.access(baseFilePath)).resolves;
		});

		test('should write single format (json)', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const baseFilePath = path.join(testOutputDir, 'multi-test');

			const filesWritten = await writeDomains('json', baseFilePath, domains, 'dead', { includeTimestamp: false });

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(path.join(testOutputDir, 'multi-test.json'));
		});

		test('should write single format (csv)', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const baseFilePath = path.join(testOutputDir, 'multi-test');

			const filesWritten = await writeDomains('csv', baseFilePath, domains, 'dead');

			expect(filesWritten).toHaveLength(1);
			expect(filesWritten[0]).toBe(path.join(testOutputDir, 'multi-test.csv'));
		});

		test('should write all formats when format is "all"', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const baseFilePath = path.join(testOutputDir, 'all-formats');

			const filesWritten = await writeDomains('all', baseFilePath, domains, 'dead', { includeTimestamp: false });

			expect(filesWritten).toHaveLength(3);
			expect(filesWritten).toContain(path.join(testOutputDir, 'all-formats.txt'));
			expect(filesWritten).toContain(path.join(testOutputDir, 'all-formats.json'));
			expect(filesWritten).toContain(path.join(testOutputDir, 'all-formats.csv'));

			// Verify all files exist
			for (const file of filesWritten) {
				await expect(fs.promises.access(file)).resolves.toBeUndefined();
			}
		});

		test('should handle redirect type domains', async () => {
			const domains = [{ domain: 'old.com', finalDomain: 'new.com', finalUrl: 'https://new.com/', statusCode: 301 }];
			const baseFilePath = path.join(testOutputDir, 'redirect-test');

			const filesWritten = await writeDomains('text', baseFilePath, domains, 'redirect', { includeTimestamp: false });

			expect(filesWritten).toHaveLength(1);

			const content = await fs.promises.readFile(filesWritten[0], 'utf8');
			expect(content).toContain('# Redirecting Domains');
			expect(content).toContain('old.com → new.com');
		});

		test('should throw error for unknown format', async () => {
			const domains = [{ domain: 'test.com', reason: 'ERROR' }];
			const baseFilePath = path.join(testOutputDir, 'unknown-format');

			await expect(writeDomains('invalid', baseFilePath, domains, 'dead')).rejects.toThrow('Unknown format: invalid');
		});
	});
});
