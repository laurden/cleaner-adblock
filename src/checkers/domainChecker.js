/**
 * Domain checking utilities using Puppeteer
 */

const { TIMEOUT, FORCE_CLOSE_TIMEOUT, CONCURRENCY, USER_AGENT } = require('../config/defaults');
const { getBaseDomain } = require('../parsers/domainExtractor');
const { debugVerbose, debugBrowser, debugNetwork, truncateError } = require('../utils/logger');
const { createProgressBar, incrementProgress } = require('../utils/progressBar');
const { expandDomainsWithWww } = require('./variants/wwwHandler');

/**
 * Check if redirect is to subdomain of same base domain
 * @param {string} originalDomain - Original domain
 * @param {string} finalDomain - Final domain after redirect
 * @param {boolean} ignoreSimilar - Whether to ignore similar domains
 * @returns {boolean} True if similar redirect
 */
function isSimilarDomainRedirect(originalDomain, finalDomain, ignoreSimilar) {
	if (!ignoreSimilar) {
		return false;
	}

	const originalBase = getBaseDomain(originalDomain);
	const finalBase = getBaseDomain(finalDomain);

	return originalBase === finalBase;
}

/**
 * Check if domain is dead or redirecting
 * @param {Object} browser - Puppeteer browser instance
 * @param {Object} domainObj - Domain object with variants
 * @param {number} index - Current index
 * @param {number} total - Total domains
 * @param {boolean} ignoreSimilar - Whether to ignore similar domain redirects
 * @param {number} timeout - Page load timeout in milliseconds (default: TIMEOUT constant)
 * @returns {Promise<{type: string|null, data: Object|null}>} Check result
 */
async function checkDomain(browser, domainObj, index, total, ignoreSimilar, timeout = TIMEOUT) {
	const { original, variants } = domainObj;
	const domain = original;

	debugVerbose(`Starting check for domain: ${domain} (${index + 1}/${total})`);
	debugVerbose(`Variants to check: ${variants.join(', ')}`);

	console.log(`[${index + 1}/${total}] Checking ${domain}...`);

	// Try each variant until one succeeds
	for (let i = 0; i < variants.length; i++) {
		const variant = variants[i];
		const isLastVariant = i === variants.length - 1;
		const variantLabel = variant === original ? '' : ` (trying www.${original})`;

		debugVerbose(`Trying variant ${i + 1}/${variants.length}: ${variant}`);

		const page = await browser.newPage();
		debugBrowser(`Created new page for ${variant}`);

		// Set custom Chrome user agent
		await page.setUserAgent(USER_AGENT);
		debugBrowser(`Set user agent: ${USER_AGENT}`);

		// Add network event listeners for debugging
		page.on('request', request => {
			debugNetwork(`Request: ${request.method()} ${request.url()}`);
		});

		page.on('response', response => {
			debugNetwork(`Response: ${response.status()} ${response.url()}`);
		});

		page.on('requestfailed', request => {
			debugNetwork(`Request failed: ${request.url()} - ${request.failure().errorText}`);
		});

		let forceCloseTimer = null;
		let pageClosed = false;

		const forceClosePage = async () => {
			if (!pageClosed) {
				console.log(`  ⏱  Force-closing ${variant} after ${FORCE_CLOSE_TIMEOUT / 1000}s timeout`);
				pageClosed = true;
				try {
					await page.close();
				} catch (e) {
					debugBrowser(`Failed to force close: ${e.message}`);
				}
			}
		};

		forceCloseTimer = setTimeout(forceClosePage, FORCE_CLOSE_TIMEOUT);

		try {
			const url = `https://${variant}`;
			if (i > 0) {
				console.log(`  ↻ Trying www.${domain}...`);
			}

			let statusCode = null;

			page.on('response', response => {
				if (response.url() === url || response.url() === url + '/') {
					statusCode = response.status();
					debugNetwork(`Main response received: ${statusCode} for ${response.url()}`);
				}
			});

			debugVerbose(`Attempting to navigate to: ${url}`);
			debugVerbose(`Timeout set to: ${timeout}ms`);

			const response = await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: timeout,
			});

			debugVerbose(`Navigation completed for ${variant}`);

			const finalUrl = page.url();
			debugVerbose(`Final URL after navigation: ${finalUrl}`);

			if (response) {
				statusCode = response.status();
			}

			// Check if dead
			const is403 = statusCode === 403;
			const isTrulyDead = (statusCode >= 400 && statusCode !== 403) || statusCode === null;

			// If 403 and not last variant, try next variant
			if (is403 && !isLastVariant) {
				clearTimeout(forceCloseTimer);
				if (!pageClosed) {
					pageClosed = true;
					await page.close();
				}
				console.log(`  ⚠  ${variant} - HTTP 403 Forbidden, trying next...`);
				continue;
			}

			// If truly dead and not last variant, try next variant
			if (isTrulyDead && !isLastVariant) {
				clearTimeout(forceCloseTimer);
				if (!pageClosed) {
					pageClosed = true;
					await page.close();
				}
				console.log(`  ☠  ${variant} - Dead (HTTP ${statusCode || 'timeout'}), trying next...`);
				continue;
			}

			const isDead = isTrulyDead || (is403 && isLastVariant);

			// Check if redirects to different domain
			const extractDomain = urlStr => {
				try {
					const parsed = new URL(urlStr);
					return parsed.hostname.replace(/^www\./, '');
				} catch {
					return urlStr;
				}
			};

			const originalDomain = extractDomain(url);
			const finalDomain = extractDomain(finalUrl);
			const isRedirecting = originalDomain !== finalDomain && !isDead;

			// Check if redirect is to similar domain
			const isSimilarRedirect = isRedirecting && isSimilarDomainRedirect(originalDomain, finalDomain, ignoreSimilar);

			let result = { type: null, data: null };

			if (isDead) {
				const reason = `HTTP ${statusCode || 'timeout/unreachable'}`;
				console.log(`  ☠  ${domain} - Dead (${reason})${variantLabel}`);
				result = {
					type: 'dead',
					data: { domain, statusCode, reason },
				};
			} else if (isRedirecting && !isSimilarRedirect) {
				console.log(`  ↪ ${domain} - Redirects to ${finalDomain}${variantLabel}`);
				result = {
					type: 'redirect',
					data: { domain, finalDomain, originalUrl: url, finalUrl, statusCode },
				};
			} else {
				if (isSimilarRedirect) {
					console.log(`  ✓  ${domain} - Active (similar redirect: ${finalDomain})${variantLabel}`);
				} else {
					console.log(`  ✓  ${domain} - Active (HTTP ${statusCode})${variantLabel}`);
				}
				result = { type: null, data: null };
			}

			clearTimeout(forceCloseTimer);
			if (!pageClosed) {
				pageClosed = true;
				await page.close();
				debugBrowser(`Closed tab for ${variant}`);
			}

			return result;
		} catch (error) {
			debugVerbose(`Error caught for ${variant}: ${error.message}`);

			const isCertError = error.message.includes('ERR_CERT') || error.message.includes('SSL') || error.message.includes('certificate');

			const isDead =
				!isCertError &&
				(error.message.includes('timeout') ||
					error.message.includes('ERR_NAME_NOT_RESOLVED') ||
					error.message.includes('ERR_CONNECTION_REFUSED') ||
					error.message.includes('ERR_CONNECTION_TIMED_OUT') ||
					error.message.includes('ERR_CONNECTION_RESET') ||
					error.message.includes('ERR_ADDRESS_UNREACHABLE'));

			clearTimeout(forceCloseTimer);
			if (!pageClosed) {
				pageClosed = true;
				try {
					await page.close();
				} catch (closeError) {
					debugBrowser(`Failed to close page: ${closeError.message}`);
				}
			}

			// If dead and not last variant, try next variant
			if (isDead && !isLastVariant) {
				const reason = truncateError(error.message);
				console.log(`  ☠  ${variant} - Dead (${reason}), trying next...`);
				continue;
			}

			let result = { type: null, data: null };

			if (isDead) {
				const reason = truncateError(error.message);
				console.log(`  ☠  ${domain} - Dead (${reason})${variantLabel}`);
				result = {
					type: 'dead',
					data: { domain, statusCode: null, reason: error.message },
				};
			} else {
				const reason = truncateError(error.message);
				console.log(`  ✓  ${domain} - ${reason}${variantLabel}`);
			}

			debugBrowser(`Closed tab for ${variant}`);
			return result;
		}
	}

	// Fallback
	return {
		type: 'dead',
		data: { domain, statusCode: null, reason: 'All variants failed' },
	};
}

