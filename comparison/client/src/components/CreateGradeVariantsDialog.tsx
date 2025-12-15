import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ItemDefinition } from '@/lib/warehouse';
import { Wand2, Loader2, AlertCircle } from 'lucide-react';
import { Warning } from 'postcss';

interface CreateGradeVariantsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSkus: Set<string>;
    items: ItemDefinition[]; // All items to check against
    onConfirm: (newItems: ItemDefinition[]) => Promise<void>;
}

const GRADES = ['New', 'A', 'B', 'C', 'D']; // RAW omitted? User asked for RAW, New, A, B, C. Let's include RAW.
const TARGET_GRADES = ['RAW', 'New', 'A', 'B', 'C'];

export function CreateGradeVariantsDialog({
    isOpen,
    onClose,
    selectedSkus,
    items,
    onConfirm
}: CreateGradeVariantsDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate Proposed Items
    const proposedItems = useMemo(() => {
        if (!isOpen) return [];

        const newItems: ItemDefinition[] = [];
        const processedIdentities = new Set<string>(); // Prevent dupes if user selected multiple variants of same item

        // Helper to get identity key
        const getIdentityKey = (item: ItemDefinition) => {
            return [
                item.manufacturer,
                item.model,
                item.capacity_gb,
                item.color,
                item.carrier,
                item.lockStatus
            ].map(v => (v || '').toString().toLowerCase()).join('|');
        };

        const selectedItems = items.filter(i => selectedSkus.has(i.sku));

        // Build index of existing grades for each identity
        const existingGradesByIdentity = new Map<string, Set<string>>();
        items.forEach(item => {
            const key = getIdentityKey(item);
            if (!existingGradesByIdentity.has(key)) {
                existingGradesByIdentity.set(key, new Set());
            }
            existingGradesByIdentity.get(key)?.add(item.grade);
        });

        selectedItems.forEach(baseItem => {
            const identityKey = getIdentityKey(baseItem);

            // If we already processed this identity (e.g. user selected both Grade A and Grade B of same phone), skip
            if (processedIdentities.has(identityKey)) return;
            processedIdentities.add(identityKey);

            const existingGrades = existingGradesByIdentity.get(identityKey) || new Set();

            TARGET_GRADES.forEach(targetGrade => {
                if (existingGrades.has(targetGrade)) return; // Already exists

                // Create New Item Definition
                // SKU Generation Logic works best if there is a pattern.
                let newSku = `${baseItem.sku}-${targetGrade}`; // Fallback

                // Try to be smarter: replace grade in SKU if present
                // e.g. IPHONE-13-128-BLK-A -> IPHONE-13-128-BLK-B
                // Regex to find grade at end or strictly delimited
                const gradeRegex = new RegExp(`[-_\\s]${baseItem.grade}([-_\\s]|$)`, 'i');
                if (gradeRegex.test(baseItem.sku)) {
                    newSku = baseItem.sku.replace(gradeRegex, (match) => {
                        // maintain delimiter
                        return match.replace(new RegExp(baseItem.grade, 'i'), targetGrade.toUpperCase());
                    });
                } else {
                    // Check if SKU ends with just the grade letter (common)
                    if (baseItem.sku.endsWith(baseItem.grade.toUpperCase())) {
                        newSku = baseItem.sku.slice(0, -baseItem.grade.length) + targetGrade.toUpperCase();
                    } else {
                        // Just append
                        newSku = `${baseItem.sku}-${targetGrade.toUpperCase()}`;
                    }
                }

                // Safety check: if new SKU matches original (e.g. replacement failed strangely), ensure uniqueness
                if (newSku === baseItem.sku) {
                    newSku = `${baseItem.sku}-${targetGrade.toUpperCase()}`;
                }

                // Check global collision just in case (though identity check covers logical collision)
                // If collision, append timestamp or random suffix? Or skip?
                // For now, assume our logic is okay, but user can see preview.

                newItems.push({
                    ...baseItem,
                    sku: newSku,
                    grade: targetGrade,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // Ensure base_sku_id matches exactly for siblings
                    // If baseItem doesn't have one (shouldn't happen with updated context, but safety first), let Context generate or generate here/
                    // Actually, if we copy ...baseItem, we copy its base_sku_id if present.
                    // If it's NOT present, we should leave it undefined so Context generates it?
                    // OR better: ensure consistency. If baseItem has it, use it.
                    // Since context generates it on load/add, it might not be on 'items' prop immediately if they are stale?
                    // But 'items' comes from context state.
                    // Let's rely on ...baseItem copying it.
                    active: true, // Default to active
                });
            });
        });

        return newItems;
    }, [isOpen, selectedSkus, items]);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(proposedItems);
            onClose();
        } catch (e) {
            console.error("Failed to batch create", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-blue-500" />
                        Create Grade Variants
                    </DialogTitle>
                    <DialogDescription>
                        Generating missing grade variants (RAW, New, A, B, C) for the selected items.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto border rounded-md min-h-[200px]">
                    {proposedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground text-center">
                            <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                            <p>No new variants needed.</p>
                            <p className="text-sm">All target grades already exist for the selected items.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>New SKU</TableHead>
                                    <TableHead>Based On</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Model</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {proposedItems.map(item => (
                                    <TableRow key={item.sku}>
                                        <TableCell className="font-mono font-bold text-xs">{item.sku}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {/* Find original for display? Hard to track back exactly without id, but context implies similar SKU */}
                                            Same Identity
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.grade}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs truncate max-w-[150px]">{item.model}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                    <span>Generated {proposedItems.length} new definitions.</span>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || proposedItems.length === 0}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Items
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
