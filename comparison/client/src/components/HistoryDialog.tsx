"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/history';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HistoryDialog({ isOpen, onClose }: HistoryDialogProps) {
    const logs = useLiveQuery(() => db.logs.orderBy('timestamp').reverse().toArray());

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Action History</DialogTitle>
                    <DialogDescription>
                        Log of recent actions performed in this session.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">Action</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{log.actionType}</TableCell>
                                    <TableCell>{log.details}</TableCell>
                                </TableRow>
                            ))}
                            {logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                        No actions recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
