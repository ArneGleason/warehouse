import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WarehouseEntity, DeviceAttributes } from '@/lib/warehouse';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X } from 'lucide-react';

interface BulkEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDevices: WarehouseEntity[];
    onConfirm: (updates: Partial<DeviceAttributes>) => void;
}

const EDITABLE_FIELDS: { key: keyof DeviceAttributes; label: string; type: 'text' | 'boolean' }[] = [
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'vendor_sku', label: 'Vendor SKU', type: 'text' },
    { key: 'po_number', label: 'PO Number', type: 'text' },
    { key: 'presold_order_number', label: 'Presold Order #', type: 'text' },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'capacity_gb', label: 'Capacity (GB)', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'carrier', label: 'Carrier', type: 'text' },
    { key: 'lock_status', label: 'Lock Status', type: 'text' },
    { key: 'grade', label: 'Grade', type: 'text' },
    { key: 'tested', label: 'Tested', type: 'boolean' },
    { key: 'sellable', label: 'Processed', type: 'boolean' },
];

export function BulkEditDialog({ isOpen, onClose, selectedDevices, onConfirm }: BulkEditDialogProps) {
    const [updates, setUpdates] = useState<Partial<DeviceAttributes>>({});
    const [initialValues, setInitialValues] = useState<Record<string, any>>({});
    const [mixedFields, setMixedFields] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<'edit' | 'confirm'>('edit');

    useEffect(() => {
        if (isOpen && selectedDevices.length > 0) {
            const newInitialValues: Record<string, any> = {};
            const newMixedFields = new Set<string>();

            EDITABLE_FIELDS.forEach(field => {
                const values = selectedDevices.map(d => d.deviceAttributes?.[field.key]);
                const firstValue = values[0];
                const allSame = values.every(v => v === firstValue);

                if (allSame) {
                    newInitialValues[field.key as string] = firstValue;
                } else {
                    newMixedFields.add(field.key as string);
                    newInitialValues[field.key as string] = 'MIXED'; // Placeholder
                }
            });

            setInitialValues(newInitialValues);
            setMixedFields(newMixedFields);
            setUpdates({});
            setStep('edit');
        }
    }, [isOpen, selectedDevices]);

    const handleUpdate = (key: keyof DeviceAttributes, value: any) => {
        setUpdates(prev => {
            const newUpdates = { ...prev, [key]: value };
            // If value matches initial (and not mixed), remove from updates
            if (!mixedFields.has(key as string) && value === initialValues[key as string]) {
                delete newUpdates[key];
            }
            // If value is empty string and initial was undefined/null, remove?
            // No, user might want to clear it.
            return newUpdates;
        });
    };

    const getDisplayValue = (key: string) => {
        if (key in updates) {
            return updates[key as keyof DeviceAttributes];
        }
        if (mixedFields.has(key)) {
            return ''; // Show empty for mixed, with placeholder
        }
        return initialValues[key] || '';
    };

    const handleSave = () => {
        onConfirm(updates);
        onClose();
    };

    const changedFields = Object.keys(updates) as (keyof DeviceAttributes)[];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bulk Edit Attributes</DialogTitle>
                    <DialogDescription>
                        Editing {selectedDevices.length} devices
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'edit' ? (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="grid grid-cols-2 gap-4 py-4">
                                {EDITABLE_FIELDS.map(field => {
                                    const isMixed = mixedFields.has(field.key as string);
                                    const isModified = field.key in updates;

                                    return (
                                        <div key={field.key} className="space-y-2">
                                            <Label
                                                htmlFor={field.key as string}
                                                className={isModified ? "text-blue-600 dark:text-blue-400 font-medium" : ""}
                                            >
                                                {field.label}
                                                {isModified && " *"}
                                            </Label>

                                            {field.type === 'boolean' ? (
                                                <div className="flex items-center space-x-2 h-10">
                                                    <Checkbox
                                                        id={field.key as string}
                                                        checked={getDisplayValue(field.key as string) === true}
                                                        onCheckedChange={(checked) => handleUpdate(field.key, checked)}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {isMixed && !(field.key in updates) ? "(Mixed values)" : (getDisplayValue(field.key as string) ? "Yes" : "No")}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <Input
                                                        id={field.key as string}
                                                        value={getDisplayValue(field.key as string) as string}
                                                        placeholder={isMixed ? "Mixed values" : ""}
                                                        onChange={(e) => handleUpdate(field.key, e.target.value)}
                                                        className={isMixed && !(field.key in updates) ? "italic text-muted-foreground placeholder:text-muted-foreground/50" : ""}
                                                    />
                                                    {isModified && (
                                                        <div className="absolute right-2 top-2.5 h-4 w-4 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="col-span-2 pt-4 border-t mt-2">
                                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">Non-Editable Unique Attributes</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        <Badge variant="outline">ID</Badge>
                                        <Badge variant="outline">IMEI</Badge>
                                        <Badge variant="outline">Barcode</Badge>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-medium text-yellow-800 dark:text-yellow-300">Confirm Bulk Changes</p>
                                    <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                                        You are about to update <strong>{selectedDevices.length}</strong> devices. This action cannot be easily undone for individual fields.
                                    </p>
                                </div>
                            </div>

                            <div className="border rounded-md">
                                <div className="bg-muted/50 px-4 py-2 border-b text-sm font-medium">
                                    Summary of Changes
                                </div>
                                <ScrollArea className="h-[200px]">
                                    <div className="p-4 space-y-3">
                                        {changedFields.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">No changes made.</p>
                                        ) : (
                                            changedFields.map(key => {
                                                const field = EDITABLE_FIELDS.find(f => f.key === key);
                                                const val = updates[key];
                                                return (
                                                    <div key={key} className="flex justify-between items-center text-sm">
                                                        <span className="font-medium">{field?.label || key}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground line-through text-xs">
                                                                {mixedFields.has(key as string) ? 'Mixed' : String(initialValues[key as string] || 'Empty')}
                                                            </span>
                                                            <span className="text-muted-foreground">→</span>
                                                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                                                {String(val)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t">
                    {step === 'edit' ? (
                        <>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                onClick={() => setStep('confirm')}
                                disabled={changedFields.length === 0}
                            >
                                Review Changes
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep('edit')}>Back</Button>
                            <Button onClick={handleSave} variant="default">
                                Confirm & Save
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
