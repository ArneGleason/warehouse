# Warehouse Simulator

A real-time warehouse layout simulator designed to help you visualize and manage warehouse entities, devices, and workflows.

## Features

- **Hierarchical View**: Organize Departments, Storage Areas, Racks, Bins, and Devices in a tree structure.
- **Drag-and-Drop**: Easily reorder items or move them between containers using drag-and-drop.
- **Real-Time Updates**: Changes are instantly reflected across all connected clients using Socket.io.
- **Version Checkpoints**: Save named snapshots of your layout and restore them at any time to experiment safely.
- **Bulk Import**: Import devices in bulk using Excel spreadsheets.
- **Dynamic Labeling**: Device labels automatically update based on SKU, Model, Grade, and IMEI.
- **Search & Filter**: Quickly find items by name or attributes.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ArneGleason/warehouse.git
    cd warehouse
    ```

2.  **Install Server Dependencies**:
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies**:
    ```bash
    cd ../client
    npm install
    ```

### Running the Application

You need to run both the server and the client concurrently.

1.  **Start the Server** (Runs on port 3001):
    ```bash
    cd server
    node index.js
    ```

2.  **Start the Client** (Runs on port 3000):
    ```bash
    cd client
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite (for persisting layouts and checkpoints)

## Key Components

- **HierarchyView**: The main tree view for managing the warehouse structure.
- **PropertiesPanel**: Edit attributes of selected items.
- **WarehouseContext**: Manages global state and API interactions.
- **CheckpointsDialog**: Interface for saving and restoring versions.
