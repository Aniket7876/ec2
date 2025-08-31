// ec2-sse-server.js
const express = require('express');
const app = express();

const connectedWorkers = new Map();

// SSE endpoint - laptop connects here to receive jobs
app.get('/jobs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const workerId = 'laptop-' + Date.now();
  connectedWorkers.set(workerId, res);
  
  res.write('data: {"status": "connected"}\n\n');
  
  req.on('close', () => {
    connectedWorkers.delete(workerId);
  });
});

// Send jobs to laptop
function sendJobsToLaptop() {
  const scrapingTasks = [
    { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' },
    { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" },
    { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
    // ... all your tasks
  ];

  connectedWorkers.forEach((worker) => {
    scrapingTasks.forEach(task => {
      worker.write(`data: ${JSON.stringify(task)}\n\n`);
    });
    // Signal end of jobs
    worker.write('data: {"status": "jobs_complete"}\n\n');
  });
}

// Start sending jobs when laptop connects
setTimeout(() => {
  if (connectedWorkers.size > 0) {
    sendJobsToLaptop();
  }
}, 2000);

app.listen(3000, () => {
  console.log('EC2 SSE server running on port 3000');
});
