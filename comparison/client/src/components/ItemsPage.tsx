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
import { Plus, Search, Upload, Download, Filter, X, ChevronLeft, Save, Wand2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ItemDefinition } from '@/lib/warehouse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { VendorSkusTab } from './VendorSkusTab';

// --- Sub-components (could be split if large) ---

function ItemsList({
    items,
    onCreate,
    onEdit
}: {
    items: ItemDefinition[],
    onCreate: () => void,
    onEdit: (sku: string) => void
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [serializedFilter, setSerializedFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
    const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

    // Filter Logic
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search
            if (searchTerm && !item.sku.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !item.model.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            // Category
            if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
            // Serialized
            if (serializedFilter !== 'ALL') {
                const isSerialized = serializedFilter === 'YES';
                if (item.serialized !== isSerialized) return false;
            }
            // Status
            if (statusFilter !== 'ALL') {
                const isActive = statusFilter === 'ACTIVE';
                if (item.active !== isActive) return false;
            }
            return true;
        });
    }, [items, searchTerm, categoryFilter, serializedFilter, statusFilter]);

    // Unique Categories for Filter
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category));
        return Array.from(cats).sort();
    }, [items]);

    const toggleSelect = (sku: string) => {
        const next = new Set(selectedSkus);
        if (next.has(sku)) next.delete(sku);
        else next.add(sku);
        setSelectedSkus(next);
    };

    const toggleSelectAll = () => {
        if (selectedSkus.size === filteredItems.length) {
            setSelectedSkus(new Set());
        } else {
            setSelectedSkus(new Set(filteredItems.map(i => i.sku)));
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 p-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Items</h1>
                    <p className="text-muted-foreground">Manage inventory SKU definitions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Import</Button>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export</Button>
                    <Button size="sm" onClick={onCreate}><Plus className="w-4 h-4 mr-2" /> Add New Item</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Category: All</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={serializedFilter} onValueChange={setSerializedFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Serialized?" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Serialized: All</SelectItem>
                        <SelectItem value="YES">Yes</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Status: All</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                {(searchTerm || categoryFilter !== 'ALL' || serializedFilter !== 'ALL' || statusFilter !== 'ACTIVE') && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setSearchTerm('');
                        setCategoryFilter('ALL');
                        setSerializedFilter('ALL');
                        setStatusFilter('ACTIVE');
                    }}>
                        <X className="w-4 h-4 mr-2" /> Clear
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="border rounded-md flex-1 overflow-auto bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <input type="checkbox"
                                    checked={filteredItems.length > 0 && selectedSkus.size === filteredItems.length}
                                    onChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>SKU / Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Manufacturer</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Serialized</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map(item => (
                                <TableRow key={item.sku} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(item.sku)}>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <input type="checkbox"
                                            checked={selectedSkus.has(item.sku)}
                                            onChange={() => toggleSelect(item.sku)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2">
                                            {item.sku}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(item.sku);
                                                    toast.success(`SKU ${item.sku} copied to clipboard`);
                                                }}
                                                title="Copy SKU"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {[
                                                item.manufacturer,
                                                item.model,
                                                item.modelNumber,
                                                item.capacity_gb ? `${item.capacity_gb}GB` : null,
                                                item.color,
                                                item.carrier !== 'ALL' ? item.carrier : null,
                                                item.lockStatus !== 'ALL' ? item.lockStatus : null
                                            ].filter(Boolean).join(' • ')}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>{item.manufacturer}</TableCell>
                                    <TableCell>{item.model}</TableCell>
                                    <TableCell><Badge variant="outline">{item.grade}</Badge></TableCell>
                                    <TableCell>{item.serialized ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.active ? 'default' : 'secondary'}>
                                            {item.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-muted-foreground text-right">
                {filteredItems.length} items found
            </div>
        </div>
    );
}

// --- Item Editor Component ---

function ItemEditor({
    initialData,
    onSave,
    onCancel,
    existingSkus
}: {
    initialData?: ItemDefinition,
    onSave: (data: ItemDefinition) => void,
    onCancel: () => void,
    existingSkus: Set<string>
}) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<ItemDefinition>(initialData || {
        sku: '',
        category: '',
        manufacturer: '',
        model: '',
        grade: 'A', // Default
        serialized: false,
        active: true,
        optionalAttributes: {},
        vendorSkus: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        capacity_gb: '',
        color: '',
        modelNumber: '',
        carrier: '',
        lockStatus: ''
    });
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    // Deep compare logic or simple dirty flag
    // Simple dirty flag for now (reset on save)
    const [isDirty, setIsDirty] = useState(false);

    const [tab, setTab] = useState('details');

    const handleChange = (field: keyof ItemDefinition, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            // Simple check: if different from initial, dirty
            setIsDirty(true);
            return next;
        });
    };

    const handleCancelClick = () => {
        if (isDirty) {
            setShowUnsavedDialog(true);
        } else {
            onCancel();
        }
    };

    const handleSave = () => {
        // Validation
        if (!formData.sku) return toast.error("SKU is required");
        if (!formData.category) return toast.error("Category is required");
        if (!formData.manufacturer) return toast.error("Manufacturer is required");
        if (!formData.model) return toast.error("Model is required");

        // Unique SKU check for Create mode
        if (!isEdit && existingSkus.has(formData.sku)) {
            return toast.error(`SKU '${formData.sku}' already exists.`);
        }

        const payload = { ...formData, updatedAt: new Date().toISOString() };

        // Prevent overwriting vendorSkus with stale data during edit
        if (isEdit) {
            delete (payload as any).vendorSkus;
        }

        onSave(payload);
    };

    const handleGenerateSku = () => {
        const parts = [];

        // Manufacturer (First 3-4 chars generally)
        if (formData.manufacturer) {
            parts.push(formData.manufacturer.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4));
        }

        // Model (Compact)
        if (formData.model) {
            // Remove vowels or kept short? simplifying to alphanumeric
            const shortModel = formData.model.toUpperCase().replace(/[^A-Z0-9]/g, '');
            // Maybe take first 6-8 chars?
            parts.push(shortModel.substring(0, 8));
        }

        // Capacity
        if (formData.capacity_gb) {
            parts.push(formData.capacity_gb);
        }

        // Color (First 3 chars)
        if (formData.color) {
            parts.push(formData.color.toUpperCase().substring(0, 3));
        }

        // Carrier? 
        if (formData.carrier && formData.carrier !== 'ALL') {
            parts.push(formData.carrier.toUpperCase().substring(0, 3));
        }

        if (parts.length > 0) {
            const newSku = parts.join('-');
            handleChange('sku', newSku);
        } else {
            toast.error("Enter Manufacturer and Model first to generate a SKU.");
        }
    };

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleCancelClick}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? `Edit Item: ${formData.sku}` : 'New Item'}</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancelClick}>Cancel</Button>
                    <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Item</Button>
                </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList>
                    <TabsTrigger value="details">Item Details</TabsTrigger>
                    <TabsTrigger value="vendor" disabled={!isEdit}>Vendor SKUs</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 overflow-auto border rounded-md p-6 bg-card">
                    <div className="grid grid-cols-2 gap-6 max-w-4xl">
                        {/* SKU */}
                        <div className="space-y-2">
                            <Label>Item # / SKU *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.sku}
                                    onChange={e => handleChange('sku', e.target.value)}
                                    disabled={isEdit}
                                    placeholder="e.g. IPAD-PRO-11-M1-128-GRY"
                                    className="font-mono"
                                />
                                {!isEdit && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleGenerateSku}
                                        title="Auto-generate SKU from attributes"
                                        type="button"
                                    >
                                        <Wand2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {!isEdit && <p className="text-xs text-muted-foreground">Unique identifier for this item definition.</p>}
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Phone">Phone</SelectItem>
                                    <SelectItem value="Tablet">Tablet</SelectItem>
                                    <SelectItem value="Laptop">Laptop</SelectItem>
                                    <SelectItem value="Wearable">Wearable</SelectItem>
                                    <SelectItem value="Accessory">Accessory</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Manufacturer */}
                        <div className="space-y-2">
                            <Label>Manufacturer *</Label>
                            <Input
                                value={formData.manufacturer}
                                onChange={e => handleChange('manufacturer', e.target.value)}
                                placeholder="e.g. Apple"
                            />
                        </div>

                        {/* Model */}
                        <div className="space-y-2">
                            <Label>Model *</Label>
                            <Input
                                value={formData.model}
                                onChange={e => handleChange('model', e.target.value)}
                                placeholder="e.g. iPad Pro 11-inch (3rd Gen)"
                            />
                        </div>



                        {/* Model Number */}
                        <div className="space-y-2">
                            <Label>Model Number</Label>
                            <Input
                                value={formData.modelNumber || ''}
                                onChange={e => handleChange('modelNumber', e.target.value)}
                                placeholder="e.g. A2378"
                            />
                        </div>

                        {/* Grade */}
                        <div className="space-y-2">
                            <Label>Grade</Label>
                            <Select value={formData.grade} onValueChange={v => handleChange('grade', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="New">New</SelectItem>
                                    <SelectItem value="A">Grade A</SelectItem>
                                    <SelectItem value="B">Grade B</SelectItem>
                                    <SelectItem value="C">Grade C</SelectItem>
                                    <SelectItem value="D">Grade D</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Capacity (Optional common) */}
                        <div className="space-y-2">
                            <Label>Capacity (GB)</Label>
                            <Input
                                value={formData.capacity_gb || ''}
                                onChange={e => handleChange('capacity_gb', e.target.value)}
                                placeholder="e.g. 128"
                            />
                        </div>

                        {/* Color (Optional common) */}
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Input
                                value={formData.color || ''}
                                onChange={e => handleChange('color', e.target.value)}
                                placeholder="e.g. Space Gray"
                            />
                        </div>

                        {/* Carrier (Optional common) */}
                        <div className="space-y-2">
                            <Label>Carrier</Label>
                            <Select value={formData.carrier || 'ALL'} onValueChange={v => handleChange('carrier', v === 'ALL' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Carrier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">None / Unlocked</SelectItem>
                                    <SelectItem value="Verizon">Verizon</SelectItem>
                                    <SelectItem value="AT&T">AT&T</SelectItem>
                                    <SelectItem value="T-Mobile">T-Mobile</SelectItem>
                                    <SelectItem value="Sprint">Sprint</SelectItem>
                                    <SelectItem value="Generic">Generic</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Lock Status (Optional common) */}
                        <div className="space-y-2">
                            <Label>Lock Status</Label>
                            <Select value={formData.lockStatus || 'ALL'} onValueChange={v => handleChange('lockStatus', v === 'ALL' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Unknown</SelectItem>
                                    <SelectItem value="Locked">Locked</SelectItem>
                                    <SelectItem value="Unlocked">Unlocked</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Switches */}
                        <div className="flex items-center justify-between border p-4 rounded-md">
                            <div className="space-y-0.5">
                                <Label>Serialized Tracking</Label>
                                <p className="text-xs text-muted-foreground">Does this item require unique serial numbers?</p>
                            </div>
                            <Switch
                                checked={formData.serialized}
                                onCheckedChange={v => handleChange('serialized', v)}
                            />
                        </div>

                        <div className="flex items-center justify-between border p-4 rounded-md">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <p className="text-xs text-muted-foreground">Enable or disable this item in the system.</p>
                            </div>
                            <Switch
                                checked={formData.active}
                                onCheckedChange={v => handleChange('active', v)}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="vendor" className="flex-1 overflow-hidden border rounded-md bg-card">
                    {/* Only render if we have data to avoid errors, though disabled tab prevents access */}
                    {/* Pass initialData (fresh) if available, otherwise formData (for create mode structure) */}
                    {isEdit && <VendorSkusTab item={initialData || formData} />}
                </TabsContent>
            </Tabs>

            <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unsaved Changes</DialogTitle>
                        <DialogDescription>
                            You have unsaved changes. What would you like to do?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:gap-0">
                        <div className="flex flex-col gap-2 w-full">
                            <Button onClick={() => {
                                handleSave();
                                setShowUnsavedDialog(false);
                            }}>
                                Save Changes and Return
                            </Button>
                            <Button variant="destructive" onClick={() => {
                                setShowUnsavedDialog(false);
                                onCancel();
                            }}>
                                Abandon Changes
                            </Button>
                            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
                                Stay Here
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

// --- Main Page Component ---

export function ItemsPage() {
    const { state, addItem, updateItem } = useWarehouse();
    const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
    const [editSku, setEditSku] = useState<string | null>(null);

    const items = useMemo(() => {
        return Object.values(state.items || {}).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [state.items]);

    const handleCreate = () => {
        setView('CREATE');
        setEditSku(null);
    };

    const handleEdit = (sku: string) => {
        setEditSku(sku);
        setView('EDIT');
    };

    const handleBack = () => {
        setView('LIST');
        setEditSku(null);
    };

    const existingSkus = useMemo(() => new Set(items.map(i => i.sku)), [items]);

    const handleSaveItem = (data: ItemDefinition) => {
        if (view === 'CREATE') {
            addItem(data);
            toast.success("Item created successfully");
            setView('LIST');
        } else {
            updateItem(data.sku, data);
            toast.success("Item updated successfully");
            setView('LIST');
        }
    };

    if (view === 'LIST') {
        return <ItemsList items={items} onCreate={handleCreate} onEdit={handleEdit} />;
    }

    const initialData = view === 'EDIT' && editSku ? state.items[editSku] : undefined;

    return (
        <ItemEditor
            initialData={initialData}
            onSave={handleSaveItem}
            onCancel={handleBack}
            existingSkus={existingSkus}
        />
    );
}
