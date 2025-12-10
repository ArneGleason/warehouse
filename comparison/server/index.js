const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'warehouse.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS layouts (
            id TEXT PRIMARY KEY,
            data TEXT,
            updatedAt TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS checkpoints (
            id TEXT PRIMARY KEY,
            layoutId TEXT,
            name TEXT,
            data TEXT,
            createdAt TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS test_results (
            id TEXT PRIMARY KEY,
            data TEXT,
            status TEXT,
            createdAt TEXT
        )`);
    });
}

// REST API
app.get('/api/layouts/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT data FROM layouts WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ data: null }); // Not found is null, client handles init
        res.json({ data: JSON.parse(row.data) });
    });
});

app.post('/api/layouts/:id', (req, res) => {
    const { id } = req.params;
    const { data } = req.body; // Expecting { data: ... }
    const now = new Date().toISOString();

    const dataStr = JSON.stringify(data);

    db.run(`INSERT INTO layouts (id, data, updatedAt) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
        [id, dataStr, now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Broadcast update to others in the room
            // We don't broadcast back to sender usually if they updated via API, 
            // but for simplicity, let's rely on socket events for real-time.
            // Actually, if we use REST for save, we should emit here.
            io.to(id).emit('update', data);

            res.json({ success: true });
        }
    );
});

app.get('/api/layouts/:layoutId/checkpoints', (req, res) => {
    const { layoutId } = req.params;
    db.all('SELECT id, name, createdAt FROM checkpoints WHERE layoutId = ? ORDER BY createdAt DESC', [layoutId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ checkpoints: rows });
    });
});

app.post('/api/layouts/:layoutId/checkpoints', (req, res) => {
    const { layoutId } = req.params;
    const { name, data } = req.body;
    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();
    const dataStr = JSON.stringify(data);

    db.run('INSERT INTO checkpoints (id, layoutId, name, data, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, layoutId, name, dataStr, now],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id, createdAt: now });
        }
    );
});

