/**
 * @file domainChecker.js
 * @module domainChecker
 * @description Part of the Cleaner-Adblock domain scanner utility
 */

const { RateLimiter } = require('limiter');
const PagePool = require('../utils/pagePool');
const { USER_AGENT, MAX_REQUESTS_PER_MINUTE, MAX_VARIANT_ATTEMPTS, MAX_RETRIES_PER_ERROR_TYPE } = require('../config/defaults');
const { getBaseDomain } = require('../parsers/domainExtractor');
const { debugVerbose, debugBrowser, debugNetwork, truncateError } = require('../utils/logger');
const { createProgressBar, incrementProgress } = require('../utils/progressBar');
const { createRollingOutput, addLine, finishRollingOutput, rerender } = require('../utils/rollingOutput');
const { expandDomainsWithWww } = require('./variants/wwwHandler');
const { formatDomainCheckTree } = require('../utils/treeFormatter');

// Create rate limiter (shared across all requests)
const rateLimiter = new RateLimiter({ tokensPerInterval: MAX_REQUESTS_PER_MINUTE, interval: 'minute' });

/**
 * Has subdomain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
 */

function hasSubdomain(domain) {
	const cleaned = domain.replace(/^www\./, '');
	const dotCount = (cleaned.match(/\./g) || []).length;
	return dotCount > 1;
}

/**
 * Strip subdomain
 * @param {*} domain - Parameter domain
 * @returns {*} Result
 */

function stripSubdomain(domain) {
	const cleaned = domain.replace(/^www\./, '');
	const parts = cleaned.split('.');
	if (parts.length <= 2) return cleaned;
	return parts.slice(-2).join('.');
}

/**
 * Is similar domain redirect
 * @param {*} originalDomain - Parameter originalDomain
 * @param {*} finalDomain - Parameter finalDomain
 * @param {*} ignoreSimilar - Parameter ignoreSimilar
 * @returns {*} Result
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
 * Get smart variants
 * @param {*} domain - Parameter domain
 * @param {*} errorCode - Parameter errorCode
 * @param {*} statusCode - Parameter statusCode
 * @param {*} lastUrl - Parameter lastUrl
 * @param {*} httpsOnly - Parameter httpsOnly
 * @returns {*} Result
 */

