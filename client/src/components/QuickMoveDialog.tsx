import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG, WarehouseEntity } from '@/lib/warehouse';
import { Search, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface QuickMoveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: Set<string>;
    onMove: (targetId: string | null) => void;
}

export function QuickMoveDialog({ isOpen, onClose, selectedIds, onMove }: QuickMoveDialogProps) {
    const { state } = useWarehouse();
    // Actually canMoveEntity is a helper in lib/warehouse.ts, but we need the context state to use it fully if we want to check descendants.
    // But for this dialog, we can implement local validation logic.

    const [searchTerm, setSearchTerm] = useState('');
    const [targetId, setTargetId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(state.roots));

    // Calculate allowed parent types for the selection
    const allowedTypes = useMemo(() => {
        if (selectedIds.size === 0) return [];
        const selectedEntities = Array.from(selectedIds).map(id => state.entities[id]).filter(Boolean);
        if (selectedEntities.length === 0) return [];

        // Get allowed parents for the first item
        let commonAllowed = new Set(ENTITY_CONFIG[selectedEntities[0].type].allowedParents);

        // Intersect with others
        for (let i = 1; i < selectedEntities.length; i++) {
            const allowed = new Set(ENTITY_CONFIG[selectedEntities[i].type].allowedParents);
            commonAllowed = new Set([...commonAllowed].filter(x => allowed.has(x)));
        }

        return Array.from(commonAllowed);
    }, [selectedIds, state.entities]);

    const isValidTarget = (entity: WarehouseEntity | null) => {
        // Root move (targetId = null)
        if (entity === null) {
            return allowedTypes.includes(null);
        }

        // Type check
        if (!allowedTypes.includes(entity.type)) return false;

        // Cycle check: Cannot move into itself or descendant
        // We need to check if 'entity' is a descendant of ANY selected node.
        // Or if 'entity' IS one of the selected nodes.
        if (selectedIds.has(entity.id)) return false;

        // Check if entity is a descendant of any selected node
        // This is expensive to check up the tree for every node, better to check down?
        // Actually, if we are rendering the tree, we can just disable the selected nodes and their children in the UI?
        // But for validation here:
        // If 'entity' is a descendant of 'selected', then 'selected' is an ancestor of 'entity'.
        let current = entity;
        while (current.parentId) {
            if (selectedIds.has(current.parentId)) return false;
            current = state.entities[current.parentId];
            if (!current) break;
        }

        return true;
    };

    const handleMove = () => {
        onMove(targetId);
        onClose();
    };

    const toggleExpansion = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);

            // Auto-expand single children recursively
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

    // Recursive Tree Node
    const TreeNode = ({ entityId, level }: { entityId: string, level: number }) => {
        const entity = state.entities[entityId];
        if (!entity) return null;

        // Filter by search
        // If search is active, show if matches OR has matching descendant
        // AND if it's a container (or valid target). 
        // Actually, we want to show the path to valid targets.

        const isMatch = searchTerm === '' || entity.label.toLowerCase().includes(searchTerm.toLowerCase());
        // We need to know if children match to decide whether to render this node if it doesn't match itself.
        // For simplicity in this "Quick" dialog, let's just filter visibility based on search.
        // If search is present, expand all matches?

        // Let's stick to simple tree with search filtering.
        // If search is active, we might want to flatten the list or auto-expand.
        // Auto-expanding is better.

        const hasChildren = entity.children.length > 0;
        const isExpanded = expandedIds.has(entityId) || searchTerm !== '';

        const valid = isValidTarget(entity);
        const isSelected = targetId === entityId;

        const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;

        // If searching, only show if match or has matching children?
        // Implementing full search filtering in a recursive tree is slightly complex.
        // Let's just highlight matches and show everything for now, or simple filter.
        // User asked: "text search at the top so that a Bin or other element can be found by name -- for non-bin elements found, let's make sure to should the elements in a path to it's descendet bins."

        // That sounds like: If I search "Bin A", show "Rack 1 -> Shelf 2 -> Bin A".
        // So we show the node if it matches OR if it has a matching descendant.

        const matchesSearchRecursive = (id: string): boolean => {
            const e = state.entities[id];
            if (!e) return false;
            if (e.label.toLowerCase().includes(searchTerm.toLowerCase())) return true;
            return e.children.some(matchesSearchRecursive);
        };

        if (searchTerm && !matchesSearchRecursive(entityId)) return null;

        return (
            <div>
                <div
                    className={cn(
                        "flex items-center py-1 px-2 cursor-pointer rounded-sm hover:bg-accent/50",
                        isSelected && "bg-accent text-accent-foreground",
                        !valid && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ paddingLeft: `${level * 12 + 4}px` }}
                    onClick={() => valid && setTargetId(entityId)}
                >
                    <div
                        className="mr-1 p-0.5 hover:bg-muted rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpansion(entityId);
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        ) : <div className="w-4 h-4" />}
                    </div>
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{entity.label}</span>
                    {isSelected && <Check className="h-4 w-4 ml-auto" />}
                </div>
                {isExpanded && hasChildren && (
                    <div>
                        {entity.children.map(childId => (
                            <TreeNode key={childId} entityId={childId} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Move {selectedIds.size} Item{selectedIds.size !== 1 && 's'}</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search destination..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-auto border rounded-md p-2 mt-2">
                    {/* Root Option */}
                    {allowedTypes.includes(null) && (
                        <div
                            className={cn(
                                "flex items-center py-2 px-2 cursor-pointer rounded-sm hover:bg-accent/50 mb-2 border-b",
                                targetId === null && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => setTargetId(null)}
                        >
                            <Icons.Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Warehouse Root</span>
                            {targetId === null && <Check className="h-4 w-4 ml-auto" />}
                        </div>
                    )}

                    {state.roots.map(rootId => (
                        <TreeNode key={rootId} entityId={rootId} level={0} />
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleMove} disabled={targetId === undefined}>Move</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
