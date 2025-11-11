/**
 * Progress bar utilities using cli-progress
 */

const cliProgress = require('cli-progress');

/**
 * Create and start a progress bar
 * @param {number} total - Total number of items
 * @param {boolean} enabled - Whether progress bar is enabled
 * @param {boolean} quietMode - Quiet mode (no console output)
 * @returns {Object|null} Progress bar instance or null if disabled
 */
function createProgressBar(total, enabled = false, quietMode = false) {
	// Don't show progress bar if disabled or in quiet mode
	if (!enabled || quietMode) {
		return null;
	}

	const bar = new cliProgress.SingleBar(
		{
			format: 'Progress |{bar}| {percentage}% | {value}/{total} | {eta_formatted} remaining',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			hideCursor: true,
		},
		cliProgress.Presets.shades_classic
	);

	bar.start(total, 0);
	return bar;
}

/**
 * Update progress bar
 * @param {Object|null} bar - Progress bar instance
 * @param {number} value - Current value
 */
function updateProgress(bar, value) {
	if (bar) {
		bar.update(value);
	}
}

/**
 * Increment progress bar by 1
 * @param {Object|null} bar - Progress bar instance
 */
function incrementProgress(bar) {
	if (bar) {
		bar.increment();
	}
}

/**
 * Stop and remove progress bar
 * @param {Object|null} bar - Progress bar instance
 */
function stopProgress(bar) {
	if (bar) {
		bar.stop();
	}
}

module.exports = {
	createProgressBar,
	updateProgress,
	incrementProgress,
	stopProgress,
};
