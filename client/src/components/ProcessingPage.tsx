import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, AlertCircle, Smartphone, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
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
        imei: '354829104829101',
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
        capacity: 128,
        color: 'Phantom Gray',
        imei: '359201928301922',
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
        model: 'Pixel 6',
        capacity: 128,
        color: 'Stormy Black',
        imei: '351029384756103',
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
    {
        id: 'tr-4',
        timestamp: '2023-10-27T11:15:00Z',
        manufacturer: 'Apple',
        model: 'iPhone 12',
        capacity: 64,
        color: 'Blue',
        imei: '354829104829104',
        status: 'PASS',
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: 'Pass',
            runTime: '2023-10-27T11:13:00Z',
            stationId: 'ST-03',
            details: {
                powerOn: 'Pass',
                screenTouch: 'Pass',
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 92,
                batteryResult: 'OK'
            }
        }
    },
    {
        id: 'tr-5',
        timestamp: '2023-10-27T11:30:00Z',
        manufacturer: 'Apple',
        model: 'iPhone 11',
        capacity: 64,
        color: 'Black',
        imei: '354829104829105',
        status: 'NOT TESTED',
        automated: null
    },
    {
        id: 'tr-6',
        timestamp: '2023-10-27T11:45:00Z',
        manufacturer: 'Samsung',
        model: 'Galaxy S20',
        capacity: 128,
        color: 'Cosmic Gray',
        imei: '359201928301926',
        status: 'PASS',
        automated: {
            source: 'Manapov',
            runStatus: 'Completed',
            runOutcome: 'Pass',
            runTime: '2023-10-27T11:43:00Z',
            stationId: 'ST-02',
            details: {
                powerOn: 'Pass',
                screenTouch: 'Pass',
                buttonsSensors: 'Pass',
                cameras: 'Pass',
                audio: 'Pass',
                connectivity: 'Pass',
                simLock: 'Unlocked',
                batteryHealth: 88,
                batteryResult: 'OK'
            }
        }
    }
];

import { toast } from 'sonner';

// ... (existing imports)

