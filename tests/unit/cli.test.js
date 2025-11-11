/**
 * Unit tests for CLI argument parsing
 */

const path = require('path');
const fs = require('fs');
const { parseArgs, showHelp } = require('../../lib/cli');

// Create a temporary test config file
const testConfigDir = path.join(__dirname, '..', 'fixtures', 'test-config');
const testConfigPath = path.join(testConfigDir, 'config.json');

// Mock console.log and console.error
let consoleOutput = [];
let consoleErrors = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalExit = process.exit;

beforeAll(async () => {
	// Create test config directory
	await fs.promises.mkdir(testConfigDir, { recursive: true });

	// Create a test config file (JSON format)
	const testConfig = {
		inputFile: 'test-input.txt',
		outputFormat: 'text',
		addWww: false,
		ignoreSimilar: false,
		quietMode: false,
		debug: false,
		debugVerbose: false,
		debugNetwork: false,
		debugBrowser: false,
		timeout: 15,
		forceCloseTimeout: 30,
		concurrency: 4,
		includeTimestamp: true,
		outputStatistics: false,
		disableSandbox: false,
		httpsOnly: false,
		maxRequestsPerMinute: 600,
		maxDomains: 100000,
	};

	await fs.promises.writeFile(testConfigPath, JSON.stringify(testConfig, null, '\t'), 'utf8');
});

afterAll(async () => {
	// Clean up test config file
	try {
		await fs.promises.unlink(testConfigPath);
		await fs.promises.rmdir(testConfigDir);
	} catch {
		// Ignore cleanup errors
	}
});

beforeEach(() => {
	consoleOutput = [];
	consoleErrors = [];
	console.log = jest.fn((...args) => {
		consoleOutput.push(args.join(' '));
	});
	console.error = jest.fn((...args) => {
		consoleErrors.push(args.join(' '));
	});
	process.exit = jest.fn();
});

afterEach(() => {
	console.log = originalConsoleLog;
	console.error = originalConsoleError;
	process.exit = originalExit;
});

