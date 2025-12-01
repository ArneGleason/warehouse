"use client";

import React, { useEffect, useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG } from '@/lib/warehouse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Icons from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { QuickMoveDialog } from '@/components/QuickMoveDialog';
import { toast } from 'sonner';
import { Trash2, Move } from 'lucide-react';

export function PropertiesPanel({ selectedIds, grouping }: { selectedIds: Set<string>, grouping?: 'none' | 'po' | 'sku' }) {
    const { state, updateEntity, addEntity, deleteEntity, deleteEntities, moveEntity, moveEntities, undo } = useWarehouse();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [quickMoveOpen, setQuickMoveOpen] = useState(false);

    const handleDelete = () => {
        const count = selectedIds.size;
        deleteEntities(Array.from(selectedIds));
        setDeleteDialogOpen(false);
        toast.success(`Deleted ${count} item${count !== 1 ? 's' : ''}`);
    };

    const handleQuickMoveConfirm = (targetId: string | null) => {
        moveEntities(Array.from(selectedIds), targetId);
        setQuickMoveOpen(false);

        const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';
        toast.success(`Moved ${selectedIds.size} items to ${targetName}`, {
            action: {
                label: 'Undo',
                onClick: () => undo()
            }
        });
    };

    if (selectedIds.size === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select an item to view properties
            </div>
        );
    }

    if (selectedIds.size > 1) {
        // Multi-select view
        const selectedEntities = Array.from(selectedIds).map(id => state.entities[id]).filter(Boolean);
        const count = selectedEntities.length;
        const deviceCount = selectedEntities.filter(e => e.type === 'Device').length;

        // Find common parent path (naive)
        const firstParentId = selectedEntities[0]?.parentId;
        const allSameParent = selectedEntities.every(e => e.parentId === firstParentId);
        const parentLabel = firstParentId ? (state.entities[firstParentId]?.label || 'Unknown') : 'Root';

        // Check for common group
        let groupLabel = '';
        if (grouping === 'po' || grouping === 'sku') {
            const firstDevice = selectedEntities.find(e => e.type === 'Device');
            if (firstDevice) {
                const getGroupKey = (e: any) => {
                    if (grouping === 'po') return e.deviceAttributes?.po_number || 'No PO';
                    if (grouping === 'sku') return e.deviceAttributes?.sku || 'No SKU';
                    return '';
                };
                const firstKey = getGroupKey(firstDevice);
                const allSameGroup = selectedEntities.every(e => e.type === 'Device' && getGroupKey(e) === firstKey);

                if (allSameGroup) {
                    groupLabel = `${grouping.toUpperCase()}: ${firstKey}`;
                }
            }
        }

        // Aggregate SKUs
        const skuCounts: Record<string, number> = {};
        selectedEntities.forEach(e => {
            if (e.type === 'Device' && e.deviceAttributes?.sku) {
                const sku = e.deviceAttributes.sku;
                skuCounts[sku] = (skuCounts[sku] || 0) + 1;
            }
        });

        return (
            <div className="h-full p-4 border-l bg-background flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-muted rounded-md">
                        {groupLabel ? <Icons.Folder className="h-6 w-6 text-blue-500" /> : <Icons.Layers className="h-6 w-6" />}
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">{groupLabel || `${count} Items Selected`}</h2>
                        <p className="text-xs text-muted-foreground">
                            {allSameParent ? `In: ${parentLabel}` : 'Mixed Locations'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6 flex-1 overflow-auto">
                    <div className="flex gap-2">
                        <Button variant="default" className="flex-1" onClick={() => setQuickMoveOpen(true)}>
                            <Move className="h-4 w-4 mr-2" /> Quick Move
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={() => setDeleteDialogOpen(true)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete All
                        </Button>
                    </div>

                    {deviceCount > 0 && (
                        <div>
                            <h3 className="font-medium text-sm mb-2">Selected Devices ({deviceCount})</h3>
                            <div className="space-y-2">
                                {Object.entries(skuCounts).map(([sku, count]) => (
                                    <div key={sku} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                        <span className="font-mono">{sku}</span>
                                        {count > 1 && <Badge variant="secondary">x{count}</Badge>}
                                    </div>
                                ))}
                                {Object.keys(skuCounts).length === 0 && (
                                    <div className="text-xs text-muted-foreground italic">No SKUs found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DeleteConfirmationDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={handleDelete}
                    entityName={`${count} items`}
                />

                <QuickMoveDialog
                    isOpen={quickMoveOpen}
                    onClose={() => setQuickMoveOpen(false)}
                    selectedIds={selectedIds}
                    onMove={handleQuickMoveConfirm}
                />
            </div>
        );
    }

    const entity = state.entities[Array.from(selectedIds)[0]];
    if (!entity) return null;

    const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;

    const getParentPath = (entityId: string) => {
        const parts: string[] = [];
        let curr = state.entities[entityId];
        while (curr?.parentId) {
            curr = state.entities[curr.parentId];
            if (curr) parts.unshift(curr.label);
        }
        return parts.length > 0 ? parts.join(' / ') : 'Root';
    };

    return (
        <div className="h-full p-4 border-l bg-background flex flex-col">
            <div className="mb-4 text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                {getParentPath(entity.id)}
            </div>

            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-muted rounded-md">
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="font-semibold text-lg">{entity.type}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{entity.id.slice(0, 8)}</p>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-auto">
                <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                        value={entity.label}
                        onChange={(e) => updateEntity(entity.id, { label: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                        value={entity.description || ''}
                        onChange={(e) => updateEntity(entity.id, { description: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input
                        value={entity.barcode || ''}
                        onChange={(e) => updateEntity(entity.id, { barcode: e.target.value })}
                    />
                </div>



                {entity.type === 'Device' && (
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-semibold text-sm">Device Attributes</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                    value={entity.deviceAttributes?.sku || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, sku: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vendor SKU</Label>
                                <Input
                                    value={entity.deviceAttributes?.vendor_sku || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, vendor_sku: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>PO Number</Label>
                                <Input
                                    value={entity.deviceAttributes?.po_number || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, po_number: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>IMEI</Label>
                                <Input
                                    value={entity.deviceAttributes?.imei || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, imei: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Barcode</Label>
                                <Input
                                    value={entity.deviceAttributes?.barcode || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, barcode: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Manufacturer</Label>
                                <Input
                                    value={entity.deviceAttributes?.manufacturer || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, manufacturer: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Input
                                    value={entity.deviceAttributes?.model || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, model: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input
                                    value={entity.deviceAttributes?.category || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, category: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Capacity (GB)</Label>
                                <Input
                                    value={entity.deviceAttributes?.capacity_gb || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, capacity_gb: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <Input
                                    value={entity.deviceAttributes?.color || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, color: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Carrier</Label>
                                <Input
                                    value={entity.deviceAttributes?.carrier || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, carrier: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lock Status</Label>
                                <Input
                                    value={entity.deviceAttributes?.lock_status || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, lock_status: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Grade</Label>
                                <Input
                                    value={entity.deviceAttributes?.grade || ''}
                                    onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, grade: e.target.value } })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="tested"
                                    checked={entity.deviceAttributes?.tested || false}
                                    onCheckedChange={(checked) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, tested: checked as boolean } })}
                                />
                                <Label htmlFor="tested">Tested</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sellable"
                                    checked={entity.deviceAttributes?.sellable || false}
                                    onCheckedChange={(checked) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, sellable: checked as boolean } })}
                                />
                                <Label htmlFor="sellable">Sellable</Label>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t mt-6">
                    <h3 className="font-medium text-sm mb-4">Add Child</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.keys(ENTITY_CONFIG)
                            .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                            .map(type => (
                                <Button
                                    key={type}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => {
                                        addEntity(type, entity.id);
                                        toast.success(`Added ${type} to ${entity.label}`);
                                    }}
                                >
                                    <Plus className="h-3 w-3 mr-2" />
                                    {type}
                                </Button>
                            ))}
                    </div>
                </div>

                <div className="pt-6 border-t mt-6 space-y-2">
                    <Button variant="default" className="w-full" onClick={() => setQuickMoveOpen(true)}>
                        <Move className="h-4 w-4 mr-2" /> Quick Move
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={() => setDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete {entity.type}
                    </Button>
                </div>
            </div>

            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                entityName={entity.label}
            />

            <QuickMoveDialog
                isOpen={quickMoveOpen}
                onClose={() => setQuickMoveOpen(false)}
                selectedIds={selectedIds}
                onMove={handleQuickMoveConfirm}
            />
        </div>
    );
}
