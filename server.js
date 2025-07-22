const WebSocket = require('ws');

// Connect to the laptop’s WebSocket server (replace with your ngrok URL)
const ws = new WebSocket('https://bright-ghosts-cheer.loca.lt');

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  // Send a scraping command
  ws.send(JSON.stringify({
    tracking_number: "SSESEA2504249893",
    type: 'mbl',
    action: "scrape"
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  if (response.status === 'success') {
    const fs = require('fs');
    fs.writeFileSync('test1.json', JSON.stringify(response.result, null, 2));
    console.log('Scraped data saved to test.json');
    
  } else {
    console.error('Error:', response.message);
  }
});

ws.on('error', (error) => console.error('WebSocket error:', error));
ws.on('close', () => console.log('Disconnected from laptop'));