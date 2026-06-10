const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testScrape() {
    const path = require('path');
    const possiblePath = path.join(
        __dirname,
        '.cache',
        'puppeteer',
        'chrome',
        'win64-148.0.7778.167',
        'chrome-win64',
        'chrome.exe'
    );
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: require('fs').existsSync(possiblePath) ? possiblePath : undefined,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // An example business in Dubai
    await page.goto('https://www.google.com/maps/place/Dubai+Real+Estate+Agency/data=!4m2!3m1!1s0x0:0x0?hl=en', { waitUntil: 'networkidle2' });
    // Let's just go to a search directly
    await page.goto('https://www.google.com/maps/search/Real+Estate+Agencies+in+Dubai', { waitUntil: 'networkidle2' });
    
    // Wait for first result
    await page.waitForSelector('a[href*="/maps/place/"]');
    
    const href = await page.evaluate(() => document.querySelector('a[href*="/maps/place/"]').href);
    console.log("Found listing URL: ", href);
    
    const detailPage = await browser.newPage();
    await detailPage.goto(href, { waitUntil: 'networkidle2' });
    
    const details = await detailPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[data-item-id]')).map(b => ({
            id: b.getAttribute('data-item-id'),
            text: b.textContent.trim(),
            aria: b.getAttribute('aria-label')
        }));
        
        // Also look for class W4Efsd or similar
        return buttons;
    });
    
    console.log(JSON.stringify(details, null, 2));
    
    await browser.close();
}

testScrape().catch(console.error);
