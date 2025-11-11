#!/usr/bin/env node
/**
 * Cleaner-Adblock - Domain Scanner for Adblock Filter Lists
 * Backward compatibility wrapper
 *
 * This file now simply calls the modularised code in src/index.js
 * The main implementation has been split into multiple modules for better maintainability.
 */

require('./src/index.js');
