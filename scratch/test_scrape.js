const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const query = "Real Estate in Dubai";
    console.log(`Searching for: ${query}`);
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    try {
        await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 15000 });
    } catch (e) {
        console.log("No results found");
        await browser.close();
        return;
    }

    console.log("Extracting results...");
    const results = await page.evaluate(() => {
        const listings = Array.from(document.querySelectorAll('a[href*="/maps/place/"]')).slice(0, 5);
        const data = [];
        for (let listing of listings) {
            const name = listing.getAttribute('aria-label') || 'Unknown';
            const container = listing.closest('div[role="article"]') || listing.parentElement?.parentElement;
            if (!container) continue;

            const rawTextNodes = Array.from(
                container.querySelectorAll('div, span')
            ).filter(
                el => el.children.length === 0 && el.textContent.trim().length > 3
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

            let address = 'N/A';
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

            data.push({
                name,
                candidates,
                address
            });
        }
        return data;
    });

    console.log("Scraped results:", JSON.stringify(results, null, 2));
    await browser.close();
}

run().catch(console.error);
