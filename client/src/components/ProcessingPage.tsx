import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, AlertCircle, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Mock Data Types
interface TestResult {
    id: string;
    timestamp: string;
    manufacturer: string;
    model: string;
    capacity: number;
    color: string;
    imei: string;
    status: 'PASS' | 'FAIL' | 'NOT TESTED';

    // Automated Results (Manapov)
    automated: {
        source: string;
        runStatus: 'Completed' | 'Incomplete' | 'Not Found';
        runOutcome: 'Pass' | 'Fail' | 'Partial';
        runTime: string;
        stationId: string;
        details: {
            powerOn: 'Pass' | 'Fail' | 'Not Tested';
            screenTouch: 'Pass' | 'Fail' | 'Not Tested';
            buttonsSensors: 'Pass' | 'Fail' | 'Not Tested';
            cameras: 'Pass' | 'Fail' | 'Not Tested';
            audio: 'Pass' | 'Fail' | 'Not Tested';
            connectivity: 'Pass' | 'Fail' | 'Not Tested';
            simLock: 'Unlocked' | 'Locked' | 'Unknown';
            batteryHealth: number;
            batteryResult: 'OK' | 'Warning' | 'Fail';
        };
    } | null;
}

// Mock Data
const MOCK_RESULTS: TestResult[] = [
    {
        id: 'tr-1',
        timestamp: '2023-10-27T10:30:00Z',
        manufacturer: 'Apple',
        model: 'iPhone 13',
        capacity: 128,
        color: 'Midnight',
        imei: '354829104829102',
        status: 'PASS',
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: 'Pass',
            runTime: '2023-10-27T10:28:00Z',
            stationId: 'ST-01',
            details: {
                powerOn: 'Pass',
                screenTouch: 'Pass',
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 98,
                batteryResult: 'OK'
            }
        }
    },
    {
        id: 'tr-2',
        timestamp: '2023-10-27T10:35:00Z',
        manufacturer: 'Samsung',
        model: 'Galaxy S21',
        capacity: 256,
        color: 'Phantom Gray',
        imei: '359201928301928',
        status: 'FAIL',
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: 'Fail',
            runTime: '2023-10-27T10:33:00Z',
            stationId: 'ST-02',
            details: {
                powerOn: 'Pass',
                screenTouch: 'Fail',
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 85,
                batteryResult: 'OK'
            }
        }
    },
    {
        id: 'tr-3',
        timestamp: '2023-10-27T11:00:00Z',
        manufacturer: 'Google',
        model: 'Pixel 7',
        capacity: 128,
        color: 'Obsidian',
        imei: '351029384756102',
        status: 'PASS',
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: 'Pass',
            runTime: '2023-10-27T10:58:00Z',
            stationId: 'ST-01',
            details: {
                powerOn: 'Pass',
                screenTouch: 'Pass',
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 100,
                batteryResult: 'OK'
            }
        }
    },
];

import { toast } from 'sonner';

// ... (existing imports)

