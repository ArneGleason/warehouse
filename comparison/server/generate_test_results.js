const http = require('http');

const targets = [
    { manufacturer: 'Apple', model: 'iPhone 13', capacity: 128, color: 'Midnight' },
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

const results = targets.map((t, i) => ({
    id: `auto-gen-${Date.now()}-${i}`,
    timestamp: new Date().toISOString(),
    manufacturer: t.manufacturer,
    model: t.model,
    capacity: t.capacity,
    color: t.color,
    imei: generateIMEI(),
    status: Math.random() > 0.8 ? 'FAIL' : 'PASS', // Mostly pass
    automated: {
        source: 'Manapov',
        runStatus: 'Completed',
        runOutcome: Math.random() > 0.8 ? 'Fail' : 'Pass',
        runTime: new Date().toISOString(),
        stationId: `ST-0${Math.floor(Math.random() * 5) + 1}`,
        details: {
            powerOn: 'Pass',
            screenTouch: Math.random() > 0.9 ? 'Fail' : 'Pass',
            buttonsSensors: 'Pass',
            cameras: 'Pass',
            audio: 'Pass',
            connectivity: 'Pass',
            simLock: Math.random() > 0.9 ? 'Locked' : 'Unlocked',
            batteryHealth: Math.floor(Math.random() * 20) + 80,
            batteryResult: 'OK'
        }
    }
}));

const postData = (data) => {
    const dataStr = JSON.stringify(data);
    const options = {
        hostname: 'localhost',
        port: 3011,
        path: '/api/test-results',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': dataStr.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Posted ${data.model} - Status: ${res.statusCode}`);
    });

    req.on('error', (error) => {
        console.error(error);
    });

    req.write(dataStr);
    req.end();
};

console.log(`Generating ${results.length} test results...`);
results.forEach((r, idx) => {
    setTimeout(() => postData(r), idx * 100); // Stagger requests
});
