import React, { useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, ClipboardList, Calendar, DollarSign, User as UserIcon, Settings } from 'lucide-react';
import { PurchaseOrderDetails } from './PurchaseOrderDetails';
import { ProcessingSettingsDialog } from './ProcessingSettingsDialog';

export function PurchaseOrdersPage() {
    const { state, addPurchaseOrder } = useWarehouse();
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);

    const purchaseOrders = Object.values(state.purchaseOrders || {})
        .filter(po => {
            const vendor = state.vendors[po.vendorId];
            const vendorName = vendor ? vendor.name : 'Unknown';
            const searchLower = searchTerm.toLowerCase();
            return (
                po.poNumber.toLowerCase().includes(searchLower) ||
                vendorName.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleCreatePO = () => {
        if (!selectedVendorId) return;
        const newId = addPurchaseOrder(selectedVendorId);
        setSelectedVendorId('');
        setIsCreateDialogOpen(false);
        setSelectedPoId(newId);
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

    const getPOTotal = (lines: any[]) => {
        return lines.reduce((sum, line) => sum + line.lineTotal, 0);
    };

    if (selectedPoId) {
        return <PurchaseOrderDetails poId={selectedPoId} onBack={() => setSelectedPoId(null)} />;
    }

    const vendors = Object.values(state.vendors).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950/50">
            {/* Header */}
            <div className="p-6 border-b bg-white dark:bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        Purchase Orders
                    </h1>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search POs..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setShowSettings(true)} title="Settings">
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New PO
                    </Button>
                </div>
            </div>

            {/* PO List */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid gap-4">
                    {purchaseOrders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                            No purchase orders found.
                        </div>
                    ) : (
                        purchaseOrders.map(po => {
                            const vendor = state.vendors[po.vendorId];
                            const total = getPOTotal(po.lines);

                            return (
                                <Card
                                    key={po.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedPoId(po.id)}
                                >
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-lg">
                                                PO
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-lg">{po.poNumber}</span>
                                                    <Badge variant="outline" className={`${getStatusColor(po.status)} border-0`}>
                                                        {po.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <UserIcon className="h-3 w-3" />
                                                        {vendor ? vendor.name : 'Unknown Vendor'}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(po.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xl font-bold font-mono">
                                                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {po.lines.length} items
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Purchase Order</DialogTitle>
                        <DialogDescription>
                            Select a vendor to create a new Draft Purchase Order.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedVendorId}
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                            >
                                <option value="" disabled>Select a vendor...</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} ({v.vendorCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePO} disabled={!selectedVendorId}>Create PO</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ProcessingSettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
}
