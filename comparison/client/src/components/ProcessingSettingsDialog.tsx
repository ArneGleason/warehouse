import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { toast } from 'sonner';

interface ProcessingSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProcessingSettingsDialog({ isOpen, onClose }: ProcessingSettingsDialogProps) {
    const { state, updateConfig } = useWarehouse();
    const [settings, setSettings] = useState({
        maxMoveWithoutConfirm: 50,
        processingSourceBinId: null as string | null,
        processingDestBinId: null as string | null,
        processingExceptionBinId: null as string | null,
        receivingBinId: null as string | null
    });

    // Load initial values from state
    useEffect(() => {
        if (isOpen) {
            setSettings({
                maxMoveWithoutConfirm: state.maxMoveWithoutConfirm || 50,
                processingSourceBinId: state.processingSourceBinId || null,
                processingDestBinId: state.processingDestBinId || null,
                processingExceptionBinId: state.processingExceptionBinId || null,
                receivingBinId: state.receivingBinId || null,
            });
        }
    }, [isOpen, state.maxMoveWithoutConfirm, state.processingSourceBinId, state.processingDestBinId, state.processingExceptionBinId, state.receivingBinId]);

    const handleSave = () => {
        updateConfig({
            maxMoveWithoutConfirm: settings.maxMoveWithoutConfirm,
            processingSourceBinId: settings.processingSourceBinId,
            processingDestBinId: settings.processingDestBinId,
            processingExceptionBinId: settings.processingExceptionBinId,
            receivingBinId: settings.receivingBinId,
        });
        toast.success("Processing settings updated");
        onClose();
    };

    // Get all bins for selection
    // We can also include Storage Areas if needed, but Prompt said "Bin".
    // Let's format the label to include parent info for clarity.
    const getBinOptions = () => {
        return Object.values(state.entities)
            .filter(e => e.type === 'Bin')
            .map(bin => {
                const parent = bin.parentId ? state.entities[bin.parentId] : null;
                const grandParent = parent?.parentId ? state.entities[parent.parentId] : null;

                let locationString = bin.label;
                if (grandParent) locationString = `${grandParent.label} > ${parent?.label} > ${bin.label}`;
                else if (parent) locationString = `${parent.label} > ${bin.label}`;

                return {
                    id: bin.id,
                    label: locationString,
                    originalLabel: bin.label
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const binOptions = getBinOptions();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Processing Configuration</DialogTitle>
                    <DialogDescription>
                        Configure the workflow for processing devices.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="receiving-bin">Default Receiving Bin (For POs)</Label>
                        <Select
                            value={settings.receivingBinId || ''}
                            onValueChange={(val) => setSettings({ ...settings, receivingBinId: val })}
                        >
                            <SelectTrigger id="receiving-bin">
                                <SelectValue placeholder="Select a bin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {binOptions.map(bin => (
                                    <SelectItem key={bin.id} value={bin.id}>
                                        {bin.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Purchase Order "Done" actions will create inventory in this bin.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="source-bin">Source Bin (Ready to Scan)</Label>
                        <Select
                            value={settings.processingSourceBinId || ''}
                            onValueChange={(val) => setSettings({ ...settings, processingSourceBinId: val })}
                        >
                            <SelectTrigger id="source-bin">
                                <SelectValue placeholder="Select a bin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {binOptions.map(bin => (
                                    <SelectItem key={bin.id} value={bin.id}>
                                        {bin.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Devices in this bin will be available for matching with test results.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dest-bin">Destination Bin (Processed)</Label>
                        <Select
                            value={settings.processingDestBinId || ''}
                            onValueChange={(val) => setSettings({ ...settings, processingDestBinId: val })}
                        >
                            <SelectTrigger id="dest-bin">
                                <SelectValue placeholder="Select a bin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {binOptions.map(bin => (
                                    <SelectItem key={bin.id} value={bin.id}>
                                        {bin.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Successfully processed devices will be moved to this bin.
                        </p>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="exception-bin">Blocked Bin (Exceptions Requiring Correction)</Label>
                        <Select
                            value={settings.processingExceptionBinId || ''}
                            onValueChange={(val) => setSettings({ ...settings, processingExceptionBinId: val })}
                        >
                            <SelectTrigger id="exception-bin">
                                <SelectValue placeholder="Select a bin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {binOptions.map(bin => (
                                    <SelectItem key={bin.id} value={bin.id}>
                                        {bin.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Devices flagged as exceptions will be moved to this bin.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
