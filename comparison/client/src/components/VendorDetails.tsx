import React, { useState, useEffect } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Vendor } from '@/lib/warehouse';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface VendorDetailsProps {
    vendorId: string;
    onBack: () => void;
}

export function VendorDetails({ vendorId, onBack }: VendorDetailsProps) {
    const { state, updateVendor, deleteVendor } = useWarehouse();
    const vendor = state.vendors[vendorId];

    // Local state for form editing
    const [formData, setFormData] = useState<Partial<Vendor>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (vendor) {
            setFormData(vendor);
            setIsDirty(false);
        }
    }, [vendor]);

    if (!vendor) return <div>Vendor not found</div>;

    const handleChange = (field: keyof Vendor, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        updateVendor(vendorId, formData);
        setIsDirty(false);
    };

    const handleDelete = () => {
        deleteVendor(vendorId);
        onBack();
    };

    // Filter Vendor SKUs
    const vendorSkus = Object.values(state.vendorSkus || {}).filter(vs =>
        // Match by Vendor Code (exact) or simple string match if data is messy
        vs.vendorId === vendor.vendorCode || vs.vendorName === vendor.name
    );

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
                        <h1 className="text-2xl font-bold">{vendor.name}</h1>
                        <div className="text-sm text-muted-foreground font-mono">{vendor.vendorCode}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={!isDirty}
                        variant={isDirty ? "default" : "outline"}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isDirty ? 'Save Changes' : 'Saved'}
                    </Button>
                    <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <Tabs defaultValue="details">
                        <TabsList className="mb-6">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="skus">
                                Vendor SKUs
                                <span className="ml-2 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                                    {vendorSkus.length}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details">
                            <Card>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Vendor Name</Label>
                                            <Input
                                                value={formData.name || ''}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contact Name</Label>
                                            <Input
                                                value={formData.contactName || ''}
                                                onChange={(e) => handleChange('contactName', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input
                                                value={formData.email || ''}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phone</Label>
                                            <Input
                                                value={formData.phone || ''}
                                                onChange={(e) => handleChange('phone', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>WhatsApp</Label>
                                            <Input
                                                value={formData.whatsapp || ''}
                                                onChange={(e) => handleChange('whatsapp', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Website</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.website || ''}
                                                    onChange={(e) => handleChange('website', e.target.value)}
                                                />
                                                {formData.website && (
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Address</Label>
                                            <Input
                                                value={formData.address || ''}
                                                onChange={(e) => handleChange('address', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="skus">
                            <Card>
                                <CardContent className="p-0">
                                    {vendorSkus.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No Vendor SKUs linked to this vendor code ({vendor.vendorCode}).
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40">
                                                <tr>
                                                    <th className="text-left font-medium py-3 px-4">Vendor SKU</th>
                                                    <th className="text-left font-medium py-3 px-4">Internal SKU</th>
                                                    <th className="text-left font-medium py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vendorSkus.map(sku => (
                                                    <tr key={sku.id} className="border-b last:border-0 hover:bg-muted/50">
                                                        <td className="py-3 px-4 font-mono">{sku.vendorSku}</td>
                                                        <td className="py-3 px-4">{sku.itemSku}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${sku.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                {sku.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <DeleteConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                entityName={`Vendor ${vendor.name}`}
                validationText="delete"
            />
        </div>
    );
}