export function ProcessingPage() {
    const { state, updateEntity, addEntity, moveEntity } = useWarehouse();
    const [incomingResults, setIncomingResults] = useState<TestResult[]>(MOCK_RESULTS);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [deviceSearch, setDeviceSearch] = useState('');
    const [poFilter, setPoFilter] = useState('');
    const [skuFilter, setSkuFilter] = useState('');

    const selectedResult = incomingResults.find(r => r.id === selectedResultId);

    // Helper to check if an entity is a descendant of a specific parent
    const isDescendant = (entityId: string, ancestorId: string): boolean => {
        let current = state.entities[entityId];
        while (current && current.parentId) {
            if (current.parentId === ancestorId) return true;
            current = state.entities[current.parentId];
        }
        return false;
    };

    // Find Receiving Department
    const receivingDept = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Receiving');

    // Get all devices in Receiving for filter options
    const receivingDevices = Object.values(state.entities).filter(e => {
        if (e.type !== 'Device') return false;
        if (!receivingDept) return false;
        // Check if descendant or direct child
        return isDescendant(e.id, receivingDept.id) || e.parentId === receivingDept.id;
    });

    // Extract unique POs and SKUs
    const uniquePOs = Array.from(new Set(receivingDevices.map(d => d.deviceAttributes?.po_number).filter(Boolean))).sort();
    const uniqueSKUs = Array.from(new Set(receivingDevices.map(d => d.deviceAttributes?.sku).filter(Boolean))).sort();

    // Filter devices for matching
    const matchingDevices = Object.values(state.entities)
        .filter(e => e.type === 'Device')
        .filter(d => {
            // 1. Must be in Receiving (if Receiving exists)
            if (receivingDept && !isDescendant(d.id, receivingDept.id)) {
                // Also check if it's directly in receiving (though devices usually in bins)
                if (d.parentId !== receivingDept.id) return false;
            }

            // 2. Must NOT be already tested
            if (d.deviceAttributes?.tested) return false;

            // 3. Filter by PO (if set)
            if (poFilter && d.deviceAttributes?.po_number !== poFilter) {
                return false;
            }

            // 4. Filter by SKU (if set)
            if (skuFilter && d.deviceAttributes?.sku !== skuFilter) {
                return false;
            }

            // 5. Strict Model Match
            if (selectedResult && d.deviceAttributes?.model !== selectedResult.model) {
                return false;
            }

            // 5. General Search
            if (!deviceSearch) return true;
            const searchLower = deviceSearch.toLowerCase();
            const attrs = d.deviceAttributes || {};
            return (
                (attrs.sku?.toLowerCase().includes(searchLower)) ||
                (attrs.model?.toLowerCase().includes(searchLower)) ||
                (attrs.imei?.includes(searchLower)) ||
                (d.label.toLowerCase().includes(searchLower))
            );
        });

    const finalizeProcessing = (deviceId: string, result: TestResult) => {
        const currentDevice = state.entities[deviceId];
        const currentAttributes = currentDevice?.deviceAttributes || {};

        // Validation: Check IMEI mismatch
        if (currentAttributes.imei && currentAttributes.imei !== result.imei) {
            toast.error(`IMEI Mismatch! Device: ${currentAttributes.imei}, Test: ${result.imei}`);
            return;
        }

        // 1. Find Processing Department
        const processingDept = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Processing');

        if (processingDept) {
            // 2. Find or Create a Bin in Processing (simplification: just put in root of dept for now, or find first bin)
            // Ideally we'd have a specific "Processed" bin or similar.
            // Let's just move to the department root for now as requested "Processing bin in Processing department" is ambiguous if it means a specific bin entity.
            // Assuming "Processing bin" means *a* bin in Processing. Let's try to find one.
            let targetBinId = processingDept.id;
            const binInProcessing = Object.values(state.entities).find(e => e.type === 'Bin' && e.parentId === processingDept.id);
            if (binInProcessing) {
                targetBinId = binInProcessing.id;
            }

            moveEntity(deviceId, targetBinId);
        } else {
            toast.error("Processing department not found. Device updated but not moved.");
        }

        // 3. Update Device Attributes
        updateEntity(deviceId, {
            deviceAttributes: {
                ...currentAttributes, // Preserve existing attributes (SKU, PO, etc.)
                tested: true,
                manufacturer: result.manufacturer,
                capacity_gb: result.capacity.toString(),
                color: result.color,
                imei: currentAttributes.imei || result.imei, // Only update IMEI if it was blank
                test_result: result
            }
        });

        // 4. Remove from Incoming Results
        setIncomingResults(prev => prev.filter(r => r.id !== result.id));
        setSelectedResultId(null);

        toast.success(`Device processed and moved to Processing`);
    };

    const handleMatchDevice = (deviceId: string) => {
        if (!selectedResult) return;

        const device = state.entities[deviceId];
        if (!device) return;

        // Update device attributes first (po/sku from match if needed)
        // Actually finalizeProcessing handles the main updates. 
        // We just need to ensure PO/SKU are set if they were missing on the device? 
        // The previous logic did that. Let's keep it but delegate the rest.

        if (!device.deviceAttributes?.po_number && poFilter) {
            updateEntity(deviceId, { deviceAttributes: { po_number: poFilter } });
        }
        if (!device.deviceAttributes?.sku && skuFilter) {
            updateEntity(deviceId, { deviceAttributes: { sku: skuFilter } });
        }

        finalizeProcessing(deviceId, selectedResult);
    };

    const handleCreateDevice = () => {
        if (!selectedResult || !receivingDept) {
            toast.error("Cannot create device: Receiving department not found");
            return;
        }

        // Create new device in Receiving first
        const newDeviceId = addEntity('Device', receivingDept.id);

        // Initial attributes
        updateEntity(newDeviceId, {
            deviceAttributes: {
                model: selectedResult.model,
                imei: selectedResult.imei,
                po_number: poFilter || undefined,
                sku: skuFilter || undefined,
            }
        });

        // Then finalize (move, mark tested, remove result)
        finalizeProcessing(newDeviceId, selectedResult);
    };

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <header className="h-14 border-b flex items-center px-6 shrink-0 bg-card">
                <h1 className="font-bold text-lg">Processing</h1>
            </header>

            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Panel: Incoming Results */}
                    <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                        <div className="h-full flex flex-col border-r">
                            <div className="p-4 border-b bg-muted/10">
                                <h2 className="font-semibold mb-1">Auto-Test Results</h2>
                                <p className="text-xs text-muted-foreground">Select a result to process</p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="flex flex-col gap-1 p-2">
                                    {incomingResults.map(result => (
                                        <div
                                            key={result.id}
                                            className={cn(
                                                "p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors flex flex-col gap-2",
                                                selectedResultId === result.id ? "bg-accent border-primary" : "bg-card"
                                            )}
                                            onClick={() => setSelectedResultId(result.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-sm">{result.model}</span>
                                                <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'} className="text-[10px] h-5">
                                                    {result.status}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex justify-between">
                                                <span>IMEI: {result.imei}</span>
                                                <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right Panel: Details & Matching */}
                    <ResizablePanel defaultSize={70}>
                        {selectedResult ? (
                            <div className="h-full flex flex-col">
                                {/* Result Details */}
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-6 space-y-8">
                                        {/* 2.1 Header Strip */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-lg font-bold">Auto-Test Result</h2>
                                                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                                        <div className="flex gap-4">
                                                            <span className="font-medium text-foreground">IMEI:</span> {selectedResult.imei}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <span className="font-medium text-foreground">Model:</span> {selectedResult.model}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={selectedResult.status === 'PASS' ? 'default' : selectedResult.status === 'FAIL' ? 'destructive' : 'secondary'}
                                                    className="text-sm px-3 py-1"
                                                >
                                                    Final Status: {selectedResult.status}
                                                </Badge>
                                            </div>

                                            {/* PO and SKU Inputs for Matching */}
                                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-md border">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-medium text-muted-foreground">PO Number</label>
                                                        {poFilter && (
                                                            <button onClick={() => setPoFilter('')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                                                                <X className="h-3 w-3" /> Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                    <Select value={poFilter} onValueChange={setPoFilter}>
                                                        <SelectTrigger className="h-8 bg-background">
                                                            <SelectValue placeholder="Select PO..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {uniquePOs.map(po => (
                                                                <SelectItem key={po} value={po!}>{po}</SelectItem>
                                                            ))}
                                                            {uniquePOs.length === 0 && <div className="p-2 text-xs text-muted-foreground">No POs found in Receiving</div>}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-medium text-muted-foreground">SKU</label>
                                                        {skuFilter && (
                                                            <button onClick={() => setSkuFilter('')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                                                                <X className="h-3 w-3" /> Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                    <Select value={skuFilter} onValueChange={setSkuFilter}>
                                                        <SelectTrigger className="h-8 bg-background">
                                                            <SelectValue placeholder="Select SKU..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {uniqueSKUs.map(sku => (
                                                                <SelectItem key={sku} value={sku!}>{sku}</SelectItem>
                                                            ))}
                                                            {uniqueSKUs.length === 0 && <div className="p-2 text-xs text-muted-foreground">No SKUs found in Receiving</div>}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Device Match Action Card */}
                                            <div className="mt-4">
                                                {matchingDevices.length > 0 ? (
                                                    <div className="border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 rounded-md p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Match Found
                                                            </h3>
                                                            {matchingDevices.length > 1 && (
                                                                <Badge variant="outline" className="bg-background text-xs">
                                                                    +{matchingDevices.length - 1} others
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="bg-background/80 rounded border p-3 mb-3">
                                                            <div className="font-medium">{matchingDevices[0].label}</div>
                                                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                                                                <div>SKU: {matchingDevices[0].deviceAttributes?.sku || '-'}</div>
                                                                <div>IMEI: {matchingDevices[0].deviceAttributes?.imei || '-'}</div>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => handleMatchDevice(matchingDevices[0].id)}
                                                        >
                                                            Connect Test Results with this Device
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 rounded-md p-4">
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                            <div>
                                                                <h3 className="font-semibold text-amber-800 dark:text-amber-300">No Matching Device Found</h3>
                                                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                                                    No devices in Receiving match the current filters.
                                                                </p>
                                                                <div className="space-y-4 mt-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">Model</div>
                                                                            <div className="font-medium">{selectedResult.model}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">Manufacturer</div>
                                                                            <div className="font-medium">{selectedResult.manufacturer}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">IMEI</div>
                                                                            <div className="font-medium font-mono">{selectedResult.imei}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">Color</div>
                                                                            <div className="font-medium">{selectedResult.color}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">Capacity</div>
                                                                            <div className="font-medium">{selectedResult.capacity}GB</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs text-muted-foreground">Status</div>
                                                                            <Badge variant={selectedResult.status === 'PASS' ? 'default' : 'destructive'}>
                                                                                {selectedResult.status}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="secondary"
                                                            className="w-full"
                                                            onClick={() => toast.info("Feature coming soon: Receive New Device for Test")}
                                                        >
                                                            Receive New Device For this Test
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* 2.2 Automated Test Results */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-md">Automated Test Results</h3>

                                            {/* Status Row */}
                                            <div className="flex flex-wrap gap-4 text-sm bg-muted/30 p-3 rounded-md border">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">Source:</span>
                                                    <span className="font-medium">{selectedResult.automated?.source || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">Run Status:</span>
                                                    <Badge variant="outline" className="font-normal">
                                                        {selectedResult.automated?.runStatus || 'Not Found'}
                                                    </Badge>
                                                </div>
                                                {selectedResult.automated && (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">Outcome:</span>
                                                            <Badge variant={selectedResult.automated.runOutcome === 'Pass' ? 'default' : 'destructive'} className="h-5 text-[10px]">
                                                                {selectedResult.automated.runOutcome}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">Time:</span>
                                                            <span>{new Date(selectedResult.automated.runTime).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">Station:</span>
                                                            <span className="font-mono text-xs">{selectedResult.automated.stationId}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Summary Grid */}
                                            {selectedResult.automated ? (
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border p-4 rounded-md">
                                                    <ResultRow label="Power On" value={selectedResult.automated.details.powerOn} />
                                                    <ResultRow label="Screen & Touch" value={selectedResult.automated.details.screenTouch} />
                                                    <ResultRow label="Buttons & Sensors" value={selectedResult.automated.details.buttonsSensors} />
                                                    <ResultRow label="Cameras" value={selectedResult.automated.details.cameras} />
                                                    <ResultRow label="Audio" value={selectedResult.automated.details.audio} />
                                                    <ResultRow label="Connectivity" value={selectedResult.automated.details.connectivity} />
                                                    <ResultRow label="SIM / Lock" value={selectedResult.automated.details.simLock} />
                                                    <div className="flex justify-between py-1 border-b border-dashed last:border-0">
                                                        <span className="text-muted-foreground">Battery Health</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>{selectedResult.automated.details.batteryHealth}%</span>
                                                            <Badge variant={selectedResult.automated.details.batteryResult === 'OK' ? 'outline' : 'destructive'} className="h-4 text-[10px]">
                                                                {selectedResult.automated.details.batteryResult}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-4 border border-dashed rounded-md text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400">
                                                    <AlertCircle className="h-5 w-5" />
                                                    <span>No automated results were received for this device. Please enter manual results below.</span>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* 2.3 Manual Test Results */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-md">Manual Test Results</h3>
                                                {/* Mode Control Stub - In real app this would toggle state */}
                                                <div className="flex bg-muted p-1 rounded-md">
                                                    <button className="px-3 py-1 text-xs font-medium bg-background shadow-sm rounded-sm">Use Automated</button>
                                                    <button className="px-3 py-1 text-xs font-medium text-muted-foreground">Review & Edit</button>
                                                </div>
                                            </div>

                                            <div className="border rounded-md p-4 bg-muted/10 space-y-6 opacity-60 pointer-events-none">
                                                {/* Group 1: Core Power & Display */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Core Power & Display</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Power On</label>
                                                            <Input value={selectedResult.automated?.details.powerOn || ''} readOnly className="h-8" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Screen Condition</label>
                                                            <Input value={selectedResult.automated?.details.screenTouch || ''} readOnly className="h-8" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Group 2: Connectivity */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Connectivity & Lock</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Sim Lock</label>
                                                            <Input value={selectedResult.automated?.details.simLock || ''} readOnly className="h-8" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Connectivity</label>
                                                            <Input value={selectedResult.automated?.details.connectivity || ''} readOnly className="h-8" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Group 6: Overall */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Overall Evaluation</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Overall Verdict</label>
                                                            <Input value={selectedResult.status} readOnly className="h-8 font-bold" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Routing</label>
                                                            <Input value="Grading" readOnly className="h-8" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* 2.4 Meta & Audit */}
                                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                            <div>
                                                <span className="font-medium">Tested By:</span> Associate Name
                                            </div>
                                            <div>
                                                <span className="font-medium">Station:</span> Testing Bench 1
                                            </div>
                                            <div>
                                                <span className="font-medium">Start:</span> {new Date(selectedResult.timestamp).toLocaleString()}
                                            </div>
                                            <div>
                                                <span className="font-medium">End:</span> {new Date(selectedResult.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Search className="h-8 w-8 opacity-50" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">No Result Selected</h3>
                                <p className="text-sm max-w-xs">Select a test result from the list on the left to view details and match it with a device.</p>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}

function ResultRow({ label, value }: { label: string, value: string }) {
    let color = 'text-foreground';
    if (value === 'Pass' || value === 'Unlocked' || value === 'OK') color = 'text-green-600 dark:text-green-400';
    if (value === 'Fail' || value === 'Locked' || value === 'Warning') color = 'text-red-600 dark:text-red-400';

    return (
        <div className="flex justify-between py-1 border-b border-dashed last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-medium", color)}>{value}</span>
        </div>
    );
}
