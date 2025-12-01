"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWarehouse } from '@/components/context/WarehouseContext';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WarehouseEntity, createEntity, generateDeviceLabel } from '@/lib/warehouse';
import { v4 as uuidv4 } from 'uuid';

interface XlsxImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    targetId: string;
}

export function XlsxImportDialog({ isOpen, onClose, targetId }: XlsxImportDialogProps) {
    const { addBulkEntities } = useWarehouse();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                setPreviewData(jsonData);
                setError(null);
            } catch (err) {
                setError("Failed to parse file. Please ensure it's a valid Excel file.");
                setPreviewData([]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = () => {
        if (!previewData.length) return;

        const newEntities: { entity: WarehouseEntity, parentId: string }[] = [];

        previewData.forEach((row: any) => {
            // Expecting columns: SKU, Label (optional), IMEI (optional), Description (optional)
            let sku = row['SKU'] || row['sku'] || row['Item #'];

            // If SKU is missing, generate a unique one
            if (!sku) {
                sku = `GEN-${uuidv4().slice(0, 8).toUpperCase()}`;
            }

            const entity = createEntity('Device', targetId);
            entity.description = row['Description'] || row['description'];
            entity.deviceAttributes = {
                sku: sku.toString(),
                imei: (row['IMEI'] || row['imei'])?.toString(),
                barcode: (row['Barcode'] || row['barcode'])?.toString(),
                po_number: (row['PO Number'] || row['po number'] || row['PO'])?.toString(),
                vendor_sku: (row['Vendor SKU'] || row['vendor sku'])?.toString(),
                manufacturer: row['Manufacturer'] || row['manufacturer'],
                model: row['Model'] || row['model'],
                category: row['Category'] || row['category'],
                capacity_gb: (row['Capacity'] || row['capacity'] || row['GB'])?.toString(),
                color: row['Color'] || row['color'],
                carrier: row['Carrier'] || row['carrier'],
                lock_status: row['Lock Status'] || row['lock status'],
                grade: row['Grade'] || row['grade'],
                tested: false
            };
            entity.label = generateDeviceLabel(entity.deviceAttributes);
            newEntities.push({ entity, parentId: targetId });
        });

        if (newEntities.length === 0) {
            setError("No valid rows found. Ensure there is a 'SKU' column.");
            return;
        }

        addBulkEntities(newEntities);
        onClose();
        setFile(null);
        setPreviewData([]);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                SKU: 'IPH-13-BLK',
                Label: 'iPhone 13 Black',
                IMEI: '123456789012345',
                Barcode: '123456789',
                'PO Number': 'PO-12345',
                'Vendor SKU': 'V-IPH-13',
                Manufacturer: 'Apple',
                Model: 'iPhone 13',
                Category: 'Smartphone',
                Capacity: '128',
                Color: 'Midnight',
                Carrier: 'Unlocked',
                'Lock Status': 'Unlocked',
                Grade: 'A'
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "device_import_template.xlsx");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Devices</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file to bulk import devices.
                        <br />
                        <span className="font-semibold mt-2 block">Required Column:</span> SKU (or "Item #")
                        <br />
                        <span className="font-semibold mt-1 block">Supported Columns:</span> Label, Description, IMEI, Barcode, PO Number, Vendor SKU, Manufacturer, Model, Category, Capacity, Color, Carrier, Lock Status, Grade.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={downloadTemplate} size="sm">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                    </div>

                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">Excel File</Label>
                        <Input id="file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} ref={fileInputRef} />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {previewData.length > 0 && (
                        <div className="border rounded-md">
                            <div className="bg-muted px-4 py-2 text-xs font-medium flex justify-between">
                                <span>Preview ({previewData.length} rows)</span>
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Ready to import
                                </span>
                            </div>
                            <ScrollArea className="h-[200px]">
                                <div className="p-4 text-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="pb-2 font-medium">SKU</th>
                                                <th className="pb-2 font-medium">Label</th>
                                                <th className="pb-2 font-medium">IMEI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-1">{row['SKU'] || row['sku'] || row['Item #'] || '-'}</td>
                                                    <td className="py-1">{row['Label'] || row['label'] || '-'}</td>
                                                    <td className="py-1">{row['IMEI'] || row['imei'] || '-'}</td>
                                                </tr>
                                            ))}
                                            {previewData.length > 10 && (
                                                <tr>
                                                    <td colSpan={3} className="py-2 text-center text-muted-foreground text-xs">
                                                        ...and {previewData.length - 10} more
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!previewData.length}>Import {previewData.length} Items</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
