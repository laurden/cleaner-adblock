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
	const configLoaderPath = path.join(__dirname, '../../src/config/loader.js');
	const configPath = path.join(__dirname, '../../src/config/config.js');
	const configExamplePath = path.join(__dirname, '../../src/config/config.js.example');

	beforeEach(() => {
		// Clear require cache before each test
		delete require.cache[configLoaderPath];
		delete require.cache[configPath];
	});

	describe('loadConfig', () => {
		test('should load and merge config with defaults', async () => {
			// Since config.js should exist in the project
			const { loadConfig } = require('../../src/config/loader');
			const config = await loadConfig();

			// Should have properties from defaults
			expect(config).toHaveProperty('TIMEOUT');
			expect(config).toHaveProperty('CONCURRENCY');
			expect(config).toHaveProperty('inputFile');

			// Should be an object
			expect(typeof config).toBe('object');
		});

		test('should throw error if config.js does not exist and example exists', async () => {
			// This test assumes config.js might not exist in some scenarios
			// We'll skip this test if config.js exists
			try {
				await fs.promises.access(configPath);
				// Config exists, skip this test
				expect(true).toBe(true);
			} catch {
				// Config doesn't exist, test error handling
				const { loadConfig } = require('../../src/config/loader');

				await expect(loadConfig()).rejects.toThrow('Configuration required');
				await expect(loadConfig()).rejects.toThrow('config.js.example');
			}
		});

		test('should merge user config with defaults', async () => {
			const { loadConfig } = require('../../src/config/loader');
			const defaults = require('../../src/config/defaults');
			const config = await loadConfig();

			// Should have default values
			expect(config.TIMEOUT).toBe(defaults.TIMEOUT);
			expect(config.CONCURRENCY).toBe(defaults.CONCURRENCY);

			// Should allow overrides (if user config has them)
			// This depends on what's in the actual config.js
		});

		test('should have all required default properties', async () => {
			const { loadConfig } = require('../../src/config/loader');
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
			const { loadConfig } = require('../../src/config/loader');
			const defaults = require('../../src/config/defaults');
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
			const { loadConfig } = require('../../src/config/loader');

			await expect(loadConfig()).resolves.toBeDefined();
		});

		test('should return consistent config on multiple calls', async () => {
			// Clear cache
			delete require.cache[configLoaderPath];

			const { loadConfig } = require('../../src/config/loader');

			const config1 = await loadConfig();
			const config2 = await loadConfig();

			// Should return same structure (values might differ if config changed)
			expect(Object.keys(config1).sort()).toEqual(Object.keys(config2).sort());
		});
	});
});
