const WebSocket = require('ws');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'ap-south-1' });

// Connect to the laptop’s WebSocket server
const ws = new WebSocket('https://injured-obtained-anniversary-fog.trycloudflare.com');

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  const scrapingTasks = [
    {
      tracking_number: "SNLFNJJL001257",
      type: 'mbl',
      code: '12IH'
    },
    {
      tracking_number: "SNLFNJJL001202",
      type: 'mbl',
      code: '12IH'
    }
  ];

  ws.send(JSON.stringify({
    action: "scrape",
    tasks: scrapingTasks
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.status === 'success') {
    const s3Key = `${response.code.toLowerCase()}/${response.trackingNumber.toLowerCase()}.json`;
    const params = {
      Bucket: 'testbucketaniket7876',
      Key: s3Key,
      Body: JSON.stringify(response.rawData, null, 2),
      ContentType: 'application/json'
    };

    s3.putObject(params, (err) => {
      if (err) {
        console.error('S3 upload error:', err);
      } else {
        console.log(`Scraped data saved to s3://testbucketaniket7876/${s3Key}`);
      }
    });
  } else {
    console.error('Error:', response.message);
  }
});

ws.on('error', (error) => console.error('WebSocket error:', error));
ws.on('close', () => console.log('Disconnected from laptop'));