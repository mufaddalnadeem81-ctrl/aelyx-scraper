require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase');
// The @sparticuz/chromium require was removed. It is too heavy for Render free tier.

puppeteer.use(StealthPlugin());

const app = express();
app.set('trust proxy', 1);

// ============================================================================
// SECURITY LAYER
// ============================================================================
app.use(helmet());

app.use(cors({
    origin: '*', // Allows all origins
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json({ limit: '1mb' }));

// ============================================================================
// RATE LIMITER
// ============================================================================
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests. Please slow down.'
    }
});

app.use('/api/', apiLimiter);



// Helper to recursively find chrome executable in cache
function findChromeExecutable(dir) {
    if (!fs.existsSync(dir)) return null;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const found = findChromeExecutable(fullPath);
                if (found) return found;
            } else if (file === 'chrome' || file === 'chrome.exe') {
                return fullPath;
            }
        }
    } catch (e) {
        console.error('[SCRAPER] Error searching cache directory:', e.message);
    }
    return null;
}

// ============================================================================
// CORE GOOGLE MAPS SCRAPER
// ============================================================================
async function scrapeGoogleMaps(searchQuery, maxResults) {

    let browser;

    try {

       
        console.log(`[SCRAPER] Starting scrape for "${searchQuery}"`);

        let launchOptions;

        const extremeMemoryArgs = [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--no-first-run',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--mute-audio',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-features=site-per-process,TranslateUI',
            '--js-flags="--max-old-space-size=256"'
        ];

        if (process.env.RENDER && !process.env.BROWSERLESS_API_KEY) {
            throw new Error("Render free tier cannot run local Chromium. You must set BROWSERLESS_API_KEY in Render environment variables.");
        }

        launchOptions = {
            headless: 'new',
            args: extremeMemoryArgs
        };

        const cacheDir = path.join(__dirname, '.cache', 'puppeteer');
        const localChromePath = findChromeExecutable(cacheDir);

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log(`[SCRAPER] Using env-defined Chrome binary: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
        } else if (localChromePath) {
            launchOptions.executablePath = localChromePath;
            console.log(`[SCRAPER] Found and using local Chrome binary: ${localChromePath}`);
        }

        if (process.env.BROWSERLESS_API_KEY) {
            console.log('[SCRAPER] Connecting to Browserless.io cloud browser...');
            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}&timeout=600000`
            });
        } else {
            browser = await puppeteer.launch(launchOptions);
        }

        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const allowed = ['document', 'script', 'xhr', 'fetch'];
            if (!allowed.includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.setViewport({
            width: 1280,
            height: 900
        });
         

       
        const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

        console.log(`[SCRAPER] Navigating to ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 90000
        });

        try {
            await page.waitForSelector(
                'a[href*="/maps/place/"]',
                { timeout: 15000 }
            );
        } catch {
            console.log('[SCRAPER] No initial results found');
        }

        // =========================================================================
        // SCROLLING LOGIC
        // =========================================================================
        await page.evaluate(async (max) => {

            const feed = document.querySelector('div[role="feed"]');

            if (!feed) return;

            await new Promise((resolve) => {

                let scrollCount = 0;

                const timer = setInterval(() => {

                    feed.scrollBy(0, 1000);

                    scrollCount++;

                    const found =
                        document.querySelectorAll(
                            'a[href*="/maps/place/"]'
                        ).length;

                    if (found >= max || scrollCount > 20) {
                        clearInterval(timer);
                        resolve();
                    }

                }, 800);

            });

        }, maxResults);
      

        // =========================================================================
        // DATA EXTRACTION (DEEP SCRAPING)
        // =========================================================================
        const businesses = await page.evaluate((max) => {
            const listings = Array.from(
                document.querySelectorAll('a[href*="/maps/place/"]')
            );
            const links = [];
            for (let listing of listings) {
                if (links.length >= max) break;
                let name = listing.getAttribute('aria-label') || 'Unknown Business';
                name = name.split('·')[0].trim(); // Clean up name
                const href = listing.getAttribute('href');
                if (name && href) {
                    const placeUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
                    links.push({ name, url: placeUrl });
                }
            }
            return links;
        }, maxResults);

        console.log(`[SCRAPER] Found ${businesses.length} URLs. Starting deep extraction...`);

        const data = [];
        const BATCH_SIZE = 1; // ABSOLUTE MINIMUM for memory constraints
        
        for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
            const batch = businesses.slice(i, i + BATCH_SIZE);
            console.log(`[SCRAPER] Processing batch ${i/BATCH_SIZE + 1} (${batch.length} URLs)...`);
            
            const batchPromises = batch.map(async (b) => {
                const detailPage = await browser.newPage();
                try {
                    await detailPage.setRequestInterception(true);
                    detailPage.on('request', (req) => {
                        const allowed = ['document', 'script', 'xhr', 'fetch'];
                        if (!allowed.includes(req.resourceType())) {
                            req.abort();
                        } else {
                            req.continue();
                        }
                    });
                    await detailPage.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );
                    await detailPage.goto(b.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Wait for the main panel to load instead of arbitrary timeout
                    await detailPage.waitForSelector('h1', { timeout: 5000 }).catch(() => {});
                    await new Promise(resolve => setTimeout(resolve, 200)); // Drastically reduced delay

                    const details = await detailPage.evaluate(() => {
                        let rating = 'N/A';
                        let phone = 'No Contact';
                        let address = 'N/A';
                        let website = 'Not Available';

                        // Rating
                        const ratingMatch = document.body.textContent.match(/(\d\.\d)\s*stars?/);
                        if (ratingMatch) {
                            rating = `⭐ ${ratingMatch[1]}`;
                        } else {
                            const rEl = document.querySelector('div.fontDisplayLarge');
                            if (rEl) rating = `⭐ ${rEl.textContent.trim()}`;
                        }

                        // Website
                        const authorityBtn = document.querySelector('a[data-item-id="authority"]');
                        if (authorityBtn && authorityBtn.href) {
                            website = authorityBtn.href;
                        } else {
                            const websiteItem = Array.from(document.querySelectorAll('a[href^="http"]')).find(a => 
                                a.textContent.toLowerCase().includes('website') && !a.href.includes('google.com')
                            );
                            if (websiteItem) website = websiteItem.href;
                        }

                        // Address and Phone
                        const buttons = Array.from(document.querySelectorAll('button[data-item-id]'));
                        for (const btn of buttons) {
                            const itemId = btn.getAttribute('data-item-id') || '';
                            if (itemId === 'address' || itemId.startsWith('address:')) {
                                let text = btn.getAttribute('aria-label') || btn.textContent;
                                text = text.replace(/^Address:\s*/i, '').trim();
                                text = text.replace(/\s*\s*/g, '');
                                address = text;
                            }
                            if (itemId.startsWith('phone:')) {
                                let text = btn.getAttribute('aria-label') || btn.textContent;
                                text = text.replace(/^Phone:\s*/i, '').trim();
                                text = text.replace(/\s*\s*/g, '');
                                phone = text;
                            }
                        }

                        return { rating, phone, address, website };
                    });

                    return {
                        name: b.name,
                        rating: details.rating,
                        phone: details.phone,
                        address: details.address !== 'N/A' && details.address !== '' ? details.address : 'N/A',
                        website: details.website !== 'Not Available' && details.website !== '' ? details.website : 'Not Available',
                        url: b.url
                    };
                } catch (err) {
                    console.error(`[SCRAPER] Error extracting details for ${b.name}: ${err.message}`);
                    return {
                        name: b.name,
                        rating: 'N/A',
                        phone: 'No Contact',
                        address: 'N/A',
                        website: 'Not Available',
                        url: b.url
                    };
                } finally {
                    try {
                        await detailPage.goto('about:blank'); // Free memory
                        await detailPage.close();
                    } catch (e) {}
                }
            });
            
            const results = await Promise.all(batchPromises);
            data.push(...results);
        }
        
        console.log(`[SCRAPER] Successfully scraped ${data.length} results deeply.`);

        // Do not await to prevent the request from hanging if Puppeteer gets stuck
        browser.close().catch(err => console.error('[SCRAPER] Error closing browser:', err));

        return data;

    } catch (err) {

        console.error(`[SCRAPER ERROR] ${err.message}`);

        if (browser) {
            browser.close().catch(() => {});
        }

        return [];
    }
}

async function verifyApiKey(req, res, next) {

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key required'
        });
    }

    const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('api_key', apiKey)
        .eq('active', true)
        .single();

    if (error || !data) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    // ADD THIS BLOCK HERE
   
    req.apiKeyRecord = data;

    next();
}

  
      


// ============================================================================
// API ROUTES
// ============================================================================

// HEALTH CHECK
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'AELYX Maps Scraper API',
        status: 'online'
    });
});


// GENERATE API KEY
app.post('/generate-key', async (req, res) => {

    try {
        const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;

        const { error } = await supabase
            .from('api_keys')
            .insert([
                {
                    api_key: apiKey,
                    owner_name: 'dashboard-user'
                }
            ]);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            apiKey
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

// CUSTOM LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'aelyx2026';

    if (username === expectedUsername && password === expectedPassword) {
        res.json({
            success: true,
            token: 'aelyx_admin_session_token_2026'
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }
});

// API USAGE
app.get('/api/usage', verifyApiKey, async (req, res) => {

    res.json({
        success: true,
        requests_used:
            req.apiKeyRecord.requests_used,
        active:
            req.apiKeyRecord.active
    });

});

// ============================================================================
// SCRAPE ENDPOINT
// ============================================================================
app.post('/api/scrape', verifyApiKey, async (req, res) => {

    try {

           const { query, city, limit } = req.body;

       const searchQuery =
    city?.trim()
    ? `${query} ${city}`
    : query;

        // =========================================================================
        // VALIDATION
        // =========================================================================
        if (!query || typeof query !== 'string') {

            return res.status(400).json({
                success: false,
                error: 'Invalid search query'
            });
        }

        const safeLimit = Math.min(
            Number(limit) || 20,
            50
        );

        const results = await scrapeGoogleMaps(
            searchQuery,
            safeLimit
        );

        

        return res.json({
            success: true,
            total: results.length,
            data: results
        });

    } catch (err) {

        console.error(`[API ERROR] ${err.message}`);

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {

    console.log('\n========================================');
    console.log('🚀 AELYX API ONLINE');
    console.log(`🌐 Port: ${PORT}`);
    console.log('🔑 API Key Authentication Enabled');
    console.log('⚡ Rate Limiting Active');
    console.log('🛡️ Helmet Security Enabled');
    console.log('========================================\n');

});

// Increase server timeout to 10 minutes to prevent it from dropping long scraping requests
server.setTimeout(600000);