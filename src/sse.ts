// ec2-sse-server.ts
import express, { Request, Response } from 'express';
import { 
  Task, 
  WorkerStatus, 
  TaskAdditionRequest, 
  TaskAdditionResponse, 
  StatusResponse,
} from './interfaces';

const app = express();

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectedWorkers = new Map<string, Response>();
const LOW_PRIORITY_BATCH_SIZE = 5;
const HIGH_PRIORITY_BATCH_SIZE = 20;

let lowPriorityTasks: Task[] = [];

let highPriorityTasks: Task[] = [];

// Track workers and their current status
const workerStatus = new Map<string, WorkerStatus>(); // clientId -> { status: 'idle'|'processing'|'waiting', lastBatchSize: number, queuePosition?, joinedAt: number }
const workerQueue: string[] = []; // FIFO queue of workers waiting for jobs

// Function to add worker to queue
function addWorkerToQueue(clientId: string): void {
    if (!workerQueue.includes(clientId) && connectedWorkers.has(clientId)) {
        workerQueue.push(clientId);
        const workerInfo = workerStatus.get(clientId);
        if (workerInfo) {
            workerInfo.status = 'waiting';
            workerInfo.queuePosition = workerQueue.length;
            workerInfo.joinedAt = Date.now();
        }
        console.log(`Worker ${clientId} added to queue at position ${workerQueue.length}`);
    }
}

// Function to distribute tasks to workers in queue order
function distributeTasksToQueuedWorkers(): void {
    console.log(`Checking for workers in queue to distribute tasks...`);
    console.log(`Queue length: ${workerQueue.length}, High Priority: ${highPriorityTasks.length}, Low Priority: ${lowPriorityTasks.length}`);
    
    // Check if there are any tasks available
    if (highPriorityTasks.length === 0 && lowPriorityTasks.length === 0) {
        console.log(`No tasks available, keeping ${workerQueue.length} workers in queue`);
        return;
    }
    
    // Process workers in queue order (FIFO) - continue until no more tasks or workers
    while (workerQueue.length > 0 && (highPriorityTasks.length > 0 || lowPriorityTasks.length > 0)) {
        const clientId = workerQueue.shift()!; // Remove first worker from queue
        
        // Check if worker is still connected
        if (!connectedWorkers.has(clientId)) {
            console.log(`Worker ${clientId} no longer connected, removing from queue`);
            continue;
        }
        
        // Send tasks to this worker
        const tasksSent = sendBatchToWorker(clientId);
        if (tasksSent > 0) {
            console.log(`Sent ${tasksSent} tasks to worker ${clientId}`);
        } else {
            // If no tasks were sent, put worker back in queue and break
            workerQueue.unshift(clientId);
            break;
        }
    }
    
    // Update queue positions for remaining workers
    workerQueue.forEach((clientId, index) => {
        const workerInfo = workerStatus.get(clientId);
        if (workerInfo) {
            workerInfo.queuePosition = index + 1;
        }
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
    workerStatus.set(clientId, { 
        status: 'waiting', 
        lastBatchSize: 0, 
        queuePosition: 0,
        joinedAt: Date.now()
    });

    res.write('data: {"status": "connected"}\n\n');
    console.log(`Laptop connected (${clientId})`);
    console.log(`Active workers: ${connectedWorkers.size}, High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Add worker to queue and try to distribute tasks
    addWorkerToQueue(clientId);
    distributeTasksToQueuedWorkers();

    req.on('close', () => {
        connectedWorkers.delete(clientId);
        workerStatus.delete(clientId);
        
        // Remove from queue if present
        const queueIndex = workerQueue.indexOf(clientId);
        if (queueIndex !== -1) {
            workerQueue.splice(queueIndex, 1);
            console.log(`Worker ${clientId} removed from queue`);
        }
        
        console.log(`Laptop disconnected (${clientId})`);
        console.log(`Active workers: ${connectedWorkers.size}, Queue length: ${workerQueue.length}`);
    });
});

app.post("/add-task-high", (req: Request<{}, TaskAdditionResponse, TaskAdditionRequest>, res: Response<TaskAdditionResponse>) => {
    const { tasks } = req.body;

    // Validate that tasks array exists and is not empty
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({
            message: "Tasks array is required and cannot be empty",
            tasks: [],
            remainingTasks: {
                highPriority: highPriorityTasks.length,
                lowPriority: lowPriorityTasks.length,
                total: highPriorityTasks.length + lowPriorityTasks.length
            }
        });
    }

    // Create new tasks from the request
    const newTasks: Task[] = tasks.map(taskData => ({
        tracking_number: taskData.tracking_number,
        type: taskData.type,
        code: taskData.code,
    }));

    // Add all new tasks to the high priority queue
    highPriorityTasks.push(...newTasks);
    
    console.log(`${newTasks.length} new HIGH PRIORITY tasks added`);
    console.log(`High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Immediately try to distribute the new tasks to queued workers
    distributeTasksToQueuedWorkers();

    const response: TaskAdditionResponse = {
        message: `${newTasks.length} high priority tasks added successfully`,
        tasks: newTasks,
        remainingTasks: {
            highPriority: highPriorityTasks.length,
            lowPriority: lowPriorityTasks.length,
            total: highPriorityTasks.length + lowPriorityTasks.length
        }
    };

    res.status(201).json(response);
});

app.post("/add-task-low", (req: Request<{}, TaskAdditionResponse, TaskAdditionRequest>, res: Response<TaskAdditionResponse>) => {
    const { tasks } = req.body;

    // Validate that tasks array exists and is not empty
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({
            message: "Tasks array is required and cannot be empty",
            tasks: [],
            remainingTasks: {
                highPriority: highPriorityTasks.length,
                lowPriority: lowPriorityTasks.length,
                total: highPriorityTasks.length + lowPriorityTasks.length
            }
        });
    }

    // Create new tasks from the request
    const newTasks: Task[] = tasks.map(taskData => ({
        tracking_number: taskData.tracking_number,
        type: taskData.type,
        code: taskData.code,
    }));

    lowPriorityTasks.push(...newTasks);
    console.log("New LOW PRIORITY task added");
    console.log(`High Priority tasks: ${highPriorityTasks.length}, Low Priority tasks: ${lowPriorityTasks.length}`);

    // Immediately try to distribute the new task to queued workers
    distributeTasksToQueuedWorkers();

    const response: TaskAdditionResponse = {
        message: "Low priority task added successfully",
        tasks: newTasks,
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

    // Check if both queues are empty
    if (highPriorityTasks.length === 0 && lowPriorityTasks.length === 0) {
        console.log(`No jobs available for ${clientId}`);
        return 0;
    }

    // Update worker status to processing
    const workerInfo = workerStatus.get(clientId);
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

    // Note: Worker will disconnect after receiving jobs, so no need to manage their status further
    console.log(`Worker ${clientId} will disconnect after processing jobs`);

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
            lastBatchSize: info.lastBatchSize,
            queuePosition: info.queuePosition,
            joinedAt: info.joinedAt
        }))
    };

    res.json(response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EC2 SSE server running on port ${PORT}`);
});
