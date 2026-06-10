const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function run() {
    console.log("Starting browser...");
    const possiblePath = path.join(
        __dirname,
        '.cache',
        'puppeteer',
        'chrome',
        'win64-148.0.7778.167',
        'chrome-win64',
        'chrome.exe'
    );
    const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox']
    };
    if (fs.existsSync(possiblePath)) {
        launchOptions.executablePath = possiblePath;
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(`https://www.google.com/maps/search/Real+Estate+in+Dubai`, {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    await page.waitForSelector('a[href*="/maps/place/"]');

    const results = await page.evaluate(() => {
        const listings = Array.from(document.querySelectorAll('a[href*="/maps/place/"]')).slice(0, 5);
        const data = [];
        for (let listing of listings) {
            const name = listing.getAttribute('aria-label') || 'Unknown';
            const container = listing.closest('div[role="article"]') || listing.parentElement?.parentElement;
            if (!container) continue;

            let address = 'N/A';
            const w4efsdElements = Array.from(container.querySelectorAll('.W4Efsd'));
            
            let categoryAddressLine = '';
            for (const el of w4efsdElements) {
                const text = el.textContent.trim();
                if (
                    text.includes('·') && 
                    !text.includes('Open') && 
                    !text.includes('Closed') && 
                    !text.includes('Closes') && 
                    !text.includes('Opens') &&
                    !text.includes('24 hours')
                ) {
                    categoryAddressLine = text;
                    break;
                }
            }

            if (categoryAddressLine) {
                const parts = categoryAddressLine.split('·').map(p => p.trim());
                const addressParts = parts.filter(p => {
                    if (p.length <= 1) return false;
                    if (p.match(/^[\uE000-\uF8FF]+$/) || p.charCodeAt(0) > 10000) return false;
                    return true;
                });

                if (addressParts.length > 1) {
                    address = addressParts.slice(1).join(', ').trim();
                } else if (addressParts.length === 1) {
                    const cand = addressParts[0];
                    const isCategory = !cand.match(/\d/) && !cand.includes(',') && cand.length < 25;
                    if (!isCategory) {
                        address = cand;
                    }
                }
            }

            if (address === 'N/A' || address === '') {
                const rawTextNodes = Array.from(
                    container.querySelectorAll('div, span')
                ).filter(
                    el =>
                        el.children.length === 0 &&
                        el.textContent.trim().length > 3
                );

                const candidates = [];
                for (const node of rawTextNodes) {
                    const text = node.textContent.trim();
                    if (text.length <= 3) continue;
                    if (text.match(/^\d\.\d$/)) continue;
                    if (text.match(/^\(\d+\)$/) || text.includes('reviews')) continue;
                    const digits = text.replace(/\D/g, '');
                    if (digits.length >= 10 && digits.length <= 15) continue;
                    if (text === name || text.startsWith(name)) continue;
                    if (
                        text.includes('Open') || 
                        text.includes('Closed') || 
                        text.includes('24 hours') || 
                        text.includes('Closes') || 
                        text.includes('Opens')
                    ) continue;
                    candidates.push(text);
                }

                if (candidates.length === 1) {
                    address = candidates[0];
                } else if (candidates.length > 1) {
                    for (let i = 0; i < candidates.length; i++) {
                        const cand = candidates[i];
                        const isCategory = !cand.match(/\d/) && !cand.includes(',') && cand.length < 25;
                        if (isCategory) {
                            if (i + 1 < candidates.length) {
                                address = candidates[i + 1];
                                break;
                            }
                        } else {
                            address = cand;
                            break;
                        }
                    }
                }
            }

            // Sanitize Address
            const categoryKeywords = [
                'agency', 'agent', 'consultant', 'firm', 'developer', 'office', 'company', 
                'service', 'store', 'shop', 'restaurant', 'hotel', 'cafe', 'school', 
                'clinic', 'hospital', 'bank', 'gym', 'mall', 'market', 'dealer', 
                'contractor', 'builder', 'association', 'society', 'club', 'institute',
                'center', 'centre', 'authority', 'department', 'business', 'enterprise',
                'consultancy', 'broker', 'brokerage'
            ];

            const uiKeywords = [
                'website', 'directions', 'sponsored', 'visit site', 'share', 'call', 
                'ad', 'advertisement', 'directory', 'open', 'closed', 'closes', 'opens', 
                'reviews', 'stars', 'online appointments', 'in-store shopping', 'delivery',
                'pickup', 'dine-in'
            ];

            if (address && address !== 'N/A') {
                const lower = address.toLowerCase();
                let isValid = true;
                for (const kw of uiKeywords) {
                    if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    const hasCategoryKw = categoryKeywords.some(kw => lower.includes(kw));
                    const hasAddressIndicators = address.match(/\d/) || address.includes(',') || lower.includes('street') || lower.includes(' road ') || lower.includes(' rd ') || lower.includes(' st ') || lower.includes(' floor ') || lower.includes(' building ') || lower.includes(' plaza ');
                    if (hasCategoryKw && !hasAddressIndicators && address.length < 30) {
                        isValid = false;
                    }
                }
                if (!isValid) {
                    address = 'N/A';
                }
            }

            data.push({
                name,
                address
            });
        }
        return data;
    });

    console.log(JSON.stringify(results, null, 2));
    await browser.close();
}

run().catch(console.error);
