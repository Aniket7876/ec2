# EC2 SSE Server - TypeScript

A TypeScript-based Server-Sent Events (SSE) server for distributing tracking tasks to connected workers.

## Project Structure

```
├── src/
│   ├── interfaces.ts    # TypeScript interfaces and type definitions
│   └── sse.ts          # Main server application
├── dist/               # Compiled JavaScript output
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript project:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Development

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /jobs?clientId=<id>` - SSE endpoint for workers to receive tasks
- `POST /batch-complete` - Endpoint for workers to report batch completion
- `POST /add-task-high` - Add high priority task
- `POST /add-task-low` - Add low priority task
- `GET /status` - Check server status and remaining tasks
