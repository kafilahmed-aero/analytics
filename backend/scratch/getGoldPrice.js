const endpoints = [
  'https://api.gold-api.com/price/XAU',
  'https://query1.finance.yahoo.com/v8/finance/chart/GCZ26.CMX?interval=1m&range=1d',
];

const run = async () => {
  for (const url of endpoints) {
    try {
      console.log(`Fetching from ${url}...`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (url.includes('gold-api.com')) {
          console.log(`Gold API price: ${data.price}, updatedAt: ${data.updatedAt}`);
        } else {
          const meta = data.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice || meta?.chartPreviousClose;
          console.log(`Yahoo price: ${price}`);
        }
      } else {
        console.log(`Failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
};

run();
