"use client";

import React, { useState, useMemo } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG, WarehouseEntity, EntityType } from '@/lib/warehouse';
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical, Folder, GitBranch, MoreHorizontal, Move, Upload, Settings, Search, X, Filter, Layers, History as HistoryIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { validateMove } from '@/lib/rules';
import { MoveBlockedDialog } from '@/components/MoveBlockedDialog';
import { MoveConfirmationDialog } from '@/components/MoveConfirmationDialog';
import { UnboxInPlaceDialog } from '@/components/UnboxInPlaceDialog';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { HistoryDialog } from '@/components/HistoryDialog';
import { CheckpointsDialog } from '@/components/CheckpointsDialog';
import { Switch } from '@/components/ui/switch';
import { QuickMoveDialog } from '@/components/QuickMoveDialog';
import { toast } from 'sonner';

import { XlsxImportDialog } from '@/components/XlsxImportDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

// Helper for virtual group IDs
const getVirtualGroupId = (groupKey: string, firstDeviceId: string) => `virtual-group-${groupKey}-${firstDeviceId}`;

// --- VirtualGroupNode Component ---
interface VirtualGroupNodeProps {
    groupKey: string;
    deviceIds: string[];
    level: number;
    onSelect: (ids: Set<string>, e: React.MouseEvent) => void;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    toggleExpansion: (id: string) => void;
    onQuickMove: (idOrIds: string | Set<string>) => void;
    onDelete: (ids: Set<string>) => void;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onDragStart: (items: { id: string; type: string }[]) => void;
    onDragEnd: () => void;
    draggedItems: { id: string; type: string }[];
    activeFilters?: Set<string>;
    onMoveBlocked: (info: { blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] }) => void;
    onMoveRequest: (draggedIds: string[], targetId: string | null) => void;
    grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed';
    setUnboxTargetId: (id: string | null) => void;
}

