const http = require('http');

const SERVER_URL = 'http://localhost:3011';
const LAYOUT_ID = 'default-layout';

function fetchLayout() {
    return new Promise((resolve, reject) => {
        http.get(`${SERVER_URL}/api/layouts/${LAYOUT_ID}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.data);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function updateLayout(data) {
    return new Promise((resolve, reject) => {
        const req = http.request(`${SERVER_URL}/api/layouts/${LAYOUT_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });

        req.on('error', reject);
        req.write(JSON.stringify({ data }));
        req.end();
    });
}

async function run() {
    try {
        console.log("Fetching layout...");
        let data = await fetchLayout();
        if (!data) {
            console.error("No data found. Ensure server is running and initialized.");
            process.exit(1);
        }

        console.log("Modifying layout...");
        const entities = data.entities || {};
        const roots = data.roots || [];

        // 1. Create Pick & Pack Dept if missing
        let pickPackId = Object.keys(entities).find(k => entities[k].type === 'Department' && entities[k].label === 'Pick & Pack');
        if (!pickPackId) {
            pickPackId = 'dept_pick_pack';
            entities[pickPackId] = {
                id: pickPackId,
                type: 'Department',
                label: 'Pick & Pack',
                parentId: 'warehouse_root', // Assuming warehouse_root exists
                children: []
            };
            // Add to root children if warehouse_root is root
            if (entities['warehouse_root']) {
                if (!entities['warehouse_root'].children.includes(pickPackId)) {
                    entities['warehouse_root'].children.push(pickPackId);
                }
            } else {
                // Should not happen based on default data, but check
                roots.push(pickPackId);
            }
        }

        // 2. Create Staging Bin if missing
        let stageBinId = Object.keys(entities).find(k => entities[k].type === 'Bin' && entities[k].label === 'Staging 1');
        if (!stageBinId) {
            stageBinId = 'bin_staging_1';
            entities[stageBinId] = {
                id: stageBinId,
                type: 'Bin',
                label: 'Staging 1',
                parentId: pickPackId,
                children: [],
                barcode: 'BN_STAGE_01'
            };
            if (!entities[pickPackId].children.includes(stageBinId)) {
                entities[pickPackId].children.push(stageBinId);
            }
        }

        // 3. Create Sellable Stock (Source)
        let storageId = Object.keys(entities).find(k => entities[k].type === 'Department' && (entities[k].label === 'Storage' || entities[k].label === 'Stock'));
        if (!storageId) {
            storageId = 'dept_storage';
            entities[storageId] = {
                id: storageId,
                type: 'Department',
                label: 'Storage',
                parentId: 'warehouse_root',
                children: []
            };
            if (entities['warehouse_root']) {
                if (!entities['warehouse_root'].children.includes(storageId)) {
                    entities['warehouse_root'].children.push(storageId);
                }
            }
        }

        let stockBinId = Object.keys(entities).find(k => entities[k].type === 'Bin' && entities[k].label === 'Stock Bin 1');
        if (!stockBinId) {
            stockBinId = 'bin_stock_1';
            entities[stockBinId] = {
                id: stockBinId,
                type: 'Bin',
                label: 'Stock Bin 1',
                parentId: storageId,
                children: [],
                barcode: 'BN_STOCK_01'
            };
            if (!entities[storageId].children.includes(stockBinId)) {
                entities[storageId].children.push(stockBinId);
            }
        }

        // 4. Add Devices (IPHONE-13-128-MID)
        const deviceCount = 5;
        for (let i = 0; i < deviceCount; i++) {
            const devId = `dev_seed_${Date.now()}_${i}`;
            const imei = `35${Date.now()}${i}`;
            entities[devId] = {
                id: devId,
                type: 'Device',
                label: `iPhone 13 (${imei})`,
                parentId: stockBinId,
                children: [],
                deviceAttributes: {
                    sku: 'IPHONE-13-128-MID',
                    manufacturer: 'Apple',
                    model: 'iPhone 13',
                    capacity_gb: '128',
                    color: 'Midnight',
                    grade: 'A',
                    imei: imei,
                    sellable: true, // Crucial for picking
                    updatedAt: new Date().toISOString()
                }
            };
            entities[stockBinId].children.push(devId);
        }

        // 5. Update Config
        data.pickPackDepartmentId = pickPackId;
        data.sellableDepartmentId = storageId;

        // Save
        data.entities = entities;
        console.log("Saving updates...");
        await updateLayout(data);
        console.log("Done!");

    } catch (e) {
        console.error(e);
    }
}

run();
