// ec2-sse-server.js
const express = require('express');
const app = express();

const connectedWorkers = new Map();

// SSE endpoint - laptop connects here to receive jobs
app.get('/jobs', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const workerId = 'laptop-' + Date.now();
  connectedWorkers.set(workerId, res);
  
  res.write('data: {"status": "connected"}\n\n');

  console.log(`Laptop connected (${workerId}), sending jobs`);

  console.log("Waiting for 10 sec")
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  setTimeout(() => {
    sendJobsToLaptop();
  }, 1000);
  
  req.on('close', () => {
    connectedWorkers.delete(workerId);
    console.log(`Laptop disconnected (${workerId})`);
  });
});

// Move scrapingTasks to module level so it can be modified
let scrapingTasks = [
    // { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' }, // Done
    // { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' }, // Done
    // { tracking_number: "254851590", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' }, // Failed
    // { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' }, // Done
    // { tracking_number: "SNLFSHJLE8A0361", type: 'mbl', code: "12IH" }, // Done
    // { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" }, // Done
    // { tracking_number: "253450396", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "254866453", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "254527448", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "254198838", type: 'mbl', code: 'MAEU' }, // Done
    // { tracking_number: "GDY0384003", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "GDY0385735", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "ANT1901431", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "AEL1900279", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "AEL1909899", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "AEL1912008", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "AEL1909944", type: "mbl", code: "CMDU" }, // Done
    // { tracking_number: "AEL1915046", type: "mbl", code: "CMDU" }, // Done Check
    // { tracking_number: "ZIMUSIN8154785", type: "mbl", code: "ZIMU" }, // Done
    // { tracking_number: "ZIMUSNH22125519", type: "mbl", code: "ZIMU" }, // Done
    // { tracking_number: "ZIMUSNH22204594", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "027F637762", type: "mbl", code: "22AA" },
    // { tracking_number: "008FA02845", type: "mbl", code: "22AA"},
    // { tracking_number: "175F000389", type: "mbl", code: "22AA"},
    // { tracking_number: "008FX13961", type: "mbl", code: "22AA"}, // Over O/B date 120 days, data is not available.
    // { tracking_number: "INAKV2570030", type: "mbl", code: "22AA"}, //  No Data
];

function sendJobsToLaptop() {
  console.log(`📦 Starting to send jobs to ${connectedWorkers.size} workers...`);
  
  connectedWorkers.forEach((worker, workerId) => {
    console.log(`Sending ${scrapingTasks.length} tasks to worker ${workerId}`);
    
    // Send all jobs first
    scrapingTasks.forEach(task => {
      worker.write(`data: ${JSON.stringify(task)}\n\n`);
      console.log(`  → Sent: ${task.tracking_number} (${task.code})`);
    });
    
    // Signal end of jobs
    worker.write('data: {"status": "jobs_complete"}\n\n');
    console.log(`All jobs sent to worker ${workerId}`);
  });

  console.log(`Jobs cleared from memory`);
}

app.listen(3000, () => {
  console.log('EC2 SSE server running on port 3000');
});

