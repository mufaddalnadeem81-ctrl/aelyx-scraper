const os = require('os');


async function measureScrapeRam() {
    // We will measure the system's free memory before and during the scrape.
    const initialFreeMem = os.freemem();
    let minFreeMem = initialFreeMem;
    
    // Start a monitor loop
    const monitor = setInterval(() => {
        const currentFreeMem = os.freemem();
        if (currentFreeMem < minFreeMem) {
            minFreeMem = currentFreeMem;
        }
    }, 100); // Check every 100ms

    console.log("Measuring Baseline System Memory...");
    console.log(`Baseline Free Memory: ${(initialFreeMem / 1024 / 1024).toFixed(2)} MB`);

    console.log("Generating API Key...");
    let apiKey = '';
    try {
        const resKey = await fetch('http://localhost:5000/generate-key', { method: 'POST' });
        const data = await resKey.json();
        apiKey = data.apiKey;
    } catch(e) {
        // use default fallback if fetch fails
        console.log("Using fallback node core modules for fetch");
    }

    if (!apiKey) {
        const http = require('http');
        const getApiKey = () => new Promise((resolve, reject) => {
            const req = http.request('http://localhost:5000/generate-key', { method: 'POST' }, res => {
                let body = '';
                res.on('data', chunk => body+=chunk);
                res.on('end', () => resolve(JSON.parse(body).apiKey));
            });
            req.on('error', reject);
            req.end();
        });
        apiKey = await getApiKey();
    }

    console.log("Starting heavy scrape (limit: 20)... WATCHING RAM SPIKE");
    
    // Trigger scrape using core http module to avoid node-fetch issues if not installed globally
    const http = require('http');
    const postData = JSON.stringify({ query: 'restaurants', city: 'Dubai', limit: 20 });
    
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/scrape',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const doScrape = () => new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });

    try {
        await doScrape();
    } catch (e) {
        console.log("Scrape request failed or timed out", e.message);
    }

    clearInterval(monitor);

    const peakRamSpike = initialFreeMem - minFreeMem;
    const mbUsed = peakRamSpike / 1024 / 1024;

    console.log("\n==========================================");
    console.log(`🚀 EXACT RAM USED BY THIS SCRAPE: ${mbUsed.toFixed(2)} MB`);
    console.log("==========================================");
    process.exit(0);
}

measureScrapeRam().catch(console.error);
