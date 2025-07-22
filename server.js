const WebSocket = require('ws');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'ap-south-1' });

// Connect to the laptop’s WebSocket server (replace with your ngrok URL)
const ws = new WebSocket('https://many-goats-show.loca.lt');

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  // Define the scraping tasks you want to send
  const scrapingTasks = [
    {
      tracking_number: "SSESEA2504249893",
      type: 'mbl',
      code: 'uwld'
    }
    // Add as many task objects as you need
  ];

  // Send a command with multiple scraping tasks
  ws.send(JSON.stringify({
    action: "scrape",
    tasks: scrapingTasks
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.status === 'success') {
    const params = {
      Bucket: 'testbucketaniket7876',
      Key: `${response.code}/${response.trackingNumber}.json`,
      Body: JSON.stringify(response.rawData, null, 2),
      ContentType: 'application/json'
    };

    s3.putObject(params, (err) => {
      if (err) {
        console.error('S3 upload error:', err);
      } else {
        console.log(`Scraped data saved to s3://testbucketaniket7876/${response.code}/${response.trackingNumber}.json`);
      }
    });
  } else {
    console.error('Error:', response.message);
  }
});

ws.on('error', (error) => console.error('WebSocket error:', error));
ws.on('close', () => console.log('Disconnected from laptop'));