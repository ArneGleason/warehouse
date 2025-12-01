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

const PORT = 3001;

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
