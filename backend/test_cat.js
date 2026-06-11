const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const path = require('path');
    const fs = require('fs');
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
            console.error(e.message);
        }
        return null;
    }
    const cacheDir = path.join(__dirname, '.cache', 'puppeteer');
    const localChromePath = findChromeExecutable(cacheDir);
    const launchOptions = { headless: 'new' };
    if (localChromePath) launchOptions.executablePath = localChromePath;

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto('https://www.google.com/maps/place/The+Dubai+Mall/@25.197197,55.2797693,15z/data=!4m6!3m5!1s0x3e5f43348a67e24b:0xff45e502e1ceb7e2!8m2!3d25.197197!4d55.2797693!16zL20vMDlnejU0?entry=ttu&g_ep=EgoyMDI1MDMwNC4wIKXMDSoASAFQAw%3D%3D', { waitUntil: 'networkidle2' });

    const categories = await page.evaluate(() => {
        let categoryName = 'N/A';
        
        // Try looking for button with jsaction="pane.rating.category"
        const categoryBtn = document.querySelector('button[jsaction="pane.rating.category"]');
        if (categoryBtn) {
            categoryName = categoryBtn.textContent.trim();
        } else {
            // Find .fontBodyMedium that contains · and a category
            const bodyMediums = Array.from(document.querySelectorAll('.fontBodyMedium'));
            for (const el of bodyMediums) {
                const text = el.textContent.trim();
                // E.g., "Shopping mall·" or "Restaurant·" or "Landmark·"
                if (text.includes('·') && !text.includes('Open') && !text.includes('Closes')) {
                    const parts = text.split('·').map(p => p.trim());
                    // The first part is usually the category if it doesn't have digits
                    if (parts[0] && !/\d/.test(parts[0]) && parts[0].length > 3 && parts[0].length < 40) {
                        categoryName = parts[0];
                        break;
                    }
                }
            }
            
            // If still N/A, just look at the first button inside the same container as rating
            if (categoryName === 'N/A') {
                 const buttons = Array.from(document.querySelectorAll('button[class*="DkEaL"]'));
                 if (buttons.length > 0) {
                     categoryName = buttons[0].textContent.trim();
                 }
            }
        }

        return { categoryName };
    });

    console.log(categories);
    await browser.close();
}
run();
