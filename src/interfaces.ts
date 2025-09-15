// Task interface for tracking jobs
export interface Task {
  tracking_number: string;
  type: 'mbl' | 'bkc';
  code: string;
}

// Worker status interface
export interface WorkerStatus {
  status: 'idle' | 'processing';
  lastBatchSize: number;
}

// Batch completion request interface
export interface BatchCompletionRequest {
  status: string;
  timestamp: string;
  clientId: string;
}

// Task addition request interface
export interface TaskAdditionRequest {
  tracking_number: string;
  type: 'mbl' | 'bkc';
  code: string;
}

// Response interfaces
export interface TaskAdditionResponse {
  message: string;
  task: Task;
  remainingTasks: {
    highPriority: number;
    lowPriority: number;
    total: number;
  };
}

export interface BatchCompletionResponse {
  success: boolean;
  message: string;
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
    status: 'idle' | 'processing';
    lastBatchSize: number;
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
