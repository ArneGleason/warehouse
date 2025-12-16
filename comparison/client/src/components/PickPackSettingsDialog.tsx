import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { WarehouseEntity } from '@/lib/warehouse';

interface PickPackSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PickPackSettingsDialog({ isOpen, onClose }: PickPackSettingsDialogProps) {
    const { state, updateConfig } = useWarehouse();
    const [sellableDeptId, setSellableDeptId] = useState(state.sellableDepartmentId || '');
    const [pickPackDeptId, setPickPackDeptId] = useState(state.pickPackDepartmentId || '');

    const departments = Object.values(state.entities).filter(e => e.type === 'Department');

    const handleSave = () => {
        updateConfig({
            sellableDepartmentId: sellableDeptId || null,
            pickPackDepartmentId: pickPackDeptId || null
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Pick & Pack Configuration</DialogTitle>
                    <DialogDescription>
                        Configure departments for the Pick & Pack workflow.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Sellable Department (Source)</Label>
                        <Select value={sellableDeptId} onValueChange={setSellableDeptId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select department..." />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Inventory for new orders will be picked from bins in this department.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Pick & Pack Department (Staging)</Label>
                        <Select value={pickPackDeptId} onValueChange={setPickPackDeptId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select department..." />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Picked orders will be staged and packed here.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
