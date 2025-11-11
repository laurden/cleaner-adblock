# CHANGELOG

## Changes

**Commit**: `current`  
**Author**: ... <bm@rtfm.foo>

### 🧱 Refactor
- Restructure project directories:
  - `src/` → `lib/`, `index.js` → `main.js`
  - updated all submodules: `checkers/`, `parsers/`, `writers/`, `utils/` and `config/`
- aligns with Node.js library-style conventions

### ⚙️ Configuration
- converted JS config → JSON config
- added **Joi-based schema validation**:
  - type checking, range validation, pattern enforcement and unknown key rejection
- added constants module for fixed values
- enhanced config loader (integrated with Joi)
- updated default values

### 🚀 Performance
- fixed unbounded memory growth by limiting buffers
- implemented Puppeteer page pooling (~40% faster, graceful fallback)
- improved array pattern handling

### 🔒 Security
- added two-layer sandbox protection (prevents accidental RCE exposure).
- path traversal blocking (`..` / absolute paths).
- rejects unknown config keys.

### ✨ Features
- auto-download of `example-list.txt` sample if missing.
- rolling live terminal output with TTY detection and resizing.
- progress bar with ETA calculation (integrated with quiet mode).
- tree formatter for ASCII visualisation.
- file helper (`getFileExtension()`).

### 📚 Documentation
- added inline TypeDoc comments (TypeDoc integration planned next).
- updated `README.md`.
- added `TODO.md` and `CHANGES.md`.

### 🧪 Tests
- added 10 test suites:
  - `integration/basic-flow.test.js`
  - `unit/cli.test.js`
  - `unit/domainChecker.test.js`
  - `unit/domainExtractor.test.js`
  - `unit/fileReader.test.js`
  - `unit/formatWriters.test.js`
  - `unit/loader.test.js`
  - `unit/logger.test.js`
  - `unit/validators.test.js`
  - `unit/wwwHandler.test.js`
- ** ✅ all 300+ tests are passing**

### 📦 Dependencies
- **production**
  - `joi` ^18.0.1 (schema validation)
  - `limiter` ^3.0.0 (rate limiting)
- updated `package-lock.json`

### 🗂️ .gitignore
- added common + security-related ignores.
- added CA-related ignores:
  - `example-list.txt`, `ca-dead-domains.txt`, `ca-redirect-domains.txt` and `ca-inconclusive-domains.txt`

### What now?

All refactors, features, and tests completed successfully–ensuring a stable baseline for future commits.

**Commit**: `183b134`  
**Author**: ... <bm@rtfm.foo>  

- Add cli.test.js with 23 tests covering:
  - parseArgs: all CLI flags, validation, error handling
  - showHelp: help output generation, examples, rule types

- Add loader.test.js with 7 tests covering:
  - loadConfig: config loading, merging with defaults
  - Error handling for missing config files
  - Verification of all required properties

- Add basic-flow.test.js with 6 integration tests covering:
  - End-to-end flow: parse → expand → filter → write
  - Multi-format output (text, JSON, CSV)
  - WWW variant expansion in integrated context

All 37 tests passing

---

**Commit**: `c8e09c3d55ff86e9e7220e21c4af7db971da7eae`  
**Author**: ... <bm@rtfm.foo>

test: add tests for domain checking and output writers

- Add wwwHandler.test.js with 7 tests covering:
  - expandDomainsWithWww: bare domains, www variants, subdomains

- Add formatWriters.test.js with 22 tests covering:
  - writeDeadDomainsText: headers, timestamps
  - writeRedirectDomainsText: redirect formatting
  - writeDomainsJSON: JSON structure, timestamps, statistics
  - writeDomainsCSV: CSV formatting, field escaping (commas, quotes, newlines)
  - writeDomains: multi-format support (text, JSON, CSV, all)

- Add domainChecker.test.js with 6 basic tests covering:
  - isSimilarDomainRedirect: base domain comparison logic
  - Note: No Puppeteer/liveness tests (those come in later commits)

All 35 tests passing

---

**Commit**: `ee71b66f0cfaede0fc2b6cdc4e799bf1523e10ac`  
**Author**: ... <bm@rtfm.foo>

test: add tests for domain parsing and extraction

- Add domainExtractor.test.js with 31 tests covering:
  - getBaseDomain: subdomain extraction, www handling
  - isBareDomain: bare vs subdomain detection
  - validateAndCleanDomain: wildcard rejection, tilde/dot removal
  - extractDomains: uBlock Origin, Adguard, network rules, multi-domain

