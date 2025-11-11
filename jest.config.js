module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['lib/**/*.js', '!lib/**/*.test.js'],
	testMatch: ['**/tests/**/*.test.js'],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
	verbose: true,
};