function getSmartVariants(domain, errorCode, statusCode, lastUrl, httpsOnly = false) {
	const hasWww = domain.startsWith('www.');
	const wwwDomain = hasWww ? domain : `www.${domain}`;
	const isSubdomain = hasSubdomain(domain);
	const baseDomain = stripSubdomain(domain);

	// Extract scheme from last URL to know what we tried
	const lastWasHttps = lastUrl.startsWith('https://');
	const lastWasWww = lastUrl.includes('://www.');

	debugVerbose(
		`Smart variants for ${domain}: errorCode=${errorCode}, statusCode=${statusCode}, lastUrl=${lastUrl}, httpsOnly=${httpsOnly}`
	);

	// Helper to filter HTTP URLs when httpsOnly is enabled
	const filterHttps = urls => {
		if (httpsOnly) {
			const filtered = urls.filter(url => url.startsWith('https://'));
			if (filtered.length < urls.length) {
				debugVerbose(`HTTPS-only mode: filtered ${urls.length - filtered.length} HTTP URLs`);
			}
			return filtered;
		}
		return urls;
	};

	// ERR_NAME_NOT_RESOLVED - DNS failed
	if (errorCode === 'ERR_NAME_NOT_RESOLVED') {
		debugVerbose(`DNS resolution failed - trying www variant (different DNS record)`);
		// DNS doesn't exist - try www variant (different DNS record)
		// SKIP http://domain - scheme doesn't matter for DNS
		if (!lastWasWww) {
			return filterHttps([`https://${wwwDomain}`, `http://${wwwDomain}`]);
		}
		// Already tried www variant, DNS truly doesn't exist
		return [];
	}

	// ERR_CONNECTION_REFUSED - Port refused (typically port 443)
	if (errorCode === 'ERR_CONNECTION_REFUSED') {
		debugVerbose(`Connection refused - likely port 443 blocked, trying port 80 (http)`);
		// Port refused - likely port 443, try port 80 first
		if (lastWasHttps) {
			return filterHttps([`http://${domain}`, `http://${wwwDomain}`, `https://${wwwDomain}`]);
		}
		// Already tried http, try www variants
		if (!lastWasWww) {
			return filterHttps([`http://${wwwDomain}`, `https://${wwwDomain}`]);
		}
		return [];
	}

	// ERR_CONNECTION_TIMED_OUT - Timeout
	if (errorCode === 'ERR_CONNECTION_TIMED_OUT') {
		debugVerbose(`Connection timed out - trying alternative variants`);
		// Standard fallback: try www, then http variants
		if (!lastWasWww) {
			return filterHttps([`https://${wwwDomain}`, `http://${domain}`, `http://${wwwDomain}`]);
		}
		// Already tried www with https, try http variants
		return filterHttps([`http://${domain}`, `http://${wwwDomain}`]);
	}

	// ERR_BLOCKED_BY_CLIENT - Browser/extension/ISP blocking
	if (errorCode === 'ERR_BLOCKED_BY_CLIENT') {
		debugVerbose(`Blocked by client (browser/extension/ISP) - skipping further attempts`);
		// If blocked by browser, extension, or ISP, trying other variants won't help
		// This is likely not a domain issue but an external block
		return [];
	}

	// HTTP 520 - Cloudflare error (origin server issue)
	if (statusCode === 520) {
		debugVerbose(`HTTP 520 (Cloudflare error) - trying alternative variants`);
		// Cloudflare is working but origin server has issues
		// Try other variants in case origin is configured differently
		if (lastWasHttps) {
			return filterHttps([`http://${domain}`, `https://${wwwDomain}`, `http://${wwwDomain}`]);
		}
		if (!lastWasWww) {
			return filterHttps([`https://${wwwDomain}`, `http://${wwwDomain}`]);
		}
		return [];
	}

	// HTTP 403 with subdomain
	if (statusCode === 403 && isSubdomain) {
		debugVerbose(`403 on subdomain ${domain} - trying http, then base domain ${baseDomain}`);
		// Try http for subdomain first
		if (lastWasHttps) {
			return filterHttps([
				`http://${domain}`,
				`https://${baseDomain}`,
				`https://www.${baseDomain}`,
				`http://${baseDomain}`,
				`http://www.${baseDomain}`,
			]);
		}
		// Already tried http for subdomain, strip subdomain and try base domain
		return filterHttps([`https://${baseDomain}`, `https://www.${baseDomain}`, `http://${baseDomain}`, `http://www.${baseDomain}`]);
	}

	// Default fallback for other errors (4xx, 5xx, etc.)
	debugVerbose(`Default variant fallback for error/status`);
	if (!lastWasWww) {
		return filterHttps([`https://${wwwDomain}`, `http://${domain}`, `http://${wwwDomain}`]);
	}
	return filterHttps([`http://${domain}`, `http://${wwwDomain}`]);
}

/**
 * Try url (async)
 * @param {*} browser - Parameter browser
 * @param {*} url - Parameter url
 * @param {*} timeout - Parameter timeout
 * @param {*} forceCloseTimeout - Parameter forceCloseTimeout
 * @param {*} pagePool - Parameter pagePool
 * @returns {Promise<*>} Promise resolving to result
 */

