// const WebSocket = require('ws');
// const AWS = require('aws-sdk');
// const s3 = new AWS.S3({ region: 'ap-south-1' });

// // Connect to the laptop’s WebSocket server
// const ws = new WebSocket('wss://crawford-incl-dimension-reef.trycloudflare.com');

// ws.on('open', () => {
//   console.log('Connected to local laptop’s browser');

//   const scrapingTasks = [
//     { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' },
//     { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' },
//     { tracking_number: "254851590", type: 'mbl', code: 'MAEU' },
//     { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' },
//     { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' },
//     { tracking_number: "253450396", type: 'mbl', code: 'MAEU' },
//     { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
//     { tracking_number: "254527448", type: 'mbl', code: 'MAEU' },
//     { tracking_number: "254198838", type: 'mbl', code: 'MAEU' },
//   ];

//   ws.send(JSON.stringify({
//     action: "scrape",
//     tasks: scrapingTasks
//   }));
// });

// ws.on('message', (data) => {
//   const response = JSON.parse(data);

//   if (response.status === 'success') {
//     const s3Key = `${response.code.toLowerCase()}/${response.trackingNumber.toLowerCase()}.json`;
//     const params = {
//       Bucket: 'testbucketaniket7876',
//       Key: s3Key,
//       Body: JSON.stringify(response.rawData, null, 2),
//       ContentType: 'application/json'
//     };

//     s3.putObject(params, (err) => {
//       if (err) {
//         console.error('S3 upload error:', err);
//       } else {
//         console.log(`Scraped data saved to s3://testbucketaniket7876/${s3Key}`);
//       }
//     });
//   } else {
//     console.error('Error:', response.message);
//   }
// });

// ws.on('error', (error) => console.error('WebSocket error:', error));
// ws.on('close', () => console.log('Disconnected from laptop'));

const WebSocket = require('ws');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'ap-south-1' });

const ws = new WebSocket('wss://html-mls-follows-communications.trycloudflare.com');

const scrapingTasks = [
  { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' },
  { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' },
  { tracking_number: "254851590", type: 'mbl', code: 'MAEU' },
  { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' },
  { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' },
  { tracking_number: "253450396", type: 'mbl', code: 'MAEU' },
  { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
  { tracking_number: "254527448", type: 'mbl', code: 'MAEU' },
  { tracking_number: "254198838", type: 'mbl', code: 'MAEU' },
];

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  let index = 0;

  const sendNextTask = () => {
    if (index >= scrapingTasks.length) return;

    const task = scrapingTasks[index];
    ws.send(JSON.stringify({
      action: "scrape",
      tasks: [task]
    }));
    console.log(`Sent task: ${task.tracking_number}`);
    index++;

    setTimeout(sendNextTask, 2000);
  };

  sendNextTask();
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
