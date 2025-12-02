import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';
import { useWarehouse } from './context/WarehouseContext';

interface MoveBlockedDialogProps {
    isOpen: boolean;
    onClose: () => void;
    blockedBy: {
        departmentName: string;
        rules: string[];
    };
    failedDeviceIds: string[];
}

export function MoveBlockedDialog({ isOpen, onClose, blockedBy, failedDeviceIds }: MoveBlockedDialogProps) {
    const { state } = useWarehouse();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-6 w-6" />
                        <DialogTitle>Move Blocked</DialogTitle>
                    </div>
                    <DialogDescription>
                        This move violates the rules set by the <strong>{blockedBy.departmentName}</strong> department.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                        <h4 className="font-semibold text-sm text-destructive mb-1">Violated Rules:</h4>
                        <ul className="list-disc list-inside text-sm text-destructive/90">
                            {blockedBy.rules.map((rule, i) => (
                                <li key={i}>{rule}</li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-medium text-sm mb-2">Failed Devices ({failedDeviceIds.length}):</h4>
                        <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 bg-muted/50 text-sm space-y-1">
                            {failedDeviceIds.map(id => {
                                const device = state.entities[id];
                                return (
                                    <div key={id} className="flex items-center justify-between">
                                        <span className="font-mono text-xs">{device?.label || id}</span>
                                        <span className="text-xs text-muted-foreground">{device?.deviceAttributes?.sku || 'Unknown SKU'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
