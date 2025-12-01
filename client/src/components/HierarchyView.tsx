"use client";

import React, { useState, useMemo } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG, WarehouseEntity } from '@/lib/warehouse';
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical, Folder } from 'lucide-react';
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
import { Search, Layers, Box, MoreHorizontal, Move } from 'lucide-react';
import { QuickMoveDialog } from '@/components/QuickMoveDialog';
import { toast } from 'sonner';

import { XlsxImportDialog } from '@/components/XlsxImportDialog';
import { Upload } from 'lucide-react';
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
    onQuickMove: (ids: Set<string>) => void;
    onDelete: (ids: Set<string>) => void;
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
    onDelete
}) => {
    const { state } = useWarehouse();
    // Use a unique ID for the virtual node for expansion state
    const virtualId = getVirtualGroupId(groupKey, deviceIds[0]);
    const isExpanded = expandedIds.has(virtualId);

    // Check if all devices in this group are selected
    const allSelected = deviceIds.every(id => selectedIds.has(id));
    // Check if some are selected (for visual feedback, though we mainly support all-or-nothing for the group node click)
    const someSelected = deviceIds.some(id => selectedIds.has(id));

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Select all devices in the group
        onSelect(new Set(deviceIds), e);
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
                        <span className="text-sm truncate flex-1 font-medium">{groupKey}</span>

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
                            onQuickMove={(id) => onQuickMove(new Set([id]))}
                            grouping="none" // Don't group recursively inside a group
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
    onQuickMove: (ids: Set<string>) => void;
    onDelete: (ids: Set<string>) => void;
}

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
    onDelete
}) => {
    const { updateEntity, moveEntity } = useWarehouse();
    const virtualId = `queue-${parentId}-${queueName}`;
    const isExpanded = expandedIds.has(virtualId);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');

        // Move to parent workstation AND update queue attribute
        // We can't do both in one atomic moveEntity call unless we update moveEntity or do two calls.
        // Better: moveEntity then updateEntity.
        // Or: if already in parent, just updateEntity.

        // We need to know if it's already a child.
        // We don't have easy access to the dragged entity state here without context lookup, 
        // but moveEntity handles the move.

        moveEntity(draggedId, parentId);
        // We need to wait for move? No, optimistic.
        // But we also need to set the queue attribute.
        updateEntity(draggedId, { deviceAttributes: { queue: queueName } as any }); // Need to merge? updateEntity merges.
        // Note: updateEntity implementation in context does a merge of top-level properties.
        // But for nested objects like deviceAttributes, we need to be careful.
        // The context implementation: [id]: { ...entity, ...updates }
        // If we pass { deviceAttributes: { queue: 'foo' } }, it might overwrite other attributes if not careful.
        // Let's check context implementation.
        // Context: [id]: { ...entity, ...updates }
        // So if we pass deviceAttributes, it replaces the whole object?
        // Let's check updateEntity in WarehouseContext.
        // It does: { ...entity, ...updates }.
        // So yes, it replaces deviceAttributes. We need to merge inside updateEntity or pass the full object.
        // Since we don't have the entity here easily, we rely on updateEntity to be smart or we need to fetch it.
        // Actually, updateEntity in context is simple.
        // We should probably improve updateEntity to handle deep merge or just do it here.
        // But we don't have the entity.
        // HACK: We can't easily do deep merge here without the entity.
        // However, we can use a functional update if supported? No.
        // Let's assume for now we need to fix this.
        // Actually, let's look at WarehouseContext again.
        // It's simple spread.
        // We should update WarehouseContext to support partial updates of nested objects or we risk data loss.
        // OR, we just assume we can't do this safely without reading state.
        // Wait, we have `useWarehouse` which gives us `state`.
        // So we can read it!
    };

    // We need state to do the safe update
    const { state } = useWarehouse();

    const handleSafeDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        const entity = state.entities[draggedId];
        if (!entity) return;

        // 1. Move if needed
        if (entity.parentId !== parentId) {
            moveEntity(draggedId, parentId);
            toast.success(`Moved to ${queueName}`);
        }

        // 2. Update queue
        const currentAttrs = entity.deviceAttributes || {};
        updateEntity(draggedId, {
            deviceAttributes: { ...currentAttrs, queue: queueName }
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div
            className="select-none"
            onDrop={handleSafeDrop}
            onDragOver={handleDragOver}
        >
            <div
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm group",
                )}
                style={{ paddingLeft: `${level * 12 + 4}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleExpansion(virtualId);
                }}
            >
                <div className="mr-1 p-0.5 hover:bg-muted rounded">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                <Icons.ListTodo className="h-4 w-4 mr-2 text-orange-500" />
                <span className="text-sm truncate flex-1 font-medium">{queueName}</span>

                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                    {deviceIds.length}
                </Badge>
            </div>

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
                            onQuickMove={(id) => onQuickMove(new Set([id]))}
                            grouping="none"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- HierarchyNode Component ---

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
    onQuickMove: (id: string) => void;
    grouping: 'none' | 'po' | 'sku';
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
    grouping
}) => {
    const { state, addEntity, moveEntity, updateEntity } = useWarehouse();
    const entity = state.entities[entityId];
    const isExpanded = expandedIds.has(entityId);

    // Memoize device count
    const deviceCount = useMemo(() => {
        const counts: Record<string, number> = {};
        const countRecursive = (id: string): number => {
            if (counts[id] !== undefined) return counts[id];
            const e = state.entities[id];
            if (!e) return 0;
            if (e.type === 'Device') {
                counts[id] = 1;
                return 1;
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
    }, [state.entities]);

    if (!entity) return null;

    // Filter Logic
    const matchesSearch = (e: WarehouseEntity) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            e.label.toLowerCase().includes(term) ||
            (e.barcode && e.barcode.toLowerCase().includes(term)) ||
            (e.deviceAttributes?.imei && e.deviceAttributes.imei.toLowerCase().includes(term))
        );
    };

    const hasMatchingDescendant = (id: string): boolean => {
        const e = state.entities[id];
        if (!e) return false;
        if (matchesSearch(e)) return true;
        return e.children.some(childId => hasMatchingDescendant(childId));
    };

    const isMatch = matchesSearch(entity);
    const hasMatch = hasMatchingDescendant(entityId);

    if (searchTerm && !isMatch && !hasMatch) return null;

    const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;
    const hasChildren = entity.children.length > 0;

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', entityId);
        e.stopPropagation();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== entityId) {
            const draggedEntity = state.entities[draggedId];
            if (!draggedEntity) return;

            // Check if we are dropping ONTO a sibling (reordering)
            // or dropping INTO a parent.
            // For this implementation, dropping ONTO an item means "place near this item".
            // We need to decide if we are placing BEFORE or AFTER based on mouse position.

            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const isTopHalf = offsetY < rect.height / 2;

            // If the dragged entity and the target entity share the same parent, it's a reorder
            // OR if we are dropping a Department onto another Department (both have null parent)
            const sameParent = draggedEntity.parentId === entity.parentId;

            // If we drop onto a container that CAN accept the dragged item as a child, 
            // we might mean "move inside". 
            // But if we are in "reorder mode" (e.g. holding Shift? or just default behavior for same type?), it's ambiguous.
            // Convention: 
            // - Drop on Center/Text -> Move Inside (if allowed)
            // - Drop on Top/Bottom Edge -> Reorder (if same parent)

            // Let's simplify:
            // If same parent AND same type (roughly), treat as reorder.
            // Especially for Departments which are roots.

            const isReorder = sameParent;
            // Note: This prevents moving a Box *into* a Bin if they are siblings? 
            // No, Box can be in Bin. If Box is in Rack, and Bin is in Rack. 
            // If I drop Box on Bin, I probably want to put Box IN Bin.
            // So "sameParent" isn't enough.

            // Check if target CAN be a parent of dragged.
            const config = ENTITY_CONFIG[draggedEntity.type];
            const canBeParent = config.allowedParents.includes(entity.type);

            if (canBeParent && !isReorder) {
                // Move INSIDE
                moveEntity(draggedId, entityId);
                toast.success(`Moved item to ${entity.label}`);
            } else if (sameParent) {
                // Reorder relative to this sibling
                // We need to find the index of the target entity in the parent's children
                let parentChildren: string[] = [];
                if (entity.parentId) {
                    parentChildren = state.entities[entity.parentId]?.children || [];
                } else {
                    parentChildren = state.roots;
                }

                const targetIndex = parentChildren.indexOf(entityId);
                if (targetIndex === -1) return;

                // If we are moving down, and we drop "before" (top half), the index is targetIndex.
                // If we drop "after" (bottom half), index is targetIndex + 1.
                // However, if we remove the item first, the indices shift.
                // Our reducer removes first.

                // Let's assume we want to insert at `targetIndex` (before) or `targetIndex + 1` (after).
                let newIndex = isTopHalf ? targetIndex : targetIndex + 1;

                // Adjustment: if dragged item is currently BEFORE target item in the SAME list,
                // and we move it AFTER, the removal will shift target back by 1.
                // But our reducer handles "remove then insert".
                // If I have [A, B, C]. I drag A to C (bottom). Target is C (index 2).
                // Remove A -> [B, C]. C is now index 1.
                // Insert at targetIndex + 1 = 3? No, original targetIndex was 2.
                // If we use the *original* indices:
                // A (0) -> C (2) bottom. New index should be 2 (after C).
                // Remove A. Insert at 2. [B, C, A]. Correct.

                // If I drag C (2) to A (0) top. Target A (0). New index 0.
                // Remove C. [A, B]. Insert at 0. [C, A, B]. Correct.

                // If I drag A (0) to B (1) top. Target B (1). New index 1.
                // Remove A. [B, C]. Insert at 1. [B, A, C]. Correct.

                // Wait, if I drag A (0) to B (1) bottom. Target B (1). New index 2.
                // Remove A. [B, C]. Insert at 2. [B, C, A]. Correct.

                // It seems `isTopHalf ? targetIndex : targetIndex + 1` works if we consider the index *before* removal?
                // The reducer removes first.
                // If we remove A (0), B becomes 0.
                // If we wanted to insert *before* B (original 1), we want index 0 (current B position).
                // If we wanted to insert *after* B (original 1), we want index 1 (after B).

                // So:
                // If dragged < target:
                //   Drop Top (Before): Insert at `targetIndex - 1`? No.
                //   Let's trace: [A, B, C]. Drag A(0) to B(1).
                //   Drop Top (Before B): We want [A, B, C]. Index should be 0.
                //   targetIndex = 1. isTopHalf = true. newIndex = 1.
                //   Remove A -> [B, C]. Insert at 1 -> [B, A, C]. WRONG. We wanted [A, B, C].

                //   Drop Bottom (After B): We want [B, A, C]. Index should be 1.
                //   targetIndex = 1. isTopHalf = false. newIndex = 2.
                //   Remove A -> [B, C]. Insert at 2 -> [B, C, A]. WRONG. We wanted [B, A, C].

                // Correction: When moving down (dragged < target), the target index shifts down by 1 after removal.
                // So we need to decrement insertion index by 1?

                const draggedIndex = parentChildren.indexOf(draggedId);
                if (draggedIndex !== -1 && draggedIndex < targetIndex) {
                    newIndex -= 1;
                }

                moveEntity(draggedId, entity.parentId, newIndex);
                // toast.success(`Reordered ${draggedEntity.label}`);
            } else {
                // Default fallback (e.g. dropping a Device onto a Department? Not allowed parent, not same parent)
                // Or dropping Device onto Workstation (allowed parent).
                if (canBeParent) {
                    moveEntity(draggedId, entityId);
                    toast.success(`Moved item to ${entity.label}`);
                }
            }

            // If dropping onto a Workstation with queues enabled... (existing logic)
            if (entity.type === 'Workstation' && entity.workstationAttributes?.queues?.length) {
                // ... (keep existing logic if needed, but the above covers the move)
                // The existing logic handled updating the queue attribute.
                // We should preserve that.
                if (draggedEntity?.type === 'Device') {
                    const defaultQueue = entity.workstationAttributes.queues[0];
                    const currentAttrs = draggedEntity.deviceAttributes || {};
                    updateEntity(draggedId, {
                        deviceAttributes: { ...currentAttrs, queue: defaultQueue }
                    });
                }
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
                            onQuickMove={(ids) => (onQuickMove as any)(ids)}
                            onDelete={(ids) => (onDelete as any)(ids)}
                        />
                    ))}
                </div>
            );
        }

        // Grouping Logic (PO/SKU)
        if (grouping !== 'none' && deviceChildren.length > 0) {
            const groups: Record<string, string[]> = {};

            deviceChildren.forEach(id => {
                const device = state.entities[id];
                let key = 'Unknown';
                if (grouping === 'po') {
                    key = device.deviceAttributes?.po_number || 'No PO';
                } else if (grouping === 'sku') {
                    key = device.deviceAttributes?.sku || 'No SKU';
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
                        />
                    ))}

                    {/* Render Virtual Groups */}
                    {Object.entries(groups).map(([key, ids]) => (
                        <VirtualGroupNode
                            key={key}
                            groupKey={key}
                            deviceIds={ids}
                            level={level + 1}
                            onSelect={(ids, e) => {
                                if (ids instanceof Set) {
                                    onSelect(ids, e);
                                }
                            }}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            toggleExpansion={toggleExpansion}
                            onQuickMove={(ids) => {
                                (onQuickMove as any)(ids);
                            }}
                            onDelete={(ids) => {
                                (onDelete as any)(ids);
                            }}
                        />
                    ))}
                </div>
            );
        }

        // Default rendering
        return (
            <div>
                {entity.children.map(childId => (
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
                            selectedIds.has(entityId) && "bg-accent text-accent-foreground"
                        )}
                        style={{ paddingLeft: `${level * 12 + 4}px` }}
                        onClick={(e) => onSelect(entityId, e)}
                        draggable
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
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
                        <span className="text-sm truncate flex-1">{entity.label}</span>

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
                                    <Badge className="h-4 px-1 text-[10px] bg-green-500 hover:bg-green-600">Sellable</Badge>
                                )}
                            </div>
                        )}

                        {searchTerm && !isMatch && hasMatch && (
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
                                    <DropdownMenuItem onClick={() => onDelete(entityId)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
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

import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { HistoryDialog } from '@/components/HistoryDialog';
import { CheckpointsDialog } from '@/components/CheckpointsDialog';
import { History, GitBranch } from 'lucide-react';

interface HierarchyViewProps {
    onSelect: (ids: Set<string>) => void;
    selectedIds: Set<string>;
    grouping: 'none' | 'po' | 'sku';
    setGrouping: (grouping: 'none' | 'po' | 'sku') => void;
}

export function HierarchyView({ onSelect, selectedIds, grouping, setGrouping }: HierarchyViewProps) {
    const { state, addEntity, moveEntity, moveEntities, deleteEntity, deleteEntities, undo, canUndo } = useWarehouse();
    const [searchTerm, setSearchTerm] = useState('');
    // grouping state moved to props
    const [importTargetId, setImportTargetId] = useState<string | null>(null);
    const [deleteTargetIds, setDeleteTargetIds] = useState<Set<string> | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [quickMoveIds, setQuickMoveIds] = useState<Set<string> | null>(null);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

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

                // If grouping is active and we have devices, we need to replicate the rendering logic
                const deviceChildren = entity.children.filter(childId => state.entities[childId]?.type === 'Device');
                const nonDeviceChildren = entity.children.filter(childId => state.entities[childId]?.type !== 'Device');

                // 1. Render non-device children first (matching renderChildren logic)
                traverse(nonDeviceChildren);

                // 2. Render groups or devices
                if (grouping !== 'none' && deviceChildren.length > 0) {
                    // Grouping logic
                    const groups: Record<string, string[]> = {};
                    deviceChildren.forEach(childId => {
                        const device = state.entities[childId];
                        let key = 'Unknown';
                        if (grouping === 'po') {
                            key = device.deviceAttributes?.po_number || 'No PO';
                        } else if (grouping === 'sku') {
                            key = device.deviceAttributes?.sku || 'No SKU';
                        }
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(childId);
                    });

                    // Traverse groups
                    Object.entries(groups).forEach(([key, groupIds]) => {
                        const virtualId = getVirtualGroupId(key, groupIds[0]);
                        visible.push(virtualId);

                        if (expandedIds.has(virtualId)) {
                            // If group is expanded, add its children
                            groupIds.forEach(childId => visible.push(childId));
                        }
                    });
                } else {
                    // Normal rendering for devices
                    traverse(deviceChildren);
                }
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
            console.log('visibleItems', visibleItems);
            const lastIndex = visibleItems.indexOf(lastSelectedId);
            const currentIndex = visibleItems.indexOf(primaryId);
            console.log('indices', { lastIndex, currentIndex });

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
            moveEntities(Array.from(quickMoveIds), targetId);

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
            className="h-full flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                moveEntity(draggedId, null);
                toast.success('Moved item to Root');
            }}
        >
            <div className="p-2 border-b space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-sm">Explorer</h2>
                    <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsHistoryOpen(true)} title="Action History">
                            <History className="h-4 w-4" />
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
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-8 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <RadioGroup
                        defaultValue="none"
                        className="flex gap-2"
                        onValueChange={(v) => setGrouping(v as any)}
                    >
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="none" id="none" />
                            <Label htmlFor="none" className="text-xs">Tree</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="po" id="po" />
                            <Label htmlFor="po" className="text-xs">PO</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="sku" id="sku" />
                            <Label htmlFor="sku" className="text-xs">SKU</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-2 pb-20">
                {state.roots.map(rootId => (
                    <HierarchyNode
                        key={rootId}
                        entityId={rootId}
                        level={0}
                        onSelect={handleNodeClick}
                        selectedIds={selectedIds}
                        searchTerm={searchTerm}
                        onImport={setImportTargetId}
                        onDelete={handleDelete}
                        expandedIds={expandedIds}
                        toggleExpansion={toggleExpansion}
                        onQuickMove={handleQuickMove}
                        grouping={grouping}
                    />
                ))}
                {state.roots.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No items. Click + to add.
                    </div>
                )}
            </div>

            {importTargetId && (
                <XlsxImportDialog
                    isOpen={!!importTargetId}
                    onClose={() => setImportTargetId(null)}
                    targetId={importTargetId}
                />
            )}

            {deleteTargetIds && (
                <DeleteConfirmationDialog
                    isOpen={!!deleteTargetIds}
                    onClose={() => setDeleteTargetIds(null)}
                    onConfirm={confirmDelete}
                    entityName={deleteTargetIds.size > 1 ? `${deleteTargetIds.size} items` : (state.entities[Array.from(deleteTargetIds)[0]]?.label || 'Item')}
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
