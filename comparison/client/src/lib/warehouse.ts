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
    | 'Device'
    | 'Warehouse';

export interface DeviceAttributes {
    sku?: string;
    vendor_sku?: string;
    po_number?: string;
    presold_order_number?: string;
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
    test_result?: any;
    // Device specific
    deviceAttributes?: DeviceAttributes;
    // Allocation
    allocatedToOrder?: {
        orderId: string;
        orderNumber: string;
        buyerName: string;
        allocatedAt: string;
        pickedAt?: string; // Distinguishes "Promised/Allocated" from "Verified Picked"
    };
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

export interface ItemDefinition {
    sku: string;
    category: string;
    manufacturer: string;
    model: string;
    modelNumber?: string;
    grade: string;
    capacity_gb?: string; // Common attribute
    color?: string;       // Common attribute
    carrier?: string;
    lockStatus?: string;
    serialized: boolean;
    active: boolean;
    optionalAttributes: Record<string, any>;
    vendorSkus: string[]; // IDs of VendorSku entities
    createdAt: string;
    updatedAt: string;
    base_sku_id?: string; // ID grouping variants that only differ by grade
}

export function generateBaseSkuId(item: Partial<ItemDefinition>): string {
    const parts = [
        item.manufacturer,
        item.model,
        item.modelNumber,
        item.capacity_gb,
        item.color,
        item.carrier,
        item.lockStatus,
        item.serialized ? 'S' : 'NS'
    ].map(p => (p || '').toString().trim().toUpperCase());

    // Hash or simply join. Joining is readable.
    return parts.join('|');
}

export interface VendorSku {
    id: string;
    itemSku: string;
    vendorName: string;
    vendorId: string; // Account # or similar
    vendorSku: string;
    status: 'Active' | 'Inactive';
    poCount: number;
    createdAt: string;
}

export interface WarehouseState {
    entities: Record<string, WarehouseEntity>;
    roots: string[];
    // Item Master
    items: Record<string, ItemDefinition>; // Keyed by SKU
    vendorSkus: Record<string, VendorSku>; // Keyed by ID

    configTitle: string;
    maxMoveWithoutConfirm: number;
    processingSourceBinId?: string | null;
    processingDestBinId?: string | null;
    processingExceptionBinId?: string | null;
    receivingBinId?: string | null;

    // Orders
    orders: Record<string, Order>;
    orderCounter: number;

    // Vendors
    vendors: Record<string, Vendor>;
    vendorCounter: number;

    // Purchase Orders
    purchaseOrders: Record<string, PurchaseOrder>;
    poCounter: number;
}

export type OrderStatus = 'Draft' | 'Ready for Payment' | 'Ready for Picking' | 'Ready for Packing' | 'Shipped' | 'Canceled';

export interface Vendor {
    id: string;
    vendorCode: string; // Readable ID e.g. VND-1001
    name: string;
    address?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    website?: string;
    createdAt: string;
    updatedAt: string;
}
export type PurchaseOrderStatus = 'Draft' | 'Issued' | 'Receiving' | 'Done' | 'Canceled';

export interface PurchaseOrderLine {
    id: string;
    poId: string;
    itemSku: string; // The internal SKU (required)
    vendorSku?: string; // Examples: "V-IPH-13" (optional)
    itemSkuDescription?: string; // Snapshot description
    vendorSkuDescription?: string; // Snapshot description
    qty: number;
    receivedQty?: number;
    unitPrice: number;
    lineTotal: number;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string; // e.g. PO-1001
    vendorId: string;
    status: PurchaseOrderStatus;
    expectedDate?: string;
    notes?: string;
    lines: PurchaseOrderLine[];
    createdAt: string;
    updatedAt: string;
}

export interface OrderLine {
    id: string;
    orderId: string;
    skuId: string; // The SKU (e.g. "IPHONE-13-128-MID")
    skuDisplay: string; // Cached label
    qty: number;
    unitPrice?: number;
    // Promise System
    promisedPoId?: string;
    promisedPoLineId?: string;
}

export interface Order {
    id: string;
    orderNumber: string; // e.g. "ORD-1001"
    status: OrderStatus;
    buyer: {
        name: string;
        company?: string;
        email?: string;
        phone?: string;
        shipToAddress?: string;
    };
    notes?: string;
    lines: OrderLine[];
    createdAt: string;
    updatedAt: string;
    shippedAt?: string;
    trackingNumber?: string;
}

export const ENTITY_CONFIG: Record<EntityType, { allowedParents: (EntityType | null)[], icon: string }> = {
    Warehouse: { allowedParents: [null], icon: 'Warehouse' },
    Department: { allowedParents: [null, 'Warehouse'], icon: 'Building' },
    StorageArea: { allowedParents: ['Department'], icon: 'Square' },
    StaticRack: { allowedParents: ['StorageArea'], icon: 'Grid' },
    MobileRack: { allowedParents: ['StorageArea', 'MobileStorageParkingSpot'], icon: 'Truck' },
    MobileStorageParkingSpot: { allowedParents: ['StorageArea'], icon: 'ParkingSquare' },
    Bin: { allowedParents: ['StaticRack', 'MobileRack', 'Department'], icon: 'Inbox' },
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
