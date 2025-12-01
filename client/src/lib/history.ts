import Dexie, { Table } from 'dexie';

export interface ActionLog {
    id?: number;
    timestamp: number;
    actionType: string;
    details: string;
    entityId?: string;
}

class WarehouseHistory extends Dexie {
    logs!: Table<ActionLog>;

    constructor() {
        super('WarehouseHistory');
        this.version(1).stores({
            logs: '++id, timestamp, actionType'
        });
    }
}

export const db = new WarehouseHistory();

export async function logAction(actionType: string, details: string, entityId?: string) {
    try {
        await db.logs.add({
            timestamp: Date.now(),
            actionType,
            details,
            entityId
        });
    } catch (error) {
        console.error("Failed to log action:", error);
    }
}
