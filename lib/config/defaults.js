/**
 * @file defaults.js
 * @module defaults
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

// Timing configuration (in seconds - converted to milliseconds by loader)
/** @constant {*} TIMEOUT - timeout */

const TIMEOUT = 30; // 30 second timeout for page loads
/** @constant {*} FORCE_CLOSE_TIMEOUT - force close timeout */

const FORCE_CLOSE_TIMEOUT = 30; // 60 second fallback to force-close any tab

// Performance configuration
/** @constant {*} CONCURRENCY - concurrency */

const CONCURRENCY = 12; // Number of concurrent checks
/** @constant {*} MAX_FILE_SIZE - max file size */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size
/** @constant {*} MAX_DOMAINS - max domains */

const MAX_DOMAINS = 100000; // Maximum number of domains to process

// Security configuration
/** @constant {*} DISABLE_SANDBOX - disable sandbox */

const DISABLE_SANDBOX = false; // Browser sandbox (should NEVER be true in production)
/** @constant {*} HTTPS_ONLY - https only */

const HTTPS_ONLY = false; // Only use HTTPS (no HTTP fallback)

// Rate limiting configuration
/** @constant {*} MAX_REQUESTS_PER_MINUTE - max requests per minute */

const MAX_REQUESTS_PER_MINUTE = 600; // Maximum requests per minute
/** @constant {*} MAX_VARIANT_ATTEMPTS - max variant attempts */

const MAX_VARIANT_ATTEMPTS = 1; // Maximum URL variant attempts per domain
/** @constant {*} MAX_RETRIES_PER_ERROR_TYPE - max retries per error type */

const MAX_RETRIES_PER_ERROR_TYPE = 1; // Maximum retries for same error type

// Output files
/** @constant {*} DEAD_DOMAINS_FILE - dead domains file */

const DEAD_DOMAINS_FILE = 'ca-dead-domains.txt';
/** @constant {*} REDIRECT_DOMAINS_FILE - redirect domains file */

const REDIRECT_DOMAINS_FILE = 'ca-redirect-domains.txt';
/** @constant {*} INCONCLUSIVE_DOMAINS_FILE - inconclusive domains file */

const INCONCLUSIVE_DOMAINS_FILE = 'ca-inconclusive-domains.txt';

// Custom User Agent - Chrome on Windows
/** @constant {*} USER_AGENT - user agent */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Domain validation constants
/** @constant {*} MIN_DOMAIN_LENGTH - min domain length */

const MIN_DOMAIN_LENGTH = 4;
/** @constant {*} MAX_ERROR_MESSAGE_LENGTH - max error message length */

const MAX_ERROR_MESSAGE_LENGTH = 120;
/** @constant {*} BARE_DOMAIN_DOT_COUNT - bare domain dot count */

const BARE_DOMAIN_DOT_COUNT = 1;

// Validation limits
/** @constant {*} MIN_TEST_COUNT - min test count */

const MIN_TEST_COUNT = 1;
/** @constant {*} MAX_TEST_COUNT - max test count */

const MAX_TEST_COUNT = 100000;
/** @constant {*} MIN_CONCURRENCY - min concurrency */

const MIN_CONCURRENCY = 1;
/** @constant {*} MAX_CONCURRENCY - max concurrency */

const MAX_CONCURRENCY = 50;
/** @constant {*} MIN_TIMEOUT - min timeout */

const MIN_TIMEOUT = 1; // 1 second minimum
/** @constant {*} MAX_TIMEOUT - max timeout */

const MAX_TIMEOUT = 65535; // 2^16 - 1 seconds maximum

// Default values
/** @constant {*} DEFAULT_INPUT_FILE - default input file */

const DEFAULT_INPUT_FILE = 'example-list.txt';
/** @constant {*} DEFAULT_TEST_COUNT - default test count */

const DEFAULT_TEST_COUNT = 5;

module.exports = {
	TIMEOUT,
	FORCE_CLOSE_TIMEOUT,
	CONCURRENCY,
	MAX_FILE_SIZE,
	MAX_DOMAINS,
	DEAD_DOMAINS_FILE,
	REDIRECT_DOMAINS_FILE,
	INCONCLUSIVE_DOMAINS_FILE,
	USER_AGENT,
	MIN_DOMAIN_LENGTH,
	MAX_ERROR_MESSAGE_LENGTH,
	BARE_DOMAIN_DOT_COUNT,
	MIN_TEST_COUNT,
	MAX_TEST_COUNT,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	MIN_TIMEOUT,
	MAX_TIMEOUT,
	DEFAULT_INPUT_FILE,
	DEFAULT_TEST_COUNT,
	DISABLE_SANDBOX,
	HTTPS_ONLY,
	MAX_REQUESTS_PER_MINUTE,
	MAX_VARIANT_ATTEMPTS,
	MAX_RETRIES_PER_ERROR_TYPE,
};
