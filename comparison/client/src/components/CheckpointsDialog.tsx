import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Loader2, Save, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CheckpointsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Checkpoint {
    id: string;
    name: string;
    createdAt: string;
}

export function CheckpointsDialog({ isOpen, onClose }: CheckpointsDialogProps) {
    const { createCheckpoint, restoreCheckpoint, loadCheckpoints } = useWarehouse();
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await loadCheckpoints();
            setCheckpoints(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load checkpoints');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await createCheckpoint(newName);
            setNewName('');
            toast.success('Checkpoint created');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create checkpoint');
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to restore "${name}"? Current unsaved changes will be lost.`)) return;

        try {
            await restoreCheckpoint(id);
            toast.success(`Restored "${name}"`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to restore checkpoint');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Version Checkpoints</DialogTitle>
                    <DialogDescription>
                        Save the current state or restore a previous version.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2 items-end">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="name">New Checkpoint Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Before Reorg"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                        </Button>
                    </div>

                    <div className="border rounded-md">
                        <div className="bg-muted px-4 py-2 text-xs font-medium">
                            History
                        </div>
                        <ScrollArea className="h-[300px]">
                            {loading ? (
                                <div className="flex justify-center items-center h-20">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : checkpoints.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    No checkpoints saved yet.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {checkpoints.map((cp) => (
                                        <div key={cp.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                            <div>
                                                <div className="font-medium text-sm">{cp.name}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(cp.createdAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleRestore(cp.id, cp.name)}>
                                                <RotateCcw className="h-3 w-3 mr-2" />
                                                Restore
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
