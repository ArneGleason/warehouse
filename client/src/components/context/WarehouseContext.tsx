"use client";

import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { socket } from '@/lib/socket';
import { logAction } from '@/lib/history';
import { WarehouseEntity, WarehouseState, createEntity, canMoveEntity, generateDeviceLabel } from '@/lib/warehouse';
import { v4 as uuidv4 } from 'uuid';

// Action Types
type Action =
    | { type: 'SET_STATE'; payload: WarehouseState }
    | { type: 'ADD_ENTITY'; payload: { entity: WarehouseEntity; parentId: string | null } }
    | { type: 'UPDATE_ENTITY'; payload: { id: string; updates: Partial<WarehouseEntity> } }
    | { type: 'DELETE_ENTITY'; payload: { id: string } }
    | { type: 'DELETE_ENTITIES'; payload: { ids: string[] } }
    | { type: 'MOVE_ENTITY'; payload: { id: string; targetId: string | null; index?: number } }
    | { type: 'BATCH_MOVE'; payload: { moves: { id: string; targetId: string | null }[] } }
    | { type: 'ADD_BULK_ENTITIES'; payload: { entities: { entity: WarehouseEntity; parentId: string }[] } };

// Initial State
const initialState: WarehouseState = {
    entities: {},
    roots: [],
    configTitle: 'Untitled Layout',
};

