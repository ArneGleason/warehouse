
const XLSX = require('xlsx');
const path = require('path');

const items = [
    {
        SKU: 'IPHONE-13-128-MID',
        Manufacturer: 'Apple',
        Model: 'iPhone 13',
        Category: 'Phone',
        Capacity: '128',
        Color: 'Midnight',
        Carrier: 'Unlocked',
        'Lock Status': 'Unlocked',
        Grade: 'A',
        Description: 'iPhone 13 128GB Midnight Unlocked'
    },
    {
        SKU: 'IPHONE-12-PRO-256-GLD',
        Manufacturer: 'Apple',
        Model: 'iPhone 12 Pro',
        Category: 'Phone',
        Capacity: '256',
        Color: 'Gold',
        Carrier: 'Verizon',
        'Lock Status': 'Locked',
        Grade: 'B',
        Description: 'iPhone 12 Pro 256GB Gold Verizon'
    },
    {
        SKU: 'GALAXY-S22-128-GRY',
        Manufacturer: 'Samsung',
        Model: 'Galaxy S22',
        Category: 'Phone',
        Capacity: '128',
        Color: 'Phantom Gray',
        Carrier: 'T-Mobile',
        'Lock Status': 'Locked',
        Grade: 'A',
        Description: 'Samsung Galaxy S22 128GB Phantom Gray T-Mobile'
    },
    {
        SKU: 'PIXEL-7-128-OBS',
        Manufacturer: 'Google',
        Model: 'Pixel 7',
        Category: 'Phone',
        Capacity: '128',
        Color: 'Obsidian',
        Carrier: 'Unlocked',
        'Lock Status': 'Unlocked',
        Grade: 'A',
        Description: 'Google Pixel 7 128GB Obsidian Unlocked'
    },
    {
        SKU: 'IPAD-9-64-SIL',
        Manufacturer: 'Apple',
        Model: 'iPad 9th Gen',
        Category: 'Tablet',
        Capacity: '64',
        Color: 'Silver',
        Carrier: 'Generic',
        'Lock Status': 'Unknown',
        Grade: 'C',
        Description: 'iPad 9th Gen 64GB Silver'
    },
    {
        SKU: 'GALAXY-TAB-A8-32-GRY',
        Manufacturer: 'Samsung',
        Model: 'Galaxy Tab A8',
        Category: 'Tablet',
        Capacity: '32',
        Color: 'Dark Gray',
        Carrier: 'Generic',
        'Lock Status': 'Unknown',
        Grade: 'B',
        Description: 'Samsung Galaxy Tab A8 32GB Dark Gray'
    }
];

const ws = XLSX.utils.json_to_sheet(items);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Devices");

const outputPath = '/Users/agleason/.gemini/antigravity/brain/35180e2c-99b1-4276-9ea1-8b6d458868a2/device_import.xlsx';
XLSX.writeFile(wb, outputPath);

console.log(`Successfully generated ${outputPath}`);
