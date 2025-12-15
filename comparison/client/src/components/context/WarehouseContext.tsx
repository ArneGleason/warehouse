"use client";
import { toast } from 'sonner';

import React, { createContext, useContext, useEffect, useReducer, useState, useRef } from 'react';
import { socket } from '@/lib/socket';
import { logAction } from '@/lib/history';
import { WarehouseEntity, WarehouseState, createEntity, canMoveEntity, generateDeviceLabel, Order, Vendor, PurchaseOrder, PurchaseOrderLine, generateBaseSkuId } from '@/lib/warehouse';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3011';

// Action Types
type Action =
    | { type: 'SET_STATE'; payload: WarehouseState }
    | { type: 'ADD_ENTITY'; payload: { entity: WarehouseEntity; parentId: string | null } }
    | { type: 'UPDATE_ENTITY'; payload: { id: string; updates: Partial<WarehouseEntity> } }
    | { type: 'DELETE_ENTITY'; payload: { id: string } }
    | { type: 'DELETE_ENTITIES'; payload: { ids: string[] } }
    | { type: 'MOVE_ENTITY'; payload: { id: string; targetId: string | null; index?: number } }
    | { type: 'BATCH_MOVE'; payload: { moves: { id: string; targetId: string | null }[] } }
    | { type: 'ADD_BULK_ENTITIES'; payload: { entities: { entity: WarehouseEntity; parentId: string }[] } }
    | { type: 'ADD_BULK_ENTITIES'; payload: { entities: { entity: WarehouseEntity; parentId: string }[] } }
    | { type: 'UPDATE_CONFIG'; payload: { maxMoveWithoutConfirm?: number; processingSourceBinId?: string | null; processingDestBinId?: string | null; processingExceptionBinId?: string | null } }
    | { type: 'BOX_ENTITIES'; payload: { boxId: string; boxLabel: string; boxBarcode: string; parentId: string | null; deviceIds: string[] } }
    | { type: 'UNBOX_ENTITIES'; payload: { boxId: string; parentId: string | null; deleteBox: boolean } }
    | { type: 'BATCH_UPDATE_ENTITIES'; payload: { updates: { id: string; updates: Partial<WarehouseEntity> }[] } }
    | { type: 'ADD_ITEM'; payload: { item: any } }
    | { type: 'ADD_ITEMS'; payload: { items: any[] } }
    | { type: 'UPDATE_ITEM'; payload: { sku: string; updates: any } }
    | { type: 'ADD_VENDOR_SKU'; payload: { vendorSku: any } }
    | { type: 'ADD_VENDOR_SKU'; payload: { vendorSku: any } }
    | { type: 'UPDATE_VENDOR_SKU'; payload: { id: string; updates: any } }
    | { type: 'ADD_ORDER'; payload: { order: Order } }
    | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
    | { type: 'ALLOCATE_DEVICES'; payload: { orderId: string; orderNumber: string; buyerName: string; deviceIds: string[] } }
    | { type: 'ALLOCATE_DEVICES'; payload: { orderId: string; orderNumber: string; buyerName: string; deviceIds: string[] } }
    | { type: 'UNALLOCATE_DEVICES'; payload: { deviceIds: string[] } }
    | { type: 'UNALLOCATE_DEVICES'; payload: { deviceIds: string[] } }
    | { type: 'DELETE_ORDER'; payload: { id: string } }
    | { type: 'ADD_VENDOR'; payload: { vendor: Vendor } }
    | { type: 'UPDATE_VENDOR'; payload: { id: string; updates: Partial<Vendor> } }
    | { type: 'DELETE_VENDOR'; payload: { id: string } }
    | { type: 'ADD_PO'; payload: { po: PurchaseOrder } }
    | { type: 'UPDATE_PO'; payload: { id: string; updates: Partial<PurchaseOrder> } }
    | { type: 'DELETE_PO'; payload: { id: string } };

