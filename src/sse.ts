// ec2-sse-server.ts
import express, { Request, Response } from 'express';
import { 
  Task, 
  WorkerStatus, 
  BatchCompletionRequest, 
  TaskAdditionRequest, 
  TaskAdditionResponse, 
  BatchCompletionResponse, 
  StatusResponse,
  SSEEvent
} from './interfaces';

const app = express();

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectedWorkers = new Map<string, Response>();
const LOW_PRIORITY_BATCH_SIZE = 5;
const HIGH_PRIORITY_BATCH_SIZE = 20;

let lowPriorityTasks: Task[] = [
    { tracking_number: "WHI251000446", type: 'mbl', code: '12GE' },
    { tracking_number: "WHI251000518", type: 'mbl', code: '12GE' },
    { tracking_number: "WHI251000482", type: 'mbl', code: '12GE' },
    { tracking_number: "WHI251000416", type: 'mbl', code: '12GE' },
    { tracking_number: "202407162948", type: 'mbl', code: '12AT' },
    { tracking_number: "A16FA00801", type: 'mbl', code: '12AT' },
    { tracking_number: "A92FX12150", type: 'mbl', code: '12AT' }, // Done
    { tracking_number: "SSECLE2403203859", type: 'mbl', code: 'UWLD' }, // Done
    { tracking_number: "HLCUBO12507BCTE1", type: 'mbl', code: 'HLCU' }, // Done
    { tracking_number: "HLCUBO12507BCTE1", type: 'mbl', code: 'HLCU' }, // Done
    { tracking_number: "SNLFNJJL001257", type: 'mbl', code: '12IH' }, // Done
    { tracking_number: "SNLFSHJLE8A0386", type: 'mbl', code: "12IH" }, // Done
    { tracking_number: "254851590", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "MRKU8203610", type: 'mbl', code: 'MAEU' }, // Failed
    { tracking_number: "254527448", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "254198838", type: 'mbl', code: 'MAEU' }, // Done
    { tracking_number: "ANT1901431", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1900279", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1909899", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1912008", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1909944", type: "mbl", code: "CMDU" }, // Done
    { tracking_number: "AEL1915046", type: "mbl", code: "CMDU" }, // Done Check
    { tracking_number: "ZIMUSIN8154785", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "ZIMUSNH22204594", type: "mbl", code: "ZIMU" }, // Done
    { tracking_number: "175F000389", type: "mbl", code: "22AA"},
    { tracking_number: "008FX13961", type: "mbl", code: "22AA"}, // Over O/B date 120 days, data is not available.
    { tracking_number: "INAKV2570030", type: "mbl", code: "22AA"}, //  No Data
];

let highPriorityTasks: Task[] = [
    { tracking_number: "WHI251000446", type: 'mbl', code: '12GE' },
    { tracking_number: "A16FA00801", type: 'mbl', code: '12AT' },
    { tracking_number: "SSESEA2504249893", type: 'mbl', code: 'UWLD' },
    { tracking_number: "14076330", type: 'bkc', code: 'HLCU' },
    { tracking_number: "SNLFSHJLE8A0361", type: 'mbl', code: "12IH" },
    { tracking_number: "253450396", type: 'mbl', code: 'MAEU' },
    { tracking_number: "254866453", type: 'mbl', code: 'MAEU' },
    { tracking_number: "GDY0384003", type: "mbl", code: "CMDU" },
    { tracking_number: "GDY0385735", type: "mbl", code: "CMDU" },
    { tracking_number: "ZIMUSNH22125519", type: "mbl", code: "ZIMU" },
    { tracking_number: "027F637762", type: "mbl", code: "22AA" },
    { tracking_number: "008FA02845", type: "mbl", code: "22AA"},
];

// Track workers and their current status
const workerStatus = new Map<string, WorkerStatus>(); // clientId -> { status: 'idle'|'processing', lastBatchSize: number }

// Function to find idle workers and send them tasks
function distributeTasksToIdleWorkers(): void {
    console.log(`Checking for idle workers to distribute tasks...`);
    
    // Find all idle workers
    const idleWorkers: string[] = [];
    for (const [clientId, status] of workerStatus.entries()) {
        if (status.status === 'idle' && connectedWorkers.has(clientId)) {
            idleWorkers.push(clientId);
        }
    }
    
    console.log(`Found ${idleWorkers.length} idle workers`);
    
    // Send tasks to idle workers
    idleWorkers.forEach(clientId => {
        sendBatchToWorker(clientId);
    });
}

