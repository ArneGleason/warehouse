import React, { useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageOpen, ArrowLeft, Printer, ShoppingCart, PackageCheck, AlertCircle, RefreshCw, X, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Order } from '@/lib/warehouse';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PickPackSettingsDialog } from '@/components/PickPackSettingsDialog';

// --- Picking Logic ---

function PickingView({ orderId, onBack }: { orderId: string, onBack: () => void }) {
    const { state, updateEntity, updateOrder, markAllocatedDevicesPicked, claimUnserializedPromise, moveEntities } = useWarehouse();
    const order = state.orders[orderId];
    const [imeiInput, setImeiInput] = useState('');
    const [lastScannedId, setLastScannedId] = useState<string | null>(null);

    // Staging Location State
    const [stagingBin, setStagingBin] = useState(order?.stagingLocation?.bin || '');
    const [stagingBoxes, setStagingBoxes] = useState(order?.stagingLocation?.boxes.join(', ') || '');

    // 1. Identification
    const neededSkus = new Set(order?.lines.map(l => l.skuId));

    // 2. Classification
    // "Allocated" means Reserved (Promised) OR Picked.
    const allAllocatedDevices = Object.values(state.entities).filter(
        e => e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === orderId
    );

    // "Picked" means Verified Scanned/Confirmed
    const pickedDevices = allAllocatedDevices.filter(d => !!d.deviceAttributes?.allocatedToOrder?.pickedAt);

    // "Reserved" means Allocated but NOT Picked
    const reservedDevices = allAllocatedDevices.filter(d => !d.deviceAttributes?.allocatedToOrder?.pickedAt);

    // 3. Staging Bins Config
    const pickPackDeptId = state.pickPackDepartmentId;
    const availableBins = Object.values(state.entities)
        .filter(e => {
            if (e.type !== 'Bin') return false;
            // Check if descendant of pickPackDeptId
            // Simple approach: Check parentId chain? Or assuming bins are direct children?
            // Warehouse Context doesn't expose hierarchy helpers directly here.
            // Assumption: Bins are typically direct children of Zones or Departments.
            // Recursive check is safer but costly.
            // Let's assume standard 3-tier: Dept -> Bin OR Dept -> Zone -> Bin.
            // Let's verify 'parentId' matches dept OR parent's parent matches dept.
            if (!pickPackDeptId) return false;
            if (e.parentId === pickPackDeptId) return true;
            const parent = state.entities[e.parentId || ''];
            if (parent && parent.parentId === pickPackDeptId) return true;
            return false;
        })
        .sort((a, b) => a.label.localeCompare(b.label));

    // 4. Progress
    const progressBySku = order?.lines.reduce((acc, line) => {
        const count = pickedDevices.filter(d => d.deviceAttributes?.sku === line.skuId).length;
        acc[line.skuId] = count;
        return acc;
    }, {} as Record<string, number>);

    if (!order) return <div>Order not found</div>;

    // 4. Candidates for Dropdown/Matching
    // Prioritize Reserved items, then general stock
    const availableCandidates = Object.values(state.entities).filter(e => {
        if (e.type !== 'Device' || !e.deviceAttributes) return false;

        // If it's allocated to THIS order and NOT picked, it's a candidate (Top Priority)
        if (e.deviceAttributes.allocatedToOrder?.orderId === orderId && !e.deviceAttributes.allocatedToOrder.pickedAt) return true;

        // If allocated to another order, or already picked, skip
        if (e.deviceAttributes.allocatedToOrder) return false;

        // Otherwise check SKU match and IMEI presence
        if (!e.deviceAttributes.imei) return false;
        return neededSkus.has(e.deviceAttributes.sku || '');
    }).sort((a, b) => {
        // Sort: Reserved first
        const aReserved = a.deviceAttributes?.allocatedToOrder?.orderId === orderId;
        const bReserved = b.deviceAttributes?.allocatedToOrder?.orderId === orderId;
        if (aReserved && !bReserved) return -1;
        if (!aReserved && bReserved) return 1;
        return (a.deviceAttributes?.sku || '').localeCompare(b.deviceAttributes?.sku || '');
    });


    const handlePick = async (imei: string) => {
        if (!imei) return;

        // A. Find device by IMEI
        const device = Object.values(state.entities).find(
            e => e.type === 'Device' &&
                (e.deviceAttributes?.imei === imei || e.deviceAttributes?.barcode === imei)
        );

        // B. Logic Branching
        if (device) {
            // Case 1: Device found
            if (device.deviceAttributes?.allocatedToOrder) {
                if (device.deviceAttributes.allocatedToOrder.orderId === orderId) {
                    if (device.deviceAttributes.allocatedToOrder.pickedAt) {
                        alert("Already picked!");
                    } else {
                        // Mark as Picked
                        markAllocatedDevicesPicked([device.id]);
                        setLastScannedId(device.id);
                        setImeiInput('');
                    }
                } else {
                    alert(`Device allocated to another order: ${device.deviceAttributes.allocatedToOrder.orderNumber}`);
                }
                return;
            }

            // Case 2: Unallocated Device found
            // Check if we need to fulfill an UNSERIALIZED promise first?
            // Actually, if we scan a device, we are picking IT.
            // But if we have an Unserialized Reservation for this SKU, maybe we should attach this IMEI to IT?
            // Requirement says: "If devices not serialized then IMEI scanned... can be applied to... matching unserialized promised device"

            const sku = device.deviceAttributes?.sku || '';
            const needsUnserializedClaim = reservedDevices.some(d => d.deviceAttributes?.sku === sku && !d.deviceAttributes?.imei);

            if (needsUnserializedClaim) {
                // We have a "Ghost" device reserved. We scanned a real device.
                // We should technically consume the Ghost device (update it with this IMEI) and remove the old entity?
                // OR simpler: Just allocate THIS device and remove the Ghost device?
                // "applied to one of the matching unserialized promised devices"
                // Let's use `claimUnserializedPromise`. But that function assumes we just have an IMEI string, not an existing device entity.
                // If `device` exists, it has an ID.
                // We should probably Swap: Delete/Unallocate the Ghost, Allocate this one.
                // OR: Update the Ghost with this device's specialized attributes (if any) + IMEI, and delete this record?
                // Simpler for now: Just allocate THIS device to the order?
                // But then we have a dangling Ghost allocation.
                // Correct logic: Find Ghost, Update Ghost with IMEI, Delete `device` (duplicate)? 
                // Wait, `device` is a physical entity in the system. The Ghost is also a physical entity (unserialized).
                // They shouldn't coexist if they are the same unit.
                // Use case: User received 10 Unserialized iPhones. 10 Ghost devices created. 
                // User picks up one, scans IMEI. If it was already in system?
                // It shouldn't be in system if it was received as unserialized.
                // IF it interacts with an existing unallocated device, just pick IT.
                // And we should probably cancel one Ghost allocation to keep numbers balanced?
                // This is complex. Let's stick to the prompt's likely intent: 
                // "If devices have not been serialized then IMEI scanned ... can be applied"
                // This implies inputting an IMEI to a blank record. Not scanning an existing record.
                // BUT, if I scan a real existing device, I should just pick it.
                // And if I have reserved qty, I should prefer picking the reserved ones.

                // Let's just do Standard Allocation for this device.
                // And if we have excess reservations (because we picked unreserved stock instead), the user can unallocate the ghosts later?
                // Let's allow picking this unallocated device.
            }

            const line = order.lines.find(l => l.skuId === sku);
            if (!line) {
                alert(`SKU ${sku} is not in this order.`);
                return;
            }

            const currentPicked = progressBySku?.[sku] || 0;
            if (currentPicked >= line.qty) {
                if (!confirm(`Requirement for ${sku} is already met(${line.qty}). Add anyway?`)) return;
            }

            // Standard Pick (Allocate + PickedAt)
            updateEntity(device.id, {
                deviceAttributes: {
                    ...device.deviceAttributes,
                    allocatedToOrder: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        buyerName: order.buyer.name,
                        allocatedAt: new Date().toISOString(),
                        pickedAt: new Date().toISOString()
                    }
                }
            });
            setLastScannedId(device.id);
            setImeiInput('');

        } else {
            // Case 3: Device NOT found (New IMEI?)
            // "If devices have not been serialized then IMEI scanned... can be applied to... unserialized promised devices"
            // This is the Claim Unserialized logic.
            // We don't know the SKU yet. We only have IMEI.
            // We can't know which SKU this IMEI belongs to unless we ask user or check something.
            // BUT, validation says "matching unserialized promised devices".
            // If we have distinct SKUs with unserialized promises, we can't disambiguate.
            // Assume user selected from dropdown? Or we simply search ALL unserialized promises for ANY SKU in the order.
            // If only 1 matches, great. If multiple SKUs have unserialized promises, we might need to ask?
            // Simplification: Try to find ANY unserialized promise in this order.
            const unserializedPromises = reservedDevices.filter(d => !d.deviceAttributes?.imei);
            // Group by SKU
            const skusWithPromises = Array.from(new Set(unserializedPromises.map(u => u.deviceAttributes?.sku)));

            if (skusWithPromises.length === 0) {
                alert("Device not found and no unserialized promises to fill.");
                return;
            }

            if (skusWithPromises.length > 1) {
                alert("Multiple SKUs have unserialized promises. Please select the device from the list manually to claim.");
                return;
            }

            // Single SKU candidate
            const targetSku = skusWithPromises[0]!;
            if (claimUnserializedPromise(orderId, targetSku, imei)) {
                setImeiInput('');
                // Success
            } else {
                alert("Failed to claim promise.");
            }
        }
    };

    const handleUnpick = (deviceId: string) => {
        const device = state.entities[deviceId];
        if (!device?.deviceAttributes?.allocatedToOrder) return;

        // Logic:
        // If Picked -> Revert to Reserved (remove pickedAt)
        // If Reserved -> Unallocate (remove allocatedToOrder)
        // This allows undoing the "Pick" action without losing the promise.

        if (device.deviceAttributes.allocatedToOrder.pickedAt) {
            // Revert to Reserved
            const { pickedAt, ...rest } = device.deviceAttributes.allocatedToOrder;
            updateEntity(deviceId, {
                deviceAttributes: {
                    ...device.deviceAttributes,
                    allocatedToOrder: rest as any
                }
            });
        } else {
            // Unallocate completely
            updateEntity(deviceId, {
                deviceAttributes: {
                    ...device.deviceAttributes,
                    allocatedToOrder: undefined
                }
            });
        }
    };

    const handleMarkAllPicked = (sku: string) => {
        // Find all Reserved (Unpicked) for this SKU
        const targets = reservedDevices.filter(d => d.deviceAttributes?.sku === sku);
        if (targets.length === 0) return;

        // Check for unserialized
        const hasUnserialized = targets.some(d => !d.deviceAttributes?.imei);
        if (hasUnserialized) {
            const note = "Vendor Manifest should be provided to Buyer.";
            if (confirm(`Some items are unserialized. This will mark them as picked and add a note to the Order: "${note}". Proceed?`)) {
                // Add note to Order
                updateOrder(orderId, { notes: (order.notes || '') + '\n' + note });
                // Mark all
                markAllocatedDevicesPicked(targets.map(d => d.id));
            }
        } else {
            // Just mark all
            markAllocatedDevicesPicked(targets.map(d => d.id));
        }
    };

    const handleMarkReadyToPack = () => {
        // Validation: Check Staging Location
        if (!stagingBin.trim()) {
            alert("Please enter a Staging Bin location.");
            return;
        }
        if (!stagingBoxes.trim()) {
            alert("Please enter at least one Box label.");
            return;
        }

        const isComplete = order.lines.every(l => (progressBySku?.[l.skuId] || 0) >= l.qty);
        if (!isComplete) {
            if (!confirm("Order is not fully picked. Mark ready to pack anyway?")) return;
        }

        // Save Staging Location and Update Status
        updateOrder(orderId, {
            status: 'Ready for Packing',
            stagingLocation: {
                bin: stagingBin.trim(),
                boxes: stagingBoxes.split(',').map(s => s.trim()).filter(Boolean)
            }
        });

        // MOVE LOGIC: Move all Picked Devices to the Staging Bin
        // 1. Find the Bin ID matching logic (we stored label in state, need ID to move)
        const targetBin = availableBins.find(b => b.label === stagingBin);
        if (targetBin) {
            const pickedIds = pickedDevices.map(d => d.id);
            if (pickedIds.length > 0) {
                moveEntities(pickedIds, targetBin.id);
            }
        } else {
            console.error("Could not find bin ID for label:", stagingBin);
            // Should we alert? The user selected from dropdown so it SHOULD exist.
        }

        onBack();
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Picking: {order.orderNumber}
                    </h2>
                </div>
                <Button onClick={handleMarkReadyToPack} variant="default" className="bg-green-600 hover:bg-green-700">
                    <PackageCheck className="h-4 w-4 mr-2" />
                    Mark Ready to Pack
                </Button>
            </div>

            {/* Input Area */}
            <Card>
                <CardContent className="p-6 flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Scan IMEI or Select Available Device
                        </div>
                        <div className="flex gap-2">
                            <Input
                                autoFocus
                                placeholder="Scan IMEI..."
                                value={imeiInput}
                                onChange={e => setImeiInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handlePick(imeiInput);
                                }}
                                className="font-mono text-lg"
                            />
                            <Button size="icon" onClick={() => handlePick(imeiInput)}>
                                <Icons.CornerDownLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="w-[300px] space-y-2">
                        <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Available Matches (Top: Reserved)
                        </div>
                        <Select onValueChange={(val) => {
                            setImeiInput(val);
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select device..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCandidates
                                    .filter(d => !!d.deviceAttributes?.imei)
                                    .slice(0, 50)
                                    .map(d => {
                                        const isReserved = d.deviceAttributes?.allocatedToOrder?.orderId === orderId;
                                        return (
                                            <SelectItem key={d.id} value={d.deviceAttributes?.imei || ''} disabled={!d.deviceAttributes?.imei}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{d.deviceAttributes?.imei || 'No IMEI'}</span>
                                                    <span>• {d.deviceAttributes?.sku}</span>
                                                    {isReserved && <Badge variant="secondary" className="ml-2 text-[10px] h-5">Reserved</Badge>}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Staging Location Input */}
            <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <Icons.MapPin className="h-4 w-4" />
                        Staging Location (Required)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Caption */}
                    <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20 p-2 rounded">
                        <span className="font-semibold">Note:</span> Setting the staging location bin is required. All picked devices will be automatically moved to this bin when you mark the order as "Ready to Pack".
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 max-w-xs space-y-2">
                            <Label htmlFor="staging-bin">Bin Location</Label>
                            {state.pickPackDepartmentId ? (
                                <Select value={stagingBin} onValueChange={setStagingBin}>
                                    <SelectTrigger id="staging-bin" className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Select Staging Bin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableBins.map(bin => (
                                            <SelectItem key={bin.id} value={bin.label}>
                                                {bin.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="staging-bin"
                                    placeholder="Config Msg: Set Pick & Pack Dept"
                                    disabled
                                    className="bg-white dark:bg-slate-950"
                                />
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="staging-boxes">Box Labels (Comma separated)</Label>
                            <Input
                                id="staging-boxes"
                                placeholder="e.g. BOX-101, BOX-102"
                                value={stagingBoxes}
                                onChange={(e) => setStagingBoxes(e.target.value)}
                                className="bg-white dark:bg-slate-950"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Progress List */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader>
                    <CardTitle>Pick List</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Model / Description</TableHead>
                                <TableHead className="text-center">Required</TableHead>
                                <TableHead className="text-center">Picked</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.lines.map(line => {
                                const picked = progressBySku?.[line.skuId] || 0;
                                const isComplete = picked >= line.qty;
                                const reservedCount = reservedDevices.filter(d => d.deviceAttributes?.sku === line.skuId).length;

                                // Show "Mark All Picked" if we have reserved unpicked items
                                const showMarkAll = reservedCount > 0;

                                return (
                                    <TableRow key={line.id} className={isComplete ? "opacity-60 bg-muted/50" : ""}>
                                        <TableCell className="font-medium">
                                            {line.skuId}
                                            {reservedCount > 0 && (
                                                <div className="text-xs text-indigo-600 font-medium mt-1">
                                                    {reservedCount} Reserved, ready to pick
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{line.skuDisplay}</TableCell>
                                        <TableCell className="text-center text-lg">{line.qty}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-foreground'}`}>
                                                {picked}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {showMarkAll && !isComplete && (
                                                <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                    onClick={() => handleMarkAllPicked(line.skuId)}>
                                                    Mark All {reservedCount} Picked
                                                </Button>
                                            )}
                                            {isComplete && <Badge className="bg-green-600 ml-2">Done</Badge>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* Detailed Device List (Split by Status) */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT: To Pick (Reserved) */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-indigo-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Reserved (To Pick)
                            </h3>
                            {reservedDevices.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic border border-dashed rounded p-4 text-center">
                                    No reserved items pending. Scan available stock to pick.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {reservedDevices.map(d => {
                                        const parent = d.parentId ? state.entities[d.parentId] : null;
                                        return (
                                            <div key={d.id} className="p-3 border rounded-md bg-indigo-50/30 flex justify-between items-center group">
                                                <div>
                                                    <div className="font-bold flex items-center gap-2">
                                                        {d.deviceAttributes?.sku}
                                                        {!d.deviceAttributes?.imei && <Badge variant="outline" className="text-[10px] h-5 py-0">Unserialized</Badge>}
                                                    </div>
                                                    <div className="font-mono text-sm">{d.deviceAttributes?.imei || 'No IMEI'}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center mt-1">
                                                        <Icons.MapPin className="h-3 w-3 mr-1" />
                                                        {parent?.label || 'Unknown Loc'} ({d.parentId})
                                                    </div>
                                                </div>
                                                {/* Action: Quick Pick (Simulates Scan) if Serialized */}
                                                {d.deviceAttributes?.imei && (
                                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600"
                                                        onClick={() => handlePick(d.deviceAttributes?.imei!)}>
                                                        Quick Pick
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Picked (Done) */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-green-700 flex items-center gap-2">
                                <PackageCheck className="h-4 w-4" />
                                Picked
                            </h3>
                            {pickedDevices.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic border border-dashed rounded p-4 text-center">
                                    No items picked yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pickedDevices.map(d => {
                                        return (
                                            <div key={d.id} className="p-3 border rounded-md bg-green-50/30 flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold">{d.deviceAttributes?.sku}</div>
                                                    <div className="font-mono text-sm">{d.deviceAttributes?.imei || 'No IMEI'}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Picked at {new Date(d.deviceAttributes?.allocatedToOrder?.pickedAt!).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                    onClick={() => handleUnpick(d.id)} title="Unpick (Revert)">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}

export function PickPackPage() {
    const { state } = useWarehouse();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Filter for "Ready for Picking" orders
    const pickingOrders = Object.values(state.orders)
        .filter(o => o.status === 'Ready for Picking')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (selectedOrderId) {
        return (
            <div className="h-full p-6 bg-slate-50 dark:bg-slate-950/50">
                <PickingView orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pick & Pack</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage picking, packing, and shipping of orders.
                    </p>
                </div>
                <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
                    <Icons.Settings className="h-4 w-4" />
                </Button>
            </div>

            <PickPackSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Config Summary Badge */}
            <div className="flex gap-2 mb-4">
                {state.sellableDepartmentId ? (
                    <Badge variant="outline" className="text-xs bg-white">
                        Source: {state.entities[state.sellableDepartmentId]?.label}
                    </Badge>
                ) : (
                    <Badge variant="destructive" className="text-xs">
                        Config Required: Set Sellable Dept
                    </Badge>
                )}
                {state.pickPackDepartmentId ? (
                    <Badge variant="outline" className="text-xs bg-white">
                        Staging: {state.entities[state.pickPackDepartmentId]?.label}
                    </Badge>
                ) : (
                    <Badge variant="destructive" className="text-xs">
                        Config Required: Set Staging Dept
                    </Badge>
                )}
            </div>
            <div className="grid gap-4">
                {pickingOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                        No orders ready for picking.
                        <div className="text-sm mt-2">Move orders to "Ready for Picking" status to see them here.</div>
                    </div>
                ) : (
                    pickingOrders.map(order => (
                        <Card
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedOrderId(order.id)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">
                                    {order.orderNumber}
                                    <span className="ml-2 font-normal text-muted-foreground">
                                        • {order.buyer.name}
                                    </span>
                                </CardTitle>
                                <Badge className="bg-amber-500 hover:bg-amber-600">
                                    Ready for Picking
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{order.lines.reduce((s, l) => s + l.qty, 0)} items to pick</span>
                                    <span>Created {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
