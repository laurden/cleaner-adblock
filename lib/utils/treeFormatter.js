/**
 * @file treeFormatter.js
 * @module treeFormatter
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

/**
 * Format domain check tree
 * @param {*} domain - Parameter domain
 * @param {*} attempts - Parameter attempts
 * @param {*} finalResult - Parameter finalResult
 * @param {*} _index - Parameter _index
 * @param {*} _total - Parameter _total
 * @returns {*} Result
 */

function formatDomainCheckTree(domain, attempts, finalResult, _index, _total) {
	const lines = [];

	// Header with first URL being checked
	const firstUrl = attempts.length > 0 ? attempts[0].url : `https://${domain}`;
	lines.push(`├── ${firstUrl}`);

	// Add each attempt as a nested item
	for (let i = 0; i < attempts.length; i++) {
		const attempt = attempts[i];
		const isLastAttempt = i === attempts.length - 1;
		const attemptPrefix = isLastAttempt ? '│   └──' : '│   ├──';

		let statusIcon = '';
		let statusText = '';

		if (attempt.success) {
			if (attempt.redirect) {
				statusIcon = '↪️';
				statusText = `➜ ${attempt.redirect}`;
			} else if (attempt.similarRedirect) {
				statusIcon = '🟢';
				statusText = `active (similar redirect: ${attempt.similarRedirect})`;
			} else {
				statusIcon = '🟢';
				statusText = `active (HTTP ${attempt.statusCode})`;
			}
		} else if (attempt.tried) {
			statusIcon = '🔴';
			// Shorten error messages to prevent truncation
			let reason = attempt.reason || 'failed';
			// Extract just the error type from messages like "net::ERR_CONNECTION_RESET at https://..."
			if (reason.includes('net::ERR_')) {
				const match = reason.match(/net::(ERR_[A-Z_]+)/);
				if (match) {
					reason = match[1].replace(/_/g, ' ').toLowerCase();
				}
			} else if (reason.includes('HTTP ')) {
				// Keep HTTP status codes short
				const match = reason.match(/HTTP (\d+)/);
				if (match) {
					reason = `HTTP ${match[1]}`;
				}
			}
			statusText = reason;
		}

		lines.push(`${attemptPrefix} ${statusIcon} ${attempt.url} ${statusText}`);
	}

	// Add final status line
	if (finalResult.type === 'dead') {
		lines.push(`└── ☠️  dead domain (saved to log)`);
	} else if (finalResult.type === 'redirect') {
		const redirectTarget = finalResult.data && finalResult.data.finalDomain ? finalResult.data.finalDomain : 'unknown';
		lines.push(`└── ↪️  redirect to ${redirectTarget} (saved to log)`);
	} else if (finalResult.type === 'inconclusive') {
		lines.push(`└── 🚫 unreachable due to possible isp block (saved to log)`);
	} else {
		lines.push(`└── ✅ active domain`);
	}

	// Add separator
	lines.push('│');

	return lines.join('\n');
}

/**
 * Format summary box
 * @param {*} stats - Parameter stats
 * @returns {*} Result
 */

function formatSummaryBox(stats) {
	const { total, dead, redirect, active, inconclusive } = stats;

	const lines = [];
	lines.push('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
	lines.push('┃           📊 SUMMARY             ┃');
	lines.push(`┃ Total domains checked : ${String(total).padStart(2)}       ┃`);
	lines.push(`┃   Dead / non-existent : ${String(dead).padStart(2)}       ┃`);
	lines.push(`┃           Redirecting : ${String(redirect).padStart(2)}       ┃`);
	lines.push(`┃          Inconclusive : ${String(inconclusive || 0).padStart(2)}       ┃`);
	lines.push(`┃    Active (no issues) : ${String(active).padStart(2)}       ┃`);
	lines.push('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

	return lines.join('\n');
}

module.exports = {
	formatDomainCheckTree,
	formatSummaryBox,
};
