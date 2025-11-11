/**
 * @file rollingOutput.js
 * @module rollingOutput
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { ROLLING_OUTPUT_MAX_LINES, ROLLING_OUTPUT_BUFFER, ROLLING_OUTPUT_ABSOLUTE_MAX } = require('../config/constants');

/**
 * Get terminal size
 * @returns {*} Result
 */

function getTerminalSize() {
	if (process.stdout && process.stdout.isTTY) {
		return {
			cols: process.stdout.columns || 80,
			rows: process.stdout.rows || 24,
		};
	}
	return { cols: 80, rows: 24 };
}

/**
 * Create rolling output
 * @param {*} opts - Parameter opts
 * @returns {*} Result
 */

function createRollingOutput(opts = {}) {
	const {
		maxLines = ROLLING_OUTPUT_MAX_LINES,
		enabled = true,
		fitToTerminal = true,
		reserveTop = 0,
		reserveBottom = 1,
		minLines = 5,
		truncateToWidth = true,
		progressBar = null,
	} = opts;

	if (!enabled) return null;

	const roller = {
		lines: [],
		maxLines,
		started: false,
		renderedCount: 0, // how many lines we drew last time
		fitToTerminal,
		reserveTop,
		reserveBottom,
		minLines,
		truncateToWidth,
		progressBar,
	};

	/**
	 * Compute max lines
	 * @returns {*} Result
	 */

	const computeMaxLines = () => {
		if (!roller.fitToTerminal) return roller.maxLines;
		const { rows } = getTerminalSize();
		const usable = Math.max(roller.minLines, rows - roller.reserveTop - roller.reserveBottom);
		return usable;
	};

	const formatLine = line => {
		if (!roller.truncateToWidth || !process.stdout.isTTY || typeof line !== 'string') {
			return line;
		}
		const { cols } = getTerminalSize();
		if (cols <= 0) return line;
		// Clear the whole line each render, so simple truncate is safe and flicker-free.
		if (line.length > cols) return line.slice(0, Math.max(1, cols));
		return line;
	};

	/**
	 * Clear rendered
	 * @returns {*} Result
	 */

	const clearRendered = () => {
		if (!roller.started || !process.stdout.isTTY || roller.renderedCount <= 0) {
			return;
		}
		process.stdout.write(`\x1b[${roller.renderedCount}A`); // up N
		for (let i = 0; i < roller.renderedCount; i++) {
			process.stdout.write('\x1b[2K'); // clear line
			process.stdout.write('\x1b[1B'); // move down
		}
		process.stdout.write(`\x1b[${roller.renderedCount}A`); // back to top
	};

	/**
	 * Render
	 * @returns {*} Result
	 */

	const render = () => {
		// Non-TTY: just print the last line normally.
		if (!process.stdout.isTTY) {
			const last = roller.lines[roller.lines.length - 1];
			if (last !== undefined) console.log(last);
			return;
		}

		// Recompute maxLines if we're fitting to terminal.
		roller.maxLines = computeMaxLines();

		// Compute the set of lines to show.
		const sliceStart = Math.max(0, roller.lines.length - roller.maxLines);
		const view = roller.lines.slice(sliceStart);

		// Clear exactly what we rendered previously (even if maxLines changed).
		clearRendered();

		// Print the new window.
		for (const raw of view) {
			const line = formatLine(raw);
			process.stdout.write(line + '\n');
		}

		// Render progress bar immediately at the bottom (no gap)
		if (roller.progressBar) {
			const { renderProgressBar } = require('./progressBar');
			const progressLine = renderProgressBar(roller.progressBar);
			process.stdout.write(formatLine(progressLine) + '\n');
			roller.renderedCount = view.length + 1; // +1 for progress bar
		} else {
			roller.renderedCount = view.length;
		}

		roller.started = true;
	};

	// Public API functions close over the helpers above:
	roller._render = render;
	roller._clearRendered = clearRendered;
	roller._computeMaxLines = computeMaxLines;

	// Auto-rerender on terminal resize.
	if (roller.fitToTerminal && process.stdout.isTTY) {
		process.stdout.on('resize', () => {
			// Re-render with new dimensions.
			render();
		});
	}

	return roller;
}

/**
 * Add line
 * @param {*} roller - Parameter roller
 * @param {*} line - Parameter line
 * @returns {*} Result
 */

function addLine(roller, line) {
	if (!roller) {
		console.log(line);
		return;
	}

	roller.lines.push(line);

	// Keep only what we might show at most; when fitToTerminal we keep a
	// small buffer above the current window size to avoid frequent shifts.
	// Enforce absolute maximum to prevent unbounded growth
	const softCap = roller.fitToTerminal
		? (roller._computeMaxLines() || roller.maxLines) + ROLLING_OUTPUT_BUFFER
		: roller.maxLines + ROLLING_OUTPUT_BUFFER;
	const hardCap = Math.min(softCap, ROLLING_OUTPUT_ABSOLUTE_MAX);

	if (roller.lines.length > hardCap) {
		roller.lines.splice(0, roller.lines.length - hardCap);
	}

	roller._render();
}

/**
 * Rerender
 * @param {*} roller - Parameter roller
 * @returns {*} Result
 */

function rerender(roller) {
	if (!roller) return;
	roller._render();
}

/**
 * Finish rolling output
 * @param {*} roller - Parameter roller
 * @returns {*} Result
 */

function finishRollingOutput(roller) {
	if (!roller || !roller.started) return;
	if (!process.stdout.isTTY) return;

	// Use the existing internal clearer (leaves us back at the TOP of the block)
	roller._clearRendered();

	// That's it - cursor is now at the top where the rolling output started
	// No gap is left because we didn't move down

	// reset the roller
	roller.started = false;
	roller.renderedCount = 0;
}

module.exports = {
	createRollingOutput,
	addLine,
	rerender,
	finishRollingOutput,
};
