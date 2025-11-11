/**
 * Unit tests for validation functions
 */

const path = require('path');
const { validateFilePath, validateTestCount, validateConcurrency, validateTimeout, isValidDomain } = require('../../lib/utils/validators');

describe('Input Validation', () => {
	describe('validateFilePath', () => {
		test('should accept valid relative paths', () => {
			const result = validateFilePath('test.txt');
			expect(result).toBe('test.txt');
		});

		test('should accept valid paths with directories', () => {
			const result = validateFilePath('data/filters.txt');
			expect(result).toBe(path.normalize('data/filters.txt'));
		});

		test('should accept filenames with dashes', () => {
			const result = validateFilePath('build/easylist-250.txt');
			expect(result).toBe(path.normalize('build/easylist-250.txt'));
		});

		test('should accept filenames with multiple dashes and underscores', () => {
			const result = validateFilePath('data/my-filter_list-v2.txt');
			expect(result).toBe(path.normalize('data/my-filter_list-v2.txt'));
		});

		test('should reject path traversal attempts with ../', () => {
			expect(() => {
				validateFilePath('../etc/passwd');
			}).toThrow('Path traversal is not allowed');
		});

		test('should reject path traversal in middle of path', () => {
			expect(() => {
				validateFilePath('data/../../../etc/passwd');
			}).toThrow('Path traversal is not allowed');
		});

		test('should normalize paths correctly', () => {
			const result = validateFilePath('./data/test.txt');
			expect(result).toBe(path.normalize('data/test.txt'));
		});

		test('should reject absolute paths for security', () => {
			const absolutePath = path.join(process.cwd(), 'test.txt');
			expect(() => {
				validateFilePath(absolutePath);
			}).toThrow('Absolute paths are not allowed for security reasons');
		});
	});

	describe('validateTestCount', () => {
		test('should accept valid numbers', () => {
			expect(validateTestCount(5)).toBe(5);
			expect(validateTestCount('10')).toBe(10);
		});

		test('should accept boundary values', () => {
			expect(validateTestCount(1)).toBe(1); // MIN_TEST_COUNT
			expect(validateTestCount(100000)).toBe(100000); // MAX_TEST_COUNT
		});

		test('should reject negative numbers', () => {
			expect(() => {
				validateTestCount(-5);
			}).toThrow('Test count must be between 1 and 100000');
		});

		test('should reject zero', () => {
			expect(() => {
				validateTestCount(0);
			}).toThrow('Test count must be between 1 and 100000');
		});

		test('should reject numbers above maximum', () => {
			expect(() => {
				validateTestCount(100001);
			}).toThrow('Test count must be between 1 and 100000');
		});

		test('should reject non-numeric values', () => {
			expect(() => {
				validateTestCount('abc');
			}).toThrow('Test count must be between 1 and 100000');
		});

		test('should reject undefined', () => {
			expect(() => {
				validateTestCount(undefined);
			}).toThrow('Test count must be between 1 and 100000');
		});
	});

	describe('validateConcurrency', () => {
		test('should accept valid concurrency values', () => {
			expect(validateConcurrency(5)).toBe(5);
			expect(validateConcurrency('12')).toBe(12);
		});

		test('should accept boundary values', () => {
			expect(validateConcurrency(1)).toBe(1); // MIN_CONCURRENCY
			expect(validateConcurrency(50)).toBe(50); // MAX_CONCURRENCY
		});

		test('should reject values below minimum', () => {
			expect(() => {
				validateConcurrency(0);
			}).toThrow('Concurrency must be between 1 and 50');
		});

		test('should reject negative values', () => {
			expect(() => {
				validateConcurrency(-1);
			}).toThrow('Concurrency must be between 1 and 50');
		});

		test('should reject values above maximum', () => {
			expect(() => {
				validateConcurrency(51);
			}).toThrow('Concurrency must be between 1 and 50');
		});

		test('should reject non-numeric values', () => {
			expect(() => {
				validateConcurrency('invalid');
			}).toThrow('Concurrency must be between 1 and 50');
		});
	});

	describe('validateTimeout', () => {
		test('should convert seconds to milliseconds', () => {
			expect(validateTimeout(30)).toBe(30000);
			expect(validateTimeout(5)).toBe(5000);
		});

		test('should accept string values', () => {
			expect(validateTimeout('10')).toBe(10000);
		});

		test('should accept boundary values', () => {
			expect(validateTimeout(1)).toBe(1000); // MIN_TIMEOUT
			expect(validateTimeout(65535)).toBe(65535000); // MAX_TIMEOUT
		});

		test('should reject values below minimum', () => {
			expect(() => {
				validateTimeout(0);
			}).toThrow('Timeout must be between 1 and 65535 seconds');
		});

		test('should reject values above maximum', () => {
			expect(() => {
				validateTimeout(65536);
			}).toThrow('Timeout must be between 1 and 65535 seconds');
		});

		test('should reject non-numeric values', () => {
			expect(() => {
				validateTimeout('abc');
			}).toThrow('Timeout must be between 1 and 65535 seconds');
		});
	});
});

describe('Domain Validation', () => {
	describe('isValidDomain', () => {
		test('should accept valid domain names', () => {
			expect(isValidDomain('example.com')).toBe(true);
			expect(isValidDomain('subdomain.example.com')).toBe(true);
			expect(isValidDomain('test-site.net')).toBe(true);
			expect(isValidDomain('site123.org')).toBe(true);
		});

		test('should reject .onion domains', () => {
			expect(isValidDomain('example.onion')).toBe(false);
			expect(isValidDomain('test.onion')).toBe(false);
		});

		test('should reject IPv4 addresses', () => {
			expect(isValidDomain('192.168.1.1')).toBe(false);
			expect(isValidDomain('10.0.0.1')).toBe(false);
			expect(isValidDomain('8.8.8.8')).toBe(false);
		});

		test('should reject IPv6 addresses', () => {
			expect(isValidDomain('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(false);
			expect(isValidDomain('::1')).toBe(false);
			expect(isValidDomain('fe80::1')).toBe(false);
		});

		test('should reject localhost', () => {
			expect(isValidDomain('localhost')).toBe(false);
			expect(isValidDomain('127.0.0.1')).toBe(false);
		});

		test('should reject domains shorter than minimum length', () => {
			expect(isValidDomain('ab')).toBe(false); // Less than MIN_DOMAIN_LENGTH (3)
			expect(isValidDomain('a')).toBe(false);
			expect(isValidDomain('')).toBe(false);
		});

		test('should accept domains at minimum length', () => {
			expect(isValidDomain('a.bc')).toBe(true); // Exactly MIN_DOMAIN_LENGTH (4)
		});
	});
});
