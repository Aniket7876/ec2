// ec2-sse-server.js
const express = require('express');
const app = express();

const connectedWorkers = new Map();

// SSE endpoint - laptop connects here to receive jobs
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
  
  // Send jobs immediately when laptop connects
  console.log(`📡 Laptop connected (${workerId}), sending jobs immediately...`);
  setTimeout(() => {
    sendJobsToLaptop();
  }, 1000); // Short delay to ensure connection is stable
  
  req.on('close', () => {
    connectedWorkers.delete(workerId);
    console.log(`📡 Laptop disconnected (${workerId})`);
  });
});

// Remove the original setTimeout at the bottom


function sendJobsToLaptop() {
  console.log(`📦 Starting to send jobs to ${connectedWorkers.size} workers...`);
  
  const scrapingTasks = [
    { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' },
    { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" },
    { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
  ];

  connectedWorkers.forEach((worker, workerId) => {
    console.log(`📤 Sending ${scrapingTasks.length} tasks to worker ${workerId}`);
    
    scrapingTasks.forEach(task => {
      worker.write(`data: ${JSON.stringify(task)}\n\n`);
      console.log(`  → Sent: ${task.tracking_number} (${task.code})`);
    });
    
    // Signal end of jobs
    worker.write('data: {"status": "jobs_complete"}\n\n');
    console.log(`✅ All jobs sent to worker ${workerId}`);
  });
}


app.listen(3000, () => {
  console.log('EC2 SSE server running on port 3000');
});
