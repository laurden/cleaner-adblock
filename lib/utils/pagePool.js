/**
 * @file pagePool.js
 * @module pagePool
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

/**
 * PagePool class
 * @class
 */

class PagePool {
	constructor(browser, size = 10) {
		this.browser = browser;
		this.size = size;
		this.available = [];
		this.inUse = new Set();
	}

	async initialize() {
		const promises = [];
		for (let i = 0; i < this.size; i++) {
			promises.push(this.browser.newPage());
		}
		this.available = await Promise.all(promises);
	}

	async acquire() {
		// If pool is empty, create a temporary page
		if (this.available.length === 0) {
			const tempPage = await this.browser.newPage();
			return tempPage;
		}

		const page = this.available.pop();
		this.inUse.add(page);

		// Reset page state to ensure clean slate
		try {
			await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
		} catch {
			// If goto fails, page might be closed - create a new one
			if (this.inUse.has(page)) {
				this.inUse.delete(page);
			}
			return await this.browser.newPage();
		}

		return page;
	}

	async release(page) {
		if (this.inUse.has(page)) {
			// Return to pool
			this.inUse.delete(page);
			this.available.push(page);
		} else {
			// Temporary page created outside pool - close it
			try {
				await page.close();
			} catch {
				// Ignore errors when closing
			}
		}
	}

	async destroy() {
		const closePromises = [];

		// Close available pages
		for (const page of this.available) {
			closePromises.push(
				page.close().catch(() => {
					/* ignore errors */
				})
			);
		}

		// Close in-use pages
		for (const page of this.inUse) {
			closePromises.push(
				page.close().catch(() => {
					/* ignore errors */
				})
			);
		}

		await Promise.all(closePromises);

		this.available = [];
		this.inUse.clear();
	}

	getStats() {
		return {
			total: this.size,
			available: this.available.length,
			inUse: this.inUse.size,
		};
	}
}

module.exports = PagePool;
