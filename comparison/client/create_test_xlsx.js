const XLSX = require('xlsx');

const wb = XLSX.utils.book_new();
const data = [
    {
        IMEI: '990000111222333',
        Manufacturer: 'TestBrand',
        Model: 'TestModel',
        Capacity: '128',
        Color: 'TestColor',
        SKU: 'TEST-SKU-001',
        Grade: 'A'
    }
];

const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Devices");
XLSX.writeFile(wb, "test_devices.xlsx");
console.log("Created test_devices.xlsx");
