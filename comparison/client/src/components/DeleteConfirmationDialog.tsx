"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    entityName: string;
    validationText?: string;
}

export function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, entityName, validationText = 'delete' }: DeleteConfirmationDialogProps) {
    const [confirmText, setConfirmText] = useState('');
    const isValid = !validationText || confirmText.toLowerCase() === validationText.toLowerCase();

    const handleConfirm = () => {
        if (isValid) {
            onConfirm();
            onClose();
            setConfirmText('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Confirm Deletion
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-foreground">{entityName}</span>?
                        This action cannot be undone.{validationText && ' All associated data will be removed.'}
                    </DialogDescription>
                </DialogHeader>

                {validationText && (
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="confirm">Type "{validationText}" to confirm</Label>
                            <Input
                                id="confirm"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={validationText}
                                className="border-destructive/50 focus-visible:ring-destructive"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isValid}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
