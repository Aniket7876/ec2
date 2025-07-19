const WebSocket = require('ws');

// Connect to the laptop’s WebSocket server (replace with your ngrok URL)
const ws = new WebSocket('https://many-cows-jump.loca.lt');

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  // Send a scraping command
  ws.send(JSON.stringify({
    url: 'http://books.toscrape.com/',
    action: 'scrape',
    selector: 'title', // Example: Scrape the page title
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  if (response.status === 'success') {
    console.log('Scraped data:', response.result);
  } else {
    console.error('Error:', response.message);
  }
});

ws.on('error', (error) => console.error('WebSocket error:', error));
ws.on('close', () => console.log('Disconnected from laptop'));