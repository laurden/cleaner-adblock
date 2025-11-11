/**
 * @file validators.js
 * @module validators
 * @description Part of the Cleaner-Adblock domain scanner utility
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
 * Validate file path
 * @param {*} filePath - Parameter filePath
 * @returns {*} Result
 */

function validateFilePath(filePath) {
	// Security: Reject absolute paths outright
	if (path.isAbsolute(filePath)) {
		throw new Error('Absolute paths are not allowed for security reasons');
	}

	// Normalize the path
	const normalized = path.normalize(filePath);

	// Check for path traversal attempts before resolution
	if (normalized.includes('..')) {
		throw new Error('Path traversal is not allowed');
	}

	// Resolve against current working directory
	const resolved = path.resolve(process.cwd(), normalized);
	const cwd = process.cwd();

	// Strict check: resolved path must be within CWD
	// Use path.sep to ensure proper directory boundary checking
	if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
		throw new Error(`Path must be within current directory: ${filePath}`);
	}

	return normalized;
}

/**
 * Validate test count
 * @param {*} count - Parameter count
 * @returns {*} Result
 */

function validateTestCount(count) {
	const num = parseInt(count, 10);
	if (isNaN(num) || num < MIN_TEST_COUNT || num > MAX_TEST_COUNT) {
		throw new Error(`Test count must be between ${MIN_TEST_COUNT} and ${MAX_TEST_COUNT}`);
	}
	return num;
}

/**
 * Validate concurrency
 * @param {*} value - Parameter value
 * @returns {*} Result
 */

function validateConcurrency(value) {
	const num = parseInt(value, 10);
	if (isNaN(num) || num < MIN_CONCURRENCY || num > MAX_CONCURRENCY) {
		throw new Error(`Concurrency must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}`);
	}
	return num;
}

/**
 * Validate timeout
 * @param {*} value - Parameter value
 * @returns {*} Result
 */

function validateTimeout(value) {
	const num = parseInt(value, 10);
	if (isNaN(num) || num < MIN_TIMEOUT || num > MAX_TIMEOUT) {
		throw new Error(`Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} seconds`);
	}
	// Convert seconds to milliseconds
	return num * 1000;
}

/**
 * Is valid domain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
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
