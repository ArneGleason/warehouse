import React, { useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Handshake, Phone, Globe, Trash2 } from 'lucide-react';
import { VendorDetails } from './VendorDetails';

export function VendorsPage() {
    const { state, addVendor } = useWarehouse();
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');

    const vendors = Object.values(state.vendors)
        .filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.vendorCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleCreateVendor = () => {
        if (!newVendorName.trim()) return;
        addVendor({
            name: newVendorName,
        });
        setNewVendorName('');
        setIsCreateDialogOpen(false);
    };

    if (selectedVendorId) {
        return <VendorDetails vendorId={selectedVendorId} onBack={() => setSelectedVendorId(null)} />;
    }
    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950/50">
            {/* Header */}
            <div className="p-6 border-b bg-white dark:bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Handshake className="h-6 w-6" />
                        Vendors
                    </h1>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vendors..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Vendor
                </Button>
            </div>

            {/* Vendor List */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid gap-4">
                    {vendors.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                            No vendors found.
                        </div>
                    ) : (
                        vendors.map(vendor => (
                            <Card
                                key={vendor.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setSelectedVendorId(vendor.id)}
                            >
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                                            {vendor.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-lg">{vendor.name}</div>
                                            <div className="flex gap-2 text-sm text-muted-foreground">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {vendor.vendorCode}
                                                </Badge>
                                                {vendor.email && <span>• {vendor.email}</span>}
                                                {vendor.phone && <span>• {vendor.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <div>Created {new Date(vendor.createdAt).toLocaleDateString()}</div>
                                        {vendor.website && (
                                            <div className="flex items-center justify-end mt-1 text-blue-600">
                                                <Globe className="h-3 w-3 mr-1" />
                                                {vendor.website}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Vendor</DialogTitle>
                        <DialogDescription>
                            Enter the vendor name to create a new record. ID will be generated automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Vendor Name</Label>
                        <Input
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            placeholder="e.g. Acme Supplies"
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateVendor} disabled={!newVendorName.trim()}>Create Vendor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
