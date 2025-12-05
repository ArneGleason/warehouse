import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WarehouseEntity } from '@/lib/warehouse';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Package } from 'lucide-react';

interface BoxInPlaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDevices: WarehouseEntity[];
    onConfirm: (label: string, barcode: string) => void;
}

export function BoxInPlaceDialog({ isOpen, onClose, selectedDevices, onConfirm }: BoxInPlaceDialogProps) {
    const { state } = useWarehouse();
    const [barcode, setBarcode] = useState('');
    const [label, setLabel] = useState('');

    // Helper to calculate label based on barcode and devices
    const calculateLabel = (currentBarcode: string) => {
        if (!selectedDevices.length) return '';

        // 1. Calculate SKU counts
        const skuCounts: Record<string, number> = {};
        selectedDevices.forEach(d => {
            const sku = d.deviceAttributes?.sku || 'Unknown SKU';
            skuCounts[sku] = (skuCounts[sku] || 0) + 1;
        });

        // 2. Find Most Representative SKU
        const sortedSkus = Object.entries(skuCounts).sort((a, b) => b[1] - a[1]);
        const [mostRepSku, count] = sortedSkus[0];
        const otherSkuCount = sortedSkus.length - 1;

        // 3. Format Label
        // {{Barcode}} • {{MostRepSKU}} [+ {{N}} MORE]
        let labelStr = `${currentBarcode || '...'} • ${mostRepSku}`;
        if (otherSkuCount > 0) {
            labelStr += ` + ${otherSkuCount} MORE`;
        }
        return labelStr;
    };

    useEffect(() => {
        if (isOpen) {
            // Generate Barcode
            let maxNum = 0;
            Object.values(state.entities).forEach(entity => {
                if (entity.barcode && entity.barcode.startsWith('BX_')) {
                    const numPart = parseInt(entity.barcode.substring(3));
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                }
            });
            const newBarcode = `BX_${maxNum + 1}`;
            setBarcode(newBarcode);
            setLabel(calculateLabel(newBarcode));
        }
    }, [isOpen, selectedDevices, state.entities]);

    // Update label when barcode changes
    useEffect(() => {
        setLabel(calculateLabel(barcode));
    }, [barcode, selectedDevices]);

    const handleConfirm = () => {
        if (!barcode.trim()) return;
        // Pass barcode as the label to avoid double-labeling in Explorer (which appends SKU summary dynamically)
        onConfirm(barcode, barcode);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Box Selected Devices
                    </DialogTitle>
                    <DialogDescription>
                        Group {selectedDevices.length} selected devices into a new Box.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="box-barcode">Barcode <span className="text-destructive">*</span></Label>
                        <Input
                            id="box-barcode"
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            placeholder="Enter barcode..."
                            autoFocus
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Default is auto-generated (BX_#). Required.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Box Label (Preview)</Label>
                        <div className="p-2 bg-muted rounded-md text-sm font-medium text-muted-foreground break-all">
                            {label}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!barcode.trim()}>Box Devices</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
