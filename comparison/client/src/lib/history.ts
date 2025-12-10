import Dexie, { Table } from 'dexie';

export interface ActionLog {
    id?: number;
    timestamp: number;
    actionType: string;
    details: string;
    entityId?: string;
    coalesceKey?: string;
}

class WarehouseHistory extends Dexie {
    logs!: Table<ActionLog>;

    constructor() {
        super('WarehouseHistory');
        this.version(1).stores({
            logs: '++id, timestamp, actionType'
        });
        this.version(2).stores({
            logs: '++id, timestamp, actionType, entityId'
        });
        this.version(3).stores({
            logs: '++id, timestamp, actionType, entityId, coalesceKey'
        });
    }
}

export const db = new WarehouseHistory();

export async function getEntityHistory(entityId: string) {
    return await db.logs
        .where('entityId').equals(entityId)
        .reverse()
        .sortBy('timestamp');
}

export async function logAction(actionType: string, details: string, entityId?: string, coalesceKey?: string) {
    try {
        const now = Date.now();

        if (coalesceKey && entityId) {
            // Check for recent similar action to coalesce
            const lastLog = await db.logs.orderBy('id').last();

            if (lastLog &&
                lastLog.entityId === entityId &&
                lastLog.actionType === actionType &&
                lastLog.coalesceKey === coalesceKey &&
                (now - lastLog.timestamp) < 2000 // 2 second window
            ) {
                // Update existing log
                await db.logs.update(lastLog.id!, {
                    timestamp: now,
                    details: details
                });
                return;
            }
        }

        await db.logs.add({
            timestamp: now,
            actionType,
            details,
            entityId,
            coalesceKey
        });
    } catch (error) {
        console.error("Failed to log action:", error);
    }
}
