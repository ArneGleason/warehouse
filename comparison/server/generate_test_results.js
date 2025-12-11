const http = require('http');

const RESET_OPTIONS = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/test-results/reset',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const POST_OPTIONS = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/test-results',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

// Target Data: 3 PASS (1 mismatch capacity), 1 FAIL
// ALL SKU MATCH: IPHONE-13-128-MID (implied Model: iPhone 13, Capacity: 128, Color: Midnight)
const targets = [
    { status: 'PASS', capacity: 128 },
    { status: 'PASS', capacity: 128 },
    { status: 'PASS', capacity: 64 }, // Capacity Mismatch (64 != 128)
    { status: 'FAIL', capacity: 128 }
];

function generateIMEI() {
    let imei = '35';
    for (let i = 0; i < 13; i++) {
        imei += Math.floor(Math.random() * 10);
    }
    return imei;
}

const resetData = JSON.stringify({ skipSeed: true });

console.log('Resetting test results...');
const resetReq = http.request(RESET_OPTIONS, (res) => {
    console.log(`Reset Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Reset Response:', data);
        if (res.statusCode === 200) {
            generateAndPostResults();
        }
    });
});

resetReq.on('error', (e) => console.error(`Reset Error: ${e.message}`));
resetReq.write(resetData);
resetReq.end();

function generateAndPostResults() {
    console.log('Generating new test results...');
    const results = targets.map((t, i) => ({
        id: `auto-gen-${Date.now()}-${i}`,
        timestamp: new Date().toISOString(),
        manufacturer: 'Apple',
        model: 'iPhone 13',
        capacity: t.capacity,
        color: 'Midnight',

        // Added fields as requested
        lock_status: 'Unlocked',

        imei: generateIMEI(),
        status: t.status,
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: t.status === 'PASS' ? 'Pass' : 'Fail',
            runTime: new Date().toISOString(),
            stationId: `ST-01`,
            details: {
                powerOn: 'Pass',
                screenTouch: t.status === 'FAIL' ? 'Fail' : 'Pass', // Correlate fail with screen touch
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 90,
                batteryResult: 'OK'
            }
        }
    }));

    results.forEach((r, idx) => {
        setTimeout(() => {
            const dataStr = JSON.stringify(r);
            const req = http.request({
                ...POST_OPTIONS,
                headers: { ...POST_OPTIONS.headers, 'Content-Length': dataStr.length }
            }, (res) => {
                console.log(`Posted ${r.id} (${r.status}) - Status: ${res.statusCode}`);
            });
            req.on('error', (e) => console.error(e));
            req.write(dataStr);
            req.end();
        }, idx * 200);
    });
}
