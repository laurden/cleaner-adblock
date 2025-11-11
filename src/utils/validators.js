/**
 * Input validation utilities
 */

const path = require('path');
const {
	MIN_TEST_COUNT,
	MAX_TEST_COUNT,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	MIN_TIMEOUT,
	MAX_TIMEOUT,
	MIN_DOMAIN_LENGTH,
} = require('../config/defaults');

/**
 * Validates and normalizes file paths to prevent path traversal attacks
 * @param {string} filePath - The file path to validate
 * @returns {string} Normalized file path
 * @throws {Error} If path is invalid or contains traversal attempts
 */
function validateFilePath(filePath) {
	// Normalize path to prevent path traversal
	const normalized = path.normalize(filePath);

	// Check for path traversal attempts
	if (normalized.includes('..')) {
		throw new Error('Path traversal is not allowed');
	}

	// Ensure path is not absolute to system directories
	const resolvedPath = path.resolve(normalized);
	const cwd = process.cwd();

	// Allow paths in current directory or explicitly specified absolute paths
	// This prevents accessing system directories unintentionally
	if (!resolvedPath.startsWith(cwd) && !path.isAbsolute(filePath)) {
		throw new Error(`Access denied: ${filePath}`);
	}

	return normalized;
}

/**
 * Validates test count parameter
 * @param {string|number} count - The test count to validate
 * @returns {number} Validated test count
 * @throws {Error} If count is invalid
 */
function validateTestCount(count) {
	const num = parseInt(count);
	if (isNaN(num) || num < MIN_TEST_COUNT || num > MAX_TEST_COUNT) {
		throw new Error(`Test count must be between ${MIN_TEST_COUNT} and ${MAX_TEST_COUNT}`);
	}
	return num;
}

/**
 * Validates concurrency parameter
 * @param {string|number} value - The concurrency value to validate
 * @returns {number} Validated concurrency value
 * @throws {Error} If value is invalid
 */
function validateConcurrency(value) {
	const num = parseInt(value);
	if (isNaN(num) || num < MIN_CONCURRENCY || num > MAX_CONCURRENCY) {
		throw new Error(`Concurrency must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}`);
	}
	return num;
}

/**
 * Validates timeout parameter
 * @param {string|number} value - The timeout value in seconds to validate
 * @returns {number} Validated timeout value in milliseconds
 * @throws {Error} If value is invalid
 */
function validateTimeout(value) {
	const num = parseInt(value);
	if (isNaN(num) || num < MIN_TIMEOUT || num > MAX_TIMEOUT) {
		throw new Error(`Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} seconds`);
	}
	// Convert seconds to milliseconds
	return num * 1000;
}

/**
 * Checks if domain is valid (not .onion, IP address, or localhost)
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if domain is valid
 */
function isValidDomain(domain) {
	// Skip .onion domains (Tor hidden services)
	if (domain.endsWith('.onion')) {
		return false;
	}

	// Skip IP addresses (IPv4)
	const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Pattern.test(domain)) {
		return false;
	}

	// Skip IPv6 addresses (simplified check)
	if (domain.includes(':')) {
		return false;
	}

	// Skip localhost
	if (domain === 'localhost' || domain === '127.0.0.1') {
		return false;
	}

	// Check minimum length
	if (domain.length < MIN_DOMAIN_LENGTH) {
		return false;
	}

	return true;
}

module.exports = {
	validateFilePath,
	validateTestCount,
	validateConcurrency,
	validateTimeout,
	isValidDomain,
};
