import { WarehouseState, WarehouseEntity, RuleCondition } from './warehouse';

export interface ValidationResult {
    allowed: boolean;
    blockedBy?: {
        departmentName: string;
        rules: string[];
    };
    failedDeviceIds?: string[];
}

export function validateMove(state: WarehouseState, deviceIds: string[], targetId: string | null): ValidationResult {
    // 1. Find all parent Departments of the targetId (including targetId itself if it's a Department)
    const parentDepartments: WarehouseEntity[] = [];
    let currentId: string | null = targetId;

    while (currentId) {
        const entity = state.entities[currentId];
        if (!entity) break;

        if (entity.type === 'Department') {
            parentDepartments.push(entity);
        }
        currentId = entity.parentId;
    }

    // If no parent departments, move is allowed
    if (parentDepartments.length === 0) {
        return { allowed: true };
    }

    // 2. Check rules for each department
    const failedDeviceIds: Set<string> = new Set();
    let blockingDepartment: string | null = null;
    let blockingRules: string[] = [];

    // Check from closest parent up to root
    for (const dept of parentDepartments) {
        if (!dept.departmentRules) continue;

        const rules = dept.departmentRules;
        const currentBlockingRules: string[] = [];

        for (const deviceId of deviceIds) {
            const device = state.entities[deviceId];
            if (!device || device.type !== 'Device') continue;

            const attrs = device.deviceAttributes || {};
            let failed = false;

            // Check Tested Rule
            if (rules.tested === 'MUST_HAVE' && !attrs.tested) {
                if (!currentBlockingRules.includes('Must be Tested')) currentBlockingRules.push('Must be Tested');
                failed = true;
            } else if (rules.tested === 'MUST_NOT_HAVE' && attrs.tested) {
                if (!currentBlockingRules.includes('Must NOT be Tested')) currentBlockingRules.push('Must NOT be Tested');
                failed = true;
            }

            // Check Processed Rule
            if (rules.sellable === 'MUST_HAVE' && !attrs.sellable) {
                if (!currentBlockingRules.includes('Must be Processed')) currentBlockingRules.push('Must be Processed');
                failed = true;
            } else if (rules.sellable === 'MUST_NOT_HAVE' && attrs.sellable) {
                if (!currentBlockingRules.includes('Must NOT be Processed')) currentBlockingRules.push('Must NOT be Processed');
                failed = true;
            }

            // Check Serialized Rule
            const isSerialized = !!attrs.imei;
            if (rules.serialized === 'MUST_HAVE' && !isSerialized) {
                if (!currentBlockingRules.includes('Must be Serialized')) currentBlockingRules.push('Must be Serialized');
                failed = true;
            } else if (rules.serialized === 'MUST_NOT_HAVE' && isSerialized) {
                if (!currentBlockingRules.includes('Must NOT be Serialized')) currentBlockingRules.push('Must NOT be Serialized');
                failed = true;
            }

            if (failed) {
                failedDeviceIds.add(deviceId);
            }
        }

        if (currentBlockingRules.length > 0) {
            blockingDepartment = dept.label;
            blockingRules = currentBlockingRules;
            break; // Stop at the first blocking department
        }
    }

    if (blockingDepartment) {
        return {
            allowed: false,
            blockedBy: {
                departmentName: blockingDepartment,
                rules: blockingRules
            },
            failedDeviceIds: Array.from(failedDeviceIds)
        };
    }

    return { allowed: true };
}
