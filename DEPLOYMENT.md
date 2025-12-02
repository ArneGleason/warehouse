# Deployment Guide

## Overview
This project is containerized using Docker, allowing for consistent deployment across various environments. The application consists of two main components:
- **Client**: A Next.js application served via a standalone Node.js server.
- **Server**: A Node.js/Express backend with a SQLite database and Socket.IO support.

By using Docker, you can package the application and its dependencies into portable images that can run on any platform supporting Docker containers, such as Google Cloud Run, AWS ECS, or a simple VPS.

## How to Select Which App Version to Deploy
Deployment versions are determined by the state of your codebase at build time.

1.  **Git Tagging (Recommended)**:
    - Tag your specific commit in Git: `git tag -a v1.0.0 -m "Release v1.0.0"`
    - Checkout that tag before building: `git checkout v1.0.0`

2.  **Docker Image Tagging**:
    - When building your Docker images, assign a specific tag instead of `latest`.
    - Example:
        ```bash
        docker build -t my-registry/warehouse-client:v1.0.0 ./client
        docker build -t my-registry/warehouse-server:v1.0.0 ./server
        ```
    - When deploying, specify this image tag (`v1.0.0`) in your deployment configuration (e.g., Kubernetes manifest, Cloud Run revision) to ensure that exact version is running.

## Continuous Deployment with GitHub Actions
A GitHub Actions workflow is included in `.github/workflows/deploy.yml` to automate deployment to Google Cloud Run.

### Setup
1.  **Create Google Cloud Resources**:
    - Create a Project.
    - Enable Cloud Run and Artifact Registry APIs.
    - Create an Artifact Registry repository named `warehouse-repo`.
    - Create a Service Account with permissions to push to Artifact Registry and deploy to Cloud Run.
    - Download the Service Account Key (JSON).

2.  **Configure GitHub Secrets**:
    Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions, and add:
    - `GCP_PROJECT_ID`: Your Google Cloud Project ID.
    - `GCP_SA_KEY`: The content of your Service Account Key JSON file.

### Usage
- **Push to Main**: Any push to the `main` branch will trigger a build and deployment.
- **Tags**: Pushing a tag starting with `v` (e.g., `v1.0.0`) will also trigger the workflow.

## How to Deploy to Google Cloud Hosting (Manual)
If you prefer to deploy manually using the CLI:

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth login`).
- A Google Cloud Project created.

### Steps

1.  **Enable Services**:
    Ensure Cloud Run and Artifact Registry APIs are enabled.

2.  **Create Artifact Registry Repository**:
    ```bash
    gcloud artifacts repositories create warehouse-repo --repository-format=docker --location=us-central1
    ```

3.  **Build and Push Images**:
    You can use Cloud Build to build and push directly:
    ```bash
    # Build Client
    gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/warehouse-repo/client:latest ./client

    # Build Server
    gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/warehouse-repo/server:latest ./server
    ```

4.  **Deploy Server**:
    ```bash
    gcloud run deploy warehouse-server \
      --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/warehouse-repo/server:latest \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --port 3001
    ```
    *Note the URL provided in the output (e.g., `https://warehouse-server-xyz.a.run.app`).*

5.  **Deploy Client**:
    Replace `SERVER_URL` with your actual server URL from the previous step.
    ```bash
    gcloud run deploy warehouse-client \
      --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/warehouse-repo/client:latest \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars NEXT_PUBLIC_SERVER_URL=https://warehouse-server-xyz.a.run.app \
      --port 3000
    ```

## Important Thing to Remember

> [!IMPORTANT]
> **Data Persistence**:
> By default, containers are ephemeral. If you restart a container on Cloud Run or other serverless platforms, **any data written to the local filesystem (like the SQLite `warehouse.db`) will be LOST.**
>
> To persist data in production:
> 1.  **Use a Managed Database**: Switch from SQLite to a managed PostgreSQL or MySQL instance (e.g., Cloud SQL) and update the server code to connect to it.
> 2.  **Use Volumes**: If deploying to a VPS or Kubernetes, ensure you mount a persistent volume to `/app/data` (or wherever the DB is stored). Cloud Run has limited support for persistent volumes (Network File System), but a managed DB is recommended for scalability.

> [!NOTE]
> **Environment Variables**: Always verify that `NEXT_PUBLIC_SERVER_URL` in the Client matches the actual deployed URL of your Server. If this is incorrect, the frontend will fail to connect to the backend API and WebSockets.