async function tryUrl(browser, url, timeout, forceCloseTimeout, pagePool = null) {
	// Rate limiting: Wait for token before making request
	await rateLimiter.removeTokens(1);
	debugVerbose(`Rate limit token acquired for ${url}`);

	let page;
	let pageReleased = false;
	let forceCloseTimer = null;

	try {
		// Use page pool if available for better performance
		page = pagePool ? await pagePool.acquire() : await browser.newPage();
		debugBrowser(`${pagePool ? 'Acquired' : 'Created'} page for ${url}`);

		/**
		 * Force close page (async)
		 * @returns {Promise<*>} Promise resolving to result
		 */

		const forceClosePage = async () => {
			if (!pageReleased) {
				debugBrowser(`Force-closing ${url} after ${forceCloseTimeout / 1000}s timeout`);
				pageReleased = true;
				try {
					if (pagePool) {
						await pagePool.release(page);
					} else {
						await page.close();
					}
				} catch (e) {
					debugBrowser(`Failed to force close: ${e.message}`);
				}
			}
		};

		forceCloseTimer = setTimeout(forceClosePage, forceCloseTimeout);

		await page.setUserAgent(USER_AGENT);
		debugBrowser(`Set user agent for ${url}: ${USER_AGENT}`);

		// Add network event listeners for debugging
		page.on('request', request => {
			debugNetwork(`Request: ${request.method()} ${request.url()}`);
		});

		page.on('response', response => {
			debugNetwork(`Response: ${response.status()} ${response.url()}`);
		});

		page.on('requestfailed', request => {
			const failure = request.failure();
			const errorText = failure ? failure.errorText : 'Unknown error';
			debugNetwork(`Request failed: ${request.url()} - ${errorText}`);
		});

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

		debugVerbose(`Navigation completed for ${url}`);

		const finalUrl = page.url();
		debugVerbose(`Final URL after navigation: ${finalUrl}`);

		if (response) {
			statusCode = response.status();
		}

		// Clean up
		clearTimeout(forceCloseTimer);
		if (!pageReleased) {
			pageReleased = true;
			if (pagePool) {
				await pagePool.release(page);
				debugBrowser(`Released page back to pool for ${url}`);
			} else {
				await page.close();
				debugBrowser(`Closed tab for ${url}`);
			}
		}

		// Check if dead (4xx/5xx)
		const isDead = statusCode >= 400 || statusCode === null;

		return {
			success: !isDead,
			statusCode,
			finalUrl,
			errorCode: null,
			reason: isDead ? `HTTP ${statusCode || 'unreachable'}` : null,
		};
	} catch (error) {
		clearTimeout(forceCloseTimer);
		if (!pageReleased && page) {
			pageReleased = true;
			try {
				if (pagePool) {
					await pagePool.release(page);
				} else {
					await page.close();
				}
			} catch (closeError) {
				debugBrowser(`Failed to close page: ${closeError.message}`);
			}
		}

		debugVerbose(`Error caught for ${url}: ${error.message}`);

		// Extract specific error code
		let errorCode = null;
		if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
			errorCode = 'ERR_NAME_NOT_RESOLVED';
		} else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
			errorCode = 'ERR_CONNECTION_REFUSED';
		} else if (error.message.includes('ERR_CONNECTION_TIMED_OUT') || error.message.includes('timeout')) {
			errorCode = 'ERR_CONNECTION_TIMED_OUT';
		} else if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
			errorCode = 'ERR_BLOCKED_BY_CLIENT';
		} else if (error.message.includes('ERR_CONNECTION_RESET')) {
			errorCode = 'ERR_CONNECTION_RESET';
		} else if (error.message.includes('ERR_SSL_PROTOCOL_ERROR')) {
			errorCode = 'ERR_SSL_PROTOCOL_ERROR';
		} else if (error.message.includes('ERR_ADDRESS_UNREACHABLE')) {
			errorCode = 'ERR_ADDRESS_UNREACHABLE';
		} else if (error.message.includes('ERR_CERT') || error.message.includes('certificate')) {
			errorCode = 'ERR_CERT';
		}

		// Check if this is a "dead" error or recoverable
		const isCertError = errorCode === 'ERR_CERT';
		const isBlocked = errorCode === 'ERR_BLOCKED_BY_CLIENT';
		const isDead = !isCertError && !isBlocked && errorCode !== null;

		return {
			success: false,
			statusCode: null,
			finalUrl: null,
			errorCode,
			reason: truncateError(error.message),
			isDead,
		};
	}
}

/**
 * Check domain (async)
 * @param {*} browser - Parameter browser
 * @param {*} domainObj - Parameter domainObj
 * @param {*} index - Parameter index
 * @param {*} total - Parameter total
 * @param {*} ignoreSimilar - Parameter ignoreSimilar
 * @param {*} timeout - Parameter timeout
 * @param {*} forceCloseTimeout - Parameter forceCloseTimeout
 * @param {*} httpsOnly - Parameter httpsOnly
 * @param {*} roller - Parameter roller
 * @param {*} pagePool - Parameter pagePool
 * @returns {Promise<*>} Promise resolving to result
 */

