#!/usr/bin/env node
/**
 * Cleaner-Adblock - Domain Scanner for Adblock Filter Lists
 * Backward compatibility wrapper
 *
 * This file now simply calls the modularised code in lib/main.js
 * The main implementation has been split into multiple modules for better maintainability.
 */

const main = require('./lib/main.js');

// Execute main function
main().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});
