/**
 * Unit tests for logger utilities
 */

const { configure, debugLog, debugVerbose, debugNetwork, debugBrowser, truncateError } = require('../../src/utils/logger');

// Mock console.log to capture output
let consoleOutput = [];
const originalConsoleLog = console.log;

beforeEach(() => {
	consoleOutput = [];
	console.log = jest.fn((...args) => {
		consoleOutput.push(args.join(' '));
	});
	// Reset logger configuration before each test
	configure({ debug: false, debugVerbose: false, debugNetwork: false, debugBrowser: false });
});

afterEach(() => {
	console.log = originalConsoleLog;
});

describe('Logger Configuration', () => {
	describe('configure', () => {
		test('should enable debug logging when debug is true', () => {
			configure({ debug: true });
			debugLog('Test message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[DEBUG] Test message');
		});

		test('should disable debug logging when debug is false', () => {
			configure({ debug: false });
			debugLog('Test message');
			expect(consoleOutput.length).toBe(0);
		});

		test('should enable verbose logging when debugVerbose is true', () => {
			configure({ debug: true, debugVerbose: true });
			debugVerbose('Verbose message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[VERBOSE] Verbose message');
		});

		test('should enable network logging when debugNetwork is true', () => {
			configure({ debug: true, debugNetwork: true });
			debugNetwork('Network message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[NETWORK] Network message');
		});

		test('should enable browser logging when debugBrowser is true', () => {
			configure({ debug: true, debugBrowser: true });
			debugBrowser('Browser message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[BROWSER] Browser message');
		});

		test('should handle empty options object', () => {
			configure({});
			debugLog('Test message');
			expect(consoleOutput.length).toBe(0);
		});

		test('should handle no options', () => {
			configure();
			debugLog('Test message');
			expect(consoleOutput.length).toBe(0);
		});
	});
});

describe('Debug Logging Functions', () => {
	describe('debugLog', () => {
		test('should log with DEBUG level by default', () => {
			configure({ debug: true });
			debugLog('Test message');
			expect(consoleOutput[0]).toContain('[DEBUG] Test message');
		});

		test('should log with custom level', () => {
			configure({ debug: true });
			debugLog('Custom message', 'INFO');
			expect(consoleOutput[0]).toContain('[INFO] Custom message');
		});

		test('should include timestamp in HH:MM:SS format', () => {
			configure({ debug: true });
			debugLog('Test message');
			// Should match format [HH:MM:SS] [DEBUG] Test message
			expect(consoleOutput[0]).toMatch(/\[\d{2}:\d{2}:\d{2}\] \[DEBUG\] Test message/);
		});

		test('should not log when debug is disabled', () => {
			configure({ debug: false });
			debugLog('Test message');
			expect(consoleOutput.length).toBe(0);
		});
	});

	describe('debugVerbose', () => {
		test('should log when debugVerbose is enabled', () => {
			configure({ debug: true, debugVerbose: true });
			debugVerbose('Verbose message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[VERBOSE] Verbose message');
		});

		test('should not log when debugVerbose is disabled', () => {
			configure({ debug: true, debugVerbose: false });
			debugVerbose('Verbose message');
			expect(consoleOutput.length).toBe(0);
		});

		test('should not log when debug is disabled even if debugVerbose is enabled', () => {
			configure({ debug: false, debugVerbose: true });
			debugVerbose('Verbose message');
			expect(consoleOutput.length).toBe(0);
		});
	});

	describe('debugNetwork', () => {
		test('should log when debugNetwork is enabled', () => {
			configure({ debug: true, debugNetwork: true });
			debugNetwork('Network message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[NETWORK] Network message');
		});

		test('should not log when debugNetwork is disabled', () => {
			configure({ debug: true, debugNetwork: false });
			debugNetwork('Network message');
			expect(consoleOutput.length).toBe(0);
		});

		test('should not log when debug is disabled even if debugNetwork is enabled', () => {
			configure({ debug: false, debugNetwork: true });
			debugNetwork('Network message');
			expect(consoleOutput.length).toBe(0);
		});
	});

	describe('debugBrowser', () => {
		test('should log when debugBrowser is enabled', () => {
			configure({ debug: true, debugBrowser: true });
			debugBrowser('Browser message');
			expect(consoleOutput.length).toBe(1);
			expect(consoleOutput[0]).toContain('[BROWSER] Browser message');
		});

		test('should not log when debugBrowser is disabled', () => {
			configure({ debug: true, debugBrowser: false });
			debugBrowser('Browser message');
			expect(consoleOutput.length).toBe(0);
		});

		test('should not log when debug is disabled even if debugBrowser is enabled', () => {
			configure({ debug: false, debugBrowser: true });
			debugBrowser('Browser message');
			expect(consoleOutput.length).toBe(0);
		});
	});
});

describe('Error Message Utilities', () => {
	describe('truncateError', () => {
		test('should not truncate short messages', () => {
			const message = 'Short error message';
			expect(truncateError(message)).toBe(message);
		});

		test('should not truncate messages exactly at max length', () => {
			const message = 'a'.repeat(120);
			expect(truncateError(message)).toBe(message);
			expect(truncateError(message).length).toBe(120);
		});

		test('should truncate long messages at 120 characters', () => {
			const message = 'a'.repeat(200);
			const result = truncateError(message);
			expect(result).toBe('a'.repeat(120) + '...');
			expect(result.length).toBe(123); // 120 + '...'
		});

		test('should use default maxLength of 120', () => {
			const message =
				'This is a very long error message that exceeds the default maximum length of 120 characters and should be truncated properly with ellipsis';
			const result = truncateError(message);
			expect(result.length).toBe(123);
			expect(result.endsWith('...')).toBe(true);
		});

		test('should respect custom maxLength parameter', () => {
			const message = 'This is a test message';
			const result = truncateError(message, 10);
			expect(result).toBe('This is a ...');
			expect(result.length).toBe(13);
		});

		test('should handle empty strings', () => {
			expect(truncateError('')).toBe('');
		});

		test('should handle single character strings', () => {
			expect(truncateError('a')).toBe('a');
		});
	});
});
