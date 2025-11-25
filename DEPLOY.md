# Local Deployment Guide

Follow these steps to deploy the application locally.

## Prerequisites
- Node.js (v20 or later recommended)
- npm

## Steps

1.  **Install Dependencies** (if not already done):
    ```bash
    npm install
    ```

2.  **Build the Application**:
    This compiles the frontend and backend into the `dist` directory.
    ```bash
    npm run build
    ```

3.  **Start the Server**:
    This runs the production server using the built files.
    ```bash
    npm start
    ```

4.  **Access the Application**:
    Open your browser and navigate to:
    [http://localhost:5000](http://localhost:5000)

## Troubleshooting
- If port 5000 is in use, you can specify a different port using an environment variable:
    ```bash
    # Windows (PowerShell)
    $env:PORT=3000; npm start
    
    # Linux/Mac
    PORT=3000 npm start
    ```