async function checkDomain(
	browser,
	domainObj,
	index,
	total,
	ignoreSimilar,
	timeout,
	forceCloseTimeout,
	httpsOnly = false,
	roller = null,
	pagePool = null
) {
	const { original } = domainObj;
	const domain = original;

	debugVerbose(`Starting check for domain: ${domain} (${index + 1}/${total})`);

	const attempts = [];
	let successResult = null;

	// Start with https://domain
	let currentUrl = `https://${domain}`;
	let attemptCount = 0;

	// Track errors by type for retry limits
	const errorCounts = {};

	while (attemptCount < MAX_VARIANT_ATTEMPTS && !successResult) {
		debugVerbose(`Attempt ${attemptCount + 1}/${MAX_VARIANT_ATTEMPTS}: Trying ${currentUrl}`);

		const result = await tryUrl(browser, currentUrl, timeout, forceCloseTimeout, pagePool);

		// Helper to extract domain from URL
		const extractDomain = urlStr => {
			try {
				const parsed = new URL(urlStr);
				return parsed.hostname.replace(/^www\./, '');
			} catch {
				return urlStr;
			}
		};

		// Build attempt object with all properties
		const attemptObj = {
			url: currentUrl,
			tried: true,
			success: result.success,
			statusCode: result.statusCode,
			reason: result.reason,
			errorCode: result.errorCode,
		};

		if (result.success) {
			// Success! Check for redirects
			const originalDomain = extractDomain(currentUrl);
			const finalDomain = extractDomain(result.finalUrl);
			const isRedirecting = originalDomain !== finalDomain;

			if (isRedirecting) {
				const isSimilarRedirect = isSimilarDomainRedirect(originalDomain, finalDomain, ignoreSimilar);

				if (isSimilarRedirect) {
					attemptObj.similarRedirect = finalDomain;
				} else {
					attemptObj.redirect = finalDomain;
				}

				successResult = {
					url: currentUrl,
					finalUrl: result.finalUrl,
					statusCode: result.statusCode,
					isRedirecting: true,
					isSimilarRedirect,
					originalDomain,
					finalDomain,
				};
			} else {
				successResult = {
					url: currentUrl,
					finalUrl: result.finalUrl,
					statusCode: result.statusCode,
					isRedirecting: false,
				};
			}
		}

		// Push complete attempt object
		attempts.push(attemptObj);

		if (result.success) {
			// Found a working variant, stop trying more
			break;
		}

		// Failed - check retry limits per error type
		if (result.errorCode) {
			errorCounts[result.errorCode] = (errorCounts[result.errorCode] || 0) + 1;

			// Security: Prevent excessive retries of same error type
			if (errorCounts[result.errorCode] > MAX_RETRIES_PER_ERROR_TYPE) {
				debugVerbose(`Max retries (${MAX_RETRIES_PER_ERROR_TYPE}) reached for ${result.errorCode} on ${domain}`);
				break;
			}
		}

		// Failed - get smart next variants
		const nextVariants = getSmartVariants(domain, result.errorCode, result.statusCode, currentUrl, httpsOnly);

		if (nextVariants.length > 0) {
			currentUrl = nextVariants[0];
			attemptCount++;
		} else {
			// No more variants to try
			debugVerbose(`No more variants to try for ${domain}`);
			break;
		}
	}

	// Determine final result
	let result = { type: null, data: null };

	if (successResult) {
		// We have at least one successful response
		if (successResult.isRedirecting && !successResult.isSimilarRedirect) {
			// Real redirect to different domain
			result = {
				type: 'redirect',
				data: {
					domain,
					finalDomain: successResult.finalDomain,
					originalUrl: successResult.url,
					finalUrl: successResult.finalUrl,
					statusCode: successResult.statusCode,
				},
			};
		}
		// If similar redirect or not redirecting, treat as active (result.type stays null)
	} else {
		// All variants failed - check if blocked or dead
		const lastAttempt = attempts.find(a => a.tried) || attempts[0];

		// Check if any attempt had ERR_BLOCKED_BY_CLIENT
		const wasBlocked = attempts.some(a => a.errorCode === 'ERR_BLOCKED_BY_CLIENT');

		if (wasBlocked) {
			// Blocked by browser/extension/ISP - inconclusive
			result = {
				type: 'inconclusive',
				data: {
					domain,
					statusCode: lastAttempt?.statusCode || null,
					reason: 'Blocked by browser/extension/ISP',
				},
			};
		} else {
			// Domain is dead
			result = {
				type: 'dead',
				data: {
					domain,
					statusCode: lastAttempt?.statusCode || null,
					reason: lastAttempt?.reason || 'All variants failed',
				},
			};
		}
	}

	// Output tree format
	const treeOutput = formatDomainCheckTree(domain, attempts, result, index, total);
	const lines = treeOutput.split('\n');
	for (const line of lines) {
		addLine(roller, line);
	}

	return result;
}

