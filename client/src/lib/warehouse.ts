import { v4 as uuidv4 } from 'uuid';

export type EntityType =
    | 'Department'
    | 'StorageArea'
    | 'StaticRack'
    | 'MobileRack'
    | 'MobileStorageParkingSpot'
    | 'Bin'
    | 'Box'
    | 'Workstation'
    | 'Device';

export interface DeviceAttributes {
    sku?: string;
    vendor_sku?: string;
    po_number?: string;
    imei?: string;
    barcode?: string;
    manufacturer?: string;
    model?: string;
    category?: string;
    capacity_gb?: string;
    color?: string;
    carrier?: string;
    lock_status?: string;
    grade?: string;
    tested?: boolean;
    sellable?: boolean;
    queue?: string;
    // Device specific
    deviceAttributes?: DeviceAttributes;
}

export type RuleCondition = 'OFF' | 'MUST_HAVE' | 'MUST_NOT_HAVE';

export interface DepartmentRules {
    tested: RuleCondition;
    sellable: RuleCondition;
    serialized: RuleCondition;
}

export interface WarehouseEntity {
    id: string;
    type: EntityType;
    label: string;
    description?: string;
    barcode?: string;
    parentId: string | null;
    children: string[];
    deviceAttributes?: DeviceAttributes;
    departmentRules?: DepartmentRules;
    workstationAttributes?: {
        queues: string[];
    };
    departmentAttributes?: {
        allowMoveIn?: boolean;
        allowMoveOut?: boolean;
    };
}

export interface WarehouseState {
    entities: Record<string, WarehouseEntity>;
    roots: string[];
    configTitle: string;
}

export const ENTITY_CONFIG: Record<EntityType, { allowedParents: (EntityType | null)[], icon: string }> = {
    Department: { allowedParents: [null], icon: 'Building' },
    StorageArea: { allowedParents: ['Department'], icon: 'Square' },
    StaticRack: { allowedParents: ['StorageArea'], icon: 'Grid' },
    MobileRack: { allowedParents: ['StorageArea', 'MobileStorageParkingSpot'], icon: 'Truck' },
    MobileStorageParkingSpot: { allowedParents: ['StorageArea'], icon: 'ParkingSquare' },
    Bin: { allowedParents: ['StaticRack', 'MobileRack'], icon: 'Inbox' },
    Box: { allowedParents: ['Bin', 'StaticRack', 'MobileRack'], icon: 'Package' },
    Workstation: { allowedParents: ['Department'], icon: 'Monitor' },
    Device: { allowedParents: ['Bin', 'Box', 'Workstation'], icon: 'Smartphone' },
};

export function createEntity(type: EntityType, parentId: string | null = null): WarehouseEntity {
    return {
        id: uuidv4(),
        type,
        label: `New ${type}`,
        parentId,
        children: [],
        deviceAttributes: type === 'Device' ? {} : undefined,
    };
}

export function canMoveEntity(entity: WarehouseEntity, targetParent: WarehouseEntity | null, allEntities: Record<string, WarehouseEntity>): boolean {
    // Cannot move into itself
    if (targetParent && targetParent.id === entity.id) return false;

    // Cannot move into a descendant
    let current = targetParent;
    while (current) {
        if (current.id === entity.id) return false;
        current = current.parentId ? allEntities[current.parentId] : null;
    }

    // Check allowed parents
    const config = ENTITY_CONFIG[entity.type];
    const targetType = targetParent ? targetParent.type : null;
    return config.allowedParents.includes(targetType);
}

export function generateDeviceLabel(attrs: DeviceAttributes): string {
    const parts = [
        attrs.sku,
        attrs.model,
        attrs.grade,
        attrs.imei
    ].filter(Boolean); // Filter out undefined/null/empty strings

    return parts.length > 0 ? parts.join(' • ') : 'New Device';
}
