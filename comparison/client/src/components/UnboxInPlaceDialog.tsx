import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PackageOpen } from 'lucide-react';

interface UnboxInPlaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    deviceCount: number;
    onConfirm: (deleteBox: boolean) => void;
}

export function UnboxInPlaceDialog({ isOpen, onClose, deviceCount, onConfirm }: UnboxInPlaceDialogProps) {
    const [deleteBox, setDeleteBox] = useState(true);

    const handleConfirm = () => {
        onConfirm(deleteBox);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageOpen className="h-5 w-5" />
                        Unbox Selected Devices
                    </DialogTitle>
                    <DialogDescription>
                        This will move {deviceCount} device{deviceCount !== 1 ? 's' : ''} out of the box and place them in the parent location.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 py-4">
                    <Checkbox
                        id="delete-box"
                        checked={deleteBox}
                        onCheckedChange={(checked) => setDeleteBox(checked as boolean)}
                    />
                    <Label htmlFor="delete-box" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Delete box after unboxing
                    </Label>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} variant="destructive">Unbox Devices</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
