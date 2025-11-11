/**
 * @file schema.js
 * @module schema
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const Joi = require('joi');

const configSchema = Joi.object({
	// Input/Output
	inputFile: Joi.string().required(),
	outputFormat: Joi.string().valid('text', 'json', 'csv', 'all').default('text'),

	// Domain checking options
	addWww: Joi.boolean().default(false),
	ignoreSimilar: Joi.boolean().default(false),

	// Timing
	timeout: Joi.number().integer().min(1).max(300).default(30),
	forceCloseTimeout: Joi.number().integer().min(1).max(600).default(60),

	// Concurrency
	concurrency: Joi.number().integer().min(1).max(50).default(12),

	// Test mode
	testMode: Joi.boolean().default(false),
	testCount: Joi.number().integer().min(1).max(10000).default(5),

	// Debug options
	debug: Joi.boolean().default(false),
	debugLevel: Joi.alternatives()
		.try(
			Joi.string().valid('verbose', 'network', 'browser', 'all'),
			Joi.array().items(Joi.string().valid('verbose', 'network', 'browser')),
			Joi.valid(null)
		)
		.optional(),
	debugVerbose: Joi.boolean().default(false),
	debugNetwork: Joi.boolean().default(false),
	debugBrowser: Joi.boolean().default(false),

	// Output options
	includeTimestamp: Joi.boolean().default(true),
	outputStatistics: Joi.boolean().default(false),
	quietMode: Joi.boolean().default(false),

	// Security options
	disableSandbox: Joi.boolean().default(false),
	disableSandboxPlease: Joi.boolean().default(false),
	httpsOnly: Joi.boolean().default(false),

	// Rate limiting (new)
	maxRequestsPerMinute: Joi.number().integer().min(1).max(10000).default(600),
	maxDomains: Joi.number().integer().min(1).max(1000000).default(100000),

	// Filtering
	excludeDomains: Joi.array().items(Joi.string()).optional(),
	includeDomains: Joi.array().items(Joi.string()).optional(),
	excludePatterns: Joi.array().items(Joi.string()).optional(),

	// Output file paths (optional overrides)
	deadDomainsFile: Joi.string().optional(),
	redirectDomainsFile: Joi.string().optional(),
	inconclusiveDomainsFile: Joi.string().optional(),

	// Advanced options
	browserArgs: Joi.array().items(Joi.string()).optional(),
	userAgent: Joi.string().optional(),
	retryFailedDomains: Joi.boolean().optional(),
	maxRetries: Joi.number().integer().min(0).max(5).optional(),
})
	.pattern(/^_/, Joi.any()) // Allow fields starting with _ for comments
	.unknown(false); // Reject unknown keys for security

module.exports = {
	configSchema,
};