interface ProcessingPageProps {
    onNavigateToExplorer?: (deviceId: string) => void;
}

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function ProcessingPage({ onNavigateToExplorer }: ProcessingPageProps) {
    const { state, updateEntity, addEntity, moveEntity } = useWarehouse();
    const [incomingResults, setIncomingResults] = useState<TestResult[]>(MOCK_RESULTS);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

    // Scan State
    const [scanInput, setScanInput] = useState('');
    const [scanError, setScanError] = useState<string | null>(null);
    const [foundDevice, setFoundDevice] = useState<{ id: string, label: string, path: string } | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

    const [poFilter, setPoFilter] = useState('');
    const [skuFilter, setSkuFilter] = useState('');

    // Collapsible State
    const [isAutomatedOpen, setIsAutomatedOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);

    const selectedResult = incomingResults.find(r => r.id === selectedResultId);

    // Reset scan state when result is selected
    React.useEffect(() => {
        if (selectedResultId) {
            setScanError(null);
            setFoundDevice(null);
            setScanInput('');
            setSelectedMatchId(null);
        }
    }, [selectedResultId]);

    // Seed Demo Data
    const hasSeeded = React.useRef(false);

    // Seed Demo Data
    React.useEffect(() => {
        if (hasSeeded.current) return;

        const receivingDept = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Receiving');
        if (!receivingDept) return;

        // Mark as seeded to prevent infinite loop
        hasSeeded.current = true;

        MOCK_RESULTS.forEach(result => {
            // Check if device exists (by IMEI or Model+Color+Capacity match)
            // Ideally check by IMEI if we want exact match, or attributes for "potential" match
            // Let's check by IMEI to avoid duplicates
            const exists = Object.values(state.entities).some(e =>
                e.type === 'Device' && e.deviceAttributes?.imei === result.imei
            );

            if (!exists) {
                const newId = addEntity('Device', receivingDept.id);
                updateEntity(newId, {
                    deviceAttributes: {
                        manufacturer: result.manufacturer,
                        model: result.model,
                        capacity_gb: result.capacity.toString(),
                        color: result.color,
                        imei: result.imei,
                        tested: false // Not tested yet in warehouse
                    }
                });
            }
        });
    }, [state.entities, addEntity, updateEntity]); // Run when entities change (or just once effectively due to check)

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

            return true;
        });

    // Get Possible Matches
    const possibleMatches = React.useMemo(() => {
        if (!selectedResult) return [];

        return Object.values(state.entities)
            .filter(e => e.type === 'Device')
            .map(device => {
                const attrs = device.deviceAttributes || {};
                let matchScore = 0;
                const matchReasons: string[] = [];

                // Critical Matches
                if (attrs.manufacturer === selectedResult.manufacturer) { matchScore++; matchReasons.push('Manufacturer'); }
                if (attrs.model === selectedResult.model) { matchScore++; matchReasons.push('Model'); }
                if (attrs.capacity_gb === selectedResult.capacity.toString()) { matchScore++; matchReasons.push('Capacity'); }
                if (attrs.color === selectedResult.color) { matchScore++; matchReasons.push('Color'); }

                // Filters
                if (poFilter && !attrs.po_number?.toLowerCase().includes(poFilter.toLowerCase())) return null;
                if (skuFilter && !attrs.sku?.toLowerCase().includes(skuFilter.toLowerCase())) return null;

                // Must match at least Model to be considered a candidate? 
                // Or just show all? Let's say Model is required.
                if (attrs.model !== selectedResult.model) return null;

                return {
                    device,
                    matchScore,
                    matchReasons
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.matchScore - a.matchScore);
    }, [selectedResult, state.entities, poFilter, skuFilter]);

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
        toast.success(`Device processed: ${result.status}`);
    };

    const handleMatchDevice = (deviceId: string) => {
        if (!selectedResult) return;

        // In a real app, this would update the device with test results
        // For now, we'll just move it to a "Processing" box or similar
        // But the prompt implies we just want to "Connect" them.
        // Let's assume we just toast for now as the backend logic for "Processing" isn't fully defined
        // or we can move it to a box.
        // Let's just simulate "Processing" by creating a box if needed or just updating status.
        // Actually, let's just toast success for now as per previous implementation.

        toast.success(`Matched device ${deviceId} with result ${selectedResult.id}`);
        finalizeProcessing(deviceId, selectedResult);
    };




    // Helper to get location path
    const getLocationPath = (entityId: string | null): string => {
        if (!entityId) return 'Unknown';
        const entity = state.entities[entityId];
        if (!entity) return 'Unknown';

        const parentPath = entity.parentId ? getLocationPath(entity.parentId) : '';
        return parentPath ? `${parentPath} > ${entity.label}` : entity.label;
    };

    const handleScan = () => {
        if (!scanInput.trim()) return;
        const query = scanInput.trim();

        // 1. Search for Auto-Test Result
        const resultMatch = incomingResults.find(r => r.imei === query);
        if (resultMatch) {
            setSelectedResultId(resultMatch.id);
            toast.success("Auto-Test Result Found");
            return;
        }

        // 2. Search for Device in Warehouse
        const deviceMatch = Object.values(state.entities).find(e =>
            e.type === 'Device' && (e.deviceAttributes?.imei === query || e.id === query || e.barcode === query)
        );

        if (deviceMatch) {
            setFoundDevice({
                id: deviceMatch.id,
                label: deviceMatch.label,
                path: getLocationPath(deviceMatch.parentId)
            });
            setScanError(null);
        } else {
            setFoundDevice(null);
            setScanError(`No matching Auto-Test Result or Device found for "${query}"`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleScan();
        }
    };

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const sidebarRef = React.useRef<import("react-resizable-panels").ImperativePanelHandle>(null);

    const toggleSidebar = () => {
        const panel = sidebarRef.current;
        if (panel) {
            if (isSidebarCollapsed) {
                panel.resize(30);
                setIsSidebarCollapsed(false);
            } else {
                panel.resize(4);
                setIsSidebarCollapsed(true);
            }
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <header className="h-14 border-b flex items-center px-6 shrink-0 bg-card">
                <h1 className="font-bold text-lg">Processing</h1>
            </header>

            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Panel: Incoming Results */}
                    <ResizablePanel
                        ref={sidebarRef}
                        defaultSize={4}
                        minSize={4}
                        maxSize={40}
                        collapsible={true}
                        collapsedSize={4}
                        onCollapse={() => setIsSidebarCollapsed(true)}
                        onExpand={() => setIsSidebarCollapsed(false)}
                        className={cn("transition-all duration-300 ease-in-out", isSidebarCollapsed ? "min-w-[50px]" : "")}
                    >
                        <div className="h-full flex flex-col border-r bg-muted/10">
                            <div className={cn("p-4 border-b flex items-center justify-between", isSidebarCollapsed && "p-2 justify-center")}>
                                {!isSidebarCollapsed && (
                                    <div>
                                        <h2 className="font-semibold mb-1">Auto-Test Results</h2>
                                        <p className="text-xs text-muted-foreground">Select a result to process</p>
                                    </div>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
                                    {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                </Button>
                            </div>

                            {!isSidebarCollapsed && (
                                <ScrollArea className="flex-1">
                                    <div className="flex flex-col gap-1 p-2">
                                        {incomingResults.map(result => (
                                            <div
                                                key={result.id}
                                                className={cn(
                                                    "p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors flex flex-col gap-2 group relative",
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
                                                <div className="text-xs text-muted-foreground flex justify-between items-center">
                                                    <span>IMEI: {result.imei}</span>
                                                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                                                </div>

                                                {/* Copy IMEI Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-2 bottom-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background shadow-sm border"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(result.imei);
                                                        toast.success("IMEI copied to clipboard");
                                                    }}
                                                    title="Copy IMEI"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right Panel: Details & Matching */}
                    <ResizablePanel defaultSize={96}>
                        {selectedResult ? (
                            <div className="h-full flex flex-col">
                                {/* Result Details */}
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-6 space-y-8">
                                        {/* 2.1 Header Strip */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 -ml-2 mt-0.5"
                                                        onClick={() => setSelectedResultId(null)}
                                                        title="Back to Ready to Scan"
                                                    >
                                                        <ChevronLeft className="h-5 w-5" />
                                                    </Button>
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
                                        <Collapsible
                                            open={isAutomatedOpen}
                                            onOpenChange={setIsAutomatedOpen}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent w-full justify-between">
                                                        <h3 className="font-semibold text-md flex items-center gap-2">
                                                            Automated Test Results
                                                            <Badge variant={selectedResult.automated?.runOutcome === 'Pass' ? 'default' : 'destructive'} className="ml-2">
                                                                {selectedResult.automated?.runOutcome || 'N/A'}
                                                            </Badge>
                                                        </h3>
                                                        {isAutomatedOpen ? <ChevronLeft className="h-4 w-4 rotate-90 transition-transform" /> : <ChevronRight className="h-4 w-4 transition-transform" />}
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </div>

                                            <CollapsibleContent className="space-y-4">
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
                                            </CollapsibleContent>
                                        </Collapsible>

                                        <Separator />

                                        {/* 2.3 Manual Test Results */}
                                        <Collapsible
                                            open={isManualOpen}
                                            onOpenChange={setIsManualOpen}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent w-full justify-between">
                                                        <h3 className="font-semibold text-md">Manual Test Results</h3>
                                                        <div className="flex items-center gap-2">
                                                            {/* Mode Control Stub - In real app this would toggle state */}
                                                            <div className="flex bg-muted p-1 rounded-md mr-2" onClick={(e) => e.stopPropagation()}>
                                                                <button className="px-3 py-1 text-xs font-medium bg-background shadow-sm rounded-sm">Use Automated</button>
                                                                <button className="px-3 py-1 text-xs font-medium text-muted-foreground">Review & Edit</button>
                                                            </div>
                                                            {isManualOpen ? <ChevronLeft className="h-4 w-4 rotate-90 transition-transform" /> : <ChevronRight className="h-4 w-4 transition-transform" />}
                                                        </div>
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </div>

                                            <CollapsibleContent className="space-y-4">
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

                                            </CollapsibleContent>
                                        </Collapsible>

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

                                        {/* Scan Feedback Area */}
                                        {scanError && (
                                            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2 text-left">
                                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-semibold">No Match Found</div>
                                                    <div className="opacity-90">{scanError}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Possible Matches */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Search className="h-4 w-4" />
                                                    Possible Matches ({possibleMatches.length})
                                                </h3>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Filter PO..."
                                                        className="h-8 w-24 text-xs"
                                                        value={poFilter}
                                                        onChange={(e) => setPoFilter(e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="Filter SKU..."
                                                        className="h-8 w-24 text-xs"
                                                        value={skuFilter}
                                                        onChange={(e) => setSkuFilter(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {possibleMatches.map(({ device, matchReasons }) => {
                                                    const isSelected = selectedMatchId === device.id;
                                                    return (
                                                        <Card
                                                            key={device.id}
                                                            className={cn(
                                                                "overflow-hidden transition-all cursor-pointer border-2",
                                                                isSelected ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : "hover:border-blue-300 border-transparent bg-card"
                                                            )}
                                                            onClick={() => setSelectedMatchId(device.id)}
                                                        >
                                                            <CardContent className="p-3">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <div className="font-medium flex items-center gap-2">
                                                                            {device.label}
                                                                            <Badge variant="outline" className="text-[10px] h-5">
                                                                                {getLocationPath(device.parentId)}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                                            <div>IMEI: <span className="font-mono text-foreground">{device.deviceAttributes?.imei || 'N/A'}</span></div>
                                                                            {device.deviceAttributes?.po_number && (
                                                                                <div>PO: <span className="font-medium text-foreground">{device.deviceAttributes.po_number}</span></div>
                                                                            )}
                                                                            {device.deviceAttributes?.sku && (
                                                                                <div>SKU: <span className="font-medium text-foreground">{device.deviceAttributes.sku}</span></div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant={isSelected ? "default" : "secondary"}
                                                                        className="h-7 text-xs"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMatchDevice(device.id);
                                                                        }}
                                                                    >
                                                                        Connect
                                                                    </Button>
                                                                </div>

                                                                <div className="flex flex-wrap gap-1">
                                                                    {matchReasons.map(reason => (
                                                                        <Badge key={reason} variant="secondary" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                                                                            Matches {reason}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}

                                                {possibleMatches.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                                        No matching devices found in warehouse.
                                                        <br />
                                                        Try adjusting filters or check Receiving.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                                <div className="max-w-md w-full space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                            <Search className="h-8 w-8 opacity-50" />
                                        </div>
                                        <h3 className="font-semibold text-xl">Ready to Process</h3>
                                        <p className="text-sm text-muted-foreground">Scan a device or select a result to begin</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Scan IMEI or UUID Barcode</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Scan barcode..."
                                                    className="font-mono"
                                                    autoFocus
                                                    value={scanInput}
                                                    onChange={(e) => setScanInput(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                />
                                                <Button onClick={handleScan}>Enter</Button>
                                            </div>
                                        </div>

                                        {/* Scan Feedback Area */}
                                        {scanError && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                                        <Search className="h-4 w-4" />
                                                        Possible Matches ({possibleMatches.length})
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Filter PO..."
                                                            className="h-8 w-24 text-xs"
                                                            value={poFilter}
                                                            onChange={(e) => setPoFilter(e.target.value)}
                                                        />
                                                        <Input
                                                            placeholder="Filter SKU..."
                                                            className="h-8 w-24 text-xs"
                                                            value={skuFilter}
                                                            onChange={(e) => setSkuFilter(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                                                    <div className="space-y-3">
                                                        {possibleMatches.map(({ device, matchReasons }) => (
                                                            <Card key={device.id} className="overflow-hidden hover:border-blue-500 transition-colors cursor-pointer" onClick={() => handleMatchDevice(device.id)}>
                                                                <CardContent className="p-3">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <div className="font-medium flex items-center gap-2">
                                                                                {device.label}
                                                                                <Badge variant="outline" className="text-[10px] h-5">
                                                                                    {getLocationPath(device.parentId)}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                                {device.deviceAttributes?.imei || 'No IMEI'}
                                                                            </div>
                                                                        </div>
                                                                        <Button size="sm" variant="secondary" className="h-7 text-xs">
                                                                            Connect
                                                                        </Button>
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-1">
                                                                        {matchReasons.map(reason => (
                                                                            <Badge key={reason} variant="secondary" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                                                                                Matches {reason}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}

                                                        {possibleMatches.length === 0 && (
                                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                                No matching devices found in warehouse.
                                                                <br />
                                                                Try adjusting filters or check Receiving.
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        )}

                                        {foundDevice && (
                                            <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-left space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-semibold text-blue-800 dark:text-blue-300">Device Found in Warehouse</div>
                                                        <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                                            This device exists but has no auto-test results.
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-background/50 rounded p-2 text-xs space-y-1">
                                                    <div className="flex gap-2">
                                                        <span className="font-medium text-muted-foreground">Label:</span>
                                                        <span>{foundDevice.label}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="font-medium text-muted-foreground">Location:</span>
                                                        <span className="font-mono">{foundDevice.path}</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => onNavigateToExplorer?.(foundDevice.id)}
                                                >
                                                    View Device Properties
                                                </Button>
                                            </div>
                                        )}

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-muted/5 px-2 text-muted-foreground">Or</span>
                                            </div>
                                        </div>

                                        <Button variant="outline" className="w-full h-12 text-base" onClick={() => toast.info("Apply UUID Barcode flow triggered")}>
                                            <Smartphone className="mr-2 h-5 w-5" />
                                            Apply UUID Barcode to Device
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup >
            </div >
        </div >
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