/**
 * Process domains (async)
 * @param {*} browser - Parameter browser
 * @param {*} domainObjects - Parameter domainObjects
 * @param {*} ignoreSimilar - Parameter ignoreSimilar
 * @param {*} timeout - Parameter timeout
 * @param {*} options - Parameter options
 * @returns {Promise<*>} Promise resolving to result
 */

async function processDomains(browser, domainObjects, ignoreSimilar, timeout, options = {}) {
	const results = [];
	const total = domainObjects.length;
	const { quietMode = false, forceCloseTimeout, concurrency, httpsOnly = false, onResult = null } = options;

	// Create and initialize page pool for better performance
	const pagePoolSize = Math.min(concurrency, 10); // Pool size based on concurrency, max 10
	const pagePool = new PagePool(browser, pagePoolSize);
	debugVerbose(`Initializing page pool with ${pagePoolSize} pages`);
	await pagePool.initialize();
	debugVerbose(`Page pool initialized`);

	// Create shared queue
	const queue = [...domainObjects];
	let processedCount = 0;

	// Create progress bar (always enabled unless in quiet mode)
	const bar = createProgressBar(total, true, quietMode);

	// Create rolling output with progress bar integrated
	const roller = createRollingOutput({
		maxLines: 10,
		enabled: !quietMode,
		fitToTerminal: true,
		reserveTop: 10,
		reserveBottom: 0,
		minLines: 5,
		truncateToWidth: true,
		progressBar: bar,
	});

	debugVerbose(`Starting to process ${total} domains with concurrency ${concurrency}`);
	debugVerbose(`Using worker pool architecture for non-blocking concurrent processing`);

	/**
	 * Worker (async)
	 * @param {*} workerId - Parameter workerId
	 * @returns {Promise<*>} Promise resolving to result
	 */

	async function worker(workerId) {
		debugVerbose(`Worker ${workerId} started`);

		while (true) {
			// Atomically get next domain from queue
			const domainObj = queue.shift();
			if (!domainObj) {
				debugVerbose(`Worker ${workerId} finished (queue empty)`);
				break;
			}

			const index = processedCount++;
			debugVerbose(`Worker ${workerId} processing domain ${index + 1}/${total}`);

			try {
				// Check domain (this may take time with multiple variants)
				const result = await checkDomain(
					browser,
					domainObj,
					index,
					total,
					ignoreSimilar,
					timeout,
					forceCloseTimeout,
					httpsOnly,
					roller,
					pagePool
				);

				// ✅ OUTPUT IMMEDIATELY (don't wait for other workers)
				if (result && result.type !== null) {
					results.push(result);
					if (onResult) {
						try {
							await onResult(result);
						} catch (error) {
							debugVerbose(`Error in onResult callback: ${error.message}`);
						}
					}
				}

				// ✅ UPDATE PROGRESS IMMEDIATELY
				if (bar) {
					incrementProgress(bar);
				}
				if (roller) {
					rerender(roller);
				}
			} catch (error) {
				debugVerbose(`Worker ${workerId} error processing domain: ${error.message}`);
				// Continue to next domain
			}
		}

		debugVerbose(`Worker ${workerId} completed all tasks`);
	}

	// Spawn N workers (concurrency level)
	const workers = [];
	for (let i = 0; i < concurrency; i++) {
		workers.push(worker(i));
	}

	// Wait for all workers to finish
	await Promise.all(workers);

	// Cleanup: verify all pages are closed
	try {
		const pages = await browser.pages();
		const openPages = pages.length;

		debugBrowser(`After all workers completed: ${openPages} pages open`);

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
	} catch (error) {
		debugVerbose(`Error during final cleanup: ${error.message}`);
	}

	// Clear the rolling output (which includes the progress bar) before showing final results
	finishRollingOutput(roller);

	// Clean up page pool
	debugVerbose(`Destroying page pool`);
	await pagePool.destroy();
	debugVerbose(`Page pool destroyed`);

	debugVerbose(`All workers completed. Total results: ${results.length}`);
	return results;
}

module.exports = {
	checkDomain,
	processDomains,
	isSimilarDomainRedirect,
	getSmartVariants,
	hasSubdomain,
	stripSubdomain,
	tryUrl,
	expandDomainsWithWww,
};