/**
 * Process domains with concurrency control
 * @param {Object} browser - Puppeteer browser instance
 * @param {Array} domainObjects - Array of domain objects with variants
 * @param {boolean} ignoreSimilar - Whether to ignore similar domain redirects
 * @param {number} timeout - Page load timeout in milliseconds (default: TIMEOUT constant)
 * @param {Object} options - Options (progressBar, quietMode)
 * @returns {Promise<Array>} Array of check results
 */
async function processDomains(browser, domainObjects, ignoreSimilar, timeout = TIMEOUT, options = {}) {
	const results = [];
	const total = domainObjects.length;
	const { progressBar = false, quietMode = false } = options;

	// Create progress bar if enabled
	const bar = createProgressBar(total, progressBar, quietMode);

	debugVerbose(`Starting to process ${total} domains with concurrency ${CONCURRENCY}`);

	for (let i = 0; i < domainObjects.length; i += CONCURRENCY) {
		const batch = domainObjects.slice(i, i + CONCURRENCY);
		const batchNumber = Math.floor(i / CONCURRENCY) + 1;
		const totalBatches = Math.ceil(domainObjects.length / CONCURRENCY);

		debugVerbose(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} domains)`);

		const batchResults = await Promise.all(
			batch.map((domainObj, batchIndex) => checkDomain(browser, domainObj, i + batchIndex, total, ignoreSimilar, timeout))
		);

		results.push(...batchResults.filter(r => r !== null && r.type !== null));

		// Update progress bar for completed domains in this batch
		if (bar) {
			for (let j = 0; j < batch.length; j++) {
				incrementProgress(bar);
			}
		}

		// Cleanup: verify all pages are closed after each batch
		const pages = await browser.pages();
		const openPages = pages.length;

		debugBrowser(`After batch ${batchNumber}: ${openPages} pages open`);

		if (openPages > 1) {
			console.log(`  🧹  Cleanup: Found ${openPages - 1} lingering pages, closing...`);
			for (const page of pages) {
				if (page.url() !== 'about:blank') {
					try {
						await page.close();
						debugBrowser(`Closed lingering page: ${page.url()}`);
					} catch (e) {
						debugBrowser(`Failed to close page: ${e.message}`);
					}
				}
			}
		}

		debugVerbose(`Batch ${batchNumber} completed`);
	}

	debugVerbose(`All batches completed. Total results: ${results.length}`);
	return results;
}

module.exports = {
	checkDomain,
	processDomains,
	isSimilarDomainRedirect,
	expandDomainsWithWww,
};
