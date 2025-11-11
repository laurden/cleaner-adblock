/**
 * Unit tests for configuration loader
 */

const fs = require('fs');
const path = require('path');

// We need to test the config loader, but since it loads from a fixed path
// (src/config/config.js), we'll need to mock the filesystem or test the
// behavior with actual config files

describe('Configuration Loader', () => {
	// Store original require cache
	const configLoaderPath = path.join(__dirname, '../../lib/config/loader.js');
	const configPath = path.join(__dirname, '../../lib/config/config.json');

	beforeEach(() => {
		// Clear require cache before each test
		delete require.cache[configLoaderPath];
		delete require.cache[configPath];
	});

	describe('loadConfig', () => {
		test('should load and merge config with defaults', async () => {
			// Config.js exists at src/config/config.js
			const { loadConfig } = require('../../lib/config/loader');
			const config = await loadConfig();

			// Should have properties from defaults
			expect(config).toHaveProperty('TIMEOUT');
			expect(config).toHaveProperty('CONCURRENCY');
			expect(config).toHaveProperty('inputFile');

			// Should be an object
			expect(typeof config).toBe('object');
		});

		test('should load config from src/config directory', async () => {
			// Config is in src/config/config.json (or defaults if not present)
			const { loadConfig } = require('../../lib/config/loader');
			const config = await loadConfig();

			// Should successfully load
			expect(config).toBeDefined();
			expect(typeof config).toBe('object');
		});

		test('should merge user config with defaults', async () => {
			const { loadConfig } = require('../../lib/config/loader');
			const defaults = require('../../lib/config/defaults');
			const config = await loadConfig();

			// Should have default values
			expect(config.TIMEOUT).toBe(defaults.TIMEOUT);
			expect(config.CONCURRENCY).toBe(defaults.CONCURRENCY);

			// Should allow overrides (if user config has them)
			// This depends on what's in the actual config.js
		});

		test('should have all required default properties', async () => {
			const { loadConfig } = require('../../lib/config/loader');
			const config = await loadConfig();

			// Check for all critical properties
			expect(config).toHaveProperty('TIMEOUT');
			expect(config).toHaveProperty('FORCE_CLOSE_TIMEOUT');
			expect(config).toHaveProperty('CONCURRENCY');
			expect(config).toHaveProperty('MAX_FILE_SIZE');
			expect(config).toHaveProperty('MAX_DOMAINS');
			expect(config).toHaveProperty('DEAD_DOMAINS_FILE');
			expect(config).toHaveProperty('REDIRECT_DOMAINS_FILE');
			expect(config).toHaveProperty('USER_AGENT');
			expect(config).toHaveProperty('inputFile');
		});

		test('should have correct default values', async () => {
			const { loadConfig } = require('../../lib/config/loader');
			const config = await loadConfig();

			// Verify timeout is reasonable
			expect(typeof config.TIMEOUT).toBe('number');
			expect(config.TIMEOUT).toBeGreaterThan(0);

			// Verify concurrency is reasonable
			expect(typeof config.CONCURRENCY).toBe('number');
			expect(config.CONCURRENCY).toBeGreaterThan(0);
			expect(config.CONCURRENCY).toBeLessThanOrEqual(50);

			// Verify output files are strings
			expect(typeof config.DEAD_DOMAINS_FILE).toBe('string');
			expect(typeof config.REDIRECT_DOMAINS_FILE).toBe('string');
		});

		test('should load config without throwing errors', async () => {
			const { loadConfig } = require('../../lib/config/loader');

			await expect(loadConfig()).resolves.toBeDefined();
		});

		test('should return consistent config on multiple calls', async () => {
			// Clear cache
			delete require.cache[configLoaderPath];

			const { loadConfig } = require('../../lib/config/loader');

			const config1 = await loadConfig();
			const config2 = await loadConfig();

			// Should return same structure (values might differ if config changed)
			expect(Object.keys(config1).sort()).toEqual(Object.keys(config2).sort());
		});

		test('should load custom config file when path is provided', async () => {
			// Create a temporary custom config file
			const customConfigDir = path.join(__dirname, '..', 'fixtures', 'custom-config');
			const customConfigPath = path.join(customConfigDir, 'custom-config.json');

			await fs.promises.mkdir(customConfigDir, { recursive: true });

			const customConfig = {
				inputFile: 'custom-input.txt',
				testMode: true,
				addWww: true,
				concurrency: 20,
				timeout: 15,
				forceCloseTimeout: 30,
				outputFormat: 'text',
			};

			await fs.promises.writeFile(customConfigPath, JSON.stringify(customConfig, null, '\t'), 'utf8');

			try {
				const { loadConfig } = require('../../lib/config/loader');
				const config = await loadConfig(customConfigPath);

				// Should have custom values
				expect(config.inputFile).toBe('custom-input.txt');
				expect(config.testMode).toBe(true);
				expect(config.addWww).toBe(true);
				expect(config.concurrency).toBe(20);

				// Should still have default values for unspecified properties
				expect(config).toHaveProperty('FORCE_CLOSE_TIMEOUT');
				expect(config).toHaveProperty('MAX_FILE_SIZE');
			} finally {
				// Clean up
				await fs.promises.unlink(customConfigPath).catch(() => {});
				await fs.promises.rmdir(customConfigDir).catch(() => {});
			}
		});

		test('should throw error when custom config file does not exist', async () => {
			const { loadConfig } = require('../../lib/config/loader');
			const nonExistentPath = 'tests/fixtures/nonexistent/config.json';

			await expect(loadConfig(nonExistentPath)).rejects.toThrow(/Configuration file not found|ENOENT/);
		});

		test('should resolve relative custom config paths', async () => {
			// Create a temporary custom config file
			const customConfigDir = path.join(__dirname, '..', 'fixtures', 'relative-config');
			const customConfigPath = path.join(customConfigDir, 'relative-config.json');

			await fs.promises.mkdir(customConfigDir, { recursive: true });

			const customConfig = {
				inputFile: 'relative-input.txt',
				outputFormat: 'text',
				timeout: 15,
				forceCloseTimeout: 30,
				concurrency: 4,
			};

			await fs.promises.writeFile(customConfigPath, JSON.stringify(customConfig, null, '\t'), 'utf8');

			try {
				const { loadConfig } = require('../../lib/config/loader');

				// Use relative path from project root
				const relativePath = path.relative(process.cwd(), customConfigPath);
				const config = await loadConfig(relativePath);

				expect(config.inputFile).toBe('relative-input.txt');
			} finally {
				// Clean up
				await fs.promises.unlink(customConfigPath).catch(() => {});
				await fs.promises.rmdir(customConfigDir).catch(() => {});
			}
		});
	});
});