describe('CLI Argument Parsing', () => {
	describe('parseArgs', () => {
		test('should load custom config file with --config flag', async () => {
			const args = [`--config=${testConfigPath}`];
			const config = await parseArgs(args);

			// Should load custom config file
			expect(config).toHaveProperty('inputFile');
			expect(config.inputFile).toBe('test-input.txt'); // From test config
		});

		test('should exit with error for non-existent custom config file', async () => {
			const args = ['--config=tests/fixtures/nonexistent/config.json'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toMatch(/Configuration file not found|ENOENT/);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should override config with --input flag', async () => {
			const args = [`--config=${testConfigPath}`, '--input=custom.txt'];
			const config = await parseArgs(args);

			expect(config.inputFile).toBe('custom.txt');
		});

		test('should enable addWww with --add-www flag', async () => {
			const args = [`--config=${testConfigPath}`, '--add-www'];
			const config = await parseArgs(args);

			expect(config.addWww).toBe(true);
		});

		test('should enable ignoreSimilar with --ignore-similar flag', async () => {
			const args = [`--config=${testConfigPath}`, '--ignore-similar'];
			const config = await parseArgs(args);

			expect(config.ignoreSimilar).toBe(true);
		});

		test('should enable basic debug with --debug flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBeFalsy();
			expect(config.debugNetwork).toBeFalsy();
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should enable basic debug with --debug=basic flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=basic'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBeFalsy();
			expect(config.debugNetwork).toBeFalsy();
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should enable verbose debug with --debug=verbose flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=verbose'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBe(true);
			expect(config.debugNetwork).toBeFalsy();
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should enable network debug with --debug=network flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=network'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBeFalsy();
			expect(config.debugNetwork).toBe(true);
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should enable browser debug with --debug=browser flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=browser'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBeFalsy();
			expect(config.debugNetwork).toBeFalsy();
			expect(config.debugBrowser).toBe(true);
		});

		test('should enable all debug flags with --debug=all flag', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=all'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBe(true);
			expect(config.debugNetwork).toBe(true);
			expect(config.debugBrowser).toBe(true);
		});

		test('should enable multiple debug types with comma-separated values', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=basic,verbose'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBe(true);
			expect(config.debugNetwork).toBeFalsy();
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should enable multiple debug types with --debug=verbose,network', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=verbose,network'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBe(true);
			expect(config.debugNetwork).toBe(true);
			expect(config.debugBrowser).toBeFalsy();
		});

		test('should exit with error for invalid debug type', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=invalid'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toContain('Invalid debug type');
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should handle case-insensitive debug types', async () => {
			const args = [`--config=${testConfigPath}`, '--debug=VERBOSE,Network'];
			const config = await parseArgs(args);

			expect(config.debug).toBe(true);
			expect(config.debugVerbose).toBe(true);
			expect(config.debugNetwork).toBe(true);
		});

		test('should enable testMode with --test-mode flag', async () => {
			const args = [`--config=${testConfigPath}`, '--test-mode'];
			const config = await parseArgs(args);

			expect(config.testMode).toBe(true);
		});

		test('should set testCount with --test-count flag', async () => {
			const args = [`--config=${testConfigPath}`, '--test-count=10'];
			const config = await parseArgs(args);

			expect(config.testCount).toBe(10);
			expect(config.testMode).toBe(true);
		});

		test('should set timeout with --timeout flag', async () => {
			const args = [`--config=${testConfigPath}`, '--timeout=60'];
			const config = await parseArgs(args);

			expect(config.timeout).toBe(60000); // Converted to milliseconds
		});

		test('should enable quietMode with --quiet flag', async () => {
			const args = [`--config=${testConfigPath}`, '--quiet'];
			const config = await parseArgs(args);

			expect(config.quietMode).toBe(true);
		});

		test('should set outputFormat with --output-format flag', async () => {
			const args = [`--config=${testConfigPath}`, '--output-format=json'];
			const config = await parseArgs(args);

			expect(config.outputFormat).toBe('json');
		});

		test('should exit with error for invalid output format', async () => {
			const args = [`--config=${testConfigPath}`, '--output-format=invalid'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toContain('Invalid output format');
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should exit with error for invalid test count', async () => {
			const args = [`--config=${testConfigPath}`, '--test-count=abc'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toContain('Invalid test count');
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should exit with error for invalid timeout', async () => {
			const args = [`--config=${testConfigPath}`, '--timeout=abc'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toContain('Invalid timeout');
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should exit with error for invalid input file path', async () => {
			const args = [`--config=${testConfigPath}`, '--input=../../../etc/passwd'];

			await parseArgs(args);

			expect(consoleErrors.length).toBeGreaterThan(0);
			expect(consoleErrors[0]).toContain('Invalid input file path');
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		test('should handle multiple flags together', async () => {
			const args = [`--config=${testConfigPath}`, '--add-www', '--ignore-similar', '--quiet', '--output-format=json'];

			const config = await parseArgs(args);

			expect(config.addWww).toBe(true);
			expect(config.ignoreSimilar).toBe(true);
			expect(config.quietMode).toBe(true);
			expect(config.outputFormat).toBe('json');
		});

		test('should handle all output formats', async () => {
			const formats = ['text', 'json', 'csv', 'all'];

			for (const format of formats) {
				const args = [`--config=${testConfigPath}`, `--output-format=${format}`];
				const config = await parseArgs(args);
				expect(config.outputFormat).toBe(format);
			}
		});
	});

	describe('showHelp', () => {
		test('should display help message', () => {
			showHelp();

			expect(consoleOutput.length).toBeGreaterThan(0);
			const helpText = consoleOutput.join('\n');

			expect(helpText).toContain('Cleaner AdBlock');
			expect(helpText).toContain('Usage:');
			expect(helpText).toContain('Options:');
			expect(helpText).toContain('--input=');
			expect(helpText).toContain('--add-www');
			expect(helpText).toContain('--ignore-similar');
			expect(helpText).toContain('--debug');
			expect(helpText).toContain('--test-mode');
		});

		test('should include examples in help message', () => {
			showHelp();

			const helpText = consoleOutput.join('\n');

			expect(helpText).toContain('Examples:');
			expect(helpText).toContain('node cleaner-adblock.js');
		});
	});
});