// Reducer
function warehouseReducer(state: WarehouseState, action: Action): WarehouseState {
    switch (action.type) {
        case 'SET_STATE': {
            const incoming = action.payload;
            const sanitizedEntities = { ...incoming.entities };

            // Sanitize roots
            const uniqueRoots = Array.from(new Set(incoming.roots));

            // Sanitize children of all entities
            Object.keys(sanitizedEntities).forEach(key => {
                const entity = sanitizedEntities[key];
                if (entity.children && entity.children.length > 0) {
                    const unique = Array.from(new Set(entity.children));
                    if (unique.length !== entity.children.length) {
                        sanitizedEntities[key] = { ...entity, children: unique };
                    }
                }
            });

            return {
                ...incoming,
                entities: sanitizedEntities,
                roots: uniqueRoots
            };
        }

        case 'ADD_ENTITY': {
            const { entity, parentId } = action.payload;
            const newState = { ...state, entities: { ...state.entities, [entity.id]: entity } };

            if (parentId) {
                const parent = newState.entities[parentId];
                if (parent) {
                    // Ensure uniqueness
                    const uniqueChildren = Array.from(new Set([...parent.children, entity.id]));
                    newState.entities[parentId] = {
                        ...parent,
                        children: uniqueChildren,
                    };
                }
            } else {
                newState.roots = Array.from(new Set([...newState.roots, entity.id]));
            }
            return newState;
        }

        case 'UPDATE_ENTITY': {
            const { id, updates } = action.payload;
            const entity = state.entities[id];
            if (!entity) return state;

            return {
                ...state,
                entities: {
                    ...state.entities,
                    [id]: { ...entity, ...updates },
                },
            };
        }

        case 'DELETE_ENTITY': {
            const { id } = action.payload;
            // Re-use logic for single or multiple
            return state;
        }

        case 'DELETE_ENTITIES': {
            const { ids } = action.payload;
            let newEntities = { ...state.entities };
            let newRoots = [...state.roots];

            // Recursive delete helper
            const deleteRecursive = (currentId: string, entities: Record<string, WarehouseEntity>) => {
                const current = entities[currentId];
                if (!current) return;

                // Delete children first
                current.children.forEach(childId => {
                    deleteRecursive(childId, entities);
                });

                delete entities[currentId];
            };

            ids.forEach(id => {
                const entityToDelete = state.entities[id];
                if (!entityToDelete) return;

                // 1. Remove from parent's children list (in the *current* working copy of entities)
                if (entityToDelete.parentId && newEntities[entityToDelete.parentId]) {
                    const parent = newEntities[entityToDelete.parentId];
                    newEntities[entityToDelete.parentId] = {
                        ...parent,
                        children: parent.children.filter(childId => childId !== id),
                    };
                } else {
                    // Remove from roots
                    newRoots = newRoots.filter(rootId => rootId !== id);
                }

                // 2. Recursive delete
                // We need to pass the *current* newEntities to deleteRecursive so it deletes from the working copy
                deleteRecursive(id, newEntities);
            });

            return {
                ...state,
                entities: newEntities,
                roots: newRoots,
            };
        }

        case 'MOVE_ENTITY': {
            const { id, targetId, index } = action.payload;
            // Delegate to BATCH_MOVE logic for consistency? 
            // Or just keep it simple. Let's duplicate logic for now to avoid refactoring risk, or better, make helper.
            // Actually, let's just use BATCH_MOVE logic inside here or vice versa.
            // Let's implement BATCH_MOVE fully and have MOVE_ENTITY use it? No, reducer must be pure.
            // I'll just implement BATCH_MOVE separately.

            const entity = state.entities[id];
            if (!entity) return state;

            // Validate move
            const targetParent = targetId ? state.entities[targetId] : null;
            if (!canMoveEntity(entity, targetParent, state.entities)) {
                console.warn("Invalid move");
                return state;
            }

            let newState = { ...state };

            // Remove from old parent
            if (entity.parentId) {
                const oldParent = newState.entities[entity.parentId];
                if (oldParent) {
                    newState.entities[entity.parentId] = {
                        ...oldParent,
                        children: oldParent.children.filter(child => child !== id),
                    };
                }
            } else {
                newState.roots = newState.roots.filter(root => root !== id);
            }

            // Add to new parent
            if (targetId) {
                const newParent = newState.entities[targetId];
                if (newParent) {
                    let newChildren = [...newParent.children];
                    // If we are moving within the same parent, we need to be careful about the index
                    // But we already removed it from old parent (which might be the same as new parent)
                    // So newChildren currently does NOT contain the id.

                    if (typeof index === 'number' && index >= 0 && index <= newChildren.length) {
                        newChildren.splice(index, 0, id);
                    } else {
                        newChildren.push(id);
                    }

                    // Ensure uniqueness just in case, though splice shouldn't duplicate if we removed correctly
                    const uniqueChildren = Array.from(new Set(newChildren));

                    newState.entities[targetId] = {
                        ...newParent,
                        children: uniqueChildren,
                    };
                }
                newState.entities[id] = { ...entity, parentId: targetId };
            } else {
                let newRoots = [...newState.roots];
                if (typeof index === 'number' && index >= 0 && index <= newRoots.length) {
                    newRoots.splice(index, 0, id);
                } else {
                    newRoots.push(id);
                }
                newState.roots = Array.from(new Set(newRoots));
                newState.entities[id] = { ...entity, parentId: null };
            }

            return newState;
        }

        case 'BATCH_MOVE': {
            const { moves } = action.payload;
            let newState = { ...state };
            let entities = { ...newState.entities };
            let roots = [...newState.roots];

            moves.forEach(({ id, targetId }) => {
                const entity = entities[id];
                if (!entity) return;

                // Validate move (skip invalid ones in batch?)
                const targetParent = targetId ? entities[targetId] : null;
                if (!canMoveEntity(entity, targetParent, entities)) {
                    console.warn(`Invalid move for ${id} to ${targetId}`);
                    return;
                }

                // Remove from old parent
                if (entity.parentId) {
                    const oldParent = entities[entity.parentId];
                    if (oldParent) {
                        entities[entity.parentId] = {
                            ...oldParent,
                            children: oldParent.children.filter(child => child !== id),
                        };
                    }
                } else {
                    roots = roots.filter(root => root !== id);
                }

                // Add to new parent
                if (targetId) {
                    const newParent = entities[targetId];
                    if (newParent) {
                        const uniqueChildren = Array.from(new Set([...newParent.children, id]));
                        entities[targetId] = {
                            ...newParent,
                            children: uniqueChildren,
                        };
                    }
                    entities[id] = { ...entity, parentId: targetId };
                } else {
                    roots = Array.from(new Set([...roots, id]));
                    entities[id] = { ...entity, parentId: null };
                }
            });

            return {
                ...newState,
                entities,
                roots
            };
        }

        case 'ADD_BULK_ENTITIES': {
            const { entities } = action.payload;
            let newState = { ...state };

            entities.forEach(({ entity, parentId }) => {
                newState.entities[entity.id] = entity;
                if (parentId) {
                    const parent = newState.entities[parentId];
                    if (parent) {
                        // Ensure uniqueness
                        const uniqueChildren = Array.from(new Set([...parent.children, entity.id]));
                        newState.entities[parentId] = {
                            ...parent,
                            children: uniqueChildren,
                        };
                    }
                } else {
                    newState.roots = Array.from(new Set([...newState.roots, entity.id]));
                }
            });

            return newState;
        }

        default:
            return state;
    }
}

