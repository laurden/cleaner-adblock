# Tests

This directory contains automated tests for the cleaner-adblock project.

## Structure

```
tests/
├── unit/              # Unit tests for individual functions
│   └── validators.test.js
├── integration/       # Integration tests (to be added)
└── fixtures/          # Test data
    └── sample-rules.txt
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage Goals

- **Unit Tests**: All utility functions (validators, parsers, domain extractors)
- **Integration Tests**: End-to-end domain checking workflows
- **Edge Cases**: Invalid inputs, malformed rules, network errors

## Writing Tests

When adding new functionality:

1. Create corresponding unit tests in `tests/unit/`
2. Add test fixtures in `tests/fixtures/` if needed
3. Ensure tests are isolated and don't depend on external state
4. Mock Puppeteer for browser-related tests

## Current Status

⚠️ **Tests are scaffolded but not yet fully implemented**

The test structure is in place. Full implementation will occur after code modularization is complete, which will make functions easier to test in isolation.

## Next Steps

1. ⏳ Pending: Modularize main code
1. ⏳ Pending: Implement unit tests
2. ⏳ Pending: Add integration tests
4. ⏳ Pending: Achieve 80%+ code coverage
