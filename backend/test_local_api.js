async function test() {
    console.log("Generating key...");
    const resKey = await fetch('http://localhost:5000/generate-key', { method: 'POST' });
    const { apiKey } = await resKey.json();
    console.log("Key:", apiKey);

    console.log("Starting scrape with limit 20...");
    const resScrape = await fetch('http://localhost:5000/api/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            query: 'restaurants',
            city: 'Dubai',
            limit: 20
        })
    });
    const data = await resScrape.json();
    console.log("Scrape Success:", data.success);
    console.log("Total Found:", data.total);
    console.log("Data sample:", JSON.stringify(data.data.slice(0, 2), null, 2));
}

test().catch(console.error);
