// ec2-sse-server.js
const express = require('express');
const app = express();

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectedWorkers = new Map();
const BATCH_SIZE = 10;

let scrapingTasks = [
    {tracking_number: "202407162948", type: 'mbl', code: '12AT'},
    {tracking_number: "A16FA00801", type: 'mbl', code: '12AT'},
    {tracking_number: "A92FX12150", type: 'mbl', code: '12AT'},
    { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' }, // Done
    { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' }, // Done
    { tracking_number: "254851590", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' }, // Failed
    { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' }, // Done
    { tracking_number: "SNLFSHJLE8A0361", type: 'mbl', code: "12IH" }, // Done
    { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" }, // Done
    { tracking_number: "253450396", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254866453", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254527448", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254198838", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "GDY0384003", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "GDY0385735", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "ANT1901431", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1900279", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1909899", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1912008", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1909944", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1915046", type: "mbl", code: "CMDU" }, // Done Check
    { tracking_number: "ZIMUSIN8154785", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "ZIMUSNH22125519", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "ZIMUSNH22204594", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "027F637762", type: "mbl", code: "22AA" },
    { tracking_number: "008FA02845", type: "mbl", code: "22AA"},
    { tracking_number: "175F000389", type: "mbl", code: "22AA"},
    { tracking_number: "008FX13961", type: "mbl", code: "22AA"}, // Over O/B date 120 days, data is not available.
    { tracking_number: "INAKV2570030", type: "mbl", code: "22AA"}, //  No Data
];

// Track workers and their current status
const workerStatus = new Map(); // clientId -> { status: 'idle'|'processing', lastBatchSize: number }

// SSE endpoint - laptops connect here to receive jobs
app.get('/jobs', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    
    const { clientId } = req.query;
    connectedWorkers.set(clientId, res);
    workerStatus.set(clientId, { status: 'idle', lastBatchSize: 0 });

    res.write('data: {"status": "connected"}\n\n');
    console.log(`🔌 Laptop connected (${clientId})`);
    console.log(`📊 Active workers: ${connectedWorkers.size}, Remaining tasks: ${scrapingTasks.length}`);

    // Immediately try to send a batch of jobs
    sendBatchToWorker(clientId);

    req.on('close', () => {
        connectedWorkers.delete(clientId);
        workerStatus.delete(clientId);
        console.log(`❌ Laptop disconnected (${clientId})`);
        console.log(`📊 Active workers: ${connectedWorkers.size}`);
    });
});

// POST endpoint for when workers complete their batch
app.post('/batch-complete', (req, res) => {
    const { status, timestamp, clientId } = req.body;
    console.log(`✅ Received batch completion notification: ${status} at ${timestamp} from client ${clientId}`);
    
    res.status(200).json({ 
        success: true, 
        message: 'Batch completion acknowledged',
        remainingTasks: scrapingTasks.length
    });
});

// Function to send a batch of jobs to a single worker
function sendBatchToWorker(clientId) {
    const worker = connectedWorkers.get(clientId);
    if (!worker) {
        console.log(`⚠️ Worker ${clientId} not found`);
        return;
    }

    // Update worker status
    const workerInfo = workerStatus.get(clientId);
    if (workerInfo) {
        workerInfo.status = 'processing';
    }

    if (scrapingTasks.length === 0) {
        console.log(`📭 No jobs available for ${clientId}`);
        // Don't send jobs_complete here - let the worker reconnect when ready
        return;
    }

    const batch = scrapingTasks.splice(0, Math.min(BATCH_SIZE, scrapingTasks.length));
    console.log(`📦 Sending batch of ${batch.length} jobs to ${clientId}`);

    // Send individual jobs (not batch markers since client expects individual jobs)
    batch.forEach((task, index) => {
        worker.write(`data: ${JSON.stringify(task)}\n\n`);
        console.log(`  📋 ${index + 1}. Sent: ${task.tracking_number} (${task.code})`);
    });

    // Signal that all jobs for this batch have been sent
    worker.write('data: {"status": "jobs_complete"}\n\n');
    console.log(`🎯 Batch complete signal sent to ${clientId}`);
    
    // Update worker info
    if (workerInfo) {
        workerInfo.lastBatchSize = batch.length;
    }

    console.log(`📊 Remaining tasks in queue: ${scrapingTasks.length}`);
    
    if (scrapingTasks.length === 0) {
        console.log(`🎉 All tasks have been distributed! Queue is now empty.`);
    }
}

// Endpoint to check server status
app.get('/status', (req, res) => {
    res.json({
        activeWorkers: connectedWorkers.size,
        remainingTasks: scrapingTasks.length,
        workers: Array.from(workerStatus.entries()).map(([id, info]) => ({
            id: id,
            status: info.status,
            lastBatchSize: info.lastBatchSize
        }))
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 EC2 SSE server running on port ${PORT}`);
});
