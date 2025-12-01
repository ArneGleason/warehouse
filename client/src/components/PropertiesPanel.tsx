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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            <div className="h-full p-4 border-l bg-background flex flex-col">
                <div className="flex items-center gap-2 mb-6 opacity-50">
                    <div className="p-2 bg-muted rounded-md">
                        <Icons.Box className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">No Selection</h2>
                        <p className="text-xs text-muted-foreground">Select an item to view properties</p>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic">
                    No item selected
                </div>

                <div className="pt-6 border-t mt-6 space-y-2">
                    <Button variant="default" className="w-full" disabled>
                        <Move className="h-4 w-4 mr-2" /> Quick Move
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                </div>
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
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(true)}>
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

    const firstSelectedId = Array.from(selectedIds)[0];

    // Handle Virtual Queue Selection
    if (firstSelectedId.startsWith('queue-')) {
        const parts = firstSelectedId.split('-');
        // Format: queue-{parentId}-{queueName}
        // But parentId is a UUID, which contains dashes.
        // Queue name is at the end.
        // Let's assume queue name doesn't have dashes for now, or we parse carefully.
        // Actually, UUID has 4 dashes.
        // queue-UUID-QueueName
        // queue-123e4567-e89b-12d3-a456-426614174000-Assigned
        // So we can split by '-' and take the last part as queueName, and the middle parts as UUID.
        // Or better: we know the UUID length? No.
        // Let's rely on the fact that queue names are fixed: Assigned, Active, Done, Blocked.
        // We can check if string ends with one of them.
        const queues = ['Assigned', 'Active', 'Done', 'Blocked'];
        const queueName = queues.find(q => firstSelectedId.endsWith(`-${q}`));

        if (queueName) {
            const parentId = firstSelectedId.replace('queue-', '').replace(`-${queueName}`, '');
            const parentEntity = state.entities[parentId];

            if (parentEntity) {
                // Get devices in this queue
                const deviceChildren = parentEntity.children
                    .map(id => state.entities[id])
                    .filter(e => e?.type === 'Device' && e.deviceAttributes?.queue === queueName);

                const count = deviceChildren.length;

                // Aggregate SKUs for the queue view
                const skuCounts: Record<string, number> = {};
                deviceChildren.forEach(e => {
                    if (e.deviceAttributes?.sku) {
                        const sku = e.deviceAttributes.sku;
                        skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                    }
                });

                return (
                    <div className="h-full p-4 border-l bg-background flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-muted rounded-md">
                                <Icons.ListTodo className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">{queueName} Queue</h2>
                                <p className="text-xs text-muted-foreground">
                                    In: {parentEntity.label}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1 overflow-auto">
                            <div className="flex gap-2">
                                <Button variant="default" className="flex-1" onClick={() => {
                                    // Select all devices in queue for quick move
                                    const ids = new Set(deviceChildren.map(d => d.id));
                                    // We need to pass these IDs to QuickMoveDialog.
                                    // But QuickMoveDialog takes `selectedIds`.
                                    // We can temporarily override selectedIds or just pass them?
                                    // QuickMoveDialog takes `selectedIds` prop.
                                    // We can't easily change the prop passed to PropertiesPanel.
                                    // But we can use a local state or just invoke the move directly if we had a way.
                                    // Actually, QuickMoveDialog uses the passed `selectedIds`.
                                    // Workaround: We can't easily use the shared QuickMoveDialog for a subset of IDs 
                                    // unless we change selection.
                                    // OR we can make QuickMoveDialog accept explicit IDs override.
                                    // Let's assume for now we select them? No, that changes view.
                                    // Let's just use the current selection (which is the queue node) 
                                    // and handle "Queue Node" in QuickMoveDialog?
                                    // Or better: The `handleQuickMoveConfirm` uses `selectedIds`.
                                    // If we select the queue node, `moveEntities` needs to handle it.
                                    // `moveEntities` in context probably doesn't handle virtual IDs.
                                    // So we should resolve IDs here.

                                    // Let's pass the device IDs to a new QuickMoveDialog instance or 
                                    // modify the existing one to accept `idsToMove`.
                                    // For now, let's just show the dialog and hack the handleConfirm?
                                    // No, `QuickMoveDialog` takes `selectedIds`.
                                    // We should probably update `QuickMoveDialog` to accept `initialSelection` or similar.
                                    // OR, simpler: When "Quick Move" is clicked here, we open the dialog, 
                                    // but we need to tell it WHAT to move.
                                    // Let's update `QuickMoveDialog` usage in this specific block.
                                    setQuickMoveOpen(true);
                                }}>
                                    <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                </Button>
                            </div>

                            <div>
                                <h3 className="font-medium text-sm mb-2">Devices in Queue ({count})</h3>
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
                        </div>

                        <QuickMoveDialog
                            isOpen={quickMoveOpen}
                            onClose={() => setQuickMoveOpen(false)}
                            selectedIds={new Set(deviceChildren.map(d => d.id))}
                            onMove={(targetId) => {
                                moveEntities(deviceChildren.map(d => d.id), targetId);
                                setQuickMoveOpen(false);
                                toast.success(`Moved ${count} items`);
                            }}
                        />
                    </div>
                );
            }
        }
    }

    const entity = state.entities[firstSelectedId];
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
                    <Button variant="outline" className="w-full" onClick={() => setDeleteDialogOpen(true)}>
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
