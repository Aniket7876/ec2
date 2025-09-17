// Task interface for tracking jobs
export interface Task {
  tracking_number: string;
  type: string;
  code: string;
}

// Worker status interface
export interface WorkerStatus {
  status: 'idle' | 'processing' | 'waiting';
  lastBatchSize: number;
  queuePosition?: number;
  joinedAt: number;
}

// Task addition request interface
export interface TaskAdditionRequest {
    tasks: Array<{
        tracking_number: string;
        type: string;
        code: string;
    }>;
}
// Response interfaces
export interface TaskAdditionResponse {
    message: string;
    tasks: Task[];
    remainingTasks: {
        highPriority: number;
        lowPriority: number;
        total: number;
    };
}


export interface StatusResponse {
  activeWorkers: number;
  remainingTasks: {
    highPriority: number;
    lowPriority: number;
    total: number;
  };
  workers: Array<{
    id: string;
    status: 'idle' | 'processing' | 'waiting';
    lastBatchSize: number;
    queuePosition?: number;
    joinedAt: number;
  }>;
}

// SSE event interfaces
export interface SSEConnectionEvent {
  status: 'connected';
}

export interface SSEJobsCompleteEvent {
  status: 'jobs_complete';
}

export type SSEEvent = SSEConnectionEvent | SSEJobsCompleteEvent | Task;