// SSE endpoint - laptops connect here to receive jobs
app.get('/jobs', (req: Request, res: Response) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    
    const { clientId } = req.query as { clientId: string };
    connectedWorkers.set(clientId, res);
    workerStatus.set(clientId, { status: 'idle', lastBatchSize: 0 });

    res.write('data: {"status": "connected"}\n\n');
    console.log(`Laptop connected (${clientId})`);
    console.log(`Active workers: ${connectedWorkers.size}, High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Immediately try to send a batch of jobs
    sendBatchToWorker(clientId);

    req.on('close', () => {
        connectedWorkers.delete(clientId);
        workerStatus.delete(clientId);
        console.log(`Laptop disconnected (${clientId})`);
        console.log(`Active workers: ${connectedWorkers.size}`);
    });
});

// POST endpoint for when workers complete their batch
app.post('/batch-complete', (req: Request<{}, BatchCompletionResponse, BatchCompletionRequest>, res: Response<BatchCompletionResponse>) => {
    const { status, timestamp, clientId } = req.body;
    console.log(`Received batch completion notification: ${status} at ${timestamp} from client ${clientId}`);
    
    // Mark worker as idle
    const workerInfo = workerStatus.get(clientId);
    if (workerInfo) {
        workerInfo.status = 'idle';
    }
    
    const response: BatchCompletionResponse = {
        success: true,
        message: 'Batch completion acknowledged',
        remainingTasks: {
            highPriority: highPriorityTasks.length,
            lowPriority: lowPriorityTasks.length,
            total: highPriorityTasks.length + lowPriorityTasks.length
        }
    };

    res.status(200).json(response);

    // After marking worker as idle, try to send more tasks
    setTimeout(() => {
        sendBatchToWorker(clientId);
    }, 100); // Small delay to ensure status update is processed
});

app.post("/add-task-high", (req: Request<{}, TaskAdditionResponse, TaskAdditionRequest>, res: Response<TaskAdditionResponse>) => {
    const { tracking_number, type, code } = req.body;

    const newTask: Task = {
        tracking_number,
        type,
        code,
    };

    highPriorityTasks.push(newTask);
    console.log("New HIGH PRIORITY task added");
    console.log(`High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Immediately try to distribute the new task to idle workers
    distributeTasksToIdleWorkers();

    const response: TaskAdditionResponse = {
        message: "High priority task added successfully",
        task: newTask,
        remainingTasks: {
            highPriority: highPriorityTasks.length,
            lowPriority: lowPriorityTasks.length,
            total: highPriorityTasks.length + lowPriorityTasks.length
        }
    };

    res.status(201).json(response);
});

app.post("/add-task-low", (req: Request<{}, TaskAdditionResponse, TaskAdditionRequest>, res: Response<TaskAdditionResponse>) => {
    const { tracking_number, type, code } = req.body;

    const newTask: Task = {
        tracking_number,
        type,
        code,
    };

    lowPriorityTasks.push(newTask);
    console.log("New LOW PRIORITY task added");
    console.log(`High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Immediately try to distribute the new task to idle workers
    distributeTasksToIdleWorkers();

    const response: TaskAdditionResponse = {
        message: "Low priority task added successfully",
        task: newTask,
        remainingTasks: {
            highPriority: highPriorityTasks.length,
            lowPriority: lowPriorityTasks.length,
            total: highPriorityTasks.length + lowPriorityTasks.length
        }
    };

    res.status(201).json(response);
});

// Function to send a batch of jobs to a single worker
function sendBatchToWorker(clientId: string): number {
    const worker = connectedWorkers.get(clientId);
    if (!worker) {
        console.log(`Worker ${clientId} not found`);
        return 0;
    }

    // Check worker status - don't send if already processing
    const workerInfo = workerStatus.get(clientId);
    if (workerInfo && workerInfo.status === 'processing') {
        console.log(`Worker ${clientId} is already processing, skipping`);
        return 0;
    }

    // Check if both queues are empty
    if (highPriorityTasks.length === 0 && lowPriorityTasks.length === 0) {
        console.log(`No jobs available for ${clientId}`);
        return 0;
    }

    // Update worker status
    if (workerInfo) {
        workerInfo.status = 'processing';
    }

    let batch: Task[] = [];
    let priorityType = '';

    // Priority logic: Check high priority tasks first
    if (highPriorityTasks.length > 0) {
        batch = highPriorityTasks.splice(0, Math.min(HIGH_PRIORITY_BATCH_SIZE, highPriorityTasks.length));
        priorityType = 'HIGH PRIORITY';
        console.log(`Sending batch of ${batch.length} HIGH PRIORITY jobs to ${clientId}`);
    } else if (lowPriorityTasks.length > 0) {
        batch = lowPriorityTasks.splice(0, Math.min(LOW_PRIORITY_BATCH_SIZE, lowPriorityTasks.length));
        priorityType = 'LOW PRIORITY';
        console.log(`Sending batch of ${batch.length} LOW PRIORITY jobs to ${clientId}`);
    }

    if (batch.length === 0) {
        console.log(`No tasks to send to ${clientId}`);
        return 0;
    }

    // Send individual jobs (not batch markers since client expects individual jobs)
    batch.forEach((task, index) => {
        worker.write(`data: ${JSON.stringify(task)}\n\n`);
        console.log(` ${index + 1}. Sent: ${task.tracking_number} (${task.code}) - ${priorityType}`);
    });

    // Signal that all jobs for this batch have been sent
    worker.write('data: {"status": "jobs_complete"}\n\n');
    console.log(`Batch complete signal sent to ${clientId}`);
    
    // Update worker info
    if (workerInfo) {
        workerInfo.lastBatchSize = batch.length;
    }

    console.log(`Remaining tasks - High Priority: ${highPriorityTasks.length}, Low Priority: ${lowPriorityTasks.length}`);
    
    if (highPriorityTasks.length === 0 && lowPriorityTasks.length === 0) {
        console.log(`All tasks have been distributed! Both queues are now empty.`);
    }

    return batch.length; // Return number of tasks sent
}

// Endpoint to check server status
app.get('/status', (req: Request, res: Response<StatusResponse>) => {
    const response: StatusResponse = {
        activeWorkers: connectedWorkers.size,
        remainingTasks: {
            highPriority: highPriorityTasks.length,
            lowPriority: lowPriorityTasks.length,
            total: highPriorityTasks.length + lowPriorityTasks.length
        },
        workers: Array.from(workerStatus.entries()).map(([id, info]) => ({
            id: id,
            status: info.status,
            lastBatchSize: info.lastBatchSize
        }))
    };

    res.json(response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EC2 SSE server running on port ${PORT}`);
});