app.post('/api/layouts/:layoutId/restore/:checkpointId', (req, res) => {
    const { layoutId, checkpointId } = req.params;

    db.get('SELECT data FROM checkpoints WHERE id = ?', [checkpointId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Checkpoint not found' });

        const data = JSON.parse(row.data);
        const now = new Date().toISOString();
        const dataStr = JSON.stringify(data);

        // Update current layout
        db.run(`INSERT INTO layouts (id, data, updatedAt) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
            [layoutId, dataStr, now],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Broadcast update
                io.to(layoutId).emit('update', data);
                res.json({ success: true, data });
            }
        );
    });
});

// Test Results API

app.post('/api/test-results/reset', (req, res) => {
    // 1. Clear existing results
    db.run('DELETE FROM test_results', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Generate Seed Data
        const targets = [
            { manufacturer: 'Apple', model: 'iPhone 13', capacity: 128, color: 'Midnight' },
            { manufacturer: 'Apple', model: 'iPhone 13', capacity: 128, color: 'Midnight' }, // Extra 1
            { manufacturer: 'Apple', model: 'iPhone 13', capacity: 128, color: 'Midnight' }, // Extra 2
            { manufacturer: 'Apple', model: 'iPhone 13', capacity: 128, color: 'Starlight' }, // Extra 3
            { manufacturer: 'Apple', model: 'iPhone 12 Pro', capacity: 256, color: 'Gold' },
            { manufacturer: 'Samsung', model: 'Galaxy S22', capacity: 128, color: 'Phantom Gray' },
            { manufacturer: 'Samsung', model: 'Galaxy A54', capacity: 128, color: 'Awesome Mint' },
            { manufacturer: 'Google', model: 'Pixel 7', capacity: 128, color: 'Obsidian' },
            { manufacturer: 'Google', model: 'Pixel 6a', capacity: 128, color: 'Charcoal' },
            { manufacturer: 'Apple', model: 'iPhone 11', capacity: 64, color: 'White' },
            { manufacturer: 'Apple', model: 'iPad 9th Gen', capacity: 64, color: 'Silver' },
            { manufacturer: 'Samsung', model: 'Galaxy Tab A8', capacity: 32, color: 'Dark Gray' },
            { manufacturer: 'OnePlus', model: 'Nord N100', capacity: 64, color: 'Blue' }
        ];

        function generateIMEI() {
            let imei = '35';
            for (let i = 0; i < 13; i++) {
                imei += Math.floor(Math.random() * 10);
            }
            return imei;
        }

        const stmt = db.prepare(`INSERT INTO test_results (id, data, status, createdAt) VALUES (?, ?, ?, ?)`);
        const now = new Date().toISOString();
        const newResults = [];

        targets.forEach((t, i) => {
            const id = `demo-${Date.now()}-${i}`;
            const result = {
                id,
                timestamp: now,
                manufacturer: t.manufacturer,
                model: t.model,
                capacity: t.capacity,
                color: t.color,
                imei: generateIMEI(),
                status: Math.random() > 0.8 ? 'FAIL' : 'PASS',
                automated: {
                    source: 'Manapov',
                    runStatus: 'Completed',
                    runOutcome: Math.random() > 0.8 ? 'Fail' : 'Pass',
                    runTime: now,
                    stationId: `ST-0${Math.floor(Math.random() * 5) + 1}`,
                    details: {
                        powerOn: 'Pass',
                        screenTouch: Math.random() > 0.9 ? 'Fail' : 'Pass',
                        buttonsSensors: 'Pass',
                        cameras: 'Pass',
                        audio: 'Pass',
                        connectivity: 'Pass',
                        simLock: 'Unlocked',
                        batteryHealth: Math.floor(Math.random() * 20) + 80,
                        batteryResult: 'OK'
                    }
                }
            };
            const dataStr = JSON.stringify(result);
            stmt.run([id, dataStr, result.status, now]);
            newResults.push(result);
        });

        stmt.finalize(() => {
            io.emit('test-results-reset', newResults); // Broadcast reset event
            res.json({ success: true, count: newResults.length });
        });
    });
});

// DEBUG: Seed Unserialized Devices for Testing
app.post('/api/debug/seed-unserialized', (req, res) => {
    // defaults
    const manufacturer = req.body.manufacturer || 'Apple';
    const model = req.body.model || 'iPhone 13';
    const capacity = req.body.capacity || '128';
    const color = req.body.color || 'Midnight';
    const count = req.body.count || 3;
    const sku = req.body.sku || 'SKU-10001';
    const po = req.body.po || 'PO_0001';

    // 1. Get current layout
    db.get('SELECT id, data FROM layouts LIMIT 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            // Create default if not exists (simplified fallback)
            return res.status(404).json({ error: "No layout found to seed into." });
        }

        const layoutId = row.id;
        let data;
        try {
            data = JSON.parse(row.data);
        } catch (e) {
            return res.status(500).json({ error: "Failed to parse layout data" });
        }

        // Find Receiving Department ID
        let parentId = null;
        Object.values(data.entities).forEach(e => {
            if (e.type === 'Department' && e.label === 'Receiving') {
                parentId = e.id;
            }
        });
        if (!parentId) parentId = 'warehouse_root'; // fallback

        // Add devices
        for (let i = 0; i < count; i++) {
            const id = `unserialized_${Date.now()}_${i}`;
            data.entities[id] = {
                id,
                type: 'Device',
                label: `${manufacturer} ${model}`,
                parentId,
                deviceAttributes: {
                    manufacturer,
                    model,
                    capacity_gb: capacity,
                    color,
                    sku,
                    po_number: po,
                    sellable: false,
                    // NO IMEI
                }
            };
        }

        const now = new Date().toISOString();
        const dataStr = JSON.stringify(data);

        // Update DB
        db.run(`UPDATE layouts SET data = ?, updatedAt = ? WHERE id = ?`,
            [dataStr, now, layoutId],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Broadcast
                io.to(layoutId).emit('update', data); // Assuming room name is layoutId
                io.emit('state-update', data.entities); // Also emit generic update if needed

                res.json({ success: true, count });
            }
        );
    }
    );
});

app.post('/api/debug/reset-warehouse', (req, res) => {
    const defaultData = {
        entities: {
            "warehouse_root": { "id": "warehouse_root", "type": "Warehouse", "label": "Main Warehouse", "children": ["dept_receiving", "dept_processing"] },
            "dept_receiving": { "id": "dept_receiving", "type": "Department", "label": "Receiving", "parentId": "warehouse_root", "children": ["bin_dock"] },
            "dept_processing": { "id": "dept_processing", "type": "Department", "label": "Processing", "parentId": "warehouse_root", "children": ["bin_bench"] },
            "bin_dock": { "id": "bin_dock", "type": "Bin", "label": "Dock", "parentId": "dept_receiving", "children": [] },
            "bin_bench": { "id": "bin_bench", "type": "Bin", "label": "Bench", "parentId": "dept_processing", "children": [] }
        },
        roots: ["warehouse_root"]
    };

    // Optional: Storage Dept
    defaultData.entities["dept_storage"] = { "id": "dept_storage", "type": "Department", "label": "Storage", "parentId": "warehouse_root", "children": ["bin_shelf_a"] };
    defaultData.entities["warehouse_root"].children.push("dept_storage");
    defaultData.entities["bin_shelf_a"] = { "id": "bin_shelf_a", "type": "Bin", "label": "Shelf A", "parentId": "dept_storage", "children": [] };

    const dataStr = JSON.stringify(defaultData);
    const now = new Date().toISOString();

    // Check if any layout exists
    db.get('SELECT id FROM layouts LIMIT 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const layoutId = row ? row.id : 'default-layout';

        db.run(`INSERT INTO layouts (id, data, updatedAt) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
            [layoutId, dataStr, now],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                io.to(layoutId).emit('update', defaultData);
                res.json({ success: true, layoutId });
            }
        );
    });
});

