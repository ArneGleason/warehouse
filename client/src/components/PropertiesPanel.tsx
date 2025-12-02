"use client";

import React, { useEffect, useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG } from '@/lib/warehouse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Icons from 'lucide-react';
import { getEntityHistory, ActionLog } from '@/lib/history';

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Move, Upload, ShieldAlert } from 'lucide-react';
import { XlsxImportDialog } from '@/components/XlsxImportDialog';
import { RuleCondition, DepartmentRules } from '@/lib/warehouse';
import { validateMove } from '@/lib/rules';
import { MoveBlockedDialog } from '@/components/MoveBlockedDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryItem {
    sku: string;
    description: string;
    total: number;
    onHandSellable: number;
    allocated: number;
    available?: number; // Optional, computed for sorting
}

function InventoryTable({ data }: { data: InventoryItem[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem; direction: 'asc' | 'desc' } | null>(null);

    // Filter
    const filteredData = data.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        const getValue = (item: InventoryItem, k: keyof InventoryItem) => {
            if (k === 'available') {
                return item.onHandSellable - item.allocated;
            }
            return item[k];
        };

        const valA = getValue(a, key);
        const valB = getValue(b, key);

        if (valA! < valB!) return direction === 'asc' ? -1 : 1;
        if (valA! > valB!) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof InventoryItem) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b">
                <div className="relative">
                    <Icons.Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search SKU or Description..."
                        className="pl-8 pr-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setSearchTerm('')}
                        >
                            <Icons.X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('sku')}>
                                <div className="flex items-center gap-1">
                                    SKU
                                    {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('description')}>
                                <div className="flex items-center gap-1">
                                    Description
                                    {sortConfig?.key === 'description' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none">
                                <div className="flex items-center justify-end gap-1">
                                    Avg Cost
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('total')}>
                                <div className="flex items-center justify-end gap-1">
                                    Total
                                    {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('onHandSellable')}>
                                <div className="flex items-center justify-end gap-1">
                                    Sellable
                                    {sortConfig?.key === 'onHandSellable' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('allocated')}>
                                <div className="flex items-center justify-end gap-1">
                                    Allocated
                                    {sortConfig?.key === 'allocated' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('available')}>
                                <div className="flex items-center justify-end gap-1">
                                    Available
                                    {sortConfig?.key === 'available' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    {searchTerm ? 'No matching inventory found' : 'No inventory found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((item) => (
                                <TableRow key={item.sku}>
                                    <TableCell className="font-medium">{item.sku}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">$100.00</TableCell>
                                    <TableCell className="text-right">{item.total}</TableCell>
                                    <TableCell className="text-right">{item.onHandSellable}</TableCell>
                                    <TableCell className="text-right">{item.allocated}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {item.onHandSellable - item.allocated}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function HistoryTable({ entityId }: { entityId: string }) {
    const [history, setHistory] = useState<ActionLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        getEntityHistory(entityId).then(setHistory);
    }, [entityId]);

    const filteredHistory = history.filter(log =>
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b">
                <div className="relative">
                    <Icons.Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search history..."
                        className="pl-8 pr-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setSearchTerm('')}
                        >
                            <Icons.X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    No history found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">
                                        <Badge variant="outline">{log.actionType}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{log.details}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export function PropertiesPanel({ selectedIds, grouping }: { selectedIds: Set<string>, grouping?: 'none' | 'po' | 'sku' }) {
    const { state, updateEntity, addEntity, deleteEntity, deleteEntities, moveEntity, moveEntities, undo } = useWarehouse();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);


    const [quickMoveOpen, setQuickMoveOpen] = useState(false);
    const [importTargetId, setImportTargetId] = useState<string | null>(null);
    const [moveBlockedInfo, setMoveBlockedInfo] = useState<{ blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] } | null>(null);

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

    const isRootSelected = selectedIds.size === 0 || (selectedIds.size === 1 && selectedIds.has('warehouse-root'));

    if (isRootSelected) {
        // Calculate global inventory
        const inventory: Record<string, {
            sku: string;
            description: string;
            total: number;
            onHandSellable: number;
            allocated: number;
        }> = {};

        Object.values(state.entities).forEach(entity => {
            if (entity.type === 'Device') {
                const attrs = entity.deviceAttributes || {};
                const sku = attrs.sku || 'Unknown SKU';

                if (!inventory[sku]) {
                    // Construct description
                    const descriptionParts = [
                        attrs.manufacturer,
                        attrs.model,
                        attrs.capacity_gb ? `${attrs.capacity_gb}GB` : null,
                        attrs.lock_status,
                        attrs.grade
                    ].filter(Boolean);

                    inventory[sku] = {
                        sku,
                        description: descriptionParts.join(' ') || 'No Description',
                        total: 0,
                        onHandSellable: 0,
                        allocated: 0
                    };
                }

                inventory[sku].total++;
                if (attrs.sellable) {
                    inventory[sku].onHandSellable++;
                }
                // Allocated logic placeholder
            }
        });

        const inventoryData = Object.values(inventory);

        return (
            <div className="h-full border-l bg-background flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-1">
                        <Icons.Warehouse className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-lg">Warehouse Root</h2>
                    </div>
                    <div className="text-xs text-muted-foreground">Global Inventory</div>
                </div>

                <Tabs defaultValue="inventory" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 pt-2">
                        <TabsList className="w-full">
                            <TabsTrigger value="inventory" className="flex-1">INVENTORY</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="inventory" className="flex-1 p-0 overflow-hidden">
                        <InventoryTable data={inventoryData} />
                    </TabsContent>
                </Tabs>
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
                    <div className="flex-1">
                        <h2 className="font-semibold text-lg">{groupLabel || `${count} Items Selected`}</h2>
                        <p className="text-xs text-muted-foreground">
                            {allSameParent ? `In: ${parentLabel}` : 'Mixed Locations'}
                        </p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setQuickMoveOpen(true)}>
                                <Move className="h-4 w-4 mr-2" /> Quick Move
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-6 flex-1 overflow-auto">
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
                            <div className="flex-1">
                                <h2 className="font-semibold text-lg">{queueName} Queue</h2>
                                <p className="text-xs text-muted-foreground">
                                    In: {parentEntity.label}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => {
                                        setQuickMoveOpen(true);
                                    }}>
                                        <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-6 flex-1 overflow-auto">
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

    // Helper to get all descendant devices for a department
    const getDepartmentInventory = (departmentId: string) => {
        const inventory: Record<string, {
            sku: string;
            description: string;
            total: number;
            onHandSellable: number;
            allocated: number;
        }> = {};

        const scanRecursive = (id: string) => {
            const entity = state.entities[id];
            if (!entity) return;

            if (entity.type === 'Device') {
                const attrs = entity.deviceAttributes || {};
                const sku = attrs.sku || 'Unknown SKU';

                if (!inventory[sku]) {
                    // Construct description
                    const descriptionParts = [
                        attrs.manufacturer,
                        attrs.model,
                        attrs.capacity_gb ? `${attrs.capacity_gb}GB` : null,
                        attrs.lock_status,
                        attrs.grade
                    ].filter(Boolean);

                    inventory[sku] = {
                        sku,
                        description: descriptionParts.join(' ') || 'No Description',
                        total: 0,
                        onHandSellable: 0,
                        allocated: 0
                    };
                }

                inventory[sku].total++;
                if (attrs.sellable) {
                    inventory[sku].onHandSellable++;
                }
                // Allocated logic placeholder
            }

            entity.children.forEach(scanRecursive);
        };

        scanRecursive(departmentId);
        return Object.values(inventory);
    };

    if (entity.type === 'Department') {
        const inventoryData = getDepartmentInventory(entity.id);
        const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;

        return (
            <div className="h-full border-l bg-background flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-lg flex-1">{entity.label}</h2>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setQuickMoveOpen(true)}>
                                    <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Department
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Add Child</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.keys(ENTITY_CONFIG)
                                            .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                            .map((type) => (
                                                <DropdownMenuItem key={type} onClick={() => {
                                                    addEntity(type, entity.id);
                                                    toast.success(`Added ${type} to ${entity.label}`);
                                                }}>
                                                    {type}
                                                </DropdownMenuItem>
                                            ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{entity.id}</div>
                </div>

                <Tabs defaultValue="inventory" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 border-b">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="inventory">Inventory</TabsTrigger>
                            <TabsTrigger value="attributes">Attributes</TabsTrigger>
                            <TabsTrigger value="rules">Rules</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="inventory" className="flex-1 overflow-auto p-0">
                        <InventoryTable data={inventoryData} />
                    </TabsContent>

                    <TabsContent value="attributes" className="flex-1 p-4 space-y-6 overflow-auto">
                        <div className="space-y-4">
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
                        </div>
                    </TabsContent>



                    <TabsContent value="rules" className="flex-1 p-4 space-y-6 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-medium">Move Validation Rules</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Configure rules that devices must meet to be moved into this department.
                            </p>

                            {['tested', 'sellable', 'serialized'].map((ruleKey) => {
                                const currentRule = entity.departmentRules?.[ruleKey as keyof DepartmentRules] || 'OFF';
                                return (
                                    <div key={ruleKey} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="text-base capitalize">{ruleKey}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Device must be {ruleKey}
                                            </p>
                                        </div>
                                        <Select
                                            value={currentRule}
                                            onValueChange={(val: RuleCondition) => {
                                                const newRules = {
                                                    ...(entity.departmentRules || { tested: 'OFF', sellable: 'OFF', serialized: 'OFF' }),
                                                    [ruleKey]: val
                                                };
                                                updateEntity(entity.id, { departmentRules: newRules as DepartmentRules });
                                            }}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="OFF">Off (Ignore)</SelectItem>
                                                <SelectItem value="MUST_HAVE">Must Have</SelectItem>
                                                <SelectItem value="MUST_NOT_HAVE">Must Not Have</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>
                </Tabs>

                <QuickMoveDialog
                    isOpen={quickMoveOpen}
                    onClose={() => setQuickMoveOpen(false)}
                    selectedIds={new Set(entity.children)}
                    onMove={(targetId) => {
                        moveEntities(entity.children, targetId);
                        setQuickMoveOpen(false);
                        toast.success(`Moved ${entity.children.length} items`);
                    }}
                />

                <DeleteConfirmationDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={handleDelete}
                    entityName={entity.label}
                />

                {importTargetId && (
                    <XlsxImportDialog
                        isOpen={!!importTargetId}
                        onClose={() => setImportTargetId(null)}
                        targetId={importTargetId}
                    />
                )}
            </div>
        );
    }

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
                <div className="flex-1">
                    <h2 className="font-semibold text-lg">{entity.type}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{entity.id.slice(0, 8)}</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {(entity.type === 'Bin' || entity.type === 'Workstation' || entity.type === 'Device') && (
                            <DropdownMenuItem onClick={() => setQuickMoveOpen(true)}>
                                <Move className="h-4 w-4 mr-2" /> {entity.type === 'Device' ? 'Quick Move' : 'Quick Move Contents'}
                            </DropdownMenuItem>
                        )}
                        {entity.type === 'Bin' && (
                            <DropdownMenuItem onClick={() => setImportTargetId(entity.id)}>
                                <Upload className="h-4 w-4 mr-2" /> Import Devices
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Entity
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Add Child</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {Object.keys(ENTITY_CONFIG)
                                    .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                    .map((type) => (
                                        <DropdownMenuItem key={type} onClick={() => {
                                            addEntity(type, entity.id);
                                            toast.success(`Added ${type} to ${entity.label}`);
                                        }}>
                                            {type}
                                        </DropdownMenuItem>
                                    ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                    <Tabs defaultValue="attributes" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 pt-2">
                            <TabsList className="w-full">
                                <TabsTrigger value="attributes" className="flex-1">ATTRIBUTES</TabsTrigger>
                                <TabsTrigger value="testing" className="flex-1">TESTING</TabsTrigger>
                                <TabsTrigger value="history" className="flex-1">HISTORY</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="attributes" className="flex-1 p-4 space-y-6 overflow-auto">
                            <div className="space-y-4">
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
                        </TabsContent>

                        <TabsContent value="testing" className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Icons.FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Testing Module Coming Soon</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 p-0 overflow-hidden">
                            <HistoryTable entityId={entity.id} />
                        </TabsContent>
                    </Tabs>
                )}

                {entity.type !== 'Device' && (
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
                                            addEntity(type as any, entity.id);
                                            toast.success(`Added ${type} to ${entity.label}`);
                                        }}
                                    >
                                        <Plus className="h-3 w-3 mr-2" />
                                        {type}
                                    </Button>
                                ))}
                        </div>
                    </div>
                )}

                {entity.type !== 'Device' && (
                    <div className="pt-6 border-t mt-6 space-y-2">
                        {/* Actions moved to header overflow menu */}
                    </div>
                )}
            </div>

            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                entityName={entity.label}
            />

            {importTargetId && (
                <XlsxImportDialog
                    isOpen={!!importTargetId}
                    onClose={() => setImportTargetId(null)}
                    targetId={importTargetId}
                />
            )}

            {moveBlockedInfo && (
                <MoveBlockedDialog
                    isOpen={!!moveBlockedInfo}
                    onClose={() => setMoveBlockedInfo(null)}
                    blockedBy={moveBlockedInfo.blockedBy}
                    failedDeviceIds={moveBlockedInfo.failedDeviceIds}
                />
            )}

            <QuickMoveDialog
                isOpen={quickMoveOpen}
                onClose={() => setQuickMoveOpen(false)}
                selectedIds={selectedIds}
                onMove={(targetId) => {
                    // Validate move
                    const deviceIds: string[] = [];
                    selectedIds.forEach(id => {
                        const entity = state.entities[id];
                        if (!entity) return; // Ensure entity exists

                        if (entity.type === 'Device') {
                            deviceIds.push(id);
                        } else {
                            // If container, get all descendant devices
                            // Simplified: just check direct children for now or need recursive?
                            // QuickMove usually moves the entity itself.
                            // If we move a Bin, we need to validate all devices inside it.
                            // Let's do a recursive gather.
                            const gatherDevices = (entId: string) => {
                                const ent = state.entities[entId];
                                if (!ent) return;
                                if (ent.type === 'Device') deviceIds.push(entId);
                                ent.children.forEach(gatherDevices);
                            };
                            gatherDevices(id);
                        }
                    });

                    const validation = validateMove(state, deviceIds, targetId);
                    if (!validation.allowed && validation.blockedBy && validation.failedDeviceIds) {
                        setMoveBlockedInfo({
                            blockedBy: validation.blockedBy,
                            failedDeviceIds: validation.failedDeviceIds
                        });
                        setQuickMoveOpen(false);
                        return;
                    }

                    moveEntities(Array.from(selectedIds), targetId);
                    setQuickMoveOpen(false);
                    toast.success(`Moved ${selectedIds.size} items`);
                }}
            />
        </div>
    );
}