// Initial State
const initialState: WarehouseState = {
    entities: {},
    roots: [],
    configTitle: 'Untitled Layout',
    maxMoveWithoutConfirm: 1,
    processingSourceBinId: null,
    processingDestBinId: null,
    processingExceptionBinId: null,
    receivingBinId: null,
    items: {
        'IPHONE-13-128-MID': {
            sku: 'IPHONE-13-128-MID', category: 'Phone', manufacturer: 'Apple', model: 'iPhone 13', modelNumber: 'A2633',
            grade: 'A', capacity_gb: '128', color: 'Midnight', carrier: 'Unlocked', lockStatus: 'Unlocked', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: ['VS-001'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'APPLE|IPHONE 13|A2633|128|MIDNIGHT|UNLOCKED|UNLOCKED|S'
        },
        'IPHONE-12-PRO-256-GLD': {
            sku: 'IPHONE-12-PRO-256-GLD', category: 'Phone', manufacturer: 'Apple', model: 'iPhone 12 Pro', modelNumber: 'A2407',
            grade: 'B', capacity_gb: '256', color: 'Gold', carrier: 'Verizon', lockStatus: 'Locked', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'APPLE|IPHONE 12 PRO|A2407|256|GOLD|VERIZON|LOCKED|S'
        },
        'GALAXY-S22-128-GRY': {
            sku: 'GALAXY-S22-128-GRY', category: 'Phone', manufacturer: 'Samsung', model: 'Galaxy S22', modelNumber: 'SM-S901U',
            grade: 'A', capacity_gb: '128', color: 'Phantom Gray', carrier: 'T-Mobile', lockStatus: 'Locked', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'SAMSUNG|GALAXY S22|SM-S901U|128|PHANTOM GRAY|T-MOBILE|LOCKED|S'
        },
        'PIXEL-7-128-OBS': {
            sku: 'PIXEL-7-128-OBS', category: 'Phone', manufacturer: 'Google', model: 'Pixel 7', modelNumber: 'GA03435',
            grade: 'A', capacity_gb: '128', color: 'Obsidian', carrier: 'Unlocked', lockStatus: 'Unlocked', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'GOOGLE|PIXEL 7|GA03435|128|OBSIDIAN|UNLOCKED|UNLOCKED|S'
        },
        'IPAD-9-64-SIL': {
            sku: 'IPAD-9-64-SIL', category: 'Tablet', manufacturer: 'Apple', model: 'iPad 9th Gen', modelNumber: 'A2602',
            grade: 'C', capacity_gb: '64', color: 'Silver', carrier: 'Generic', lockStatus: 'Unknown', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'APPLE|IPAD 9TH GEN|A2602|64|SILVER|GENERIC|UNKNOWN|S'
        },
        'GALAXY-TAB-A8-32-GRY': {
            sku: 'GALAXY-TAB-A8-32-GRY', category: 'Tablet', manufacturer: 'Samsung', model: 'Galaxy Tab A8', modelNumber: 'SM-X200',
            grade: 'B', capacity_gb: '32', color: 'Dark Gray', carrier: 'Generic', lockStatus: 'Unknown', serialized: true, active: true,
            optionalAttributes: {}, vendorSkus: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            base_sku_id: 'SAMSUNG|GALAXY TAB A8|SM-X200|32|DARK GRAY|GENERIC|UNKNOWN|S'
        }
    },
    vendorSkus: {
        'VS-001': {
            id: 'VS-001', itemSku: 'IPHONE-13-128-MID', vendorName: 'Verizon', vendorId: 'VZN-1122',
            vendorSku: 'VZN-IP13-128-M', status: 'Active', poCount: 5, createdAt: new Date().toISOString()
        }
    },
    orders: {},
    orderCounter: 1000,
    vendors: {},
    vendorCounter: 1000,
    purchaseOrders: {},
    poCounter: 1000,
};

// Reducer
function warehouseReducer(state: WarehouseState, action: Action): WarehouseState {
    switch (action.type) {
        case 'UNBOX_ENTITIES': {
            const { boxId, parentId, deleteBox } = action.payload;
            const box = state.entities[boxId];
            if (!box) return state;

            let newState = { ...state };
            let entities = { ...newState.entities };
            let roots = [...newState.roots];

            // 1. Move all children of the box to the parentId (or root)
            const childrenIds = box.children;
            childrenIds.forEach(childId => {
                const child = entities[childId];
                if (!child) return;

                // Update child parent pointer
                entities[childId] = { ...child, parentId: parentId };

                // Add to new parent's children list
                if (parentId) {
                    const parent = entities[parentId];
                    if (parent) {
                        const uniqueChildren = Array.from(new Set([...parent.children, childId]));
                        entities[parentId] = { ...parent, children: uniqueChildren };
                    }
                } else {
                    roots = Array.from(new Set([...roots, childId]));
                }
            });

            // 2. Clear box children
            entities[boxId] = { ...box, children: [] };

            // 3. Delete box if requested
            if (deleteBox) {
                // Remove from parent
                if (box.parentId) {
                    const parent = entities[box.parentId];
                    if (parent) {
                        entities[box.parentId] = {
                            ...parent,
                            children: parent.children.filter(id => id !== boxId)
                        };
                    }
                } else {
                    roots = roots.filter(id => id !== boxId);
                }
                delete entities[boxId];
            }

            return {
                ...newState,
                entities,
                roots
            };
        }

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
            // Delegate to DELETE_ENTITIES logic
            // Since we can't call reducer recursively easily here without changing state ref in tricky ways, 
            // I'll just copy the logic or direct flow.
            // Actually, best way is to fall through? No, payload differs.
            // I'll just wrap it.
            const ids = [id];

            // --- Reuse DELETE_ENTITIES logic ---
            let newEntities = { ...state.entities };
            let newRoots = [...state.roots];

            // Recursive delete helper (redefined here or moved out? moved out is cleaner but let's just duplicate for safety/speed)
            const deleteRecursive = (currentId: string, entities: Record<string, WarehouseEntity>) => {
                const current = entities[currentId];
                if (!current) return;

                // Delete children first
                current.children.forEach(childId => {
                    deleteRecursive(childId, entities);
                });

                delete entities[currentId];
            };

            const entityToDelete = state.entities[id];
            if (!entityToDelete) return state;

            // 1. Remove from parent's children list
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
            deleteRecursive(id, newEntities);

            return {
                ...state,
                entities: newEntities,
                roots: newRoots,
            };
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

        case 'UPDATE_CONFIG': {
            return {
                ...state,
                ...action.payload
            };
        }

        case 'BOX_ENTITIES': {
            const { boxId, boxLabel, boxBarcode, parentId, deviceIds } = action.payload;
            let newState = { ...state };
            let entities = { ...newState.entities };
            let roots = [...newState.roots];

            // 1. Create Box Entity
            const newBox: WarehouseEntity = {
                id: boxId,
                type: 'Box',
                label: boxLabel,
                barcode: boxBarcode,
                parentId: parentId,
                children: [], // Will be populated below
                deviceAttributes: undefined
            };
            entities[boxId] = newBox;

            // 2. Add Box to Parent
            if (parentId) {
                const parent = entities[parentId];
                if (parent) {
                    const uniqueChildren = Array.from(new Set([...parent.children, boxId]));
                    entities[parentId] = {
                        ...parent,
                        children: uniqueChildren
                    };
                }
            } else {
                roots = Array.from(new Set([...roots, boxId]));
            }

            // 3. Move Devices to Box
            const boxChildren: string[] = [];
            deviceIds.forEach(deviceId => {
                const device = entities[deviceId];
                if (!device) return;

                // Remove from old parent
                if (device.parentId) {
                    const oldParent = entities[device.parentId];
                    if (oldParent) {
                        entities[device.parentId] = {
                            ...oldParent,
                            children: oldParent.children.filter(child => child !== deviceId)
                        };
                    }
                } else {
                    roots = roots.filter(root => root !== deviceId);
                }

                // Update Device
                entities[deviceId] = {
                    ...device,
                    parentId: boxId
                };
                boxChildren.push(deviceId);
            });

            // Update Box children
            entities[boxId] = {
                ...entities[boxId],
                children: boxChildren
            };

            return {
                ...newState,
                entities,
                roots
            };
        }

        case 'BATCH_UPDATE_ENTITIES': {
            const newEntities = { ...state.entities };
            action.payload.updates.forEach(({ id, updates }) => {
                if (newEntities[id]) {
                    // Handle label regeneration for devices if attributes change
                    let finalUpdates = { ...updates };
                    if (newEntities[id].type === 'Device' && updates.deviceAttributes) {
                        const currentAttrs = newEntities[id].deviceAttributes || {};
                        const newAttrs = { ...currentAttrs, ...updates.deviceAttributes };
                        finalUpdates.label = generateDeviceLabel(newAttrs);
                    }

                    newEntities[id] = {
                        ...newEntities[id],
                        ...finalUpdates,
                        deviceAttributes: updates.deviceAttributes ? {
                            ...newEntities[id].deviceAttributes,
                            ...updates.deviceAttributes
                        } : newEntities[id].deviceAttributes
                    };
                }
            });
            return {
                ...state,
                entities: newEntities
            };
            return {
                ...state,
                entities: newEntities
            };
        }

        case 'ADD_ITEM': {
            const { item } = action.payload;
            return {
                ...state,
                items: { ...state.items, [item.sku]: item }
            };
        }

        case 'ADD_ITEMS': {
            const { items } = action.payload;
            const newItems = { ...state.items };
            items.forEach(item => {
                newItems[item.sku] = item;
            });
            return {
                ...state,
                items: newItems
            };
        }

        case 'UPDATE_ITEM': {
            const { sku, updates } = action.payload;
            const item = state.items[sku];
            if (!item) return state;
            return {
                ...state,
                items: { ...state.items, [sku]: { ...item, ...updates } }
            };
        }

        case 'ADD_VENDOR_SKU': {
            const { vendorSku } = action.payload;
            // Also update the parent Item's vendorSkus list
            const item = state.items[vendorSku.itemSku];
            let newItems = state.items;

            if (item) {
                newItems = {
                    ...state.items,
                    [item.sku]: {
                        ...item,
                        vendorSkus: [...(item.vendorSkus || []), vendorSku.id]
                    }
                };
            }

            return {
                ...state,
                items: newItems,
                vendorSkus: { ...state.vendorSkus, [vendorSku.id]: vendorSku }
            };
        }

        case 'UPDATE_VENDOR_SKU': {
            const { id, updates } = action.payload;
            const vSku = state.vendorSkus[id];
            if (!vSku) return state;
            return {
                ...state,
                vendorSkus: { ...state.vendorSkus, [id]: { ...vSku, ...updates } }
            };
        }

        case 'ADD_ORDER': {
            const { order } = action.payload;
            return {
                ...state,
                orders: { ...state.orders, [order.id]: order },
                orderCounter: state.orderCounter + 1
            };
        }

        case 'UPDATE_ORDER': {
            const { id, updates } = action.payload;
            const order = state.orders[id];
            if (!order) return state;
            return {
                ...state,
                orders: {
                    ...state.orders,
                    [id]: { ...order, ...updates, updatedAt: new Date().toISOString() }
                }
            };
        }

        case 'DELETE_ORDER': {
            const { id } = action.payload;
            const newOrders = { ...state.orders };
            delete newOrders[id];

            return {
                ...state,
                orders: newOrders
            };
        }

        case 'ADD_VENDOR': {
            const { vendor } = action.payload;
            return {
                ...state,
                vendors: { ...state.vendors, [vendor.id]: vendor },
                vendorCounter: state.vendorCounter + 1
            };
        }

        case 'UPDATE_VENDOR': {
            const { id, updates } = action.payload;
            const vendor = state.vendors[id];
            if (!vendor) return state;
            return {
                ...state,
                vendors: {
                    ...state.vendors,
                    [id]: { ...vendor, ...updates, updatedAt: new Date().toISOString() }
                }
            };
        }

        case 'DELETE_VENDOR': {
            const { id } = action.payload;
            const newVendors = { ...state.vendors };
            delete newVendors[id];
            return {
                ...state,
                vendors: newVendors
            };
        }

        case 'ADD_PO': {
            const { po } = action.payload;
            return {
                ...state,
                purchaseOrders: { ...state.purchaseOrders, [po.id]: po },
                poCounter: state.poCounter + 1
            };
        }

        case 'UPDATE_PO': {
            const { id, updates } = action.payload;
            const po = state.purchaseOrders[id];
            if (!po) return state;
            return {
                ...state,
                purchaseOrders: {
                    ...state.purchaseOrders,
                    [id]: { ...po, ...updates, updatedAt: new Date().toISOString() }
                }
            };
        }

        case 'DELETE_PO': {
            const { id } = action.payload;
            const newPOs = { ...state.purchaseOrders };
            delete newPOs[id];
            return {
                ...state,
                purchaseOrders: newPOs
            };
        }

        case 'ALLOCATE_DEVICES': {
            const { orderId, orderNumber, buyerName, deviceIds } = action.payload;
            const newEntities = { ...state.entities };

            deviceIds.forEach(id => {
                if (newEntities[id] && newEntities[id].deviceAttributes) {
                    newEntities[id] = {
                        ...newEntities[id],
                        deviceAttributes: {
                            ...newEntities[id].deviceAttributes,
                            allocatedToOrder: {
                                orderId,
                                orderNumber,
                                buyerName,
                                allocatedAt: new Date().toISOString()
                            }
                        }
                    };
                }
            });

            return {
                ...state,
                entities: newEntities
            };
        }

        case 'UNALLOCATE_DEVICES': {
            const { deviceIds } = action.payload;
            const newEntities = { ...state.entities };

            deviceIds.forEach(id => {
                if (newEntities[id] && newEntities[id].deviceAttributes) {
                    const attrs = { ...newEntities[id].deviceAttributes };
                    delete attrs.allocatedToOrder;

                    newEntities[id] = {
                        ...newEntities[id],
                        deviceAttributes: attrs
                    };
                }
            });

            return {
                ...state,
                entities: newEntities
            };
        }

        default:
            return state;
    }
}

// Context
interface WarehouseContextType {
    state: WarehouseState;
    addEntity: (type: any, parentId?: string | null, overrides?: Partial<WarehouseEntity>) => string;
    updateEntity: (id: string, updates: Partial<WarehouseEntity>) => void;
    deleteEntity: (id: string) => void;
    deleteEntities: (ids: string[]) => void;
    moveEntity: (id: string, targetId: string | null, index?: number) => void;
    moveEntities: (ids: string[], targetId: string | null) => void;
    addBulkEntities: (entities: { entity: WarehouseEntity; parentId: string }[]) => void;
    undo: () => void;
    canUndo: boolean;
    isConnected: boolean;
    updateConfig: (config: { maxMoveWithoutConfirm?: number; processingSourceBinId?: string | null; processingDestBinId?: string | null; processingExceptionBinId?: string | null; receivingBinId?: string | null }) => void;
    boxEntities: (boxId: string, boxLabel: string, boxBarcode: string, parentId: string | null, deviceIds: string[]) => void;
    unboxEntities: (boxId: string, parentId: string | null, deleteBox: boolean) => void;
    updateEntities: (updates: { id: string; updates: Partial<WarehouseEntity> }[]) => void;

    // Item Master
    addItem: (item: any) => void;
    addItems: (items: any[]) => void;
    updateItem: (sku: string, updates: any) => void;
    addVendorSku: (vendorSku: any) => void;
    updateVendorSku: (id: string, updates: any) => void;

    // Orders
    addOrder: (order: Order) => void;
    updateOrder: (id: string, updates: Partial<Order>) => void;
    getNextOrderNumber: () => string;
    getSellableInventory: () => Record<string, number>;
    allocateDevices: (orderId: string, orderNumber: string, buyerName: string, sku: string, qty: number) => string[];
    unallocateDevices: (deviceIds: string[]) => void;
    deleteOrder: (orderId: string) => void;
    removeOrderLine: (orderId: string, lineId: string) => void;
    shipOrder: (orderId: string) => void;

    // Vendors
    addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'vendorCode'>) => void;
    updateVendor: (id: string, updates: Partial<Vendor>) => void;
    deleteVendor: (id: string) => void;

    // Purchase Orders
    addPurchaseOrder: (vendorId: string) => string;
    updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
    deletePurchaseOrder: (id: string) => void;
    getNextPoNumber: () => string;
    finishPurchaseOrder: (id: string) => void;
    markAllocatedDevicesPicked: (deviceIds: string[]) => void;
    claimUnserializedPromise: (orderId: string, sku: string, imei: string) => boolean;

    setWarehouseState: (newState: WarehouseState) => void;
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

    // Ref to track latest state for async/callback access
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

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
        fetch(`${SERVER_URL}/api/layouts/${layoutId}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    // Merge initial items if missing from saved state (Seed data)
                    const loadedState = data.data;
                    if (!loadedState.items || Object.keys(loadedState.items).length === 0) {
                        loadedState.items = initialState.items;
                        loadedState.vendorSkus = initialState.vendorSkus;
                    }
                    if (!loadedState.vendorSkus) {
                        loadedState.vendorSkus = initialState.vendorSkus;
                    }
                    if (!loadedState.vendors) loadedState.vendors = initialState.vendors;
                    if (!loadedState.vendorCounter) loadedState.vendorCounter = initialState.vendorCounter;

                    if (!loadedState.orders) loadedState.orders = initialState.orders;
                    if (!loadedState.orderCounter) loadedState.orderCounter = initialState.orderCounter;

                    if (!loadedState.purchaseOrders) loadedState.purchaseOrders = initialState.purchaseOrders;
                    if (!loadedState.poCounter) loadedState.poCounter = initialState.poCounter;

                    // MIGRATION: Ensure all items have base_sku_id
                    if (loadedState.items) {
                        let migrationNeeded = false;
                        Object.values(loadedState.items).forEach((item: any) => {
                            if (!item.base_sku_id) {
                                item.base_sku_id = generateBaseSkuId(item);
                                migrationNeeded = true;
                            }
                        });
                        // Can't call saveState here easily because it's defined below
                        // But dispatching correct state fixes UI immediately
                        // Persistence will happen on next write
                        if (migrationNeeded) {
                            console.log("Migrated items to include base_sku_id");
                        }
                    }

                    dispatch({ type: 'SET_STATE', payload: loadedState });
                }
            })
            .catch(err => {
                console.error("Failed to load layout", err);
                toast.error(`Failed to load layout: ${err.message}`);
            });
    }, [layoutId]);

    const saveState = (newState: WarehouseState) => {
        fetch(`${SERVER_URL}/api/layouts/${layoutId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: newState }),
        }).catch(err => console.error("Failed to save", err));
    };

    const setWarehouseState = (newState: WarehouseState) => {
        dispatch({ type: 'SET_STATE', payload: newState });
        saveState(newState);
    };

    // Wrapper functions that dispatch AND save
    const addEntity = (type: any, parentId: string | null = null, overrides: Partial<WarehouseEntity> = {}) => {
        const baseEntity = createEntity(type, parentId);
        const entity = { ...baseEntity, ...overrides };

        // Auto-generate barcode for Bins and Boxes if not overridden
        if ((type === 'Bin' || type === 'Box') && !overrides.barcode) {
            const existingEntities = Object.values(state.entities).filter(e => e.type === type);
            const nextNum = existingEntities.length + 1;
            const prefix = type === 'Bin' ? 'BN' : 'BOX';
            const barcode = `${prefix}_${nextNum.toString().padStart(3, '0')}`;
            entity.barcode = barcode;
            if (!overrides.label) entity.label = barcode;
        }

        const action: Action = { type: 'ADD_ENTITY', payload: { entity, parentId } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created ${type}: ${entity.label}`, entity.id);
        return entity.id;
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

        // Determine coalesce key (e.g. "label", "description")
        // If multiple keys, maybe join them or don't coalesce.
        const keys = Object.keys(updates);
        const coalesceKey = keys.length === 1 ? keys[0] : undefined;

        logAction('UPDATE', `Updated properties for ${state.entities[id]?.label || id}`, id, coalesceKey);
    };

    const updateEntities = (entityUpdates: { id: string; updates: Partial<WarehouseEntity> }[]) => {
        // We can optimize this by creating a single action for batch update if we want,
        // but for now iterating dispatch is okay if we only save once.
        // Actually, reducer is pure, so we can chain them or add a BATCH_UPDATE action.
        // Let's add BATCH_UPDATE to reducer for efficiency.

        // For now, to avoid changing reducer too much, let's just dispatch individually but save once?
        // No, dispatch triggers re-render.
        // Let's add BATCH_UPDATE_ENTITIES action.

        const action: Action = { type: 'BATCH_UPDATE_ENTITIES', payload: { updates: entityUpdates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Bulk updated ${entityUpdates.length} entities`, entityUpdates[0].id);
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
            // Or we can just save the final state and dispatch SET_STATE? No, that might flicker.
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
        console.log('[WarehouseContext] addBulkEntities called. Count:', entities.length);
        if (entities.length > 0) {
            console.log('[WarehouseContext] First entity parentId:', entities[0].parentId);
        }

        const action: Action = { type: 'ADD_BULK_ENTITIES', payload: { entities } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Bulk created ${entities.length} entities`, entities[0].entity.id);
    };

    const updateConfig = (config: { maxMoveWithoutConfirm?: number }) => {
        const action: Action = { type: 'UPDATE_CONFIG', payload: config };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CONFIG', `Updated config`, 'config');
    };

    const boxEntities = (boxId: string, boxLabel: string, boxBarcode: string, parentId: string | null, deviceIds: string[]) => {
        // Use stateRef to ensure we have latest state if needed, though arguments provide most info.
        // But for safety, we might want to check if devices still exist?
        // The reducer handles basic checks.

        const action: Action = {
            type: 'BOX_ENTITIES',
            payload: { boxId, boxLabel, boxBarcode, parentId, deviceIds }
        };
        const newState = warehouseReducer(stateRef.current, action);
        dispatch(action);
        saveState(newState);
        logAction('BOX', `Boxed ${deviceIds.length} items into ${boxLabel}`, boxId);
    };

    const unboxEntities = (boxId: string, parentId: string | null, deleteBox: boolean) => {
        const action: Action = {
            type: 'UNBOX_ENTITIES',
            payload: { boxId, parentId, deleteBox }
        };
        const newState = warehouseReducer(stateRef.current, action);
        dispatch(action);
        saveState(newState);
        logAction('UNBOX', `Unboxed ${boxId}`, boxId);
    };

    // Item Master Actions
    const addItem = (item: any) => {
        if (!item.base_sku_id) {
            item.base_sku_id = generateBaseSkuId(item);
        }
        const action: Action = { type: 'ADD_ITEM', payload: { item } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created Item: ${item.sku}`, item.sku);
    };

    const addItems = (items: any[]) => {
        if (items.length === 0) return;

        // Ensure all items have base_sku_id
        const processedItems = items.map(item => {
            if (!item.base_sku_id) {
                return { ...item, base_sku_id: generateBaseSkuId(item) };
            }
            return item;
        });

        const action: Action = { type: 'ADD_ITEMS', payload: { items: processedItems } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Bulk created ${items.length} items`, items[0].sku);
    };

    const updateItem = (sku: string, updates: any) => {
        const action: Action = { type: 'UPDATE_ITEM', payload: { sku, updates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Updated Item: ${sku}`, sku);
    };

    const addVendorSku = (vendorSku: any) => {
        const action: Action = { type: 'ADD_VENDOR_SKU', payload: { vendorSku } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created Vendor SKU: ${vendorSku.vendorSku}`, vendorSku.id);
    };

    const updateVendorSku = (id: string, updates: any) => {
        const action: Action = { type: 'UPDATE_VENDOR_SKU', payload: { id, updates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Updated Vendor SKU`, id);
    };

    // Order Actions
    const addOrder = (order: Order) => {
        const action: Action = { type: 'ADD_ORDER', payload: { order } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created Order: ${order.orderNumber}`, order.id);
    };

    const updateOrder = (id: string, updates: Partial<Order>) => {
        const action: Action = { type: 'UPDATE_ORDER', payload: { id, updates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Updated Order: ${state.orders[id]?.orderNumber}`, id);
    };

    const getNextOrderNumber = () => {
        return `ORD-${state.orderCounter}`;
    };

    const getSellableInventory = () => {
        const inventory: Record<string, number> = {};
        Object.values(state.entities).forEach(entity => {
            if (entity.type === 'Device' &&
                entity.deviceAttributes?.sellable &&
                !entity.deviceAttributes.allocatedToOrder) { // Check not allocated
                const sku = entity.deviceAttributes.sku;
                if (sku) {
                    inventory[sku] = (inventory[sku] || 0) + 1;
                }
            }
        });
        return inventory;
    };

    const allocateDevices = (orderId: string, orderNumber: string, buyerName: string, sku: string, qty: number): string[] => {
        // Find available devices
        const availableDeviceIds: string[] = [];
        const entities = Object.values(state.entities);

        for (const entity of entities) {
            if (availableDeviceIds.length >= qty) break;

            if (entity.type === 'Device' &&
                entity.deviceAttributes?.sku === sku &&
                entity.deviceAttributes?.sellable &&
                !entity.deviceAttributes.allocatedToOrder) {
                availableDeviceIds.push(entity.id);
            }
        }

        if (availableDeviceIds.length > 0) {
            const action: Action = {
                type: 'ALLOCATE_DEVICES',
                payload: { orderId, orderNumber, buyerName, deviceIds: availableDeviceIds }
            };
            const newState = warehouseReducer(state, action);
            dispatch(action);
            saveState(newState);
            logAction('UPDATE', `Allocated ${availableDeviceIds.length} devices to ${orderNumber}`, orderId);
        }

        return availableDeviceIds;
    };

    const unallocateDevices = (deviceIds: string[]) => {
        if (deviceIds.length === 0) return;
        const action: Action = { type: 'UNALLOCATE_DEVICES', payload: { deviceIds } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('UPDATE', `Unallocated ${deviceIds.length} devices`, deviceIds[0]);
    };

    const deleteOrder = (orderId: string) => {
        const order = state.orders[orderId];
        if (!order) return;

        // 1. Unallocate all devices for this order
        const allocatedDevices = Object.values(state.entities).filter(e =>
            e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === orderId
        );

        if (allocatedDevices.length > 0) {
            unallocateDevices(allocatedDevices.map(d => d.id));
        }

        // 2. Delete the order
        const action: Action = { type: 'DELETE_ORDER', payload: { id: orderId } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('DELETE', `Deleted Order: ${order.orderNumber}`, orderId);
    };

    const removeOrderLine = (orderId: string, lineId: string) => {
        const order = state.orders[orderId];
        if (!order) return;

        const line = order.lines.find(l => l.id === lineId);
        if (!line) return;

        // 1. Find devices allocated to this order AND matching this SKU
        // Note: This is an approximation since we don't link specific device IDs to specific lines yet.
        // We will unallocate 'qty' amount of devices of this SKU allocated to this order.
        const devicesToUnallocate = Object.values(state.entities).filter(e =>
            e.type === 'Device' &&
            e.deviceAttributes?.allocatedToOrder?.orderId === orderId &&
            e.deviceAttributes?.sku === line.skuId
        ).slice(0, line.qty);

        if (devicesToUnallocate.length > 0) {
            unallocateDevices(devicesToUnallocate.map(d => d.id));
        }

        // 2. Update the order to remove the line
        const updatedLines = order.lines.filter(l => l.id !== lineId);
        updateOrder(orderId, { lines: updatedLines });
    };

    const shipOrder = (orderId: string) => {
        const order = state.orders[orderId];
        if (!order) return;

        // 1. Find all devices allocated to this order
        // In a real app, we'd have a more direct index, but scanning entities works for this scale
        const allocatedDeviceIds = Object.values(state.entities)
            .filter(e => e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === orderId)
            .map(e => e.id);

        // 2. Move them to a "Shipped" virtual bin (or just out of the warehouse)
        // We'll assume a 'bin_shipped' exists or create/use a virtual ID. 
        // For visual clarity, let's just make sure they aren't in the active layout.
        // But to keep data, we re-parent them to 'bin_shipped'.
        // Check if bin_shipped exists, if not, relying on "virtual" nature might be tricky for the visualizer
        // UNLESS we just set their parentId to 'virtual_shipped' which isn't rendered.

        moveEntities(allocatedDeviceIds, 'virtual_shipped');

        // 3. Update Order Status
        updateOrder(orderId, { status: 'Shipped', shippedAt: new Date().toISOString() });
    };

    const addVendor = (vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'vendorCode'>) => {
        const id = uuidv4();
        const vendorCode = `VND-${state.vendorCounter + 1}`;
        const newVendor: Vendor = {
            id,
            vendorCode,
            ...vendorData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const action: Action = { type: 'ADD_VENDOR', payload: { vendor: newVendor } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created Vendor: ${newVendor.name}`, id);
    };

    const updateVendor = (id: string, updates: Partial<Vendor>) => {
        const action: Action = { type: 'UPDATE_VENDOR', payload: { id, updates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
    };

    const deleteVendor = (id: string) => {
        const action: Action = { type: 'DELETE_VENDOR', payload: { id } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('DELETE', 'Deleted Vendor', id);
    };

    // Purchase Orders
    const addPurchaseOrder = (vendorId: string) => {
        const id = uuidv4();
        const poNumber = `PO-${state.poCounter + 1}`;
        const newPO: PurchaseOrder = {
            id,
            poNumber,
            vendorId,
            status: 'Draft',
            lines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const action: Action = { type: 'ADD_PO', payload: { po: newPO } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('CREATE', `Created PO: ${poNumber}`, id);
        return id;
    };

    const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
        const action: Action = { type: 'UPDATE_PO', payload: { id, updates } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
    };

    const deletePurchaseOrder = (id: string) => {
        const action: Action = { type: 'DELETE_PO', payload: { id } };
        const newState = warehouseReducer(state, action);
        dispatch(action);
        saveState(newState);
        logAction('DELETE', 'Deleted PO', id);
    };

    const getNextPoNumber = () => {
        return `PO-${state.poCounter}`;
    };

    const finishPurchaseOrder = (poId: string) => {
        const po = state.purchaseOrders[poId];
        const receivingBinId = state.receivingBinId;

        if (!po || !receivingBinId) return;

        // 1. Generate devices for received quantities
        const newEntities = { ...state.entities };
        const receivingBin = newEntities[receivingBinId];
        if (!receivingBin) return; // or create it? User should've selected valid one.

        po.lines.forEach(line => {
            const qtyToReceive = line.receivedQty || 0;
            if (qtyToReceive <= 0) return;

            const item = state.items[line.itemSku];
            // Look up promises for this line
            const promisedLines: { orderId: string, orderNumber: string, remainingQty: number }[] = [];

            Object.values(state.orders).forEach(order => {
                if (order.status !== 'Canceled') {
                    order.lines.forEach(ol => {
                        if (ol.promisedPoId === poId && ol.promisedPoLineId === line.id) {
                            // Determine how many are NOT yet allocated (simple approximation: assume full line needs allocation if we are just receiving now)
                            // In a more complex system, we'd track allocation status per line more granularly.
                            // For now, we allocate up to the order line qty.
                            promisedLines.push({
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                remainingQty: ol.qty
                            });
                        }
                    });
                }
            });

            for (let i = 0; i < qtyToReceive; i++) {
                const deviceId = uuidv4();

                // Determine allocation
                let allocatedToOrder: { orderId: string, orderNumber: string, buyerName: string, allocatedAt: string } | undefined = undefined;

                // Find a promise that needs fulfillment
                const promiseIndex = promisedLines.findIndex(p => p.remainingQty > 0);
                if (promiseIndex >= 0) {
                    const p = promisedLines[promiseIndex];
                    const order = state.orders[p.orderId]; // accurate lookup
                    allocatedToOrder = {
                        orderId: p.orderId,
                        orderNumber: p.orderNumber,
                        buyerName: order?.buyer?.name || 'Unknown',
                        allocatedAt: new Date().toISOString()
                    };
                    promisedLines[promiseIndex].remainingQty--;
                }

                const device: WarehouseEntity = {
                    id: deviceId,
                    type: 'Device',
                    label: 'Pending...',
                    parentId: receivingBinId,
                    children: [],
                    deviceAttributes: {
                        sku: line.itemSku,
                        vendor_sku: line.vendorSku,
                        model: item?.model || 'Unknown Model',
                        manufacturer: item?.manufacturer || 'Unknown',
                        grade: item?.grade || 'UNTESTED',
                        po_number: po.poNumber,
                        allocatedToOrder: allocatedToOrder
                    }
                };
                device.label = generateDeviceLabel(device.deviceAttributes!);

                newEntities[deviceId] = device;
                receivingBin.children = [...receivingBin.children, deviceId];
            }
        });

        // 2. Update PO Status to Done
        const newPOs = { ...state.purchaseOrders };
        newPOs[poId] = { ...po, status: 'Done', updatedAt: new Date().toISOString() };

        // 3. Dispatch Batch Update (custom logic or just SET_STATE)
        // Since we are touching entities AND POs, best to just create a new state object and SET_STATE
        // But we need to be careful with history/undo. 
        // Let's make a specific reducer action 'FINISH_PO' if we want atomic
        // OR just dispatch SET_STATE with the new blob.

        // For simplicity and atomicity, let's dispatch a specialized action so reducer handles it? 
        // Logic is a bit complex for reducer (UUID gen). 
        // Let's do the "SET_STATE" approach or "BATCH_UPDATE_ENTITIES" + "UPDATE_PO" combo.
        // But we want it atomic.

        // Let's construct the full new state and dispatch SET_STATE for now, 
        // assuming no race conditions in this single-user local sim.

        const newState: WarehouseState = {
            ...state,
            entities: newEntities,
            purchaseOrders: newPOs
        };

        dispatch({ type: 'SET_STATE', payload: newState });
        saveState(newState);
        logAction('UPDATE', `Received PO ${po.poNumber}`, poId);
    };

    const markAllocatedDevicesPicked = (deviceIds: string[]) => {
        if (deviceIds.length === 0) return;
        const updates = deviceIds.map(id => {
            const entity = state.entities[id];
            if (entity && entity.type === 'Device' && entity.deviceAttributes?.allocatedToOrder) {
                return {
                    id,
                    updates: {
                        deviceAttributes: {
                            ...entity.deviceAttributes,
                            allocatedToOrder: {
                                ...entity.deviceAttributes.allocatedToOrder,
                                pickedAt: new Date().toISOString()
                            }
                        }
                    }
                };
            }
            return null;
        }).filter(Boolean) as { id: string, updates: Partial<WarehouseEntity> }[];

        if (updates.length > 0) {
            const action: Action = { type: 'BATCH_UPDATE_ENTITIES', payload: { updates } };
            const newState = warehouseReducer(state, action);
            dispatch(action);
            saveState(newState);
            logAction('PICK', `Picked ${updates.length} devices`, updates[0].id);
        }
    };

    const claimUnserializedPromise = (orderId: string, sku: string, imei: string) => {
        // Find a device allocated to this order AND matching SKU AND NOT picked yet
        const candidate = Object.values(state.entities).find(e =>
            e.type === 'Device' &&
            e.deviceAttributes?.sku === sku &&
            e.deviceAttributes?.allocatedToOrder?.orderId === orderId &&
            !e.deviceAttributes?.allocatedToOrder?.pickedAt &&
            (!e.deviceAttributes?.imei || e.deviceAttributes?.imei === '') // Unserialized ideally
        );

        if (!candidate) {
            console.error('No unpicked allocated device found for UNSERIALIZED claim', sku);
            // Fallback? Or fail.
            // If strict logic: fail.
            // But user might be scanning a new device to FULFILL a promise. 
            // If the promise was "Item A", and we generated "Item A (No IMEI)", now we give it an IMEI.
            return false;
        }

        // Update the candidate
        const updates = {
            deviceAttributes: {
                ...candidate.deviceAttributes,
                imei: imei, // Assign the scanned IMEI
                allocatedToOrder: {
                    ...candidate.deviceAttributes!.allocatedToOrder!,
                    pickedAt: new Date().toISOString()
                }
            },
            label: generateDeviceLabel({ ...candidate.deviceAttributes, imei } as any) // Update label with new IMEI
        };

        updateEntity(candidate.id, updates);
        logAction('PICK', `Claimed promised device with IMEI ${imei}`, candidate.id);
        return true;
    };

    return (
        <WarehouseContext.Provider value={{
            state,
            addEntity,
            updateEntity,
            deleteEntity,
            deleteEntities,
            moveEntity,
            moveEntities,
            addBulkEntities,
            undo,
            canUndo: undoStack.length > 0,
            isConnected,
            updateConfig,
            boxEntities,
            unboxEntities,
            updateEntities,
            addItem,
            updateItem,
            addVendorSku,
            updateVendorSku,
            addOrder,
            updateOrder,
            getNextOrderNumber,
            getSellableInventory,
            allocateDevices,
            unallocateDevices,
            deleteOrder,
            removeOrderLine,
            setWarehouseState,
            shipOrder,
            addVendor,
            updateVendor,
            deleteVendor,
            addItems,
            addPurchaseOrder,
            updatePurchaseOrder,
            deletePurchaseOrder,
            getNextPoNumber,
            finishPurchaseOrder,
            markAllocatedDevicesPicked,
            claimUnserializedPromise
        }}>
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
