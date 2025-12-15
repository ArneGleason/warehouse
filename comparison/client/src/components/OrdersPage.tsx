import React, { useState, useEffect } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ShoppingCart, ArrowLeft, Truck, CreditCard, Package, RotateCcw, ClipboardList, Trash2, Receipt } from 'lucide-react';
import { Order, OrderStatus } from '@/lib/warehouse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WarehouseEntity, OrderLine, PurchaseOrder } from '@/lib/warehouse';
import { Checkbox } from '@/components/ui/checkbox';


function ManifestDialog({ orderId, entities }: { orderId: string, entities: Record<string, WarehouseEntity> }) {
    const allocatedDevices = Object.values(entities).filter(
        e => e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === orderId
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Manifest ({allocatedDevices.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Order Manifest</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Model</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>IMEI / Serial</TableHead>
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allocatedDevices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                        No devices allocated yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                allocatedDevices.map(device => {
                                    // Find parent location label
                                    const parent = device.parentId ? entities[device.parentId] : null;
                                    const locationLabel = parent ? parent.label : 'Unknown';

                                    return (
                                        <TableRow key={device.id}>
                                            <TableCell className="font-medium">{device.deviceAttributes?.model}</TableCell>
                                            <TableCell>{device.deviceAttributes?.sku}</TableCell>
                                            <TableCell className="font-mono text-xs">{device.deviceAttributes?.imei || device.deviceAttributes?.barcode || '-'}</TableCell>
                                            <TableCell>{locationLabel}</TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <div className="flex justify-end p-2 border-t text-sm text-muted-foreground">
                    Total Allocated: {allocatedDevices.length}
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface OrderLineFormData {
    sku: string;
    qty: number;
    unitPrice: number;
}

function OrderLineDialog({
    open,
    onOpenChange,
    onSave,
    availableInventory,
    initialValues
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    onSave: (data: OrderLineFormData) => void,
    availableInventory: Record<string, number>,
    initialValues?: OrderLineFormData
}) {
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [unitPrice, setUnitPrice] = useState<string>('');

    // Load initial values when dialog opens
    useEffect(() => {
        if (open && initialValues) {
            setSelectedSku(initialValues.sku);
            setQty(initialValues.qty);
            setUnitPrice(initialValues.unitPrice.toString());
        } else if (open) {
            // Reset for Add mode
            setSelectedSku(null);
            setQty(1);
            setUnitPrice('');
        }
    }, [open, initialValues]);

    const handleSave = () => {
        if (selectedSku) {
            const price = parseFloat(unitPrice);
            if (isNaN(price)) {
                alert("Please enter a valid unit price");
                return;
            }
            onSave({ sku: selectedSku, qty, unitPrice: price });
            onOpenChange(false);
        }
    };

    const skus = Object.entries(availableInventory).map(([sku, count]) => ({ sku, count }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initialValues ? 'Edit Order Line' : 'Add Order Line'}</DialogTitle>
                </DialogHeader>
                <div className="flex gap-4 h-[400px]">
                    <div className="flex-1 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skus.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                            No sellable inventory found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    skus.map(item => (
                                        <TableRow
                                            key={item.sku}
                                            className={`cursor-pointer ${selectedSku === item.sku ? 'bg-muted' : ''}`}
                                            onClick={() => setSelectedSku(item.sku)}
                                        >
                                            <TableCell className="font-medium">{item.sku}</TableCell>
                                            <TableCell className="text-right">{item.count}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="w-[200px] flex flex-col gap-4 p-4 border rounded-md bg-muted/10">
                        <div className="space-y-2">
                            <Label>Selected SKU</Label>
                            <div className="font-semibold h-6 text-sm truncate" title={selectedSku || ''}>
                                {selectedSku || 'None selected'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min={1}
                                value={qty}
                                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                                disabled={!selectedSku}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit Price ($)</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                placeholder="0.00"
                                disabled={!selectedSku}
                            />
                        </div>
                        <div className="flex-1" />
                        <Button onClick={handleSave} disabled={!selectedSku}>
                            {initialValues ? 'Save Changes' : 'Add to Order'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ImportFromPODialog({
    open,
    onOpenChange,
    purchaseOrders,
    onImport
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    purchaseOrders: PurchaseOrder[],
    onImport: (items: { sku: string, qty: number, poId: string, poLineId: string }[]) => void
}) {
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});

    const validPos = purchaseOrders.filter(po => po.status === 'Issued' || po.status === 'Receiving');
    const selectedPo = selectedPoId ? purchaseOrders.find(po => po.id === selectedPoId) : null;

    // Reset selection when PO changes
    useEffect(() => {
        if (selectedPo) {
            const allSelected: Record<string, boolean> = {};
            selectedPo.lines.forEach(line => {
                allSelected[line.id] = true;
            });
            setSelectedLines(allSelected);
        } else {
            setSelectedLines({});
        }
    }, [selectedPoId]);

    const handleImport = () => {
        if (!selectedPo) return;

        const itemsToImport = selectedPo.lines
            .filter(line => selectedLines[line.id])
            .map(line => ({
                sku: line.itemSku,
                qty: line.qty,
                poId: selectedPo.id,
                poLineId: line.id
            }));

        onImport(itemsToImport);
        onOpenChange(false);
        setSelectedPoId(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Import from Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 h-[500px]">
                    <div className="w-[300px]">
                        <Label>Select Purchase Order</Label>
                        <Select value={selectedPoId || ''} onValueChange={setSelectedPoId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select PO..." />
                            </SelectTrigger>
                            <SelectContent>
                                {validPos.length === 0 ? (
                                    <SelectItem value="none" disabled>No valid POs found</SelectItem>
                                ) : (
                                    validPos.map(po => (
                                        <SelectItem key={po.id} value={po.id}>
                                            {po.poNumber} ({po.status}) - {po.lines.length} items
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                        <div className="p-2 bg-muted/20 border-b flex justify-between items-center text-sm px-4">
                            <span className="font-semibold">Items in PO</span>
                            {selectedPo && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => {
                                        const allConfig: Record<string, boolean> = {};
                                        selectedPo.lines.forEach(l => allConfig[l.id] = true);
                                        setSelectedLines(allConfig);
                                    }}>Select All</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedLines({})}>Deselect All</Button>
                                </div>
                            )}
                        </div>
                        <ScrollArea className="flex-1">
                            {!selectedPo ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Please select a PO to view items.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">PO Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedPo.lines.map(line => (
                                            <TableRow
                                                key={line.id}
                                                onClick={() => setSelectedLines(prev => ({ ...prev, [line.id]: !prev[line.id] }))}
                                                className="cursor-pointer hover:bg-muted/50"
                                            >
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={!!selectedLines[line.id]}
                                                        onCheckedChange={(checked) => setSelectedLines(prev => ({ ...prev, [line.id]: !!checked }))}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono">{line.itemSku}</TableCell>
                                                <TableCell className="text-right">{line.qty}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleImport} disabled={!selectedPo || Object.values(selectedLines).every(v => !v)}>
                            Import Items
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Order Details Component ---
function OrderDetails({ orderId, onBack }: { orderId: string; onBack: () => void }) {
    const { state, updateOrder, getSellableInventory, allocateDevices, deleteOrder, removeOrderLine, shipOrder } = useWarehouse();
    const order = state.orders[orderId];
    const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);

    // Line Editing State
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [importPoDialogOpen, setImportPoDialogOpen] = useState(false);
    const [editingLine, setEditingLine] = useState<OrderLine | null>(null);

    // Local state for form fields to prevent excessive context updates on every keystroke
    // We'll sync on blur or "Save"
    const [buyer, setBuyer] = useState(order?.buyer || {});
    const [notes, setNotes] = useState(order?.notes || '');

    useEffect(() => {
        if (order) {
            setBuyer(order.buyer);
            setNotes(order.notes || '');
        }
    }, [order]);

    if (!order) return <div>Order not found</div>;

    const handleBuyerChange = (field: keyof typeof buyer, value: string) => {
        setBuyer(prev => ({ ...prev, [field]: value }));
    };

    const saveChanges = () => {
        updateOrder(orderId, {
            buyer,
            notes
        });
    };

    // Auto-save on blur helper
    const handleBlur = () => {
        saveChanges();
    };

    const handleSaveLine = (data: OrderLineFormData) => {
        let newLines = [...order.lines];

        if (editingLine) {
            // Edit Mode: Update existing line
            const index = newLines.findIndex(l => l.id === editingLine.id);
            if (index >= 0) {
                newLines[index] = {
                    ...newLines[index],
                    skuId: data.sku,
                    skuDisplay: state.items[data.sku]?.model || data.sku,
                    qty: data.qty,
                    unitPrice: data.unitPrice
                };
            }
        } else {
            // Add Mode: Update Order Lines (Merge if exists, else add)
            const existingLineIndex = order.lines.findIndex(l => l.skuId === data.sku && l.unitPrice === data.unitPrice);

            if (existingLineIndex >= 0) {
                newLines[existingLineIndex] = {
                    ...newLines[existingLineIndex],
                    qty: newLines[existingLineIndex].qty + data.qty
                };
            } else {
                newLines.push({
                    id: `line-${Date.now()}`,
                    orderId: order.id,
                    skuId: data.sku,
                    skuDisplay: state.items[data.sku]?.model || data.sku,
                    qty: data.qty,
                    unitPrice: data.unitPrice
                });
            }
        }

        updateOrder(order.id, { lines: newLines });
    };

    const handleImportFromPo = (items: { sku: string, qty: number, poId: string, poLineId: string }[]) => {
        let newLines = [...order.lines];

        items.forEach(item => {
            // Check if exact same line exists (SKU + UnitPrice 0 + Same PO Line Promise)
            const existingIndex = newLines.findIndex(l =>
                l.skuId === item.sku &&
                l.unitPrice === 0 &&
                l.promisedPoId === item.poId &&
                l.promisedPoLineId === item.poLineId
            );

            if (existingIndex >= 0) {
                newLines[existingIndex] = {
                    ...newLines[existingIndex],
                    qty: newLines[existingIndex].qty + item.qty
                };
            } else {
                newLines.push({
                    id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    orderId: order.id,
                    skuId: item.sku,
                    skuDisplay: state.items[item.sku]?.model || item.sku,
                    qty: item.qty,
                    unitPrice: 0,
                    promisedPoId: item.poId,
                    promisedPoLineId: item.poLineId
                });
            }
        });

        updateOrder(order.id, { lines: newLines });
    };

    const handleStatusChange = (newStatus: OrderStatus) => {
        // Validation Logic
        if (newStatus === 'Ready for Payment') {
            if (!order.buyer.name || !order.buyer.name.trim()) {
                alert("Validation Error: Buyer Name is required.");
                return;
            }
            if (order.lines.length === 0) {
                alert("Validation Error: Order must have at least one line item.");
                return;
            }
        }

        // Check allocations for Picking and Shipping
        if (newStatus === 'Shipped') {
            const allocatedDeviceCount = Object.values(state.entities).filter(
                e => e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === orderId
            ).length;
            const totalOrderedQty = order.lines.reduce((sum, line) => sum + line.qty, 0);

            if (allocatedDeviceCount < totalOrderedQty) {
                if (!confirm(`Warning: Only ${allocatedDeviceCount} of ${totalOrderedQty} items are allocated. Do you want to ship this partial order?`)) {
                    return;
                }
            }
        }

        if (newStatus === 'Shipped') {
            if (confirm("Confirm Shipment? This will remove allocated items from inventory.")) {
                shipOrder(orderId);
            }
            return;
        }

        updateOrder(orderId, { status: newStatus });
    };

    const sellableInventory = getSellableInventory();

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {order.orderNumber}
                            <Badge variant={
                                order.status === 'Draft' ? 'secondary' :
                                    order.status === 'Ready for Payment' ? 'outline' :
                                        order.status === 'Ready for Picking' ? 'default' : 'default'
                            } className={
                                order.status === 'Ready for Picking' ? 'bg-amber-500 hover:bg-amber-600' :
                                    order.status === 'Shipped' ? 'bg-green-600 hover:bg-green-700' : ''
                            }>{order.status}</Badge>
                        </h2>
                        <div className="text-sm text-muted-foreground">
                            Created {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Delete Order Action (Draft Only) */}
                    {order.status === 'Draft' && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteOrderOpen(true)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Order
                        </Button>
                    )}

                    <DeleteConfirmationDialog
                        isOpen={deleteOrderOpen}
                        onClose={() => setDeleteOrderOpen(false)}
                        onConfirm={() => {
                            deleteOrder(orderId);
                            onBack();
                        }}
                        entityName={`Order ${order.orderNumber}`}
                        validationText="delete"
                    />

                    <ManifestDialog orderId={orderId} entities={state.entities} />

                    {/* Status Actions */}
                    {order.status === 'Draft' && (
                        <Button onClick={() => handleStatusChange('Ready for Payment')}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Mark Ready for Payment
                        </Button>
                    )}
                    {order.status === 'Ready for Payment' && (
                        <>
                            <Button variant="outline" onClick={() => handleStatusChange('Draft')}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Revert
                            </Button>
                            <Button onClick={() => handleStatusChange('Ready for Picking')}>
                                <Package className="h-4 w-4 mr-2" />
                                Mark Ready for Picking
                            </Button>
                        </>
                    )}
                    {order.status === 'Ready for Picking' && (
                        <>
                            <Button variant="outline" onClick={() => handleStatusChange('Ready for Payment')}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Revert
                            </Button>
                            <Button onClick={() => handleStatusChange('Shipped')}>
                                <Truck className="h-4 w-4 mr-2" />
                                Mark Shipped
                            </Button>
                        </>
                    )}
                    {order.status === 'Shipped' && (
                        <Button variant="outline" onClick={() => updateOrder(orderId, { status: 'Ready for Picking', shippedAt: undefined })}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Revert to Picking
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Left Column: Buyer & Details */}
                <div className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Buyer Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="buyerName">Name *</Label>
                                <Input
                                    id="buyerName"
                                    value={buyer.name || ''}
                                    onChange={(e) => handleBuyerChange('name', e.target.value)}
                                    onBlur={handleBlur}
                                    disabled={order.status !== 'Draft'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    value={buyer.company || ''}
                                    onChange={(e) => handleBuyerChange('company', e.target.value)}
                                    onBlur={handleBlur}
                                    disabled={order.status !== 'Draft'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={buyer.email || ''}
                                    onChange={(e) => handleBuyerChange('email', e.target.value)}
                                    onBlur={handleBlur}
                                    disabled={order.status !== 'Draft'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={buyer.phone || ''}
                                    onChange={(e) => handleBuyerChange('phone', e.target.value)}
                                    onBlur={handleBlur}
                                    disabled={order.status !== 'Draft'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Ship To Address</Label>
                                <textarea
                                    id="address"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={buyer.shipToAddress || ''}
                                    onChange={(e) => handleBuyerChange('shipToAddress', e.target.value)}
                                    onBlur={handleBlur}
                                    disabled={order.status !== 'Draft'}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Internal notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                onBlur={handleBlur}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Lines */}
                <div className="col-span-2 flex flex-col gap-6 overflow-hidden">
                    <Card className="flex-1 flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Order Lines</CardTitle>
                            {order.status === 'Draft' && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setImportPoDialogOpen(true)}>
                                        <ClipboardList className="h-4 w-4 mr-2" />
                                        Import from PO
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setEditingLine(null);
                                        setProcessDialogOpen(true);
                                    }}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Line
                                    </Button>
                                </div>
                            )}
                            <ImportFromPODialog
                                open={importPoDialogOpen}
                                onOpenChange={setImportPoDialogOpen}
                                purchaseOrders={Object.values(state.purchaseOrders)}
                                onImport={handleImportFromPo}
                            />
                            <OrderLineDialog
                                open={processDialogOpen}
                                onOpenChange={setProcessDialogOpen}
                                onSave={handleSaveLine}
                                availableInventory={sellableInventory}
                                initialValues={editingLine ? {
                                    sku: editingLine.skuId,
                                    qty: editingLine.qty,
                                    unitPrice: editingLine.unitPrice || 0
                                } : undefined}
                            />
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            {order.lines.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                                    No items added yet.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Line Total</TableHead>
                                            {order.status === 'Draft' && <TableHead className="w-[50px]"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.lines.map(line => (
                                            <TableRow
                                                key={line.id}
                                                className={order.status === 'Draft' ? "cursor-pointer hover:bg-muted/50" : ""}
                                                onClick={() => {
                                                    if (order.status === 'Draft') {
                                                        setEditingLine(line);
                                                        setProcessDialogOpen(true);
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{line.skuDisplay}</div>
                                                    <div className="text-xs text-muted-foreground">{line.skuId}</div>
                                                    {line.promisedPoId && (
                                                        <div className="mt-1">
                                                            <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                                                                Promised from {state.purchaseOrders[line.promisedPoId]?.poNumber || 'Unknown PO'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{line.qty}</TableCell>
                                                <TableCell className="text-right">
                                                    {line.unitPrice !== undefined
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(line.unitPrice)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {line.unitPrice !== undefined
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(line.qty * line.unitPrice)
                                                        : '-'}
                                                </TableCell>
                                                {order.status === 'Draft' && (
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Remove line ${line.skuDisplay}?`)) {
                                                                    removeOrderLine(orderId, line.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                        <div className="p-4 border-t bg-muted/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Items:</span>
                                <span>{order.lines.reduce((sum, line) => sum + line.qty, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Order Total:</span>
                                <span>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                        order.lines.reduce((sum, line) => sum + (line.qty * (line.unitPrice || 0)), 0)
                                    )}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}



export function OrdersPage() {
    const { state, addOrder, updateOrder } = useWarehouse();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');

    const orders = Object.values(state.orders || {}).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filteredOrders = statusFilter === 'All'
        ? orders
        : orders.filter(o => o.status === statusFilter);

    const handleCreateOrder = () => {
        const newOrder: Order = {
            id: `ord-${Date.now()}`, // Temporary ID gen
            orderNumber: `ORD-${Object.keys(state.orders || {}).length + 1001}`,
            status: 'Draft',
            buyer: {
                name: 'New Buyer',
                company: '',
                email: '',
                phone: '',
                shipToAddress: '',
            },
            notes: '',
            lines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        addOrder(newOrder);
        setSelectedOrderId(newOrder.id);
    };

    if (selectedOrderId) {
        const selectedOrder = state.orders[selectedOrderId];


        return (
            <div className="h-full p-6 bg-slate-50 dark:bg-slate-950/50">
                <OrderDetails orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="h-6 w-6" />
                        Sales Orders
                    </h1>
                    <p className="text-muted-foreground">Manage draft orders and shipments</p>
                </div>
                <Button onClick={handleCreateOrder}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['All', 'Draft', 'Ready for Payment', 'Ready for Picking', 'Ready for Packing', 'Shipped'] as const).map(status => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                    >
                        {status}
                    </Button>
                ))}
            </div>

            {/* Orders List */}
            <div className="grid gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        No orders found. Create a new order to get started.
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <Card key={order.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedOrderId(order.id)}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold">
                                    {order.orderNumber}
                                    <span className="ml-2 font-normal text-muted-foreground">
                                        • {order.buyer.name}
                                    </span>
                                </CardTitle>
                                <Badge variant={
                                    order.status === 'Draft' ? 'secondary' :
                                        order.status === 'Ready for Payment' ? 'outline' :
                                            order.status === 'Ready for Picking' ? 'default' : 'default'
                                } className={
                                    order.status === 'Ready for Picking' ? 'bg-amber-500 hover:bg-amber-600' :
                                        order.status === 'Ready for Packing' ? 'bg-blue-600 hover:bg-blue-700' :
                                            order.status === 'Shipped' ? 'bg-green-600 hover:bg-green-700' : ''
                                }>
                                    {order.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    {order.lines.length} items • Created {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

