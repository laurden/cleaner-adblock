/**
 * @file progressBar.js
 * @module progressBar
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { PROGRESS_BAR_WIDTH } = require('../config/constants');

/**
 * Create progress bar
 * @param {*} total - Parameter total
 * @param {*} enabled - Parameter enabled
 * @param {*} quietMode - Parameter quietMode
 * @returns {*} Result
 */

function createProgressBar(total, enabled = false, quietMode = false) {
	// Don't show progress bar if disabled or in quiet mode
	if (!enabled || quietMode) {
		return null;
	}

	return {
		total,
		current: 0,
		started: false,
	};
}

/**
 * Render progress bar
 * @param {*} bar - Parameter bar
 * @returns {*} Result
 */

function renderProgressBar(bar) {
	if (!bar) {
		return '';
	}

	const percentage = Math.floor((bar.current / bar.total) * 100);
	const barWidth = PROGRESS_BAR_WIDTH;
	const filledWidth = Math.floor((bar.current / bar.total) * barWidth);

	const filledBar = '█'.repeat(filledWidth);
	const emptyBar = '░'.repeat(barWidth - filledWidth);

	const eta = calculateETA(bar);
	const etaStr = eta > 0 ? ` | ${formatTime(eta)} remaining` : '';

	return `Progress |${filledBar}${emptyBar}| ${percentage}% | ${bar.current}/${bar.total}${etaStr}`;
}

/**
 * Calculate e t a
 * @param {*} bar - Parameter bar
 * @returns {*} Result
 */

function calculateETA(bar) {
	if (!bar.startTime || bar.current === 0) {
		return 0;
	}

	const elapsed = (Date.now() - bar.startTime) / 1000; // seconds
	const rate = bar.current / elapsed;
	const remaining = bar.total - bar.current;

	return rate > 0 ? Math.ceil(remaining / rate) : 0;
}

/**
 * Format time
 * @param {*} seconds - Parameter seconds
 * @returns {*} Result
 */

function formatTime(seconds) {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes}m ${secs}s`;
}

/**
 * Update progress
 * @param {*} bar - Parameter bar
 * @param {*} value - Parameter value
 * @returns {*} Result
 */

function updateProgress(bar, value) {
	if (bar) {
		if (!bar.started) {
			bar.startTime = Date.now();
			bar.started = true;
		}
		bar.current = value;
	}
}

/**
 * Increment progress
 * @param {*} bar - Parameter bar
 * @returns {*} Result
 */

function incrementProgress(bar) {
	if (bar) {
		if (!bar.started) {
			bar.startTime = Date.now();
			bar.started = true;
		}
		bar.current++;
	}
}

/**
 * Stop progress
 * @param {*} bar - Parameter bar
 * @returns {*} Result
 */

function stopProgress(bar) {
	if (bar) {
		bar.started = false;
	}
}

module.exports = {
	createProgressBar,
	updateProgress,
	incrementProgress,
	stopProgress,
	renderProgressBar,
};
