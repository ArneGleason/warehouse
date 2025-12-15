import React, { useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Trash2, Plus, AlertCircle, CheckCircle, Package, Settings } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from '@/lib/warehouse';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessingSettingsDialog } from './ProcessingSettingsDialog';

interface PurchaseOrderDetailsProps {
    poId: string;
    onBack: () => void;
}

export function PurchaseOrderDetails({ poId, onBack }: PurchaseOrderDetailsProps) {
    const { state, updatePurchaseOrder, deletePurchaseOrder, finishPurchaseOrder } = useWarehouse();
    const po = state.purchaseOrders[poId];

    // Calculate Promises
    const promisesStart = React.useMemo(() => {
        const promiseMap: Record<string, { orderId: string, orderNumber: string, qty: number }[]> = {};

        Object.values(state.orders).forEach(order => {
            if (order.status !== 'Canceled') {
                order.lines.forEach(line => {
                    if (line.promisedPoId === poId && line.promisedPoLineId) {
                        if (!promiseMap[line.promisedPoLineId]) {
                            promiseMap[line.promisedPoLineId] = [];
                        }
                        promiseMap[line.promisedPoLineId].push({
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            qty: line.qty
                        });
                    }
                });
            }
        });
        return promiseMap;
    }, [state.orders, poId]);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDoneConfirm, setShowDoneConfirm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [isAddLineOpen, setIsAddLineOpen] = useState(false);

    // Add Line State
    const [selectedItemSku, setSelectedItemSku] = useState('');
    const [vendorSku, setVendorSku] = useState('');
    const [qty, setQty] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);

    if (!po) return <div>Purchase Order not found</div>;

    const vendor = state.vendors[po.vendorId];
    const receivingBinId = state.receivingBinId;
    const receivingBin = receivingBinId ? state.entities[receivingBinId] : null;

    const handleStatusChange = (newStatus: PurchaseOrderStatus) => {
        if (newStatus === 'Done') {
            // Logic handled by finish confirmation
            setShowDoneConfirm(true);
        } else {
            updatePurchaseOrder(poId, { status: newStatus });
        }
    };

    const handleMarkDone = () => {
        if (!receivingBinId) {
            // Should not happen if button disabled, but just in case
            return;
        }
        finishPurchaseOrder(poId);
        setShowDoneConfirm(false);
    };

    const handleDelete = () => {
        deletePurchaseOrder(poId);
        onBack();
    };

    const handleAddLine = () => {
        if (!selectedItemSku || qty <= 0) return;

        const item = state.items[selectedItemSku];

        const newLine: PurchaseOrderLine = {
            id: crypto.randomUUID(),
            poId,
            itemSku: selectedItemSku,
            vendorSku: vendorSku || undefined,
            itemSkuDescription: `${item.manufacturer} ${item.model} ${item.grade}`,
            qty,
            unitPrice,
            lineTotal: qty * unitPrice,
            receivedQty: 0
        };

        const updatedLines = [...po.lines, newLine];
        updatePurchaseOrder(poId, { lines: updatedLines });

        // Reset form
        setSelectedItemSku('');
        setVendorSku('');
        setQty(1);
        setUnitPrice(0);
        setIsAddLineOpen(false);
    };

    const removeLine = (lineId: string) => {
        const updatedLines = po.lines.filter(l => l.id !== lineId);
        updatePurchaseOrder(poId, { lines: updatedLines });
    };

    const updateReceivedQty = (lineId: string, val: number) => {
        const updatedLines = po.lines.map(l => {
            if (l.id === lineId) {
                return { ...l, receivedQty: val };
            }
            return l;
        });
        updatePurchaseOrder(poId, { lines: updatedLines });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'Issued': return 'bg-blue-100 text-blue-800';
            case 'Receiving': return 'bg-yellow-100 text-yellow-800';
            case 'Done': return 'bg-green-100 text-green-800';
            case 'Canceled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const grandTotal = po.lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalOrdered = po.lines.reduce((sum, line) => sum + line.qty, 0);
    const totalReceived = po.lines.reduce((sum, line) => sum + (line.receivedQty || 0), 0);

    // Filter Items for Select
    const items = Object.values(state.items).filter(i => i.active).sort((a, b) => a.sku.localeCompare(b.sku));

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950/50">
            {/* Header */}
            <div className="p-6 border-b bg-white dark:bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
                            <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Vendor: <span className="font-medium text-foreground">{vendor ? vendor.name : 'Unknown'}</span>
                            <span className="mx-2">•</span>
                            Date: {new Date(po.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {po.status === 'Draft' && (
                        <>
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange('Issued')}>
                                Issue PO
                            </Button>
                        </>
                    )}
                    {po.status === 'Issued' && (
                        <>
                            <Button variant="outline" onClick={() => handleStatusChange('Draft')}>Revert to Draft</Button>
                            <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={() => handleStatusChange('Receiving')}>
                                Start Receiving
                            </Button>
                        </>
                    )}
                    {po.status === 'Receiving' && (
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowDoneConfirm(true)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Done
                        </Button>
                    )}
                    {(po.status === 'Issued' || po.status === 'Draft') && (
                        <Button variant="ghost" className="text-red-600" onClick={() => handleStatusChange('Canceled')}>
                            Cancel PO
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>One-Time Items (PO Lines)</CardTitle>
                        {po.status === 'Draft' && (
                            <Button size="sm" onClick={() => setIsAddLineOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Line
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item SKU</TableHead>
                                    <TableHead>Vendor SKU</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    {po.status === 'Receiving' || po.status === 'Done' ? (
                                        <TableHead className="text-right w-32 bg-yellow-50/50">Received</TableHead>
                                    ) : null}
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {po.lines.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No items on this purchase order.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    po.lines.map(line => (
                                        <TableRow key={line.id}>
                                            <TableCell className="font-medium">{line.itemSku}</TableCell>
                                            <TableCell className="text-muted-foreground">{line.vendorSku || '-'}</TableCell>
                                            <TableCell>
                                                {line.itemSkuDescription}
                                                {promisesStart[line.id] && promisesStart[line.id].length > 0 && (
                                                    <div className="mt-1 flex flex-col gap-1">
                                                        {promisesStart[line.id].map((p, idx) => (
                                                            <div key={idx} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                                                                Promised to {p.orderNumber}: {p.qty}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{line.qty}</TableCell>

                                            {po.status === 'Receiving' || po.status === 'Done' ? (
                                                <TableCell className="text-right bg-yellow-50/50">
                                                    {po.status === 'Receiving' ? (
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-24 ml-auto text-right"
                                                            min="0"
                                                            value={line.receivedQty || 0}
                                                            onChange={(e) => updateReceivedQty(line.id, parseInt(e.target.value) || 0)}
                                                        />
                                                    ) : (
                                                        <span className={line.receivedQty !== line.qty ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                                            {line.receivedQty || 0}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            ) : null}

                                            <TableCell className="text-right">${line.unitPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold">${line.lineTotal.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {po.status === 'Draft' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeLine(line.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                {po.status === 'Receiving' && (
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Enter received quantities above. Devices will be generated upon completion.</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-8 text-lg font-bold">
                                <span>Total:</span>
                                <span>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Line Dialog */}
            <Dialog open={isAddLineOpen} onOpenChange={setIsAddLineOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Line Item</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Receiving SKU (Required)</Label>
                            {/* Simple Native Select for now due to large list potential */}
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedItemSku}
                                onChange={(e) => setSelectedItemSku(e.target.value)}
                            >
                                <option value="" disabled>Select internal SKU...</option>
                                {items.map(item => (
                                    <option key={item.sku} value={item.sku}>
                                        {item.sku}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vendor SKU (Optional)</Label>
                            <Input
                                value={vendorSku}
                                onChange={(e) => setVendorSku(e.target.value)}
                                placeholder="e.g. V-12345"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Price ($)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-sm font-medium">
                            <span>Line Total:</span>
                            <span>${(qty * unitPrice).toFixed(2)}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddLineOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddLine} disabled={!selectedItemSku || qty <= 0}>Add Item</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                entityName={`PO ${po.poNumber}`}
                validationText="delete"
            />

            {/* Mark Done Config Warning / Confirmation */}
            <Dialog open={showDoneConfirm} onOpenChange={setShowDoneConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Purchase Order</DialogTitle>
                        <DialogDescription>
                            This will mark the PO as Done and generate inventory for the received items.
                        </DialogDescription>
                    </DialogHeader>

                    {!receivingBin ? (
                        <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 mt-0.5" />
                            <div className="space-y-2">
                                <div className="font-semibold">Missing Receiving Bin Configuration</div>
                                <div className="text-sm">You must configure a "Received Bin" in Settings before you can complete this PO. Inventory will be created in this bin.</div>
                                <Button size="sm" variant="outline" className="mt-2" onClick={() => { setShowDoneConfirm(false); setShowSettings(true); }}>
                                    Open Settings
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-slate-50 p-3 rounded">
                                    <div className="text-muted-foreground">Total Ordered</div>
                                    <div className="text-xl font-bold">{totalOrdered}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded">
                                    <div className="text-muted-foreground">Total Received</div>
                                    <div className={totalReceived !== totalOrdered ? "text-xl font-bold text-orange-600" : "text-xl font-bold text-green-600"}>
                                        {totalReceived}
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Inventory will be created in: <strong>{receivingBin.label}</strong>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDoneConfirm(false)}>Cancel</Button>
                        <Button onClick={handleMarkDone} disabled={!receivingBin}>Confirm & Create Inventory</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ProcessingSettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
}