// Context
interface WarehouseContextType {
    state: WarehouseState;
    addEntity: (type: any, parentId?: string | null) => void;
    updateEntity: (id: string, updates: Partial<WarehouseEntity>) => void;
    deleteEntity: (id: string) => void;
    deleteEntities: (ids: string[]) => void;
    moveEntity: (id: string, targetId: string | null, index?: number) => void;
    moveEntities: (ids: string[], targetId: string | null) => void;
    addBulkEntities: (entities: { entity: WarehouseEntity; parentId: string }[]) => void;
    createCheckpoint: (name: string) => Promise<void>;
    restoreCheckpoint: (checkpointId: string) => Promise<void>;
    loadCheckpoints: () => Promise<any[]>;
    undo: () => void;
    canUndo: boolean;
    isConnected: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

interface UndoAction {
    type: 'BATCH_MOVE';
    moves: { id: string; targetId: string | null }[];
}

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(warehouseReducer, initialState);
    const [isConnected, setIsConnected] = useState(false);
    const [layoutId, setLayoutId] = useState('default-layout'); // Hardcoded for now
    const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

    // Socket Connection
    useEffect(() => {
        socket.connect();

        function onConnect() {
            setIsConnected(true);
            socket.emit('join', layoutId);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onUpdate(data: WarehouseState) {
            dispatch({ type: 'SET_STATE', payload: data });
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('update', onUpdate);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('update', onUpdate);
            socket.disconnect();
        };
    }, [layoutId]);

    // Initial Load
    useEffect(() => {
        fetch(`http://localhost:3001/api/layouts/${layoutId}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    dispatch({ type: 'SET_STATE', payload: data.data });
                }
            })
            .catch(err => console.error("Failed to load layout", err));
    }, [layoutId]);

    const saveState = (newState: WarehouseState) => {
        fetch(`http://localhost:3001/api/layouts/${layoutId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: newState }),
        }).catch(err => console.error("Failed to save", err));
    };

    // Wrapper functions that dispatch AND save
    const addEntity = (type: any, parentId: string | null = null) => {
        const entity = createEntity(type, parentId);

        // Auto-generate barcode for Bins and Boxes
        if (type === 'Bin' || type === 'Box') {
            const existingEntities = Object.values(state.entities).filter(e => e.type === type);
            const nextNum = existingEntities.length + 1;
            const prefix = type === 'Bin' ? 'BX' : 'BOX'; // Or maybe just BX for both? User example was BX_001 for Bin. Let's use BOX for Box to distinguish? Or maybe BX for Bin and something else for Box?
            // User request: "automaticaly create short unique barcode for any new box (e.g. BX_001)" - this was for "box label" but context was "Bin".
            // Now user says "same thing to happen for Boxes".
            // If Bin is BX, maybe Box is PKG? or BOX?
            // Let's use 'BOX' for Box type to avoid collision if they share namespace, or just distinct prefixes.
            const barcode = `${prefix}_${nextNum.toString().padStart(3, '0')}`;
            entity.barcode = barcode;
            entity.label = barcode;
        }

        const action: Action = { type: 'ADD_ENTITY', payload: { entity, parentId } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created ${type}: ${entity.label}`, entity.id);
    };

    const updateEntity = (id: string, updates: Partial<WarehouseEntity>) => {
        let finalUpdates = { ...updates };

        // If updating device attributes, regenerate label
        if (state.entities[id]?.type === 'Device' && updates.deviceAttributes) {
            const currentAttrs = state.entities[id].deviceAttributes || {};
            const newAttrs = { ...currentAttrs, ...updates.deviceAttributes };
            finalUpdates.label = generateDeviceLabel(newAttrs);
        }

        const action: Action = { type: 'UPDATE_ENTITY', payload: { id, updates: finalUpdates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Updated properties for ${state.entities[id]?.label || id}`, id);
    };

    const deleteEntity = (id: string) => {
        const label = state.entities[id]?.label || id;
        const action: Action = { type: 'DELETE_ENTITY', payload: { id } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('DELETE', `Deleted entity: ${label}`, id);
    };

    const deleteEntities = (ids: string[]) => {
        const action: Action = { type: 'DELETE_ENTITIES', payload: { ids } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('DELETE', `Deleted ${ids.length} entities`, ids[0]);
    };

    const moveEntity = (id: string, targetId: string | null, index?: number) => {
        // Capture state for undo
        const entity = state.entities[id];
        if (entity) {
            const undoMove: UndoAction = {
                type: 'BATCH_MOVE',
                moves: [{ id, targetId: entity.parentId }]
            };
            setUndoStack([undoMove]); // 1-step undo
        }

        const label = state.entities[id]?.label || id;
        const targetLabel = targetId ? (state.entities[targetId]?.label || targetId) : 'Root';
        const action: Action = { type: 'MOVE_ENTITY', payload: { id, targetId, index } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('MOVE', `Moved ${label} to ${targetLabel}`, id);
    };

    const moveEntities = (ids: string[], targetId: string | null) => {
        // Handle Virtual Queue Target
        let actualTargetId = targetId;
        let targetQueue: string | null = null;

        if (targetId && targetId.startsWith('queue-')) {
            // Format: queue-{parentId}-{queueName}
            const queues = ['Assigned', 'Active', 'Done', 'Blocked'];
            const queueName = queues.find(q => targetId.endsWith(`-${q}`));
            if (queueName) {
                targetQueue = queueName;
                actualTargetId = targetId.replace('queue-', '').replace(`-${queueName}`, '');
            }
        }

        // Capture state for undo
        const moves: { id: string; targetId: string | null }[] = [];
        const undoMoves: { id: string; targetId: string | null }[] = [];
        // We also need to capture previous attributes for undo if we are changing them
        // But our simple undo system only handles moves right now.
        // TODO: Enhance undo to handle attribute changes.
        // For now, undo will just move them back, but won't restore the old queue status if it was different.
        // That's acceptable for "Quick Move" which implies a state change.

        ids.forEach(id => {
            const entity = state.entities[id];
            if (entity) {
                moves.push({ id, targetId: actualTargetId });
                undoMoves.push({ id, targetId: entity.parentId });
            }
        });

        if (moves.length === 0) return;

        const undoAction: UndoAction = {
            type: 'BATCH_MOVE',
            moves: undoMoves
        };
        setUndoStack([undoAction]); // 1-step undo

        // 1. Perform the Move
        const action: Action = { type: 'BATCH_MOVE', payload: { moves } };
        let newState = warehouseReducer(state, action);

        // 2. If target was a queue, update attributes
        if (targetQueue) {
            const updates: Record<string, WarehouseEntity> = {};
            ids.forEach(id => {
                const entity = newState.entities[id];
                if (entity && entity.type === 'Device') {
                    const currentAttrs = entity.deviceAttributes || {};
                    updates[id] = {
                        ...entity,
                        deviceAttributes: { ...currentAttrs, queue: targetQueue }
                    };
                }
            });

            // Apply updates to state
            newState = {
                ...newState,
                entities: {
                    ...newState.entities,
                    ...updates
                }
            };

            // We need to dispatch these updates too so the reducer stays in sync if we used dispatch for BATCH_MOVE
            // But we can't easily dispatch "BATCH_UPDATE".
            // We can dispatch multiple UPDATE_ENTITY or add BATCH_UPDATE.
            // Or we can just rely on SET_STATE if we had it, but we don't want to reload everything.
            // Let's add BATCH_UPDATE to reducer? Or just iterate.
            // Iterating might be slow for many items but safe.
            // Actually, we can just save the final state and dispatch SET_STATE? No, that might flicker.
            // Let's just loop dispatch UPDATE_ENTITY for now, or better:
            // We already calculated `newState` with the updates.
            // We can just force the state update if we had a way.
            // But `dispatch` needs an action.
            // Let's just dispatch the moves first (already done above via action const), 
            // then dispatch updates.

            // Wait, I haven't dispatched BATCH_MOVE yet in this new code block.
            dispatch(action);

            // Now dispatch updates
            ids.forEach(id => {
                // We need to check if it's a device
                const entity = state.entities[id]; // Use original state to check type safely
                if (entity && entity.type === 'Device') {
                    dispatch({
                        type: 'UPDATE_ENTITY',
                        payload: {
                            id,
                            updates: { deviceAttributes: { ...entity.deviceAttributes, queue: targetQueue } as any }
                        }
                    });
                }
            });
        } else {
            dispatch(action);
        }

        // Save the final computed state (which includes moves and updates)
        saveState(newState);

        const targetLabel = actualTargetId ? (state.entities[actualTargetId]?.label || actualTargetId) : 'Root';
        const logMsg = targetQueue
            ? `Moved ${ids.length} items to ${targetLabel} (${targetQueue})`
            : `Moved ${ids.length} items to ${targetLabel}`;

        logAction('MOVE', logMsg, ids[0]);
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const lastAction = undoStack[0];

        if (lastAction.type === 'BATCH_MOVE') {
            const action: Action = { type: 'BATCH_MOVE', payload: { moves: lastAction.moves } };
            const newState = warehouseReducer(state, action);
            dispatch(action);
            saveState(newState);
            logAction('UNDO', `Undid last move`, lastAction.moves[0].id);
        }

        setUndoStack([]);
    };

    const addBulkEntities = (entities: { entity: WarehouseEntity; parentId: string }[]) => {
        const action: Action = { type: 'ADD_BULK_ENTITIES', payload: { entities } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        const parentIdForLog = entities.length > 0 ? entities[0].parentId : null;
        const parentLabelForLog = parentIdForLog ? (state.entities[parentIdForLog]?.label || 'container') : 'Root';
        logAction('BULK_IMPORT', `Imported ${entities.length} items into ${parentLabelForLog}`, parentIdForLog || 'N/A');
    };

    const createCheckpoint = async (name: string) => {
        const res = await fetch(`http://localhost:3001/api/layouts/${layoutId}/checkpoints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, data: state }),
        });
        if (!res.ok) throw new Error('Failed to create checkpoint');
    };

    const restoreCheckpoint = async (checkpointId: string) => {
        const res = await fetch(`http://localhost:3001/api/layouts/${layoutId}/restore/${checkpointId}`, {
            method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to restore checkpoint');
        const { data } = await res.json();
        dispatch({ type: 'SET_STATE', payload: data });
        logAction('RESTORE', `Restored checkpoint`, checkpointId);
    };

    const loadCheckpoints = async () => {
        const res = await fetch(`http://localhost:3001/api/layouts/${layoutId}/checkpoints`);
        if (!res.ok) throw new Error('Failed to load checkpoints');
        const { checkpoints } = await res.json();
        return checkpoints;
    };

    return (
        <WarehouseContext.Provider value={{ state, addEntity, updateEntity, deleteEntity, deleteEntities, moveEntity, moveEntities, addBulkEntities, createCheckpoint, restoreCheckpoint, loadCheckpoints, undo, canUndo: undoStack.length > 0, isConnected }}>
            {children}
        </WarehouseContext.Provider>
    );
}

export function useWarehouse() {
    const context = useContext(WarehouseContext);
    if (!context) {
        throw new Error('useWarehouse must be used within a WarehouseProvider');
    }
    return context;
}
