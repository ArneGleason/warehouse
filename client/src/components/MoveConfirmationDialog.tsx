import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from 'lucide-react';

interface MoveConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    count: number;
    targetName: string;
    sourceName: string;
    skuSummary: string;
}

export function MoveConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    count,
    targetName,
    sourceName,
    skuSummary
}: MoveConfirmationDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <ClipboardCheck className="h-6 w-6" />
                        <DialogTitle>Confirm Move</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-base space-y-2">
                        <div>
                            You are about to move <span className="font-semibold text-foreground">{count}</span> items.
                        </div>
                        <div className="text-sm bg-muted p-3 rounded-md space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">From:</span>
                                <span className="font-medium text-foreground">{sourceName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">To:</span>
                                <span className="font-medium text-foreground">{targetName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Items:</span>
                                <span className="font-medium text-foreground">{skuSummary}</span>
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-muted-foreground">
                    Are you sure you want to continue?
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => {
                        onConfirm();
                        onClose();
                    }}>
                        Confirm Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
