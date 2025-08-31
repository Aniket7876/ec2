const WebSocket = require('ws');
const AWS = require('aws-sdk');
const fs = require('fs');
const { type } = require('os');
const s3 = new AWS.S3({ region: 'ap-south-1' });

// Connect to the laptop’s WebSocket server
const ws = new WebSocket('https://daisy-leasing-breathing-sectors.trycloudflare.com');

ws.on('open', () => {
  console.log('Connected to local laptop’s browser');

  const scrapingTasks = [
    // { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' }, // Done
    { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' }, // Done
    // { tracking_number: "254851590", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' }, // Failed
    // { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' }, // Done
    // { tracking_number: "SNLFSHJLE8A0361", type: 'mbl', code: "12IH" }, // Done
    { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" }, // Done
    // { tracking_number: "253450396", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254866453", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254527448", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "254198838", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "GDY0384003", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "GDY0385735", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "ANT1901431", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "ZIMUSIN8154785", type: "mbl", code: "ZIMU" }, // Done
    // { tracking_number: "ZIMUSNH22125519", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "ZIMUSNH22204594", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "027F637762", type: "mbl", code: "22AA" },
    { tracking_number: "008FA02845", type: "mbl", code: "22AA"},
    { tracking_number: "175F000389", type: "mbl", code: "22AA"},
    { tracking_number: "008FX13961", type: "mbl", code: "22AA"}, // Over O/B date 120 days, data is not available.
    { tracking_number: "INAKV2570030", type: "mbl", code: "22AA"}, //  No Data
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

    // s3.putObject(params, (err) => {
    //   if (err) {
    //     console.error('S3 upload error:', err);
    //   } else {
    //     console.log(`Scraped data saved to s3://testbucketaniket7876/${s3Key}`);
    //   }
    // });
    // Collect responses in an array and write them all at once
    fs.appendFile('data.json', JSON.stringify(response, null, 2) + ',\n', (err) => {
      if (err) {
        console.error('File append error:', err);
      } else {
        console.log('Scraped data appended to data.json');
      }
    });

  } else {
    console.error('Error:', response.message);
  }
});

ws.on('error', (error) => console.error('WebSocket error:', error));
ws.on('close', () => console.log('Disconnected from laptop'));

// const WebSocket = require('ws');
// const AWS = require('aws-sdk');
// const fs = require('fs');
// const s3 = new AWS.S3({ region: 'ap-south-1' });

// const ws = new WebSocket('https://summaries-within-priced-earrings.trycloudflare.com');

// const scrapingTasks = [
//   { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' },
//   // { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' },
//   // { tracking_number: "254851590", type: 'mbl', code: 'MAEU' },
//   // { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' },
//   { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' },
//   // { tracking_number: "253450396", type: 'mbl', code: 'MAEU' },
//   // { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
//   // { tracking_number: "254527448", type: 'mbl', code: 'MAEU' },
//   // { tracking_number: "254198838", type: 'mbl', code: 'MAEU' },
//   // {tracking_number: "GDY0384003", type: "mbl", code: "CMDU"},
//   // {tracking_number: "GDY0385735", type: "mbl", code: "CMDU"},
//   // {tracking_number: "ANT1901431", type: "mbl", code: "CMDU"},
//   { tracking_number: "ZIMUSNH22204594", type: "mbl", code: "ZIMU" }
// ];

// ws.on('open', () => {
//   console.log('Connected to local laptop’s browser');

//   let index = 0;

//   const sendNextTask = () => {
//     if (index >= scrapingTasks.length) return;

//     const task = scrapingTasks[index];
//     ws.send(JSON.stringify({
//       action: "scrape",
//       tasks: [task]
//     }));
//     console.log(`Sent task: ${task.tracking_number}`);
//     index++;

//     setTimeout(sendNextTask, 2000);
//   };

//   sendNextTask();
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

//     // s3.putObject(params, (err) => {
//     //   if (err) {
//     //     console.error('S3 upload error:', err);
//     //   } else {
//     //     console.log(`Scraped data saved to s3://testbucketaniket7876/${s3Key}`);
//     //   }
//     // });
//     fs.appendFile('data.json', JSON.stringify(response, null, 2), (err) => {
//       if (err) {
//         console.error('File append error:', err);
//       } else {
//         console.log('Scraped data appended to data.json');
//       }
//     });

//   } else {
//     console.error('Error:', response.message);
//   }
// });

// ws.on('error', (error) => console.error('WebSocket error:', error));
// ws.on('close', () => console.log('Disconnected from laptop'));
