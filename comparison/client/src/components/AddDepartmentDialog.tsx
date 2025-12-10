"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface AddDepartmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
}

export function AddDepartmentDialog({ isOpen, onClose, onConfirm }: AddDepartmentDialogProps) {
    const [name, setName] = useState('');

    const handleConfirm = () => {
        if (name.trim()) {
            onConfirm(name.trim());
            onClose();
            setName('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Department
                    </DialogTitle>
                    <DialogDescription>
                        Enter a name for the new department.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input
                            id="dept-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. Receiving"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!name.trim()}>
                        Add Department
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
