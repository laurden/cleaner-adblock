/**
 * Configuration constants for cleaner-adblock
 */

// Timing configuration
const TIMEOUT = 30000; // 30 second timeout for page loads
const FORCE_CLOSE_TIMEOUT = 60000; // 60 second fallback to force-close any tab

// Performance configuration
const CONCURRENCY = 12; // Number of concurrent checks
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size
const MAX_DOMAINS = 100000; // Maximum number of domains to process

// Output files
const DEAD_DOMAINS_FILE = 'dead_domains.txt';
const REDIRECT_DOMAINS_FILE = 'redirect_domains.txt';

// Custom User Agent - Chrome on Windows
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Domain validation constants
const MIN_DOMAIN_LENGTH = 3;
const MAX_ERROR_MESSAGE_LENGTH = 120;
const BARE_DOMAIN_DOT_COUNT = 1;

// Validation limits
const MIN_TEST_COUNT = 1;
const MAX_TEST_COUNT = 100000;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 50;
const MIN_TIMEOUT = 1; // 1 second minimum
const MAX_TIMEOUT = 65535; // 2^16 - 1 seconds maximum

// Default values
const DEFAULT_INPUT_FILE = 'easylist_specific_hide.txt';
const DEFAULT_TEST_COUNT = 5;

module.exports = {
	TIMEOUT,
	FORCE_CLOSE_TIMEOUT,
	CONCURRENCY,
	MAX_FILE_SIZE,
	MAX_DOMAINS,
	DEAD_DOMAINS_FILE,
	REDIRECT_DOMAINS_FILE,
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
};
