import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, AlertCircle, Smartphone, X, ChevronLeft, ChevronRight, Copy, Settings, AlertTriangle, Minus, Edit, RotateCcw } from 'lucide-react';
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
import { ProcessingSettingsDialog } from './ProcessingSettingsDialog';

interface ProcessingPageProps {
    onNavigateToExplorer?: (deviceId: string) => void;
}

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function ProcessingPage({ onNavigateToExplorer }: ProcessingPageProps) {
    const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3011'; // Use direct variable if needed or ensure alignment

    const { state, updateEntity, addEntity, moveEntity } = useWarehouse();
    const [incomingResults, setIncomingResults] = useState<TestResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [pendingProcess, setPendingProcess] = useState<{ deviceId: string, result: TestResult } | null>(null);

    // Fetch Results
    React.useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await fetch(`${SERVER_URL}/api/test-results`);
                if (res.ok) {
                    const data = await res.json();
                    const pending = data.results.filter((r: any) => r.status && r.status !== 'PROCESSED');
                    setIncomingResults(pending);
                }
            } catch (err) {
                console.error("Failed to load test results", err);
                toast.error("Failed to load test results");
            }
        };

        fetchResults();
    }, []);

    // Scan State
    const [scanInput, setScanInput] = useState('');
    const [scanError, setScanError] = useState<string | null>(null);
    const [foundDevice, setFoundDevice] = useState<{ id: string, label: string, path: string } | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

    const [poFilter, setPoFilter] = useState('');
    const [skuFilter, setSkuFilter] = useState('');

    // Collapsible State
    const [isAutomatedOpen, setIsAutomatedOpen] = useState(false);

    // Manual Testing State
    const [isManualMode, setIsManualMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [manualForm, setManualForm] = useState({
        manufacturer: '',
        model: '',
        capacity: '128',
        color: '',
        imei: '',
        powerOn: 'Pending',
        screenTouch: 'Pending',
        buttons: 'Pending',
        cameras: 'Pending',
        audio: 'Pending',
        connectivity: 'Pending',
        batteryHealth: '100'
    });

    // Settings Dialog
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Check Config
    const isConfigured = state.processingSourceBinId && state.processingDestBinId; // Exception bin is optional
    const sourceBinName = state.processingSourceBinId ? state.entities[state.processingSourceBinId]?.label || 'Unknown Bin' : null;
    const destBinName = state.processingDestBinId ? state.entities[state.processingDestBinId]?.label || 'Unknown Bin' : null;
    const exceptionBinName = state.processingExceptionBinId ? state.entities[state.processingExceptionBinId]?.label || 'Unknown Bin' : null;

    // Helper to check if an entity is a descendant of a specific parent
    const isDescendant = (entityId: string, ancestorId: string): boolean => {
        let current = state.entities[entityId];
        while (current && current.parentId) {
            if (current.parentId === ancestorId) return true;
            current = state.entities[current.parentId];
        }
        return false;
    };

    // Calculate counts
    const getBinDeviceCount = (binId: string | null) => {
        if (!binId) return 0;
        return Object.values(state.entities).filter(e =>
            e.type === 'Device' && (e.parentId === binId || isDescendant(e.id, binId))
        ).length;
    };

    const sourceBinCount = getBinDeviceCount(state.processingSourceBinId || null);
    const destBinCount = getBinDeviceCount(state.processingDestBinId || null);
    const exceptionBinCount = getBinDeviceCount(state.processingExceptionBinId || null);

    const selectedResult = incomingResults.find(r => r.id === selectedResultId);

    // Reset scan state when result is selected
    React.useEffect(() => {
        if (selectedResultId) {
            setScanError(null);
            setFoundDevice(null);
            // Populate scan input with the selected result's IMEI
            const result = incomingResults.find(r => r.id === selectedResultId);
            if (result) {
                setScanInput(result.imei);
            }
            setSelectedMatchId(null);
        }
    }, [selectedResultId, incomingResults]);

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


    // Find Receiving Department
    const receivingDept = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Receiving');

    // Get all devices in the Source Bin for filter options
    const sourceBinDevices = Object.values(state.entities).filter(e => {
        if (e.type !== 'Device') return false;

        // Use Configured Source Bin
        if (state.processingSourceBinId) {
            return isDescendant(e.id, state.processingSourceBinId) || e.parentId === state.processingSourceBinId;
        }

        // Fallback to Receiving if no config (only if legacy mode needed, but precise request implies strictness)
        // Let's keep fallback to Receiving for now to avoid breaking if config is empty, but clearer logic.
        if (!receivingDept) return false;
        return isDescendant(e.id, receivingDept.id) || e.parentId === receivingDept.id;
    });

    // Extract unique POs and SKUs with Cascading Logic
    // If SKU is selected, PO options are limited to those devices.
    // If PO is selected, SKU options are limited to those devices.

    const availableDevicesForPO = skuFilter
        ? sourceBinDevices.filter(d => d.deviceAttributes?.sku === skuFilter)
        : sourceBinDevices;

    const availableDevicesForSKU = poFilter
        ? sourceBinDevices.filter(d => d.deviceAttributes?.po_number === poFilter)
        : sourceBinDevices;

    const uniquePOs = Array.from(new Set(availableDevicesForSKU.map(d => d.deviceAttributes?.po_number).filter(Boolean))).sort();
    const uniqueSKUs = Array.from(new Set(availableDevicesForPO.map(d => d.deviceAttributes?.sku).filter(Boolean))).sort();

    // Filter devices for matching
    const matchingDevices = Object.values(state.entities)
        .filter(e => e.type === 'Device')
        .filter(d => {
            // 1. Must be in Source Bin (if configured)
            if (state.processingSourceBinId) {
                if (!isDescendant(d.id, state.processingSourceBinId) && d.parentId !== state.processingSourceBinId) {
                    return false;
                }
            } else if (receivingDept && !isDescendant(d.id, receivingDept.id)) {
                // Fallback to Receiving if no config (legacy behavior)
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

    // Grouping Unserialized Devices
    const groupedMatches = React.useMemo(() => {
        const serialized: any[] = [];
        const groups: Record<string, { device: any, count: number, ids: string[] }> = {};

        matchingDevices.forEach(d => {
            if (d.deviceAttributes?.imei) {
                serialized.push({ ...d, isGroup: false });
            } else {
                const key = [
                    d.deviceAttributes?.model,
                    d.deviceAttributes?.sku,
                    d.deviceAttributes?.po_number,
                    d.deviceAttributes?.color,
                    d.deviceAttributes?.capacity_gb
                ].join('|');

                if (!groups[key]) {
                    groups[key] = { device: d, count: 0, ids: [] };
                }
                groups[key].count++;
                groups[key].ids.push(d.id);
            }
        });

        // Convert groups to array
        const groupArray = Object.values(groups).map(g => ({
            ...g.device,
            id: g.ids[0], // Use first ID as key
            label: `${g.device.deviceAttributes?.model} • ${g.device.deviceAttributes?.color}`, // Custom label for group
            isGroup: true,
            groupCount: g.count,
            groupIds: g.ids
        }));

        return [...serialized, ...groupArray];
    }, [matchingDevices]);

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

        // 3. Find Processing (Dest) Bin
        if (state.processingDestBinId) {
            moveEntity(deviceId, state.processingDestBinId);
        } else {
            // Legacy fallback logic
            const processingDept = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Processing');
            if (processingDept) {
                let targetBinId = processingDept.id;
                const binInProcessing = Object.values(state.entities).find(e => e.type === 'Bin' && e.parentId === processingDept.id);
                if (binInProcessing) {
                    targetBinId = binInProcessing.id;
                }
                moveEntity(deviceId, targetBinId);
            } else {
                toast.error("Processing destination not configured and Department not found. Device updated but not moved.");
            }
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
                test_result: result,
                sellable: true
            }
        });

        // 4. Update Result Status on Server
        fetch(`${SERVER_URL}/api/test-results/${result.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PROCESSED' })
        })
            .then(res => res.json())
            .then(() => {
                setIncomingResults(prev => prev.filter(r => r.id !== result.id));

                // Reset State Completely
                setSelectedResultId(null);
                setScanInput('');
                setScanError(null);
                setFoundDevice(null);
                setPoFilter('');
                setSkuFilter('');
                setPendingProcess(null);

                toast.success(`Device processed: ${result.status}`);
            })
            .catch(() => toast.error("Failed to update test result status"));
    };

    const handleExceptionProcess = (deviceId: string) => {
        if (!state.processingExceptionBinId) {
            toast.error("Exception Bin not configured");
            return;
        }

        moveEntity(deviceId, state.processingExceptionBinId);

        // Reset State (keep selection if you want, but probably safer to clear to avoid confusion)
        setPendingProcess(null);
        setFoundDevice(null);
        // Do NOT clear selectedResultId or results, as we might want to try again with another device?
        // Or should we assume the result was bad? No, exception is usually physical device issue.
        // Let's clear pending UI elements.
        toast.info("Device moved to Exception Bin");
    };

    const handleMatchDevice = (deviceId: string) => {
        if (!selectedResult) return;
        setPendingProcess({ deviceId, result: selectedResult });
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

    // Helper Component for Results
    const ResultRow = ({ label, value }: { label: string; value: string | undefined }) => (
        <div className="flex justify-between py-1 border-b border-dashed last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value || '-'}</span>
        </div>
    );

    const handleEditResult = () => {
        if (!selectedResult) return;

        // Map Auto-Test to Manual Form
        const autoDetails = (selectedResult.automated?.details || {}) as any;

        setManualForm({
            manufacturer: selectedResult.manufacturer || '',
            model: selectedResult.model || '',
            capacity: selectedResult.capacity.toString() || '',
            color: selectedResult.color || '',
            imei: selectedResult.imei || '',
            powerOn: autoDetails.powerOn === 'Pass' ? 'Pass' : autoDetails.powerOn === 'Fail' ? 'Fail' : 'Pending',
            screenTouch: autoDetails.screenTouch === 'Pass' ? 'Pass' : autoDetails.screenTouch === 'Fail' ? 'Fail' : 'Pending',
            buttons: autoDetails.buttonsSensors === 'Pass' ? 'Pass' : autoDetails.buttonsSensors === 'Fail' ? 'Fail' : 'Pending',
            cameras: autoDetails.cameras === 'Pass' ? 'Pass' : autoDetails.cameras === 'Fail' ? 'Fail' : 'Pending',
            audio: autoDetails.audio === 'Pass' ? 'Pass' : autoDetails.audio === 'Fail' ? 'Fail' : 'Pending',
            connectivity: autoDetails.connectivity === 'Pass' ? 'Pass' : autoDetails.connectivity === 'Fail' ? 'Fail' : 'Pending',
            batteryHealth: autoDetails.batteryHealth?.toString() || '100'
        });

        // Switch to Manual Mode
        setSelectedResultId(null);
        setEditingId(selectedResult.id);
        setIsManualMode(true);
        toast.info("Editing Test Result");
    };

    const handleResetDemo = async () => {
        try {
            await fetch(`${SERVER_URL}/api/test-results/reset`, { method: 'POST' });
            // Refresh list (or wait for socket)
            const res = await fetch(`${SERVER_URL}/api/test-results`);
            if (res.ok) {
                const data = await res.json();
                const pending = data.results.filter((r: any) => r.status && r.status !== 'PROCESSED');
                setIncomingResults(pending);
                toast.success("Demo Data Reset");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to reset demo data");
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            <header className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-card">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-lg">Process Device</h1> {/* Renamed Title */}
                    {isConfigured ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground border-l pl-4">
                            <div className="flex flex-col">
                                <span>Source: <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={() => state.processingSourceBinId && onNavigateToExplorer?.(state.processingSourceBinId)}>{sourceBinName}</span> <span className="text-[10px] bg-muted px-1 rounded-full">{sourceBinCount}</span></span>
                                <span>Dest: <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={() => state.processingDestBinId && onNavigateToExplorer?.(state.processingDestBinId)}>{destBinName}</span> <span className="text-[10px] bg-muted px-1 rounded-full">{destBinCount}</span></span>
                                {exceptionBinName && (
                                    <span>Blocked: <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={() => state.processingExceptionBinId && onNavigateToExplorer?.(state.processingExceptionBinId)}>{exceptionBinName}</span> <span className="text-[10px] bg-muted px-1 rounded-full">{exceptionBinCount}</span></span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsSettingsOpen(true)}>
                            <AlertTriangle className="h-3 w-3" />
                            Configure Bins
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetDemo} title="Reset Test Results for Demo">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset for Demo
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} title="Configure Processing Bins">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>
            </header >

            {!isConfigured && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 text-center border-b border-destructive/20">
                    <span className="font-medium">Configuration Required:</span> Please select Source and Destination bins to enable processing.
                </div>
            )
            }

            {
                isConfigured && sourceBinDevices.length === 0 && (
                    <div className="bg-amber-50 text-amber-900 text-sm p-2 text-center border-b border-amber-200 flex justify-center items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span><span className="font-medium">Source Bin Empty:</span> No devices found in <span className="font-medium">{sourceBinName}</span>. Please move devices to this bin to begin processing.</span>
                    </div>
                )
            }

            <ScrollArea className="flex-1 min-h-0">
                <div className="max-w-4xl mx-auto space-y-8 p-6">

                    {/* 1. Scan Input & Pending Results */}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Scan IMEI or Barcode</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Scan IMEI (e.g. 35...)"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                                    autoFocus
                                    className="font-mono"
                                />
                                <Button onClick={handleScan}>Scan</Button>
                            </div>
                            {scanError && <p className="text-sm text-destructive">{scanError}</p>}
                        </div>

                        <div className="w-[300px] space-y-2">
                            <label className="text-sm font-medium">Or Select Pending Result</label>
                            <Select onValueChange={(val) => setSelectedResultId(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select from list..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {incomingResults.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            <span className="font-mono text-xs mr-2">{r.imei}</span>
                                            • {r.manufacturer} • {r.model}
                                        </SelectItem>
                                    ))}
                                    {incomingResults.length === 0 && (
                                        <div className="p-2 text-xs text-muted-foreground text-center">No pending auto-test results</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>



                    {/* 3. PO & SKU Context (Simplified) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">Received PO</label>
                                {poFilter && <button onClick={() => setPoFilter('')} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
                            </div>
                            <Select value={poFilter} onValueChange={setPoFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select PO..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniquePOs.map(po => <SelectItem key={po} value={po!}>{po}</SelectItem>)}
                                    {uniquePOs.length === 0 && <div className="p-2 text-xs text-muted-foreground">No POs in Source Bin</div>}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">Received SKU</label>
                                {skuFilter && <button onClick={() => setSkuFilter('')} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
                            </div>
                            <Select value={skuFilter} onValueChange={setSkuFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select SKU..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueSKUs.map(sku => <SelectItem key={sku} value={sku!}>{sku}</SelectItem>)}
                                    {uniqueSKUs.length === 0 && <div className="p-2 text-xs text-muted-foreground">No SKUs in Source Bin</div>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 4. Matching Devices */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            Matching Devices
                            {matchingDevices.length > 0 && <Badge variant="secondary">{matchingDevices.length}</Badge>}
                        </h3>

                        {!poFilter || !skuFilter ? (
                            <div className="text-muted-foreground text-sm italic py-8 text-center border rounded-md border-dashed bg-muted/10">
                                Please select both a <strong>Received PO</strong> and <strong>Received SKU</strong> to view matching devices.
                            </div>
                        ) : matchingDevices.length === 0 ? (
                            <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md flex justify-between items-center text-amber-800 dark:text-amber-300">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5" />
                                    <div>
                                        <div className="font-medium">No Matches Found</div>
                                        <div className="text-xs opacity-90">No devices in <strong>{sourceBinName}</strong> match the current criteria.</div>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground h-8 text-xs"
                                    onClick={() => {
                                        if (selectedResult) {
                                            // Check if receiving dept exists
                                            const receiving = Object.values(state.entities).find(e => e.type === 'Department' && e.label === 'Receiving');
                                            // Or configured source bin
                                            const targetParentId = state.processingSourceBinId || receiving?.id;

                                            if (!targetParentId) {
                                                toast.error("No Receiving Department or Source Bin found.");
                                                return;
                                            }

                                            // Create Device
                                            const newId = addEntity('Device', targetParentId);
                                            updateEntity(newId, {
                                                deviceAttributes: {
                                                    manufacturer: selectedResult.manufacturer,
                                                    model: selectedResult.model,
                                                    capacity_gb: selectedResult.capacity.toString(),
                                                    color: selectedResult.color,
                                                    imei: selectedResult.imei,
                                                    tested: false // Not tested in warehouse context yet (logically)
                                                }
                                            });
                                            toast.success(`Received device: ${selectedResult.imei}`);
                                        } else {
                                            toast.error("No test result selected to receive from.");
                                        }
                                    }}
                                >
                                    Receive New Device
                                </Button>
                            </div>
                        ) : (

                            <div className="grid gap-3">
                                {groupedMatches.map(item => {
                                    const device = item as any; // Cast for implicit props
                                    // Calculate Match Reasons
                                    const reasons: string[] = [];
                                    if (selectedResult && device.deviceAttributes?.model === selectedResult.model) reasons.push('Model Match');
                                    if (poFilter && device.deviceAttributes?.po_number === poFilter) reasons.push('PO Match');
                                    if (skuFilter && device.deviceAttributes?.sku === skuFilter) reasons.push('SKU Match');

                                    return (
                                        <div key={device.id} className="border p-4 rounded-md bg-card flex justify-between items-center group hover:border-primary transition-colors shadow-sm">
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {device.isGroup ? (
                                                        <>
                                                            {device.deviceAttributes?.manufacturer} {device.deviceAttributes?.model}
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                                {device.groupCount} Available
                                                            </Badge>
                                                        </>
                                                    ) : (
                                                        device.label
                                                    )}

                                                    {!device.isGroup && reasons.map(r => <Badge key={r} variant="outline" className="text-[10px] bg-secondary/50">{r}</Badge>)}

                                                    {device.deviceAttributes?.sellable && (
                                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Processed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-x-8 gap-y-1">
                                                    <span>SKU: <span className="text-foreground">{device.deviceAttributes?.sku || '-'}</span></span>
                                                    <span>PO: <span className="text-foreground">{device.deviceAttributes?.po_number || '-'}</span></span>
                                                    {!device.isGroup && <span>IMEI: <span className="text-foreground">{device.deviceAttributes?.imei || '-'}</span></span>}
                                                    <span>Color: <span className="text-foreground">{device.deviceAttributes?.color || '-'}</span></span>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    if (selectedResult) {
                                                        // If group, use the first ID (which is device.id as per our map logic)
                                                        handleMatchDevice(device.id);
                                                    } else {
                                                        toast.error("Please scan a test result first (or perform manual test)");
                                                    }
                                                }}
                                                disabled={!selectedResult}
                                                className={cn(selectedResult ? "bg-primary" : "bg-muted text-muted-foreground")}
                                            >
                                                {device.isGroup ? "Connect & Process (Any)" : "Connect & Process"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 2. Testing Section (Moved to Bottom) */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Smartphone className="h-4 w-4" />
                                Testing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {selectedResult ? (
                                <div className="space-y-4">
                                    {/* Test Result Summary */}
                                    <div className="flex justify-between items-start border p-4 rounded-md bg-card shadow-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">IMEI</div>
                                                <div className="font-medium font-mono text-sm">{selectedResult.imei}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Model</div>
                                                <div className="font-medium text-sm">{selectedResult.manufacturer} {selectedResult.model}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Specs</div>
                                                <div className="font-medium text-sm">{selectedResult.capacity}GB • {selectedResult.color}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status</div>
                                                <Badge variant={selectedResult.status === 'PASS' ? 'default' : 'destructive'}>
                                                    {selectedResult.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 -mr-2 -mt-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleEditResult} title="Edit / Convert to Manual">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setSelectedResultId(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Collapsible Details */}
                                    {selectedResult.automated && (
                                        <Collapsible open={isAutomatedOpen} onOpenChange={setIsAutomatedOpen} className="border rounded-md">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" className="w-full flex justify-between p-3 h-auto hover:bg-muted/50">
                                                    <span className="text-sm font-medium">View Detailed Test Results</span>
                                                    {isAutomatedOpen ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="p-4 border-t bg-muted/10">
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
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
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )}
                                </div>
                            ) : isManualMode ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h4 className="font-semibold text-sm">
                                            {editingId ? "Edit / Convert Result" : "Manual Device Entry"}
                                        </h4>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setIsManualMode(false);
                                            setEditingId(null);
                                        }}>Cancel</Button>
                                    </div>

                                    {/* Identity Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Manufacturer</label>
                                            <Input
                                                value={manualForm.manufacturer}
                                                onChange={e => setManualForm({ ...manualForm, manufacturer: e.target.value })}
                                                placeholder="Apple, Samsung..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Model</label>
                                            <Input
                                                value={manualForm.model}
                                                onChange={e => setManualForm({ ...manualForm, model: e.target.value })}
                                                placeholder="iPhone 13..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Color</label>
                                            <Input
                                                value={manualForm.color}
                                                onChange={e => setManualForm({ ...manualForm, color: e.target.value })}
                                                placeholder="Blue, Black..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">IMEI</label>
                                            <Input
                                                value={manualForm.imei}
                                                onChange={e => setManualForm({ ...manualForm, imei: e.target.value })}
                                                placeholder="Full IMEI"
                                            />
                                        </div>
                                    </div>


                                    {/* Functional Checks */}
                                    <div className="space-y-3 border rounded-md p-3 bg-muted/5">
                                        <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Functional Checks</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['powerOn', 'screenTouch', 'buttons', 'cameras', 'audio', 'connectivity'].map(key => {
                                                const value = manualForm[key as keyof typeof manualForm] as string;
                                                const getStatusColor = (v: string) => {
                                                    if (v === 'Pass') return 'text-green-600';
                                                    if (v === 'Fail') return 'text-red-600';
                                                    return 'text-yellow-600';
                                                };
                                                const getButtonVariant = (v: string) => {
                                                    if (v === 'Pass') return 'default'; // or specific green variant if available
                                                    if (v === 'Fail') return 'destructive';
                                                    return 'secondary';
                                                };

                                                return (
                                                    <div key={key} className="flex items-center justify-between">
                                                        <label className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-xs font-bold w-12 text-right", getStatusColor(value))}>
                                                                {value.toUpperCase()}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant={getButtonVariant(value) as any}
                                                                className={cn("h-6 w-10 p-0", value === 'Pending' && "bg-muted-foreground/20 text-muted-foreground")}
                                                                onClick={() => {
                                                                    const nextStatus = value === 'Pending' ? 'Pass' : value === 'Pass' ? 'Fail' : 'Pending';
                                                                    setManualForm({ ...manualForm, [key]: nextStatus });
                                                                }}
                                                            >
                                                                {value === 'Pending' && <Minus className="h-3 w-3" />}
                                                                {value === 'Pass' && <CheckCircle2 className="h-3 w-3" />}
                                                                {value === 'Fail' && <X className="h-3 w-3" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button className="w-full" onClick={() => {
                                            // Validate that nothing is Pending? Optional. For now let's allow it or warn.
                                            // The prompt just said "states should be", not "must be resolved".
                                            // We will map directly.

                                            const textId = editingId || `manual-${Date.now()}`;
                                            const newResult: TestResult = {
                                                id: textId,
                                                timestamp: new Date().toISOString(),
                                                manufacturer: manualForm.manufacturer || 'Unknown',
                                                model: manualForm.model || 'Unknown',
                                                capacity: parseInt(manualForm.capacity) || 0,
                                                color: manualForm.color || 'Unknown',
                                                imei: manualForm.imei || 'Unknown',
                                                status: Object.values(manualForm).some(v => v === 'Fail') ? 'FAIL' : 'PASS', // Simple Aggregation
                                                automated: {
                                                    source: 'Manual',
                                                    runStatus: 'Completed',
                                                    runOutcome: Object.values(manualForm).some(v => v === 'Fail') ? 'Fail' : 'Pass',
                                                    runTime: new Date().toISOString(),
                                                    stationId: 'MANUAL',
                                                    details: {
                                                        powerOn: manualForm.powerOn === 'Pending' ? 'Not Tested' : manualForm.powerOn as any,
                                                        screenTouch: manualForm.screenTouch === 'Pending' ? 'Not Tested' : manualForm.screenTouch as any,
                                                        buttonsSensors: manualForm.buttons === 'Pending' ? 'Not Tested' : manualForm.buttons as any,
                                                        cameras: manualForm.cameras === 'Pending' ? 'Not Tested' : manualForm.cameras as any,
                                                        audio: manualForm.audio === 'Pending' ? 'Not Tested' : manualForm.audio as any,
                                                        connectivity: manualForm.connectivity === 'Pending' ? 'Not Tested' : manualForm.connectivity as any,
                                                        simLock: 'Unlocked',
                                                        batteryHealth: parseInt(manualForm.batteryHealth) || 100,
                                                        batteryResult: 'OK'
                                                    }
                                                }
                                            };

                                            // If editing, we use PATCH/PUT logic or just POST with same ID if server supports upsert (which it does via ON CONFLICT)
                                            // The server instruction was: "ON CONFLICT(id) DO UPDATE"
                                            // So POST is fine.

                                            // Save to API
                                            fetch(`${SERVER_URL}/api/test-results`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(newResult)
                                            })
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        const result = data.result;

                                                        // Update state
                                                        setIncomingResults(prev => {
                                                            const exists = prev.some(r => r.id === result.id);
                                                            if (exists) {
                                                                return prev.map(r => r.id === result.id ? result : r);
                                                            }
                                                            return [...prev, result];
                                                        });

                                                        setSelectedResultId(result.id); // Select the result we just saved
                                                        setIsManualMode(false);
                                                        setEditingId(null);
                                                        toast.success(editingId ? "Test Result Updated" : "Manual Test Result Created");
                                                    }
                                                })
                                                .catch(() => toast.error("Failed to save manual result"));
                                        }}>
                                            {editingId ? "Update Result" : "Save Manual Result"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 space-y-4">
                                    <div className="text-muted-foreground text-sm">No Test Result Loaded</div>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setIsManualMode(true);
                                        setEditingId(null);
                                        // Pre-fill if we have a scan query that looks like IMEI
                                        if (scanInput.length > 10) {
                                            setManualForm(prev => ({ ...prev, imei: scanInput }));
                                        }
                                    }}>
                                        Perform Manual Testing
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </ScrollArea >
            {/* Settings Dialog */}
            < ProcessingSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)
                }
            />

            {/* Confirmation Dialog */}
            <Dialog open={!!pendingProcess} onOpenChange={(open) => !open && setPendingProcess(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Connection</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to connect this test result to this device?
                        </DialogDescription>
                    </DialogHeader>

                    {pendingProcess && (
                        <div className="grid grid-cols-2 gap-4 border rounded-md p-4 bg-muted/10 text-sm">
                            <div>
                                <h4 className="font-semibold mb-2">Physical Device</h4>
                                <div className="space-y-1 text-muted-foreground">
                                    <div className="break-all"><span className="font-medium text-foreground">Label:</span> {state.entities[pendingProcess.deviceId]?.label}</div>
                                    {state.entities[pendingProcess.deviceId]?.deviceAttributes?.imei && (
                                        <div><span className="font-medium text-foreground">IMEI:</span> {state.entities[pendingProcess.deviceId]?.deviceAttributes?.imei}</div>
                                    )}
                                    <div><span className="font-medium text-foreground">SKU:</span> {state.entities[pendingProcess.deviceId]?.deviceAttributes?.sku || 'N/A'}</div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Test Result</h4>
                                <div className="space-y-1 text-muted-foreground">
                                    <div><span className="font-medium text-foreground">Model:</span> {pendingProcess.result.manufacturer} {pendingProcess.result.model}</div>
                                    <div className="break-all"><span className="font-medium text-foreground">IMEI:</span> {pendingProcess.result.imei}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">Status:</span>
                                        <Badge variant={pendingProcess.result.status === 'PASS' ? 'default' : 'destructive'} className="h-5 px-1 text-[10px]">
                                            {pendingProcess.result.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingProcess(null)}>Cancel</Button>
                        {state.processingExceptionBinId && (
                            <Button variant="destructive" onClick={() => {
                                if (pendingProcess) {
                                    handleExceptionProcess(pendingProcess.deviceId);
                                }
                            }}>
                                Move to Exception
                            </Button>
                        )}
                        <Button onClick={() => {
                            if (pendingProcess) {
                                finalizeProcessing(pendingProcess.deviceId, pendingProcess.result);
                            }
                        }}>Confirm & Process</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
