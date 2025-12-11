import React, { useState, useMemo } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Upload, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ItemDefinition, VendorSku } from '@/lib/warehouse';
import { v4 as uuidv4 } from 'uuid';

export function VendorSkusTab({ item }: { item: ItemDefinition }) {
    const { state, addVendorSku, updateVendorSku } = useWarehouse();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Dialog State
    const [formData, setFormData] = useState({
        vendorName: '',
        vendorId: '',
        vendorSku: '',
        status: 'Active' as 'Active' | 'Inactive'
    });

    const vendorSkus = useMemo(() => {
        return (item.vendorSkus || [])
            .map(id => state.vendorSkus[id])
            .filter(Boolean) // Filter out undefined if any
            .filter(v => {
                if (!searchTerm) return true;
                const lower = searchTerm.toLowerCase();
                return v.vendorName.toLowerCase().includes(lower) ||
                    v.vendorSku.toLowerCase().includes(lower) ||
                    v.vendorId.toLowerCase().includes(lower);
            });
    }, [item.vendorSkus, state.vendorSkus, searchTerm]);

    const handleSave = () => {
        if (!formData.vendorName || !formData.vendorSku) {
            toast.error("Vendor Name and Vendor SKU are required");
            return;
        }

        // Check Uniqueness
        const exists = vendorSkus.some(v =>
            v.vendorName.toLowerCase() === formData.vendorName.toLowerCase() &&
            v.vendorSku.toLowerCase() === formData.vendorSku.toLowerCase()
        );
        if (exists) {
            toast.error("This Vendor + Vendor SKU combination already exists for this item");
            return;
        }

        addVendorSku({
            id: uuidv4(),
            itemSku: item.sku,
            vendorName: formData.vendorName,
            vendorId: formData.vendorId,
            vendorSku: formData.vendorSku,
            status: formData.status,
            poCount: 0,
            createdAt: new Date().toISOString()
        });

        toast.success("Vendor SKU added");
        setIsDialogOpen(false);
        setFormData({ vendorName: '', vendorId: '', vendorSku: '', status: 'Active' });
    };

    return (
        <div className="space-y-4 pt-4">
            {/* Actions */}
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search vendor SKUs..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Import</Button>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export</Button>
                    <Button size="sm" onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Vendor SKU</Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"><input type="checkbox" /></TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Vendor ID</TableHead>
                            <TableHead>Vendor SKU</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>POs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vendorSkus.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No Vendor SKUs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            vendorSkus.map(v => (
                                <TableRow key={v.id}>
                                    <TableCell><input type="checkbox" /></TableCell>
                                    <TableCell className="font-medium">{v.vendorName}</TableCell>
                                    <TableCell>{v.vendorId || '-'}</TableCell>
                                    <TableCell>{v.vendorSku}</TableCell>
                                    <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>{v.poCount}</TableCell>
                                    <TableCell>
                                        <Badge variant={v.status === 'Active' ? 'default' : 'secondary'}>{v.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Vendor SKU</DialogTitle>
                        <DialogDescription>Link a vendor-specific SKU to this item.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vendor Name *</label>
                            <Input
                                value={formData.vendorName}
                                onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vendor ID</label>
                            <Input
                                value={formData.vendorId}
                                onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                                placeholder="e.g. V-1001"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vendor SKU *</label>
                            <Input
                                value={formData.vendorSku}
                                onChange={e => setFormData({ ...formData, vendorSku: e.target.value })}
                                placeholder="e.g. ACME-IPAD-BLK"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
