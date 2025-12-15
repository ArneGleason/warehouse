const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.resolve(__dirname, '.backups');
const DB_PATH = path.resolve(__dirname, 'server/warehouse.db');
const SESSION_FILE = path.resolve(__dirname, 'server/session.json');

const args = process.argv.slice(2);
const command = args[0];

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

function suspend(taskName) {
    if (!taskName) {
        console.error("Please provide a task name to suspend on.");
        process.exit(1);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `warehouse_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // 1. Snapshot DB
    if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`Database backed up to ${backupPath}`);
    } else {
        console.log("No database found to backup.");
    }

    // 2. Save Session State
    const sessionData = {
        lastTask: taskName,
        timestamp: new Date().toISOString(),
        backupFile: backupName
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));


    // 3. Git Checkin
    try {
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "Suspend work on ${taskName} - ${timestamp}"`, { stdio: 'inherit' });
        console.log("Committed changes to git.");
    } catch (e) {
        console.log("Git commit failed (maybe nothing to commit):", e.message);
    }

    console.log(`\n\n[SUSPEND COMPLETE]`);
    console.log(`To resume, ask: "Resume working on ${taskName}"`);
}

function resume() {
    if (!fs.existsSync(SESSION_FILE)) {
        console.log("No session file found. Cannot auto-resume specific state.");
        return;
    }

    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const backupPath = path.join(BACKUP_DIR, session.backupFile);

    // 1. Restore DB
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, DB_PATH);
        console.log(`Restored database from ${backupPath}`);
    } else {
        console.warn(`Backup file ${backupPath} not found!`);
    }

    // 2. Start Servers (Detached)
    console.log("Starting backend server...");
    try {
        const out = fs.openSync('./server/server.log', 'a');
        const err = fs.openSync('./server/server.log', 'a');
        const serverProcess = require('child_process').spawn('node', ['index.js'], {
            cwd: path.resolve(__dirname, 'server'),
            detached: true,
            stdio: ['ignore', out, err]
        });
        serverProcess.unref();
    } catch (e) {
        console.error("Failed to start server:", e);
    }

    console.log("Starting frontend client (Port 3010)...");
    try {
        const out = fs.openSync('./client/client.log', 'a');
        const err = fs.openSync('./client/client.log', 'a');
        const clientProcess = require('child_process').spawn('npm', ['run', 'dev', '--', '-p', '3010'], {
            cwd: path.resolve(__dirname, 'client'),
            detached: true,
            stdio: ['ignore', out, err]
        });
        clientProcess.unref();
    } catch (e) {
        console.error("Failed to start client:", e);
    }

    console.log(`\n\n[RESUME COMPLETE]`);
    console.log(`Last working on: ${session.lastTask}`);
    console.log(`Servers restarting relative to 'server/server.log' and 'client/client.log'.`);
    console.log(`App should be available at http://localhost:3010 shortly.`);
}

if (command === 'suspend') {
    suspend(args[1] || 'Unspecified Task');
} else if (command === 'resume') {
    resume();
} else {
    console.log("Usage: node session_manager.js [suspend|resume] [task_name]");
}
