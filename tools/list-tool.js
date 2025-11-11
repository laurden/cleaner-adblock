#!/usr/bin/env node

/**
 * * Cross-platform interactive downloader for EasyList / EasyPrivacy / Fanboy lists.
 * - Works in macOS/Linux terminals and Windows PowerShell/Command Prompt.
 * - Prefers OS built-ins: curl -> wget (POSIX), curl -> PowerShell Invoke-WebRequest (Windows).
 * - Falls back to Node https if needed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');
const https = require('https');
const http = require('http');

// ====== UI helpers ======
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const HEADER = String.raw`████████╗███████╗███████╗████████╗██╗███╗   ██╗ ██████╗     ████████╗ ██████╗  ██████╗ ██╗      ██╗███████╗██╗ 
╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║████╗  ██║██╔════╝     ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔╝██╔════╝╚██╗
   ██║   █████╗  ███████╗   ██║   ██║██╔██╗ ██║██║  ███╗       ██║   ██║   ██║██║   ██║██║     ██║ ███████╗ ██║
   ██║   ██╔══╝  ╚════██║   ██║   ██║██║╚██╗██║██║   ██║       ██║   ██║   ██║██║   ██║██║     ██║ ╚════██║ ██║
   ██║   ███████╗███████║   ██║   ██║██║ ╚████║╚██████╔╝       ██║   ╚██████╔╝╚██████╔╝███████╗╚██╗███████║██╔╝
   ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝        ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝ ╚═╝╚══════╝╚═╝ 
                                                                                                               
created to assist in downloading lists for testing`;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const CATEGORIES = {
	EasyList: [
		{
			label: 'EasyList',
			url: 'https://easylist.to/easylist/easylist.txt',
			filename: 'easylist.txt',
		},
		{
			label: 'EasyList Cookie',
			url: 'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
			filename: 'fanboy-cookiemonster.txt',
		},
	],
	EasyPrivacy: [
		{
			label: 'EasyPrivacy',
			url: 'https://easylist.to/easylist/easyprivacy.txt',
			filename: 'easyprivacy.txt',
		},
	],
	Fanboy: [
		{
			label: 'Agegate',
			url: 'https://fanboy.co.nz/fanboy-agegate.txt',
			filename: 'fanboy-agegate.txt',
		},
		{
			label: 'Annoyance(s)',
			url: 'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
			filename: 'fanboy-annoyance.txt',
		},
		{
			label: 'Anti-Facebook Filters',
			url: 'https://fanboy.co.nz/fanboy-antifacebook.txt',
			filename: 'fanboy-antifacebook.txt',
		},
		{
			label: 'Social',
			url: 'https://easylist.to/easylist/fanboy-social.txt',
			filename: 'fanboy-social.txt',
		},
	],
};

const isWindows = process.platform === 'win32';

function commandExists(cmd) {
	try {
		if (isWindows) {
			const res = spawnSync('where', [cmd], {
				stdio: 'ignore',
				shell: true,
			});
			return res.status === 0;
		} else {
			const res = spawnSync('command', ['-v', cmd], {
				stdio: 'ignore',
				shell: true,
			});
			return res.status === 0;
		}
	} catch {
		return false;
	}
}

function downloadWithCurl(url, destPath) {
	const args = ['-L', '-f', '-o', destPath, url];
	const result = spawnSync('curl', args, {
		stdio: 'inherit',
		shell: true,
	});
	return result.status === 0;
}

function downloadWithWget(url, destPath) {
	const args = ['-q', '-O', destPath, url];
	const result = spawnSync('wget', args, {
		stdio: 'inherit',
		shell: true,
	});
	return result.status === 0;
}

function downloadWithPowershell(url, destPath) {
	// handles old PS and newer; UseBasicParsing avoids IE engine dependency.
	const psCmd = `try { Invoke-WebRequest -Uri '${url.replace(/'/g, "''")}' -OutFile '${destPath.replace(/'/g, "''")}' -UseBasicParsing -ErrorAction Stop } catch { exit 1 }`;
	const result = spawnSync('powershell', ['-NoProfile', '-Command', psCmd], {
		stdio: 'inherit',
		shell: true,
	});
	return result.status === 0;
}

function downloadWithNode(url, destPath) {
	return new Promise(resolve => {
		const file = fs.createWriteStream(destPath);
		const client = url.startsWith('https') ? https : http;

		const req = client.get(url, res => {
			if (res.statusCode && res.statusCode >= 400) {
				file.close(() => fs.unlink(destPath, () => resolve(false)));
				return;
			}
			res.pipe(file);
			file.on('finish', () => file.close(() => resolve(true)));
		});

		req.on('error', () => {
			file.close(() => fs.unlink(destPath, () => resolve(false)));
		});
	});
}

async function smartDownload(url, destPath) {
	// prefer OS built-ins first
	if (commandExists('curl')) {
		if (downloadWithCurl(url, destPath)) return true;
	}
	if (!isWindows && commandExists('wget')) {
		if (downloadWithWget(url, destPath)) return true;
	}
	if (isWindows) {
		// on modern Windows, curl usually exists; if not, try PowerShell
		if (downloadWithPowershell(url, destPath)) return true;
	}
	// fallback to pure Node
	return await downloadWithNode(url, destPath);
}

function stripHeadersAndComments(text) {
	// Rules:
	//  - remove lines starting with "!" (comments) anywhere
	//  - remove lines like "[Adblock Plus 2.0]" (or any bracket header) anywhere
	//  - remove empty/whitespace-only lines
	//
	// Keep all other lines (actual filter rules), this also drops section separators of "!" dashes
	const lines = text.split(/\r?\n/);
	return lines.map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('!') && !/^\[.*\]$/.test(l));
}

function sampleN(lines, n) {
	// Fisher-Yates shuffle up to n; avoid full shuffle
	if (lines.length <= n) return lines.slice();
	// sampling
	const reservoir = lines.slice(0, n);
	for (let i = n; i < lines.length; i++) {
		const j = Math.floor(Math.random() * (i + 1));
		if (j < n) reservoir[j] = lines[i];
	}
	return reservoir;
}

function ask(question) {
	return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

function showMainMenu() {
	console.log();
	console.log(`${BOLD}[1]${RESET} Download EasyList, EasyPrivacy and Fanboy Lists ${DIM}[entire file]${RESET}`);
	console.log(
		`${BOLD}[2]${RESET} Download EasyList, EasyPrivacy and Fanboy Lists ${DIM}[custom amount of lines]${RESET} ${RED}*testing purposes*${RESET}`
	);
}

function showCategories() {
	console.log();
	console.log(`${BOLD}[1]${RESET} EasyList`);
	console.log(`${BOLD}[2]${RESET} EasyPrivacy`);
	console.log(`${BOLD}[3]${RESET} Fanboy`);
}

function showItems(categoryName) {
	console.log();
	const items = CATEGORIES[categoryName];
	items.forEach((it, idx) => {
		console.log(`${BOLD}[${idx + 1}]${RESET} ${it.label} (${it.url})`);
	});
}

function normalizeDestName(baseFilename, isSample, lineCount = 1000) {
	if (!isSample) return baseFilename;
	// insert -<lineCount> before .txt (or at end if no .txt found)
	const ext = path.extname(baseFilename);
	const name = path.basename(baseFilename, ext);
	if (ext.toLowerCase() === '.txt') {
		return `${name}-${lineCount}${ext}`;
	}
	return `${baseFilename}-${lineCount}`;
}

function prettyBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let i = -1;
	do {
		bytes /= 1024;
		i++;
	} while (bytes >= 1024 && i < units.length - 1);
	return `${bytes.toFixed(2)} ${units[i]}`;
}

(async function main() {
	console.clear();
	console.log(HEADER);
	console.log();

	// Main choice
	showMainMenu();
	const mainChoice = await ask(`Choose an option [1-2]: `);
	if (!['1', '2'].includes(mainChoice)) {
		console.log(`${RED}Invalid choice. Exiting.${RESET}`);
		rl.close();
		return;
	}
	const sampleMode = mainChoice === '2';

	// sample mode, ask for line count
	let lineCount = 1000; // default
	if (sampleMode) {
		console.log();
		let validCount = false;
		while (!validCount) {
			const countInput = await ask(`How many lines would you like to download? [25-2500]: `);
			const count = parseInt(countInput, 10);
			if (isNaN(count) || count < 25 || count > 2500) {
				console.log(`${RED}Invalid number. Please enter a value between 25 and 2500.${RESET}`);
			} else {
				lineCount = count;
				validCount = true;
			}
		}
	}

	showCategories();
	const catChoice = await ask(`Choose a category [1-3]: `);
	const catMap = {
		1: 'EasyList',
		2: 'EasyPrivacy',
		3: 'Fanboy',
	};
	const categoryName = catMap[catChoice];
	if (!categoryName) {
		console.log(`${RED}Invalid category. Exiting.${RESET}`);
		rl.close();
		return;
	}

	showItems(categoryName);
	const items = CATEGORIES[categoryName];
	const itemChoice = await ask(`Choose an item [1-${items.length}]: `);
	const index = parseInt(itemChoice, 10) - 1;
	if (!(index >= 0 && index < items.length)) {
		console.log(`${RED}Invalid item. Exiting.${RESET}`);
		rl.close();
		return;
	}

	const chosen = items[index];
	const destName = normalizeDestName(chosen.filename, sampleMode, lineCount);
	const destPath = path.resolve(process.cwd(), destName);

	console.log();
	console.log(`${BOLD}Selected:${RESET} ${categoryName} → ${chosen.label}`);
	console.log(`${BOLD}URL:${RESET} ${chosen.url}`);
	console.log(`${BOLD}Output:${RESET} ${destPath}`);
	console.log(`${BOLD}Mode:${RESET} ${sampleMode ? `${lineCount} random rules (headers removed)` : 'Full file'}`);
	console.log();

	// temp. file path for download (if sampling we download full to temp .first)
	const tmpPath = sampleMode ? path.resolve(os.tmpdir(), `list-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`) : destPath;

	// download
	process.stdout.write(`${DIM}Downloading...${RESET} `);
	const ok = await smartDownload(chosen.url, tmpPath);
	if (!ok) {
		console.log(`\n${RED}Download failed. Please check your internet connection or try again.${RESET}`);
		rl.close();
		return;
	}
	console.log(`done.`);

	try {
		if (sampleMode) {
			// read, strip headers/comments, sample specified number of lines, write new file
			const raw = fs.readFileSync(tmpPath, 'utf8');
			const rules = stripHeadersAndComments(raw);
			if (rules.length === 0) {
				console.log(`${RED}No rules found after stripping headers/comments. Aborting.${RESET}`);
				fs.unlinkSync(tmpPath);
				rl.close();
				return;
			}
			const picked = sampleN(rules, lineCount);
			fs.writeFileSync(destPath, picked.join(os.EOL) + os.EOL, 'utf8');
			fs.unlinkSync(tmpPath);
			const sz = fs.statSync(destPath).size;
			console.log(`${BOLD}Saved:${RESET} ${destName} (${prettyBytes(sz)}).`);
			console.log(
				`${DIM}Note:${RESET} Selected ${picked.length} rules at random from ${rules.length} available after header/comment removal.`
			);
		} else {
			const sz = fs.statSync(destPath).size;
			console.log(`${BOLD}Saved:${RESET} ${destName} (${prettyBytes(sz)}).`);
		}
	} catch (err) {
		console.log(`${RED}Error processing file: ${err && err.message ? err.message : err}${RESET}`);
		// Try to clean up
		try {
			if (sampleMode && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
		} catch {}
		rl.close();
		return;
	}

	console.log();
	console.log(`${BOLD}All set!${RESET}`);
	if (!sampleMode) {
		console.log(`• ${BOLD}Full file${RESET}: exact mirror of the source list.`);
	} else {
		console.log(`• ${BOLD}${lineCount} random${RESET}: comment/header lines removed, then ${lineCount} rules chosen randomly.`);
	}
	console.log(`File saved to: ${destPath}`);
	console.log();

	// ofer another run
	const again = await ask(`Would you like to download another? [y/N]: `);
	if (/^y(es)?$/i.test(again)) {
		console.log();
		// restart by spawning a new instance to keep state clean
		const res = spawnSync(process.execPath, [__filename], {
			stdio: 'inherit',
		});
		process.exit(res.status || 0);
	} else {
		rl.close();
	}
})();