app.get('/api/test-results', (req, res) => {
    db.all('SELECT * FROM test_results ORDER BY createdAt DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = rows.map(row => ({
            ...JSON.parse(row.data),
            status: row.status // Ensure top-level status matches DB
        }));
        res.json({ results });
    });
});

app.post('/api/test-results', (req, res) => {
    const result = req.body;
    const id = result.id || require('crypto').randomUUID();
    const now = new Date().toISOString();
    const status = result.status || 'PENDING';

    // Ensure ID is in the data blob
    const dataWithId = { ...result, id };
    const dataStr = JSON.stringify(dataWithId);

    db.run(`INSERT INTO test_results (id, data, status, createdAt) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, status = excluded.status`,
        [id, dataStr, status, now],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            io.emit('test-result-update', dataWithId); // Broadcast to all clients
            res.json({ success: true, result: dataWithId });
        }
    );
});

app.patch('/api/test-results/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    db.get('SELECT data FROM test_results WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Result not found' });

        const currentData = JSON.parse(row.data);
        const newData = { ...currentData, ...updates };
        const newStatus = updates.status || row.status;
        const dataStr = JSON.stringify(newData);

        db.run('UPDATE test_results SET data = ?, status = ? WHERE id = ?',
            [dataStr, newStatus, id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                io.emit('test-result-update', newData);
                res.json({ success: true, result: newData });
            }
        );
    });
});


// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (layoutId) => {
        socket.join(layoutId);
        console.log(`Socket ${socket.id} joined ${layoutId}`);
    });

    socket.on('update', ({ layoutId, data }) => {
        // Client sent an update via socket
        // Save to DB
        const now = new Date().toISOString();
        const dataStr = JSON.stringify(data);

        db.run(`INSERT INTO layouts (id, data, updatedAt) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
            [layoutId, dataStr, now],
            (err) => {
                if (err) console.error('Error saving from socket:', err);
                // Broadcast to everyone ELSE in the room
                socket.to(layoutId).emit('update', data);
            }
        );
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