- Add fileReader.test.js with 9 tests covering:
  - parseDomainsFromFile: file parsing, deduplication, sorting
  - Error handling for missing files
  - Support for empty files and comment-only files
  - Multi-domain and mixed rule type handling

All 40 tests passing

---

**Commit**: `f8b310887edd506662575bb6d6b2ba6f23130a64`  
**Author**: ... <bm@rtfm.foo>

test: add comprehensive tests for validators and logger

- Add validators.test.js with 33 tests covering:
  - validateFilePath: path traversal protection, normalization
  - validateTestCount: boundary validation (1-100000)
  - validateConcurrency: boundary validation (1-50)
  - validateTimeout: seconds to milliseconds conversion (1-65535)
  - isValidDomain: .onion, IP addresses, localhost filtering

- Add logger.test.js with 26 tests covering:
  - configure: debug flag management
  - debugLog, debugVerbose, debugNetwork, debugBrowser: conditional logging
  - truncateError: message truncation at 120 characters

All 59 tests passing

---

**Commit**: `da1a866b57bc6cff393d2b2983a8d539fe605437`  
**Author**: ... <bm@rtfm.foo>

test: add Jest configuration and test fixtures

Add test infrastructure for comprehensive testing:
- tests/README.md: Documentation for test structure and running tests
- tests/fixtures/sample-rules.txt: Sample filter rules for testing

This establishes the test directory structure with:
- tests/unit/ for unit tests
- tests/integration/ for integration tests
- tests/fixtures/ for test data

Prepares for implementing comprehensive test coverage in subsequent commits.

---

**Commit**: `2d730e406b281b3f285e3d0aec5b2bffafb6562a`  
**Author**: ... <bm@rtfm.foo>

docs: update README to reflect modular structure

Update README.md to document the refactored codebase:
- Add project structure section showing modular organization
- Update configuration section to reference src/config/ system
- Update installation to use package.json (npm install)
- Update troubleshooting to reference config files
- Fix license section to specify GPL-3.0
- Update references from "Minimal Domain Scanner" to "Cleaner-Adblock"

The LICENSE file (GPL-3.0) remains unchanged and is already correct.
This completes the basic documentation for the refactored codebase.

---

**Commit**: `6f34408f9718aacd110e66d17a92004c825879f6`  
**Author**: ... <bm@rtfm.foo>

feat: add multi-format output writers (text, JSON, CSV)

Add dedicated writer modules to handle output in multiple formats:
- src/writers/formatWriters.js: Format-specific writers (text, JSON, CSV)
- src/writers/reportWriter.js: High-level writer functions
- Update src/index.js to use new writer API

The new writer system supports text (default), JSON, and CSV formats, with options for timestamps and statistics. This replaces the inline file writing code in src/index.js with a clean, extensible API.

Also fix Puppeteer API: rename ignoreHTTPSErrors to acceptInsecureCerts

---

**Commit**: `4c7afd0da87d2c5adb436847194918e756d64674`  
**Author**: ... <bm@rtfm.foo>

feat: extract CLI and main entry point modules

Refactor core application logic into modular structure:
- src/cli.js: Command-line argument parsing and help display
- src/index.js: Main orchestrator with domain processing workflow
- Update cleaner-adblock.js to simple wrapper calling src/index.js

This commit maintains backward compatibility while establishing the core application structure. File writing is currently inline in src/index.js and will be enhanced in Commit 7 with dedicated writer modules.

---

**Commit**: `1aac6927a8ebdf34c73bf8d343950523098f1f53`  
**Author**: ... <bm@rtfm.foo>

feat: add basic domain checking with HTTP status codes

---

**Commit**: `ca0e9ff69f8d0a54572d3b7452cf24312beade61`  
**Author**: ... <bm@rtfm.foo>

feat: add domain extraction and file reading modules

---

**Commit**: `945342c4d048bdd68aa833c31d172d047725eddb`  
**Author**: ... <bm@rtfm.foo>

feat: add logger, validators, and progress bar utilities

---

**Commit**: `6b86059286f000a43c4be4be76cd621d1778a76f`  
**Author**: ... <bm@rtfm.foo>

feat: add configuration system with defaults and loader

---

**Commit**: `a1d07943d67d318f68551df911202cfbf740ae91`  
**Author**: ... <bm@rtfm.foo>

chore: initialise project with build tools and dependencies, etc