const VirtualGroupNode: React.FC<VirtualGroupNodeProps> = ({
    groupKey,
    deviceIds,
    level,
    onSelect,
    selectedIds,
    expandedIds,
    toggleExpansion,
    onQuickMove,
    onDelete,
    dragOverId,
    setDragOverId,
    onDragStart,
    onDragEnd,
    draggedItems,
    activeFilters,
    onMoveBlocked,
    onMoveRequest,
    grouping,
    setUnboxTargetId
}) => {
    const { state } = useWarehouse();
    // Use a unique ID for the virtual node for expansion state
    const virtualId = getVirtualGroupId(groupKey, deviceIds[0]);
    const isExpanded = expandedIds.has(virtualId);

    // Calculate Label
    let label = groupKey;
    if (grouping === 'sku' && deviceIds.length > 0) {
        const firstDevice = state.entities[deviceIds[0]];
        if (firstDevice && firstDevice.deviceAttributes) {
            const { sku, model, grade } = firstDevice.deviceAttributes;
            // Use the groupKey (which is the SKU) or fallback
            // Actually groupKey IS the SKU when grouping='sku'.
            // But let's be safe and use the attributes if available.
            // Format: {{sku}} • {{model}} • {{grade}}
            const safeSku = sku || groupKey;
            const safeModel = model || 'Unknown Model';
            const safeGrade = grade || 'Unknown Grade';
            label = `${safeSku} • ${safeModel} • ${safeGrade}`;
        }
    }

    // Check if all devices in this group are selected
    const allSelected = deviceIds.every(id => selectedIds.has(id));
    // Check if some are selected (for visual feedback, though we mainly support all-or-nothing for the group node click)
    const someSelected = deviceIds.some(id => selectedIds.has(id));

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Select all devices in the group
        onSelect(new Set(deviceIds), e);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        // Drag all devices in the group
        e.dataTransfer.setData('application/json', JSON.stringify({ ids: deviceIds }));
        e.dataTransfer.setData('text/plain', deviceIds[0]); // Fallback

        // Collect types for validation (all Devices)
        const items = deviceIds.map(id => ({ id, type: 'Device' }));
        onDragStart(items);
    };

    return (
        <div className="select-none">
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm group",
                            (allSelected || someSelected) && "bg-accent/50 text-accent-foreground"
                        )}
                        style={{ paddingLeft: `${level * 12 + 4}px` }}
                        onClick={handleSelect}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={onDragEnd}
                    >
                        <div
                            className="mr-1 p-0.5 hover:bg-muted rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(virtualId);
                            }}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>

                        <Folder className="h-4 w-4 mr-2 text-blue-400 fill-blue-400/20" />
                        <span className="text-sm truncate flex-1 font-medium">{label}</span>

                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                            {deviceIds.length}
                        </Badge>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onQuickMove(new Set(deviceIds))}>
                                        <Move className="h-4 w-4 mr-2" /> Quick Move Group
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(new Set(deviceIds))}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => onQuickMove(new Set(deviceIds))}>
                        <Move className="h-4 w-4 mr-2" /> Quick Move Group
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onDelete(new Set(deviceIds))}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {isExpanded && (
                <div>
                    {deviceIds.map(childId => (
                        <HierarchyNode
                            key={childId}
                            entityId={childId}
                            level={level + 1}
                            onSelect={(idOrIds, e) => {
                                const ids = typeof idOrIds === 'string' ? new Set([idOrIds]) : idOrIds;
                                onSelect(ids, e);
                            }}
                            selectedIds={selectedIds}
                            searchTerm=""
                            onImport={() => { }}
                            onDelete={(id) => onDelete(new Set([id]))}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            grouping="none" // Don't group recursively inside a group
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            activeFilters={activeFilters}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- VirtualQueueNode Component ---
interface VirtualQueueNodeProps {
    queueName: string;
    parentId: string;
    deviceIds: string[];
    level: number;
    onSelect: (ids: Set<string>, e: React.MouseEvent) => void;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    toggleExpansion: (id: string) => void;
    onQuickMove: (idOrIds: string | Set<string>) => void;
    onDelete: (ids: Set<string>) => void;
    grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed';
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onDragStart: (items: { id: string; type: string }[]) => void;
    onDragEnd: () => void;
    draggedItems: { id: string; type: string }[];
    activeFilters?: Set<string>;
    onMoveBlocked: (info: { blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] }) => void;
    onMoveRequest: (draggedIds: string[], targetId: string | null) => void;
    setUnboxTargetId: (id: string | null) => void;
}

const QUEUE_COLORS: Record<string, string> = {
    'Assigned': '#2F50AC',
    'Active': '#DBA200',
    'Done': '#5A8B30',
    'Blocked': '#F57C00'
};

const VirtualQueueNode: React.FC<VirtualQueueNodeProps> = ({
    queueName,
    parentId,
    deviceIds,
    level,
    onSelect,
    selectedIds,
    expandedIds,
    toggleExpansion,
    onQuickMove,
    onDelete,
    grouping,
    dragOverId,
    setDragOverId,
    onDragStart,
    onDragEnd,
    draggedItems,
    activeFilters = new Set(),
    onMoveBlocked,
    onMoveRequest,
    setUnboxTargetId
}) => {
    const { state, updateEntity } = useWarehouse();
    const virtualId = `queue-${parentId}-${queueName}`;
    const isExpanded = expandedIds.has(virtualId);
    const isSelected = selectedIds.has(virtualId);

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(new Set([virtualId]), e);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        // Drag just this queue? Or its contents?
        // Usually we drag the queue itself if we want to move it (not supported yet?)
        // Or maybe we don't support dragging queues yet.
        // But the code has `draggable` and `onDragStart={handleDragStart}`.
        // If we don't support it, we should remove draggable.
        // But if we do, we need to set data.
        // Let's assume we drag the queue "folder" which might mean moving all its contents?
        // Or maybe it's just visual for now.
        // Let's implement a basic drag start that drags the virtual ID.
        e.dataTransfer.setData('text/plain', virtualId);
        e.dataTransfer.setData('application/json', JSON.stringify({ ids: [virtualId] }));
        // For now, we don't support dragging queues as items with types for validation
        // But if we did, we'd call onDragStart here.
        // onDragStart([{ id: virtualId, type: 'VirtualQueue' }]); 
    };

    const handleSafeDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);

        let draggedIds: string[] = [];
        try {
            const jsonData = e.dataTransfer.getData('application/json');
            if (jsonData) {
                const data = JSON.parse(jsonData);
                if (data.ids && Array.isArray(data.ids)) {
                    draggedIds = data.ids;
                }
            }
        } catch (err) {
            console.error("Failed to parse drag data", err);
        }

        if (draggedIds.length === 0) {
            const plainId = e.dataTransfer.getData('text/plain');
            if (plainId) draggedIds = [plainId];
        }

        if (draggedIds.length === 0) return;

        // Validation Logic
        const validation = validateMove(state, draggedIds, parentId);
        if (!validation.allowed && validation.blockedBy && validation.failedDeviceIds) {
            onMoveBlocked({
                blockedBy: validation.blockedBy,
                failedDeviceIds: validation.failedDeviceIds
            });
            return;
        }

        // 1. Update queue attribute first (to prevent race condition where move response overwrites attributes)
        draggedIds.forEach(id => {
            const entity = state.entities[id];
            if (entity && entity.type === 'Device') {
                updateEntity(id, { deviceAttributes: { ...entity.deviceAttributes, queue: queueName } as any });
            }
        });

        // Check if any item actually needs a parent change
        const itemsNeedingMove = draggedIds.filter(id => state.entities[id]?.parentId !== parentId);

        if (itemsNeedingMove.length > 0) {
            onMoveRequest(itemsNeedingMove, parentId);
        }

        // Auto-expand and select
        if (!expandedIds.has(virtualId)) {
            toggleExpansion(virtualId);
        }
        onSelect(new Set(draggedIds), e);

        toast.success(`Moved ${draggedIds.length} items to ${queueName}`);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Validation Logic
        if (draggedItems.length > 0) {
            // Check if Workstation (parent) is a valid parent for these items
            // Since dropping on a queue moves to the workstation (and sets queue attr)
            const targetType = 'Workstation';
            const canAccept = draggedItems.every(item => {
                const config = ENTITY_CONFIG[item.type as EntityType];
                return config && config.allowedParents.includes(targetType as any);
            });

            if (!canAccept) {
                if (dragOverId !== null) setDragOverId(null);
                return;
            }
        }

        if (dragOverId !== virtualId) {
            setDragOverId(virtualId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div
            className="select-none"
            onDrop={handleSafeDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={onDragEnd}
        >
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm group",
                            isSelected && "bg-accent text-accent-foreground",
                            dragOverId === virtualId && "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                        )}
                        style={{ paddingLeft: `${level * 12 + 4}px` }}
                        onClick={handleSelect}
                        draggable
                        onDragStart={handleDragStart}
                    >
                        <div
                            className="mr-1 p-0.5 hover:bg-muted rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(virtualId);
                            }}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>

                        <Icons.ListTodo
                            className="h-4 w-4 mr-2"
                            style={{ color: QUEUE_COLORS[queueName] || '#F97316' }}
                        />
                        <span className="text-sm truncate flex-1 font-medium">{queueName}</span>

                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                            {deviceIds.length}
                        </Badge>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onQuickMove(new Set(deviceIds))}>
                                        <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => onQuickMove(new Set(deviceIds))}>
                        <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {isExpanded && (
                <div>
                    {deviceIds.map(childId => (
                        <HierarchyNode
                            key={childId}
                            entityId={childId}
                            level={level + 1}
                            onSelect={(idOrIds, e) => {
                                const ids = typeof idOrIds === 'string' ? new Set([idOrIds]) : idOrIds;
                                onSelect(ids, e);
                            }}
                            selectedIds={selectedIds}
                            searchTerm=""
                            onImport={() => { }}
                            onDelete={(id) => onDelete(new Set([id]))}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            grouping="none"
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- WarehouseRootNode Component ---
interface WarehouseRootNodeProps {
    children: React.ReactNode;
    onSelect: (ids: Set<string>, e: React.MouseEvent) => void;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    toggleExpansion: (id: string) => void;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent) => void;
}

const WarehouseRootNode: React.FC<WarehouseRootNodeProps> = ({
    children,
    onSelect,
    selectedIds,
    expandedIds,
    toggleExpansion,
    dragOverId,
    setDragOverId,
    onDragEnd,
    onDrop
}) => {
    const rootId = 'warehouse-root';
    const isExpanded = expandedIds.has(rootId);
    const isSelected = selectedIds.has(rootId);

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(new Set([rootId]), e);
    };

    return (
        <div
            className="select-none"
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragOverId !== rootId) setDragOverId(rootId);
            }}
            onDrop={(e) => {
                onDrop(e);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDragEnd={onDragEnd}
        >
            <div
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm group",
                    isSelected && "bg-accent text-accent-foreground",
                    dragOverId === rootId && "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                )}
                onClick={handleSelect}
            >
                <div
                    className="mr-1 p-0.5 hover:bg-muted rounded"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleExpansion(rootId);
                    }}
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                <Icons.Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm truncate flex-1 font-semibold">Warehouse</span>
            </div>

            {isExpanded && (
                <div className="pl-0">
                    {children}
                </div>
            )}
        </div>
    );
};

interface HierarchyNodeProps {
    entityId: string;
    level: number;
    onSelect: (ids: Set<string> | string, e: React.MouseEvent) => void;
    selectedIds: Set<string>;
    searchTerm: string;
    onImport: (id: string) => void;
    onDelete: (id: string) => void;
    expandedIds: Set<string>;
    toggleExpansion: (id: string) => void;
    onQuickMove: (idOrIds: string | Set<string>) => void;
    grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed';
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onDragStart: (items: { id: string; type: string }[]) => void;
    onDragEnd: () => void;
    draggedItems: { id: string; type: string }[];
    activeFilters?: Set<string>;
    onMoveBlocked: (info: { blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] }) => void;
    onMoveRequest: (draggedIds: string[], targetId: string | null) => void;
    setUnboxTargetId: (id: string | null) => void;
}

const HierarchyNode: React.FC<HierarchyNodeProps> = ({
    entityId,
    level,
    onSelect,
    selectedIds,
    searchTerm,
    onImport,
    onDelete,
    expandedIds,
    toggleExpansion,
    onQuickMove,
    grouping,
    dragOverId,
    setDragOverId,
    onDragStart,
    onDragEnd,
    draggedItems,
    activeFilters = new Set(),
    onMoveBlocked,
    onMoveRequest,
    setUnboxTargetId
}) => {
    const { state, addEntity, moveEntity, moveEntities, updateEntity } = useWarehouse();
    const entity = state.entities[entityId];
    const isExpanded = expandedIds.has(entityId);

    // Memoize device count
    const deviceCount = useMemo(() => {
        const counts: Record<string, number> = {};

        // Helper to check if a device matches filters (duplicated from checkVisibility to avoid circular dependency)
        const deviceMatchesFilters = (device: WarehouseEntity) => {
            if (activeFilters.size === 0) return true;
            if (activeFilters.has('sellable') && !device.deviceAttributes?.sellable) return false;
            if (activeFilters.has('tested') && !device.deviceAttributes?.tested) return false;
            if (activeFilters.has('unlocked') && device.deviceAttributes?.lock_status !== 'Unlocked') return false;
            if (activeFilters.has('grade_a') && device.deviceAttributes?.grade !== 'A') return false;
            return true;
        };

        const countRecursive = (id: string): number => {
            if (counts[id] !== undefined) return counts[id];
            const e = state.entities[id];
            if (!e) return 0;

            if (e.type === 'Device') {
                // Only count if it matches filters
                const matches = deviceMatchesFilters(e);
                counts[id] = matches ? 1 : 0;
                return counts[id];
            }

            let sum = 0;
            for (const childId of e.children) {
                sum += countRecursive(childId);
            }
            counts[id] = sum;
            return sum;
        };
        Object.keys(state.entities).forEach(id => countRecursive(id));
        return counts;
    }, [state.entities, activeFilters]);

    if (!entity) return null;

    // Filter Logic
    const checkVisibility = (e: WarehouseEntity) => {
        const hasActiveSearchOrFilter = searchTerm || activeFilters.size > 0;
        if (!hasActiveSearchOrFilter) return true;

        let matchesSearch = false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            matchesSearch = (
                e.label.toLowerCase().includes(term) ||
                (e.barcode && e.barcode.toLowerCase().includes(term)) ||
                (e.deviceAttributes?.imei?.toLowerCase().includes(term) ?? false)
            );
        }

        if (e.type === 'Device') {
            let matchesFilter = true;
            if (activeFilters.size > 0) {
                if (activeFilters.has('sellable') && !e.deviceAttributes?.sellable) matchesFilter = false;
                if (activeFilters.has('tested') && !e.deviceAttributes?.tested) matchesFilter = false;
                if (activeFilters.has('unlocked') && e.deviceAttributes?.lock_status !== 'Unlocked') matchesFilter = false;
                if (activeFilters.has('grade_a') && e.deviceAttributes?.grade !== 'A') matchesFilter = false;
            }
            return (searchTerm ? matchesSearch : true) && matchesFilter;
        }

        // Container matches if it matches search string explicitly
        return matchesSearch;
    };

    const hasMatchingDescendant = (id: string): boolean => {
        const e = state.entities[id];
        if (!e) return false;
        if (checkVisibility(e)) return true;
        return e.children.some(childId => hasMatchingDescendant(childId));
    };

    const isVisible = checkVisibility(entity);
    const hasVisibleDescendants = hasMatchingDescendant(entityId);

    // If we have active search/filter, and this node doesn't match AND has no matching descendants, hide it
    if ((searchTerm || activeFilters.size > 0) && !isVisible && !hasVisibleDescendants) return null;

    const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;
    const hasChildren = entity.children.length > 0;

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();

        // If the dragged item is part of the selection, drag ALL selected items
        if (selectedIds.has(entityId)) {
            const ids = Array.from(selectedIds);
            e.dataTransfer.setData('application/json', JSON.stringify({ ids }));
            e.dataTransfer.setData('text/plain', entityId); // Fallback / Primary ID
            // Set drag image to show count?
            // const dragIcon = document.createElement('div');
            // dragIcon.innerText = `${ids.length} items`;
            // document.body.appendChild(dragIcon);
            // e.dataTransfer.setDragImage(dragIcon, 0, 0);
            // setTimeout(() => document.body.removeChild(dragIcon), 0);

            // Collect types for validation
            const items = ids.map(id => ({ id, type: state.entities[id]?.type || 'Unknown' }));
            onDragStart(items);
        } else {
            // Otherwise just drag this one
            e.dataTransfer.setData('application/json', JSON.stringify({ ids: [entityId] }));
            e.dataTransfer.setData('text/plain', entityId);
            onDragStart([{ id: entityId, type: entity.type }]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Validation Logic
        if (draggedItems.length > 0) {
            const targetType = entity.type;
            const canAccept = draggedItems.every(item => {
                const config = ENTITY_CONFIG[item.type as EntityType];
                return config && config.allowedParents.includes(targetType as any);
            });

            if (!canAccept) {
                if (dragOverId !== null) setDragOverId(null);
                return;
            }
        }

        if (dragOverId !== entityId) {
            setDragOverId(entityId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if we are leaving this element, not entering a child?
        // Actually, dragLeave fires when entering a child.
        // So we shouldn't clear it here blindly.
        // But if we rely on the new target setting the ID, we might be fine.
        // However, if we leave the hierarchy entirely...
        // Let's just rely on other nodes taking over.
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);

        let draggedIds: string[] = [];
        try {
            const jsonData = e.dataTransfer.getData('application/json');
            if (jsonData) {
                const data = JSON.parse(jsonData);
                if (data.ids && Array.isArray(data.ids)) {
                    draggedIds = data.ids;
                }
            }
        } catch (err) {
            console.error("Failed to parse drag data", err);
        }

        // Fallback to text/plain if JSON failed or empty
        if (draggedIds.length === 0) {
            const plainId = e.dataTransfer.getData('text/plain');
            if (plainId) draggedIds = [plainId];
        }

        if (draggedIds.length === 0) return;

        // Filter out self-drops (dropping onto itself)
        draggedIds = draggedIds.filter(id => id !== entityId);
        if (draggedIds.length === 0) return;

        // Check if all dragged items are already children of the target
        const allAlreadyInTarget = draggedIds.every(id => state.entities[id]?.parentId === entityId);
        if (allAlreadyInTarget) {
            // If all items are already in the target, silently ignore the move
            // but ensure they remain selected.
            onSelect(new Set(draggedIds), e);
            return;
        }

        // Check if target CAN be a parent of dragged items.
        // We assume all dragged items are of compatible types if they are selected together?
        // Or we filter valid ones.

        const validMoves: string[] = [];
        const config = ENTITY_CONFIG[state.entities[draggedIds[0]]?.type]; // Check first item type
        // Note: If mixed types are selected, this might be tricky.
        // But usually we select same type or compatible.

        // Let's iterate and check validity for each?
        // Or just try to move all and let context handle validation (it logs warning).

        // Logic for "Reorder" vs "Move Inside"
        // If dropping onto a sibling (same parent), it's a reorder.
        // If dropping onto a container, it's a move inside.

        // For multi-item, reorder is complex. Let's prioritize "Move Inside" for now.
        // If dropping onto a container that accepts these items, move them inside.

        const targetType = entity.type;
        // Check if target accepts these children
        const canAccept = draggedIds.every(id => {
            const t = state.entities[id]?.type;
            return t && ENTITY_CONFIG[t].allowedParents.includes(targetType);
        });

        if (canAccept) {
            // Validate move rules
            const validation = validateMove(state, draggedIds, entityId);
            if (!validation.allowed && validation.blockedBy && validation.failedDeviceIds) {
                onMoveBlocked({
                    blockedBy: validation.blockedBy,
                    failedDeviceIds: validation.failedDeviceIds
                });
                return;
            }

            onMoveRequest(draggedIds, entityId);
            toast.success(`Moved ${draggedIds.length} items to ${entity.label}`);

            // Handle Queue logic for Workstations
            if (entity.type === 'Workstation' && entity.workstationAttributes?.queues?.length) {
                const defaultQueue = entity.workstationAttributes.queues[0];
                // Update queue attribute for all devices
                // We need to do this after move? Or parallel.
                // moveEntities updates parent. We need to update attributes.
                // We can iterate updateEntity.
                draggedIds.forEach(id => {
                    if (state.entities[id]?.type === 'Device') {
                        updateEntity(id, { deviceAttributes: { ...state.entities[id].deviceAttributes, queue: defaultQueue } as any });
                    }
                });
            }

            // Auto-expand and select
            if (!expandedIds.has(entityId)) {
                toggleExpansion(entityId);
            }
            onSelect(new Set(draggedIds), e);
        } else {
            // Maybe reorder?
            // Only if single item reorder for now?
            // Or if all have same parent as target.
            const allSameParent = draggedIds.every(id => state.entities[id]?.parentId === entity.parentId);
            if (allSameParent && draggedIds.length === 1) {
                // Single item reorder logic (keep existing logic for single item)
                // ... [Insert Reorder Logic Here if needed, or skip for simplicity in this step]
                // The user asked for "works when there are multiple devices selected".
                // Reordering multiple items is hard. Let's prioritize "Move Inside" for multi-drag.
                toast.error("Cannot move these items here.");
            } else {
                toast.error("Cannot move these items here.");
            }
        }
    };

    // Grouping Children Logic
    const renderChildren = () => {
        // Always render children for Workstations (to show queues) or if there are actual children
        if (!hasChildren && entity.type !== 'Workstation') return null;

        let childrenToRender = entity.children;
        const nonDeviceChildren = childrenToRender.filter(id => state.entities[id]?.type !== 'Device');
        const deviceChildren = childrenToRender.filter(id => state.entities[id]?.type === 'Device');

        // Workstation Queues Logic
        if (entity.type === 'Workstation') {
            const queues = ['Assigned', 'Active', 'Done', 'Blocked'];
            const devicesByQueue: Record<string, string[]> = {};
            const unassignedDevices: string[] = [];

            // Initialize buckets
            queues.forEach(q => devicesByQueue[q] = []);

            deviceChildren.forEach(id => {
                const device = state.entities[id];
                const q = device.deviceAttributes?.queue;
                if (q && queues.includes(q)) {
                    devicesByQueue[q].push(id);
                } else {
                    // If strict mode, maybe these should be in 'Assigned'? 
                    // For now, let's put them in 'Assigned' visually if we want to enforce it,
                    // or just show them as unassigned. 
                    // The user asked for "devices moves can no longer go into the workstation root",
                    // so we should probably treat them as 'Assigned' or force them there.
                    // Let's map unassigned to 'Assigned' for display.
                    devicesByQueue['Assigned'].push(id);
                }
            });

            return (
                <div>
                    {/* Render non-device children (if any allowed) */}
                    {nonDeviceChildren.map(childId => (
                        <HierarchyNode
                            key={childId}
                            entityId={childId}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedIds={selectedIds}
                            searchTerm={searchTerm}
                            onImport={onImport}
                            onDelete={onDelete}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            grouping={grouping}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}

                    {/* Render Queues */}
                    {queues.map(q => (
                        <VirtualQueueNode
                            key={q}
                            queueName={q}
                            parentId={entityId}
                            deviceIds={devicesByQueue[q]}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            onDelete={(ids) => (onDelete as any)(ids)}
                            grouping={grouping}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}
                </div>
            );
        }

        // Grouping Logic (PO/SKU)
        if (grouping !== 'none' && deviceChildren.length > 0) {
            // Sort deviceChildren to ensure deterministic order for virtual group IDs
            deviceChildren.sort();

            const groups: Record<string, string[]> = {};

            deviceChildren.forEach(id => {
                const device = state.entities[id];
                let key = 'Unknown';
                if (grouping === 'po') {
                    key = device.deviceAttributes?.po_number || 'No PO';
                } else if (grouping === 'sku') {
                    key = device.deviceAttributes?.sku || 'No SKU';
                } else if (grouping === 'presold') {
                    key = device.deviceAttributes?.presold_order_number || 'No Presold Order';
                } else if (grouping === 'processed') {
                    key = device.deviceAttributes?.sellable ? 'Processed' : 'Not Processed';
                }
                if (!groups[key]) groups[key] = [];
                groups[key].push(id);
            });

            return (
                <div>
                    {/* Render non-device children normally */}
                    {nonDeviceChildren.map(childId => (
                        <HierarchyNode
                            key={childId}
                            entityId={childId}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedIds={selectedIds}
                            searchTerm={searchTerm}
                            onImport={onImport}
                            onDelete={onDelete}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            grouping={grouping}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            activeFilters={activeFilters}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}

                    {/* Render Virtual Groups */}
                    {Object.entries(groups).map(([key, ids]) => (
                        <VirtualGroupNode
                            key={key}
                            groupKey={key}
                            deviceIds={ids}
                            level={level + 1}
                            grouping={grouping}

                            onSelect={(ids, e) => {
                                if (ids instanceof Set) {
                                    onSelect(ids, e);
                                }
                            }}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={onQuickMove}
                            onDelete={(ids) => {
                                (onDelete as any)(ids);
                            }}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            draggedItems={draggedItems}
                            activeFilters={activeFilters}
                            onMoveBlocked={onMoveBlocked}
                            onMoveRequest={onMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}
                </div>
            );
        }

        // Default rendering
        let childrenToRenderDefault = entity.children;
        if (entity.type === 'Bin') {
            // For Bins, render Devices first, then Boxes (others)
            const devices = entity.children.filter(id => state.entities[id]?.type === 'Device');
            const others = entity.children.filter(id => state.entities[id]?.type !== 'Device');
            childrenToRenderDefault = [...devices, ...others];
        }

        return (
            <div>
                {childrenToRenderDefault.map(childId => (
                    <HierarchyNode
                        key={childId}
                        entityId={childId}
                        level={level + 1}
                        onSelect={onSelect}
                        selectedIds={selectedIds}
                        searchTerm={searchTerm}
                        onImport={onImport}
                        onDelete={onDelete}
                        expandedIds={expandedIds}
                        toggleExpansion={toggleExpansion}
                        onQuickMove={onQuickMove}
                        grouping={grouping}
                        dragOverId={dragOverId}
                        setDragOverId={setDragOverId}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        draggedItems={draggedItems}
                        activeFilters={activeFilters}
                        onMoveBlocked={onMoveBlocked}
                        onMoveRequest={onMoveRequest}
                        setUnboxTargetId={setUnboxTargetId}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="select-none">
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm group",
                            selectedIds.has(entityId) && "bg-accent text-accent-foreground",
                            dragOverId === entityId && "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                        )}
                        style={{ paddingLeft: `${level * 12 + 4}px` }}
                        onClick={(e) => onSelect(entityId, e)}
                        draggable
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={onDragEnd}
                    >
                        <div
                            className="mr-1 p-0.5 hover:bg-muted rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(entityId);
                            }}
                        >
                            {hasChildren || entity.type === 'Workstation' ? (
                                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            ) : (
                                <div className="w-4 h-4" />
                            )}
                        </div>

                        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">
                            {(entity.type === 'Bin' || entity.type === 'Box') ? (() => {
                                // Dynamic Bin/Box Label Logic
                                const barcode = entity.label; // Always use label, ignore barcode for display
                                const devices = entity.children
                                    .map(id => state.entities[id])
                                    .filter(e => e && e.type === 'Device');

                                if (devices.length === 0) {
                                    return `${barcode} • EMPTY`;
                                }

                                const skuCounts: Record<string, number> = {};
                                devices.forEach(d => {
                                    const sku = d.deviceAttributes?.sku || 'Unknown';
                                    skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                                });

                                const uniqueSkus = Object.keys(skuCounts);
                                if (uniqueSkus.length === 1) {
                                    return `${barcode} • ${uniqueSkus[0]}`;
                                }

                                // Mixed SKUs
                                // Sort by count (desc), then by SKU (asc)
                                uniqueSkus.sort((a, b) => {
                                    const countDiff = skuCounts[b] - skuCounts[a];
                                    if (countDiff !== 0) return countDiff;
                                    return a.localeCompare(b);
                                });

                                const mostRepresentativeSku = uniqueSkus[0];
                                const otherSkuCount = uniqueSkus.length - 1;

                                return `${barcode} • ${mostRepresentativeSku} + ${otherSkuCount} MORE`;
                            })() : entity.label}
                        </span>

                        {entity.type !== 'Device' && deviceCount[entityId] > 0 && (
                            <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30">
                                {deviceCount[entityId]}
                            </Badge>
                        )}

                        {entity.type === 'Device' && (
                            <div className="flex items-center gap-1 ml-2">
                                {!entity.deviceAttributes?.sku && (
                                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">Unknown</Badge>
                                )}
                                {entity.deviceAttributes?.sku && entity.deviceAttributes?.tested && (
                                    <Badge className="h-4 px-1 text-[10px] bg-blue-500 hover:bg-blue-600">Tested</Badge>
                                )}
                                {(entity.deviceAttributes?.imei) && (
                                    <Badge className="h-4 px-1 text-[10px] bg-purple-500 hover:bg-purple-600">Serialized</Badge>
                                )}
                                {entity.deviceAttributes?.sellable && (
                                    <Badge className="h-4 px-1 text-[10px] bg-green-500 hover:bg-green-600">Processed</Badge>
                                )}
                            </div>
                        )}

                        {(searchTerm || activeFilters.size > 0) && !isVisible && hasVisibleDescendants && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-2">Contains Match</Badge>
                        )}

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {(entity.type === 'Bin' || entity.type === 'Workstation' || entity.type === 'Device') && (
                                        <DropdownMenuItem onClick={() => onQuickMove(entityId)}>
                                            <Move className="h-4 w-4 mr-2" /> {entity.type === 'Device' ? 'Quick Move' : 'Quick Move Contents'}
                                        </DropdownMenuItem>
                                    )}
                                    {entity.type === 'Bin' && (
                                        <DropdownMenuItem onClick={() => onImport(entityId)}>
                                            <Upload className="h-4 w-4 mr-2" /> Import Devices
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => onDelete(entityId)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                    {entity.type === 'Box' && (
                                        <DropdownMenuItem onClick={() => setUnboxTargetId(entityId)}>
                                            <Icons.PackageOpen className="h-4 w-4 mr-2" /> Unbox In Place
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Add Child</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {Object.keys(ENTITY_CONFIG)
                                                .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                                .map((type) => (
                                                    <DropdownMenuItem key={type} onClick={() => {
                                                        addEntity(type, entityId);
                                                        if (!isExpanded) toggleExpansion(entityId);
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
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => onDelete(entityId)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </ContextMenuItem>
                    {entity.type === 'Bin' && (
                        <ContextMenuItem onClick={() => onImport(entityId)}>
                            <Upload className="h-4 w-4 mr-2" /> Import Devices
                        </ContextMenuItem>
                    )}
                    {(entity.type === 'Bin' || entity.type === 'Workstation' || entity.type === 'Device') && (
                        <ContextMenuItem onClick={() => onQuickMove(entityId)}>
                            <Move className="h-4 w-4 mr-2" /> {entity.type === 'Device' ? 'Quick Move' : 'Quick Move Contents'}
                        </ContextMenuItem>
                    )}
                    {entity.type === 'Box' && (
                        <ContextMenuItem onClick={() => setUnboxTargetId(entityId)}>
                            <Icons.PackageOpen className="h-4 w-4 mr-2" /> Unbox In Place
                        </ContextMenuItem>
                    )}
                    <ContextMenuSub>
                        <ContextMenuSubTrigger>Add Child</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                            {Object.keys(ENTITY_CONFIG)
                                .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                .map((type) => (
                                    <ContextMenuItem key={type} onClick={() => {
                                        addEntity(type, entityId);
                                        if (!isExpanded) toggleExpansion(entityId);
                                        toast.success(`Added ${type} to ${entity.label}`);
                                    }}>
                                        {type}
                                    </ContextMenuItem>
                                ))}
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                </ContextMenuContent>
            </ContextMenu>

            {isExpanded && renderChildren()}
        </div>
    );
};



interface HierarchyViewProps {
    onSelect: (ids: Set<string>) => void;
    selectedIds: Set<string>;
    grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed';
    setGrouping: (grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed') => void;
}

export function HierarchyView({ onSelect, selectedIds, grouping, setGrouping }: HierarchyViewProps) {
    const { state, addEntity, deleteEntity, deleteEntities, moveEntity, moveEntities, undo, canUndo, updateConfig, unboxEntities } = useWarehouse();
    const [searchTerm, setSearchTerm] = useState('');
    // grouping state moved to props
    const [importTargetId, setImportTargetId] = useState<string | null>(null);
    const [deleteTargetIds, setDeleteTargetIds] = useState<Set<string> | null>(null);
    const [unboxTargetId, setUnboxTargetId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['warehouse-root'])); // Default expand root
    const [quickMoveIds, setQuickMoveIds] = useState<Set<string> | null>(null);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedItems, setDraggedItems] = useState<{ id: string; type: string }[]>([]);
    const [singleBinExpansion, setSingleBinExpansion] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const [moveBlockedInfo, setMoveBlockedInfo] = useState<{ blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] } | null>(null);
    const [moveConfirmationInfo, setMoveConfirmationInfo] = useState<{ count: number; targetName: string; sourceName: string; skuSummary: string; draggedIds: string[]; targetId: string | null } | null>(null);

    const maxMoveWithoutConfirm = state.maxMoveWithoutConfirm ?? 1;

    const handleUnbox = (deleteBox: boolean) => {
        if (!unboxTargetId) return;
        const entity = state.entities[unboxTargetId];
        if (!entity || entity.type !== 'Box') return;

        unboxEntities(entity.id, entity.parentId, deleteBox);
        toast.success(`Unboxed ${entity.label}`);
        setUnboxTargetId(null);
    };

    const handleMoveRequest = (draggedIds: string[], targetId: string | null) => {
        // ... (existing code)
        if (draggedIds.length > maxMoveWithoutConfirm) {
            const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';

            // Calculate Source Name
            let sourceName = 'Unknown';
            const firstItem = state.entities[draggedIds[0]];
            if (firstItem && firstItem.parentId) {
                const parent = state.entities[firstItem.parentId];
                if (parent) {
                    // Check if all items are from the same parent
                    const allSameParent = draggedIds.every(id => state.entities[id]?.parentId === firstItem.parentId);
                    sourceName = allSameParent ? parent.label : 'Various Locations';
                } else if (firstItem.parentId === 'warehouse-root') {
                    sourceName = 'Warehouse Root';
                }
            }

            // Calculate SKU Summary
            const skuCounts: Record<string, number> = {};
            draggedIds.forEach(id => {
                const entity = state.entities[id];
                if (entity && entity.type === 'Device') {
                    const sku = entity.deviceAttributes?.sku || 'Unknown SKU';
                    skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                } else {
                    const type = entity ? entity.type : 'Item';
                    skuCounts[type] = (skuCounts[type] || 0) + 1;
                }
            });

            const sortedSkus = Object.entries(skuCounts).sort((a, b) => b[1] - a[1]);
            let skuSummary = '';
            if (sortedSkus.length > 0) {
                const [mostFrequentSku, count] = sortedSkus[0];
                if (sortedSkus.length === 1) {
                    skuSummary = mostFrequentSku;
                } else {
                    const otherCount = sortedSkus.slice(1).reduce((acc, [, c]) => acc + c, 0);
                    skuSummary = `${mostFrequentSku} + ${otherCount} MORE`;
                }
            } else {
                skuSummary = `${draggedIds.length} Items`;
            }

            setMoveConfirmationInfo({
                count: draggedIds.length,
                targetName,
                sourceName,
                skuSummary,
                draggedIds,
                targetId
            });
        } else {
            moveEntities(draggedIds, targetId);
            const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';
            toast.success(`Moved ${draggedIds.length} items to ${targetName}`);
        }
    };

    // ... (rest of existing code)

    // Fix setMaxMoveWithoutConfirm usage
    // In render:
    // onCheckedChange={(checked) => updateConfig({ maxMoveWithoutConfirm: checked ? 0 : 1 })}
    // updateConfig({ maxMoveWithoutConfirm: val });

    const handleConfirmMove = () => {
        if (moveConfirmationInfo) {
            moveEntities(moveConfirmationInfo.draggedIds, moveConfirmationInfo.targetId);
            toast.success(`Moved ${moveConfirmationInfo.count} items to ${moveConfirmationInfo.targetName}`);
            setMoveConfirmationInfo(null);
        }
    };

    const availableFilters = [
        { id: 'sellable', label: 'Processed' },
        { id: 'tested', label: 'Tested' },
        { id: 'unlocked', label: 'Unlocked' },
        { id: 'grade_a', label: 'Grade A' },
    ];

    const toggleFilter = (filterId: string) => {
        const newFilters = new Set(activeFilters);
        if (newFilters.has(filterId)) {
            newFilters.delete(filterId);
        } else {
            newFilters.add(filterId);
        }
        setActiveFilters(newFilters);
    };

    const handleGlobalDragStart = (items: { id: string; type: string }[]) => {
        setDraggedItems(items);
    };

    const handleGlobalDragEnd = () => {
        setDraggedItems([]);
        setDragOverId(null);
    };

    // Helper to generate virtual group IDs (must match VirtualGroupNode logic)
    // We need to define this outside or use the exported one if we export it.
    // Since we are in the same file, we can just define it at module level or use the one we added.

    const getVisibleItems = (): string[] => {
        const visible: string[] = [];

        const traverse = (ids: string[]) => {
            ids.forEach(id => {
                visible.push(id);

                // If not expanded, don't traverse children
                if (!expandedIds.has(id)) return;

                const entity = state.entities[id];
                if (!entity) return;

                // --- Grouping Logic ---
                if (grouping !== 'none') {
                    const deviceChildren = entity.children.filter(childId => state.entities[childId]?.type === 'Device').sort();
                    const nonDeviceChildren = entity.children.filter(childId => state.entities[childId]?.type !== 'Device');

                    // 1. Non-Device Children
                    traverse(nonDeviceChildren);

                    // 2. Virtual Groups
                    if (deviceChildren.length > 0) {
                        const groups: Record<string, string[]> = {};
                        deviceChildren.forEach(childId => {
                            const device = state.entities[childId];
                            let key = 'Unknown';
                            if (grouping === 'po') {
                                key = device.deviceAttributes?.po_number || 'No PO';
                            } else if (grouping === 'sku') {
                                key = device.deviceAttributes?.sku || 'No SKU';
                            } else if (grouping === 'presold') {
                                key = device.deviceAttributes?.presold_order_number || 'No Presold Order';
                            }
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(childId);
                        });

                        // Traverse Groups
                        Object.entries(groups).forEach(([key, groupIds]) => {
                            const virtualId = getVirtualGroupId(key, groupIds[0]);
                            visible.push(virtualId);

                            if (expandedIds.has(virtualId)) {
                                groupIds.forEach(childId => visible.push(childId));
                            }
                        });
                    }
                    return;
                }

                // --- No Grouping ---

                // Workstation Logic
                if (entity.type === 'Workstation') {
                    const deviceChildren = entity.children.filter(childId => state.entities[childId]?.type === 'Device');
                    const nonDeviceChildren = entity.children.filter(childId => state.entities[childId]?.type !== 'Device');

                    // 1. Non-Device Children
                    traverse(nonDeviceChildren);

                    // 2. Virtual Queues
                    const queues = ['Assigned', 'Active', 'Done', 'Blocked'];
                    const devicesByQueue: Record<string, string[]> = {};
                    queues.forEach(q => devicesByQueue[q] = []);

                    deviceChildren.forEach(childId => {
                        const device = state.entities[childId];
                        const q = device.deviceAttributes?.queue;
                        if (q && queues.includes(q)) {
                            devicesByQueue[q].push(childId);
                        } else {
                            devicesByQueue['Assigned'].push(childId);
                        }
                    });

                    queues.forEach(q => {
                        const virtualId = `queue-${id}-${q}`;
                        visible.push(virtualId);

                        if (expandedIds.has(virtualId)) {
                            // Devices in queue
                            devicesByQueue[q].forEach(childId => visible.push(childId));
                        }
                    });
                    return;
                }

                // Bin Logic
                if (entity.type === 'Bin') {
                    const devices = entity.children.filter(childId => state.entities[childId]?.type === 'Device');
                    const others = entity.children.filter(childId => state.entities[childId]?.type !== 'Device');

                    // Devices first, then others
                    traverse(devices);
                    traverse(others);
                    return;
                }

                // Default Logic
                traverse(entity.children);
            });
        };

        traverse(state.roots);
        return visible;
    };

    // Toggle expansion
    const toggleExpansion = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            // Single Bin Expansion Logic
            if (singleBinExpansion) {
                const entity = state.entities[id];
                // If opening a Bin, close other Bins
                // Note: We check if the entity is a Bin.
                // Virtual nodes (queues/groups) don't have entity types in state.entities usually,
                // or are handled differently.
                // state.entities[id] works for real entities.
                if (entity && entity.type === 'Bin') {
                    // Find other expanded bins and close them
                    Array.from(newExpanded).forEach(expandedId => {
                        const otherEntity = state.entities[expandedId];
                        if (otherEntity && otherEntity.type === 'Bin') {
                            newExpanded.delete(expandedId);
                        }
                    });
                }
            }

            newExpanded.add(id);

            // Auto-expand single children recursively
            // Note: This logic might need adjustment for virtual groups, but for now let's keep it simple
            // It only works for real entities anyway since state.entities[id] check
            let currentId = id;
            while (true) {
                const entity = state.entities[currentId];
                if (entity && entity.children.length === 1) {
                    const childId = entity.children[0];
                    newExpanded.add(childId);
                    currentId = childId;
                } else {
                    break;
                }
            }
        }
        setExpandedIds(newExpanded);
    };

    const handleNodeClick = (idOrIds: string | Set<string>, e: React.MouseEvent) => {
        e.stopPropagation();

        console.log('handleNodeClick', { idOrIds, shift: e.shiftKey, lastSelectedId });

        let newSelection = new Set(selectedIds);
        const idsToHandle = typeof idOrIds === 'string' ? [idOrIds] : Array.from(idOrIds);
        const primaryId = idsToHandle[0]; // For range select anchor

        if (e.metaKey || e.ctrlKey) {
            // Toggle
            idsToHandle.forEach(id => {
                if (newSelection.has(id)) {
                    newSelection.delete(id);
                } else {
                    newSelection.add(id);
                }
            });
            setLastSelectedId(primaryId);
        } else if (e.shiftKey && lastSelectedId && typeof idOrIds === 'string') {
            // Range select
            const visibleItems = getVisibleItems();
            const lastIndex = visibleItems.indexOf(lastSelectedId);
            const currentIndex = visibleItems.indexOf(primaryId);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const range = visibleItems.slice(start, end + 1);
                console.log('range', range);

                // Add range to selection (or replace? Standard is usually replace + add range if not ctrl)
                // But here we are just adding to existing if shift is held?
                // Standard OS behavior: Shift+Click selects range from Anchor to Current.
                // It usually clears other selections unless Ctrl is also held.
                // Let's assume simple range extension for now, or replace.
                // Let's do: Keep existing selection? No, usually Shift-click defines the selection as Range(Anchor, Current).

                // Let's try to be smart:
                // If we want to ADD to selection, we'd use Ctrl+Shift.
                // Just Shift usually implies "Select this range".
                newSelection = new Set(range);
            }
        } else {
            // Single select (or group select replacing everything)
            newSelection = new Set(idsToHandle);
            setLastSelectedId(primaryId);
        }

        onSelect(newSelection);
    };

    const handleDelete = (idOrIds: string | Set<string>) => {
        const ids = typeof idOrIds === 'string' ? new Set([idOrIds]) : idOrIds;
        setDeleteTargetIds(ids);
    };

    const confirmDelete = () => {
        if (deleteTargetIds) {
            const count = deleteTargetIds.size;
            deleteEntities(Array.from(deleteTargetIds));
            setDeleteTargetIds(null);
            onSelect(new Set()); // Clear selection
            toast.success(`Deleted ${count} item${count !== 1 ? 's' : ''}`);
        }
    };

    const handleQuickMove = (idOrIds: string | Set<string>) => {
        if (typeof idOrIds === 'string') {
            // If it's a bin/workstation, move its children
            const entity = state.entities[idOrIds];
            if (entity && (entity.type === 'Bin' || entity.type === 'Workstation')) {
                setQuickMoveIds(new Set(entity.children));
            } else {
                setQuickMoveIds(new Set([idOrIds]));
            }
        } else {
            setQuickMoveIds(idOrIds);
        }
    };

    const handleQuickMoveConfirm = (targetId: string | null) => {
        if (quickMoveIds) {
            const count = quickMoveIds.size;
            handleMoveRequest(Array.from(quickMoveIds), targetId);

            const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';
            toast.success(`Moved ${count} items to ${targetName}`, {
                action: {
                    label: 'Undo',
                    onClick: () => undo()
                }
            });

            setQuickMoveIds(null);
        }
    };

    return (
        <div
            className="h-full flex flex-col bg-background border-r"
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverId(null);

                let draggedIds: string[] = [];
                try {
                    const jsonData = e.dataTransfer.getData('application/json');
                    if (jsonData) {
                        const data = JSON.parse(jsonData);
                        if (data.ids && Array.isArray(data.ids)) {
                            draggedIds = data.ids;
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse drag data", err);
                }

                if (draggedIds.length === 0) {
                    const plainId = e.dataTransfer.getData('text/plain');
                    if (plainId) draggedIds = [plainId];
                }

                if (draggedIds.length === 0) return;

                // Move to root
                handleMoveRequest(draggedIds, null);
            }}
        >
            <div className="p-2 border-b space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-sm">Explorer</h2>
                    <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsHistoryOpen(true)} title="Action History">
                            <HistoryIcon className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsCheckpointsOpen(true)} title="Version Checkpoints">
                            <GitBranch className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={undo}
                            disabled={!canUndo}
                            title="Undo Last Move"
                        >
                            <Icons.Undo2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                            addEntity('Department', null);
                            toast.success('Added new Department');
                        }} title="Add Department">
                            <Plus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-6 w-6" title="Settings">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <div className="flex items-center justify-between px-2 py-2">
                                    <Label htmlFor="single-bin-mode" className="text-sm font-medium">Single Bin Expansion</Label>
                                    <Switch
                                        id="single-bin-mode"
                                        checked={singleBinExpansion}
                                        onCheckedChange={setSingleBinExpansion}
                                    />
                                </div>
                                <div className="px-2 py-2 space-y-2 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="always-confirm" className="text-sm font-medium">Always Confirm Moves</Label>
                                        <Switch
                                            id="always-confirm"
                                            checked={maxMoveWithoutConfirm === 0}
                                            onCheckedChange={(checked) => updateConfig({ maxMoveWithoutConfirm: checked ? 0 : 1 })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="max-move" className={cn("text-sm font-medium", maxMoveWithoutConfirm === 0 && "text-muted-foreground")}>
                                            Max Move w/o Confirm
                                        </Label>
                                        <Input
                                            id="max-move"
                                            type="number"
                                            min="0"
                                            value={maxMoveWithoutConfirm === 0 ? '' : maxMoveWithoutConfirm}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) {
                                                    updateConfig({ maxMoveWithoutConfirm: val });
                                                }
                                            }}
                                            disabled={maxMoveWithoutConfirm === 0}
                                            placeholder={maxMoveWithoutConfirm === 0 ? "Always Confirm" : ""}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-8 pr-16 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-8 top-1 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setSearchTerm('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7">
                                <Filter className={cn("h-4 w-4", activeFilters.size > 0 ? "text-blue-500 fill-blue-500/20" : "text-muted-foreground")} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {availableFilters.map(filter => (
                                <DropdownMenuItem key={filter.id} onClick={() => toggleFilter(filter.id)}>
                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={activeFilters.has(filter.id)} />
                                        <span>{filter.label}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {activeFilters.size > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {Array.from(activeFilters).map(filterId => {
                            const filter = availableFilters.find(f => f.id === filterId);
                            return (
                                <Badge key={filterId} variant="secondary" className="h-5 px-1 text-[10px] gap-1 cursor-pointer" onClick={() => toggleFilter(filterId)}>
                                    {filter?.label}
                                    <X className="h-3 w-3" />
                                </Badge>
                            );
                        })}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <RadioGroup
                        value={grouping}
                        className="flex gap-2"
                        onValueChange={(v) => setGrouping(v as any)}
                    >
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="none" id="none" />
                            <Label htmlFor="none" className="text-xs">Ungrouped</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="po" id="po" />
                            <Label htmlFor="po" className="text-xs">PO</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="sku" id="sku" />
                            <Label htmlFor="sku" className="text-xs">SKU</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="presold" id="presold" />
                            <Label htmlFor="presold" className="text-xs">Presold</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="processed" id="processed" />
                            <Label htmlFor="processed" className="text-xs">Processed</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-2 pb-20" onMouseLeave={() => setDragOverId(null)}>
                <WarehouseRootNode
                    onSelect={(ids, e) => onSelect(ids)}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    toggleExpansion={toggleExpansion}
                    dragOverId={dragOverId}
                    setDragOverId={setDragOverId}
                    onDragEnd={handleGlobalDragEnd}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverId(null);

                        let draggedIds: string[] = [];
                        try {
                            const jsonData = e.dataTransfer.getData('application/json');
                            if (jsonData) {
                                const data = JSON.parse(jsonData);
                                if (data.ids && Array.isArray(data.ids)) {
                                    draggedIds = data.ids;
                                }
                            }
                        } catch (err) {
                            console.error("Failed to parse drag data", err);
                        }

                        if (draggedIds.length === 0) {
                            const plainId = e.dataTransfer.getData('text/plain');
                            if (plainId) draggedIds = [plainId];
                        }

                        if (draggedIds.length === 0) return;

                        // Move to root
                        handleMoveRequest(draggedIds, null);
                    }}
                >
                    {state.roots.map(rootId => (
                        <HierarchyNode
                            key={rootId}
                            entityId={rootId}
                            level={1} // Indent level 1 since it's under Warehouse
                            onSelect={handleNodeClick}
                            selectedIds={selectedIds}
                            searchTerm={searchTerm}
                            onImport={setImportTargetId}
                            onDelete={handleDelete}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={handleQuickMove}
                            grouping={grouping}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onDragStart={handleGlobalDragStart}
                            onDragEnd={handleGlobalDragEnd}
                            draggedItems={draggedItems}
                            onMoveBlocked={setMoveBlockedInfo}
                            onMoveRequest={handleMoveRequest}
                            setUnboxTargetId={setUnboxTargetId}
                        />
                    ))}
                    {state.roots.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8">
                            No items. Click + to add.
                        </div>
                    )}
                </WarehouseRootNode>
            </div>

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

            {moveConfirmationInfo && (
                <MoveConfirmationDialog
                    isOpen={!!moveConfirmationInfo}
                    onClose={() => setMoveConfirmationInfo(null)}
                    onConfirm={handleConfirmMove}
                    count={moveConfirmationInfo.count}
                    targetName={moveConfirmationInfo.targetName}
                    sourceName={moveConfirmationInfo.sourceName}
                    skuSummary={moveConfirmationInfo.skuSummary}
                />
            )}
            {deleteTargetIds && (
                <DeleteConfirmationDialog
                    isOpen={!!deleteTargetIds}
                    onClose={() => setDeleteTargetIds(null)}
                    onConfirm={() => {
                        if (deleteTargetIds) {
                            deleteEntities(Array.from(deleteTargetIds));
                            setDeleteTargetIds(null);
                            toast.success(`Deleted ${deleteTargetIds.size} items`);
                        }
                    }}
                    entityName={deleteTargetIds.size === 1
                        ? state.entities[Array.from(deleteTargetIds)[0]]?.label || 'Item'
                        : `${deleteTargetIds.size} items`}
                />
            )}

            {unboxTargetId && (
                <UnboxInPlaceDialog
                    isOpen={!!unboxTargetId}
                    onClose={() => setUnboxTargetId(null)}
                    deviceCount={state.entities[unboxTargetId]?.children.length || 0}
                    onConfirm={handleUnbox}
                />
            )}

            <HistoryDialog
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />

            <CheckpointsDialog
                isOpen={isCheckpointsOpen}
                onClose={() => setIsCheckpointsOpen(false)}
            />

            {quickMoveIds && (
                <QuickMoveDialog
                    isOpen={!!quickMoveIds}
                    onClose={() => setQuickMoveIds(null)}
                    selectedIds={quickMoveIds}
                    onMove={handleQuickMoveConfirm}
                />
            )}
        </div>
    );
}
