"use client";

import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { ENTITY_CONFIG, WarehouseEntity } from '@/lib/warehouse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import * as Icons from 'lucide-react';
import { getEntityHistory, ActionLog } from '@/lib/history';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';

import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { QuickMoveDialog } from '@/components/QuickMoveDialog';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Move, Upload, ShieldAlert, Printer, Copy, Plus, QrCode } from 'lucide-react';
import { XlsxImportDialog } from '@/components/XlsxImportDialog';
import { RuleCondition, DepartmentRules } from '@/lib/warehouse';
import { validateMove } from '@/lib/rules';
import { MoveBlockedDialog } from '@/components/MoveBlockedDialog';
import { MoveConfirmationDialog } from '@/components/MoveConfirmationDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoxInPlaceDialog } from '@/components/BoxInPlaceDialog';
import { UnboxInPlaceDialog } from './UnboxInPlaceDialog';
import { BulkEditDialog } from './BulkEditDialog';
import { v4 as uuidv4 } from 'uuid';

interface InventoryItem {
    sku: string;
    description: string;
    total: number;
    onHandSellable: number;
    allocated: number;
    available?: number; // Optional, computed for sorting
}

function InventoryTable({ data }: { data: InventoryItem[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem; direction: 'asc' | 'desc' } | null>(null);

    // Filter
    const filteredData = data.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        const getValue = (item: InventoryItem, k: keyof InventoryItem) => {
            if (k === 'available') {
                return item.onHandSellable - item.allocated;
            }
            return item[k];
        };

        const valA = getValue(a, key);
        const valB = getValue(b, key);

        if (valA! < valB!) return direction === 'asc' ? -1 : 1;
        if (valA! > valB!) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof InventoryItem) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b">
                <div className="relative">
                    <Icons.Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search SKU or Description..."
                        className="pl-8 pr-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setSearchTerm('')}
                        >
                            <Icons.X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('sku')}>
                                <div className="flex items-center gap-1">
                                    SKU
                                    {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('description')}>
                                <div className="flex items-center gap-1">
                                    Description
                                    {sortConfig?.key === 'description' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none">
                                <div className="flex items-center justify-end gap-1">
                                    Avg Cost
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('total')}>
                                <div className="flex items-center justify-end gap-1">
                                    Total
                                    {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('onHandSellable')}>
                                <div className="flex items-center justify-end gap-1">
                                    Processed
                                    {sortConfig?.key === 'onHandSellable' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('allocated')}>
                                <div className="flex items-center justify-end gap-1">
                                    Allocated
                                    {sortConfig?.key === 'allocated' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('available')}>
                                <div className="flex items-center justify-end gap-1">
                                    Available
                                    {sortConfig?.key === 'available' && (sortConfig.direction === 'asc' ? <Icons.ArrowUp className="h-3 w-3" /> : <Icons.ArrowDown className="h-3 w-3" />)}
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    {searchTerm ? 'No matching inventory found' : 'No inventory found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((item) => (
                                <TableRow key={item.sku}>
                                    <TableCell className="font-medium">{item.sku}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">$100.00</TableCell>
                                    <TableCell className="text-right">{item.total}</TableCell>
                                    <TableCell className="text-right">{item.onHandSellable}</TableCell>
                                    <TableCell className="text-right">{item.allocated}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {item.onHandSellable - item.allocated}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function HistoryTable({ entityId }: { entityId: string }) {
    const [history, setHistory] = useState<ActionLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        getEntityHistory(entityId).then(setHistory);
    }, [entityId]);

    const filteredHistory = history.filter(log =>
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b">
                <div className="relative">
                    <Icons.Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search history..."
                        className="pl-8 pr-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setSearchTerm('')}
                        >
                            <Icons.X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    No history found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">
                                        <Badge variant="outline">{log.actionType}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{log.details}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

interface PropertiesPanelProps {
    selectedIds: Set<string>;
    grouping: 'none' | 'po' | 'sku' | 'presold' | 'processed';
    onSelect?: (ids: Set<string>) => void;
}

function BarcodeDialog({ value, isOpen, onClose, onSave }: { value: string, isOpen: boolean, onClose: () => void, onSave: (val: string) => void }) {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value, isOpen]);

    const handleSave = () => {
        onSave(currentValue);
        onClose();
    };

    const handleClear = () => {
        onSave('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{value ? 'Edit Barcode' : 'Add Barcode'}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="bg-white p-4 rounded-lg border shadow-sm min-h-[200px] min-w-[200px] flex items-center justify-center">
                        {currentValue ? (
                            <QRCode value={currentValue} size={200} />
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                <QrCode className="h-16 w-16 opacity-20" />
                                <span className="text-xs">No Barcode</span>
                            </div>
                        )}
                    </div>

                    <div className="w-full space-y-2">
                        <Label>Barcode Value</Label>
                        <div className="flex gap-2">
                            <Input
                                value={currentValue}
                                onChange={(e) => setCurrentValue(e.target.value)}
                                placeholder="Enter barcode value..."
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {value && (
                        <Button variant="outline" className="sm:mr-auto" onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                                printWindow.document.write(`
                                    <html>
                                        <head>
                                            <title>Print Barcode - ${value}</title>
                                            <style>
                                                body {
                                                    display: flex;
                                                    flex-direction: column;
                                                    align-items: center;
                                                    justify-content: center;
                                                    height: 100vh;
                                                    margin: 0;
                                                    font-family: monospace;
                                                }
                                                .barcode-container {
                                                    text-align: center;
                                                }
                                                .value {
                                                    margin-top: 10px;
                                                    font-size: 24px;
                                                    font-weight: bold;
                                                }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="barcode-container">
                                                ${document.getElementById(`qr-header-${value}`)?.outerHTML || ''}
                                                <div class="value">${value}</div>
                                            </div>
                                            <script>
                                                window.onload = () => {
                                                    window.print();
                                                    window.close();
                                                };
                                            </script>
                                        </body>
                                    </html>
                                `);
                                printWindow.document.close();
                            }
                        }}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                    )}
                    <div className="flex gap-2">
                        {value && (
                            <Button variant="destructive" onClick={handleClear}>
                                Clear
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BarcodeHeaderControl({ value, onSave }: { value: string, onSave: (val: string) => void }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        toast.success('Barcode copied to clipboard');
    };

    if (!value) {
        return (
            <>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 ml-2"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus className="h-3 w-3" />
                    ADD BARCODE
                </Button>
                <BarcodeDialog
                    value={value}
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSave={onSave}
                />
            </>
        );
    }

    return (
        <>
            <div className="flex items-center gap-3 ml-4 h-10 px-2 rounded-md border bg-card/50 hover:bg-card transition-colors group">
                <div
                    className="bg-white p-0.5 rounded cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setIsDialogOpen(true)}
                    title="Click to edit/print"
                >
                    <div id={`qr-header-${value}`}>
                        <QRCode value={value} size={32} />
                    </div>
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={handleCopy}
                    title="Click to copy"
                >
                    <span className="font-mono font-medium text-sm">{value}</span>
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                </div>
            </div>
            <BarcodeDialog
                value={value}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={onSave}
            />
        </>
    );
}

function EditableProperty({ label, value, onSave, placeholder, rightElement }: { label: string, value: string, onSave: (val: string) => void, placeholder?: string, rightElement?: React.ReactNode }) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleSave = () => {
        onSave(currentValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCurrentValue(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="space-y-2">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                    <Input
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        placeholder={placeholder}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                        }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSave}>
                        <Icons.Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleCancel}>
                        <Icons.X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1 group relative">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex items-center justify-between p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-all min-h-[2.5rem] pr-10">
                <span className={cn("text-sm font-medium", !value && "text-muted-foreground italic")}>
                    {value || placeholder || 'Empty'}
                </span>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditing(true)}
                >
                    <Icons.Pencil className="h-3 w-3" />
                </Button>
            </div>
            {rightElement && (
                <div className="absolute right-2 top-[2.1rem]">
                    {rightElement}
                </div>
            )}
        </div>
    );
}

function HeaderEditableLabel({ value, onSave }: { value: string, onSave: (val: string) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleSave = () => {
        onSave(currentValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCurrentValue(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="h-8 w-[200px] font-semibold text-lg"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <Button size="sm" variant="ghost" className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                    OK
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                    Cancel
                </Button>
            </div>
        );
    }

    return (
        <span
            className="cursor-pointer hover:underline hover:text-primary decoration-dotted underline-offset-4"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            title="Click to edit label"
        >
            {value}
        </span>
    );
}

function QueueDeviceList({ devices, onSelect }: { devices: WarehouseEntity[], onSelect?: (id: string) => void }) {
    return (
        <div className="space-y-1">
            {devices.map(device => (
                <div
                    key={device.id}
                    className="flex items-center p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => onSelect?.(device.id)}
                >
                    <Icons.Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                                {device.label}
                            </span>
                            {/* Status Badges */}
                            <div className="flex items-center gap-1">
                                {!device.deviceAttributes?.sku && (
                                    <Badge variant="destructive" className="h-3 px-1 text-[9px]">Unknown</Badge>
                                )}
                                {device.deviceAttributes?.sku && device.deviceAttributes?.tested && (
                                    <Badge className="h-3 px-1 text-[9px] bg-blue-500 hover:bg-blue-600">Tested</Badge>
                                )}
                                {(device.deviceAttributes?.imei) && (
                                    <Badge className="h-3 px-1 text-[9px] bg-purple-500 hover:bg-purple-600">Serialized</Badge>
                                )}
                                {device.deviceAttributes?.sellable && (
                                    <Badge className="h-3 px-1 text-[9px] bg-green-500 hover:bg-green-600">Processed</Badge>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {device.deviceAttributes?.sku || 'No SKU'}
                            {device.deviceAttributes?.imei ? ` • ${device.deviceAttributes.imei}` : ''}
                        </div>
                    </div>
                    <Icons.ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                </div>
            ))}
            {devices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No devices in this queue
                </div>
            )}
        </div>
    );
}

function TestingTabContent({ testResult, onClear }: { testResult: any, onClear: () => void }) {
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    if (!testResult) {
        return (
            <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Icons.FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No test results available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 overflow-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">Test Result</h3>
                    <p className="text-xs text-muted-foreground">
                        {new Date(testResult.timestamp).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={testResult.status === 'PASS' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                        {testResult.status}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setClearDialogOpen(true)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Clear Test Result
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground block text-xs">Model</span>
                    <span className="font-medium">{testResult.model}</span>
                </div>
                <div>
                    <span className="text-muted-foreground block text-xs">IMEI</span>
                    <span className="font-medium font-mono">{testResult.imei}</span>
                </div>
                <div>
                    <span className="text-muted-foreground block text-xs">Manufacturer</span>
                    <span className="font-medium">{testResult.manufacturer || '-'}</span>
                </div>
                <div>
                    <span className="text-muted-foreground block text-xs">Source</span>
                    <span className="font-medium">{testResult.automated?.source || 'Manual'}</span>
                </div>
            </div>

            {testResult.automated && (
                <div className="space-y-3">
                    <h4 className="font-medium text-sm border-b pb-1">Automated Checks</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        {Object.entries(testResult.automated.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                                <span className="text-muted-foreground capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className={cn(
                                    "font-medium",
                                    value === 'Pass' || value === 'OK' || value === 'Unlocked' ? "text-green-600 dark:text-green-400" :
                                        value === 'Fail' || value === 'Locked' ? "text-red-600 dark:text-red-400" : ""
                                )}>
                                    {value as React.ReactNode}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear Test Result</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to clear the test result for this device? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => {
                            onClear();
                            setClearDialogOpen(false);
                        }}>Clear Result</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function BinContentsList({ devices, onSelect }: { devices: WarehouseEntity[], onSelect?: (id: string) => void }) {
    return (
        <div className="space-y-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
                <Icons.Layers className="h-4 w-4 text-muted-foreground" />
                Contents ({devices.length})
            </h3>
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {devices.map(device => (
                    <div
                        key={device.id}
                        className="flex items-center p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => onSelect?.(device.id)}
                    >
                        <Icons.Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                    {device.label}
                                </span>
                                <div className="flex items-center gap-1">
                                    {device.deviceAttributes?.tested && (
                                        <Badge className="h-3 px-1 text-[9px] bg-blue-500">Tested</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                                {device.deviceAttributes?.sku || 'No SKU'}
                            </div>
                        </div>
                    </div>
                ))}
                {devices.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-xs border border-dashed rounded-md">
                        Bin is empty
                    </div>
                )}
            </div>
        </div>
    );
}

export function PropertiesPanel({ selectedIds, grouping, onSelect }: PropertiesPanelProps) {
    const { state, updateEntity, addEntity, deleteEntity, deleteEntities, moveEntity, moveEntities, undo, boxEntities, unboxEntities, updateEntities } = useWarehouse();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);


    const [quickMoveOpen, setQuickMoveOpen] = useState(false);
    const [importTargetId, setImportTargetId] = useState<string | null>(null);
    const [moveBlockedInfo, setMoveBlockedInfo] = useState<{ blockedBy: { departmentName: string; rules: string[] }; failedDeviceIds: string[] } | null>(null);
    const [moveConfirmationInfo, setMoveConfirmationInfo] = useState<{ count: number; targetName: string; sourceName: string; skuSummary: string; draggedIds: string[]; targetId: string | null } | null>(null);
    const [isBoxDialogOpen, setIsBoxDialogOpen] = useState(false);

    const maxMoveWithoutConfirm = state.maxMoveWithoutConfirm ?? 1;

    const handleBoxInPlace = (label: string, barcode: string) => {
        const selectedEntities = Array.from(selectedIds).map(id => state.entities[id]).filter(Boolean);
        if (selectedEntities.length === 0) return;

        console.log('handleBoxInPlace started', { label, barcode, count: selectedEntities.length });

        // Determine parent
        const firstParent = selectedEntities[0].parentId;
        const allSameParent = selectedEntities.every(e => e.parentId === firstParent);

        // If mixed parents, we'll put the box in the warehouse root to be safe/visible
        const targetParentId = allSameParent ? firstParent : null; // null = root

        console.log('Creating box in parent:', targetParentId);

        // Atomic Action: Create Box + Move Items
        const newBoxId = uuidv4();
        boxEntities(newBoxId, label, barcode, targetParentId, Array.from(selectedIds));

        toast.success(`Boxed ${selectedEntities.length} devices into ${label}`);

        // Auto-select the new box
        if (onSelect) {
            onSelect(new Set([newBoxId]));
        }
    };

    const [isUnboxDialogOpen, setUnboxDialogOpen] = useState(false);
    const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

    const handleUnboxInPlace = (deleteBox: boolean) => {
        const entity = state.entities[Array.from(selectedIds)[0]];
        if (!entity || entity.type !== 'Box') return;

        unboxEntities(entity.id, entity.parentId, deleteBox);
        toast.success(`Unboxed ${entity.label}`);
    };

    const handleDelete = () => {
        const count = selectedIds.size;
        deleteEntities(Array.from(selectedIds));
        setDeleteDialogOpen(false);
        toast.success(`Deleted ${count} item${count !== 1 ? 's' : ''}`);
    };

    const handleClearTestResult = (deviceId: string) => {
        const device = state.entities[deviceId];
        if (!device) return;

        updateEntity(deviceId, {
            deviceAttributes: {
                ...device.deviceAttributes,
                test_result: undefined,
                tested: false
            }
        });
        toast.success('Test result cleared');
    };

    const handleQuickMoveConfirm = (targetId: string | null) => {
        // Validate move
        const deviceIds: string[] = [];
        selectedIds.forEach(id => {
            const entity = state.entities[id];
            if (!entity) return;

            if (entity.type === 'Device') {
                deviceIds.push(id);
            } else {
                const gatherDevices = (entId: string) => {
                    const ent = state.entities[entId];
                    if (!ent) return;
                    if (ent.type === 'Device') deviceIds.push(entId);
                    ent.children.forEach(gatherDevices);
                };
                gatherDevices(id);
            }
        });

        const validation = validateMove(state, deviceIds, targetId);
        if (!validation.allowed && validation.blockedBy && validation.failedDeviceIds) {
            setMoveBlockedInfo({
                blockedBy: validation.blockedBy,
                failedDeviceIds: validation.failedDeviceIds
            });
            setQuickMoveOpen(false);
            return;
        }

        if (deviceIds.length > maxMoveWithoutConfirm) {
            const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';

            // Calculate Source Name
            let sourceName = 'Unknown';
            const firstItem = state.entities[deviceIds[0]];
            if (firstItem && firstItem.parentId) {
                const parent = state.entities[firstItem.parentId];
                if (parent) {
                    const allSameParent = deviceIds.every(id => state.entities[id]?.parentId === firstItem.parentId);
                    sourceName = allSameParent ? parent.label : 'Various Locations';
                } else if (firstItem.parentId === 'warehouse-root') {
                    sourceName = 'Warehouse Root';
                }
            }

            // Calculate SKU Summary
            const skuCounts: Record<string, number> = {};
            deviceIds.forEach(id => {
                const entity = state.entities[id];
                if (entity && entity.type === 'Device') {
                    const sku = entity.deviceAttributes?.sku || 'Unknown SKU';
                    skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                } else {
                    const type = entity ? entity.type : 'Item';
                    skuCounts[type] = (skuCounts[type] || 0) + 1;
                }
            });

            const sortedSkus = Object.entries(skuCounts).sort((a, b) => b[1] - a[1]);
            let skuSummary = '';
            if (sortedSkus.length > 0) {
                const [mostFrequentSku, count] = sortedSkus[0];
                if (sortedSkus.length === 1) {
                    skuSummary = mostFrequentSku;
                } else {
                    const otherCount = sortedSkus.slice(1).reduce((acc, [, c]) => acc + c, 0);
                    skuSummary = `${mostFrequentSku} + ${otherCount} MORE`;
                }
            } else {
                skuSummary = `${deviceIds.length} Items`;
            }

            setMoveConfirmationInfo({
                count: deviceIds.length,
                targetName,
                sourceName,
                skuSummary,
                draggedIds: deviceIds,
                targetId
            });
            setQuickMoveOpen(false);
        } else {
            moveEntities(Array.from(selectedIds), targetId);
            setQuickMoveOpen(false);
            const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';
            toast.success(`Moved ${selectedIds.size} items to ${targetName}`, {
                action: {
                    label: 'Undo',
                    onClick: () => undo()
                }
            });
        }
    };

    const isRootSelected = selectedIds.size === 0 || (selectedIds.size === 1 && selectedIds.has('warehouse-root'));

    if (isRootSelected) {
        // Calculate global inventory
        const inventory: Record<string, {
            sku: string;
            description: string;
            total: number;
            onHandSellable: number;
            allocated: number;
        }> = {};

        Object.values(state.entities).forEach(entity => {
            if (entity.type === 'Device') {
                const attrs = entity.deviceAttributes || {};
                const sku = attrs.sku || 'Unknown SKU';

                if (!inventory[sku]) {
                    // Construct description
                    const descriptionParts = [
                        attrs.manufacturer,
                        attrs.model,
                        attrs.capacity_gb ? `${attrs.capacity_gb}GB` : null,
                        attrs.lock_status,
                        attrs.grade
                    ].filter(Boolean);

                    inventory[sku] = {
                        sku,
                        description: descriptionParts.join(' ') || 'No Description',
                        total: 0,
                        onHandSellable: 0,
                        allocated: 0
                    };
                }

                inventory[sku].total++;
                if (attrs.sellable) {
                    inventory[sku].onHandSellable++;
                }
                // Allocated logic placeholder
            }
        });

        const inventoryData = Object.values(inventory);

        return (
            <div className="h-full border-l bg-background flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-1">
                        <Icons.Warehouse className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-lg">Warehouse Root</h2>
                    </div>
                    <div className="text-xs text-muted-foreground">Global Inventory</div>
                </div>

                <Tabs defaultValue="inventory" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 pt-2">
                        <TabsList className="w-full">
                            <TabsTrigger value="inventory" className="flex-1">INVENTORY</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="inventory" className="flex-1 p-0 overflow-hidden">
                        <InventoryTable data={inventoryData} />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // Handle Queue Selection
    if (selectedIds.size === 1) {
        const id = Array.from(selectedIds)[0];
        if (id.startsWith('queue-')) {
            // Parse queue ID: queue-{parentId}-{queueName}
            // But parentId might contain dashes (UUID).
            // Format: queue-{UUID}-{QueueName}
            // Let's assume QueueName doesn't have dashes or we split carefully.
            // Actually, UUID has dashes.
            // "queue-".length is 6.
            // The last part is the queue name.
            // Wait, queue names are fixed: Assigned, Active, Done, Blocked.
            // So we can check endsWith.

            const queueNames = ['Assigned', 'Active', 'Done', 'Blocked'];
            const queueName = queueNames.find(name => id.endsWith(`-${name}`));

            if (queueName) {
                const prefix = `queue-`;
                const suffix = `-${queueName}`;
                const parentId = id.substring(prefix.length, id.length - suffix.length);
                const parent = state.entities[parentId];

                if (parent) {
                    // Find devices in this queue
                    // Devices are children of the workstation (parent)
                    // And have deviceAttributes.queue === queueName
                    const devicesInQueue = parent.children
                        .map(childId => state.entities[childId])
                        .filter(child =>
                            child &&
                            child.type === 'Device' &&
                            child.deviceAttributes?.queue === queueName
                        );

                    return (
                        <div className="h-full flex flex-col bg-background">
                            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                        <Icons.Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-lg leading-none">{queueName} Queue</h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {parent.label} • {devicesInQueue.length} Devices
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4">
                                <QueueDeviceList
                                    devices={devicesInQueue}
                                    onSelect={(deviceId) => onSelect?.(new Set([deviceId]))}
                                />
                            </div>
                        </div>
                    );
                }
            }
        }
    }

    if (selectedIds.size > 1) {
        // Multi-select view
        const selectedEntities = Array.from(selectedIds).map(id => state.entities[id]).filter(Boolean);
        const count = selectedEntities.length;
        const deviceCount = selectedEntities.filter(e => e.type === 'Device').length;

        // Check if any device is already in a box
        const anyInBox = selectedEntities.some(e => {
            if (e.type !== 'Device') return false;
            const parent = state.entities[e.parentId || ''];
            return parent && parent.type === 'Box';
        });

        // Find common parent path (naive)
        const firstParentId = selectedEntities[0]?.parentId;
        const allSameParent = selectedEntities.every(e => e.parentId === firstParentId);
        const parentLabel = firstParentId ? (state.entities[firstParentId]?.label || 'Unknown') : 'Root';

        // Check for common group
        let groupLabel = '';
        if (grouping === 'po' || grouping === 'sku') {
            const firstDevice = selectedEntities.find(e => e.type === 'Device');
            if (firstDevice) {
                const getGroupKey = (e: any) => {
                    if (grouping === 'po') return e.deviceAttributes?.po_number || 'No PO';
                    if (grouping === 'sku') return e.deviceAttributes?.sku || 'No SKU';
                    return '';
                };
                const firstKey = getGroupKey(firstDevice);
                const allSameGroup = selectedEntities.every(e => e.type === 'Device' && getGroupKey(e) === firstKey);

                if (allSameGroup) {
                    groupLabel = `${grouping.toUpperCase()}: ${firstKey}`;
                }
            }
        }

        // Aggregate SKUs
        const skuDetails: Record<string, { count: number, model: string, grade: string }> = {};
        selectedEntities.forEach(e => {
            if (e.type === 'Device' && e.deviceAttributes?.sku) {
                const sku = e.deviceAttributes.sku;
                if (!skuDetails[sku]) {
                    skuDetails[sku] = {
                        count: 0,
                        model: e.deviceAttributes.model || 'Unknown Model',
                        grade: e.deviceAttributes.grade || 'Unknown Grade'
                    };
                }
                skuDetails[sku].count++;
            }
        });

        return (
            <div className="h-full p-4 border-l bg-background flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-muted rounded-md">
                        {groupLabel ? <Icons.Folder className="h-6 w-6 text-blue-500" /> : <Icons.Layers className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-lg">{groupLabel || `${count} Items Selected`}</h2>
                        <p className="text-xs text-muted-foreground">
                            {allSameParent ? `In: ${parentLabel}` : 'Mixed Locations'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => setQuickMoveOpen(true)}
                    >
                        <Move className="h-4 w-4 mr-2" />
                        Quick Move
                    </Button>
                    {deviceCount === count && !anyInBox && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => setIsBoxDialogOpen(true)}
                        >
                            <Icons.Package className="h-4 w-4 mr-2" />
                            BOX IN PLACE
                        </Button>
                    )}
                    {deviceCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => setBulkEditDialogOpen(true)}
                        >
                            <Icons.Edit className="h-4 w-4 mr-2" />
                            Edit Attributes
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {/* Quick Move moved to button */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-6 flex-1 overflow-auto">
                    {deviceCount > 0 && (
                        <div>
                            <h3 className="font-medium text-sm mb-2">Selected Devices ({deviceCount})</h3>
                            <div className="space-y-2">
                                {Object.entries(skuDetails).map(([sku, details]) => (
                                    <div key={sku} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                        <span className="font-mono truncate mr-2" title={`${sku} • ${details.model} • ${details.grade}`}>
                                            {sku} • {details.model} • {details.grade}
                                        </span>
                                        {details.count > 1 && <Badge variant="secondary" className="shrink-0">x{details.count}</Badge>}
                                    </div>
                                ))}
                                {Object.keys(skuDetails).length === 0 && (
                                    <div className="text-sm text-muted-foreground italic p-2">
                                        No devices selected
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                ```
                <DeleteConfirmationDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={handleDelete}
                    entityName={`${count} items`}
                />

                {quickMoveOpen && (
                    <QuickMoveDialog
                        isOpen={quickMoveOpen}
                        onClose={() => setQuickMoveOpen(false)}
                        selectedIds={selectedIds}
                        onMove={handleQuickMoveConfirm}
                    />
                )}

                <BoxInPlaceDialog
                    isOpen={isBoxDialogOpen}
                    onClose={() => setIsBoxDialogOpen(false)}
                    selectedDevices={Array.from(selectedIds).map(id => state.entities[id]).filter(e => e && e.type === 'Device') as WarehouseEntity[]}
                    onConfirm={handleBoxInPlace}
                />

                <BulkEditDialog
                    isOpen={isBulkEditDialogOpen}
                    onClose={() => setBulkEditDialogOpen(false)}
                    selectedDevices={selectedEntities.filter(e => e.type === 'Device')}
                    onConfirm={(updates) => {
                        const entityUpdates = selectedEntities
                            .filter(e => e.type === 'Device')
                            .map(e => ({
                                id: e.id,
                                updates: { deviceAttributes: updates }
                            }));
                        updateEntities(entityUpdates);
                        toast.success(`Updated ${entityUpdates.length} devices`);
                    }}
                />

                {moveBlockedInfo && (
                    <MoveBlockedDialog
                        isOpen={!!moveBlockedInfo}
                        onClose={() => setMoveBlockedInfo(null)}
                        blockedBy={moveBlockedInfo.blockedBy}
                        failedDeviceIds={moveBlockedInfo.failedDeviceIds}
                    />
                )}

                {moveConfirmationInfo && (
                    <MoveConfirmationDialog
                        isOpen={!!moveConfirmationInfo}
                        onClose={() => setMoveConfirmationInfo(null)}
                        onConfirm={() => {
                            moveEntities(moveConfirmationInfo.draggedIds, moveConfirmationInfo.targetId);
                            toast.success(`Moved ${moveConfirmationInfo.count} items to ${moveConfirmationInfo.targetName}`);
                            setMoveConfirmationInfo(null);
                        }}
                        count={moveConfirmationInfo.count}
                        targetName={moveConfirmationInfo.targetName}
                        sourceName={moveConfirmationInfo.sourceName}
                        skuSummary={moveConfirmationInfo.skuSummary}
                    />
                )}
            </div>
        );
    }

    const firstSelectedId = Array.from(selectedIds)[0];

    // Handle Virtual Queue Selection
    if (firstSelectedId.startsWith('queue-')) {
        const parts = firstSelectedId.split('-');
        // Format: queue-{parentId}-{queueName}
        // But parentId is a UUID, which contains dashes.
        // Queue name is at the end.
        // Let's assume queue name doesn't have dashes for now, or we parse carefully.
        // Actually, UUID has 4 dashes.
        // queue-UUID-QueueName
        // queue-123e4567-e89b-12d3-a456-426614174000-Assigned
        // So we can split by '-' and take the last part as queueName, and the middle parts as UUID.
        // Or better: we know the UUID length? No.
        // Let's rely on the fact that queue names are fixed: Assigned, Active, Done, Blocked.
        // We can check if string ends with one of them.
        const queues = ['Assigned', 'Active', 'Done', 'Blocked'];
        const queueName = queues.find(q => firstSelectedId.endsWith(`-${q}`));

        if (queueName) {
            const parentId = firstSelectedId.replace('queue-', '').replace(`-${queueName}`, '');
            const parentEntity = state.entities[parentId];

            if (parentEntity) {
                // Get devices in this queue
                const deviceChildren = parentEntity.children
                    .map(id => state.entities[id])
                    .filter(e => e?.type === 'Device' && e.deviceAttributes?.queue === queueName);

                const count = deviceChildren.length;

                // Aggregate SKUs for the queue view
                const skuCounts: Record<string, number> = {};
                deviceChildren.forEach(e => {
                    if (e.deviceAttributes?.sku) {
                        const sku = e.deviceAttributes.sku;
                        skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                    }
                });

                return (
                    <div className="h-full p-4 border-l bg-background flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-muted rounded-md">
                                <Icons.ListTodo className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-lg">{queueName} Queue</h2>
                                <p className="text-xs text-muted-foreground">
                                    In: {parentEntity.label}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => {
                                        setQuickMoveOpen(true);
                                    }}>
                                        <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-6 flex-1 overflow-auto">
                            <div>
                                <h3 className="font-medium text-sm mb-2">Devices in Queue ({count})</h3>
                                <div className="space-y-2">
                                    {Object.entries(skuCounts).map(([sku, count]) => (
                                        <div key={sku} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                            <span className="font-mono">{sku}</span>
                                            {count > 1 && <Badge variant="secondary">x{count}</Badge>}
                                        </div>
                                    ))}
                                    {Object.keys(skuCounts).length === 0 && (
                                        <div className="text-xs text-muted-foreground italic">No SKUs found</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <QuickMoveDialog
                            isOpen={quickMoveOpen}
                            onClose={() => setQuickMoveOpen(false)}
                            selectedIds={new Set(deviceChildren.map(d => d.id))}
                            onMove={(targetId) => {
                                moveEntities(deviceChildren.map(d => d.id), targetId);
                                setQuickMoveOpen(false);
                                toast.success(`Moved ${count} items`);
                            }}
                        />
                    </div>
                );
            }
        }
    }

    const entity = state.entities[firstSelectedId];
    if (!entity) return null;

    // Helper to get all descendant devices for a department
    const getDepartmentInventory = (departmentId: string) => {
        const inventory: Record<string, {
            sku: string;
            description: string;
            total: number;
            onHandSellable: number;
            allocated: number;
        }> = {};

        const scanRecursive = (id: string) => {
            const entity = state.entities[id];
            if (!entity) return;

            if (entity.type === 'Device') {
                const attrs = entity.deviceAttributes || {};
                const sku = attrs.sku || 'Unknown SKU';

                if (!inventory[sku]) {
                    // Construct description
                    const descriptionParts = [
                        attrs.manufacturer,
                        attrs.model,
                        attrs.capacity_gb ? `${attrs.capacity_gb}GB` : null,
                        attrs.lock_status,
                        attrs.grade
                    ].filter(Boolean);

                    inventory[sku] = {
                        sku,
                        description: descriptionParts.join(' • ') || 'No Description',
                        total: 0,
                        onHandSellable: 0,
                        allocated: 0
                    };
                }

                inventory[sku].total++;
                if (attrs.sellable) {
                    inventory[sku].onHandSellable++;
                }
                // Allocated logic placeholder
            }

            entity.children.forEach(scanRecursive);
        };

        scanRecursive(departmentId);
        return Object.values(inventory);
    };

    if (entity.type === 'Department') {
        const inventoryData = getDepartmentInventory(entity.id);
        const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;

        return (
            <div className="h-full border-l bg-background flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-lg flex items-center gap-2 flex-1">
                            Department <span className="text-muted-foreground">-</span> <HeaderEditableLabel value={entity.label} onSave={(val) => updateEntity(entity.id, { label: val })} />
                        </h2>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setQuickMoveOpen(true)}>
                                    <Move className="h-4 w-4 mr-2" /> Quick Move Contents
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Department
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Add Child</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.keys(ENTITY_CONFIG)
                                            .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                            .map((type) => (
                                                <DropdownMenuItem key={type} onClick={() => {
                                                    addEntity(type, entity.id);
                                                    toast.success(`Added ${type} to ${entity.label}`);
                                                }}>
                                                    {type}
                                                </DropdownMenuItem>
                                            ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{entity.id}</div>
                </div>

                <Tabs defaultValue="inventory" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 border-b">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="inventory">Inventory</TabsTrigger>
                            <TabsTrigger value="attributes">Attributes</TabsTrigger>
                            <TabsTrigger value="rules">Rules</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="inventory" className="flex-1 overflow-auto p-0">
                        <InventoryTable data={inventoryData} />
                    </TabsContent>

                    <TabsContent value="attributes" className="flex-1 p-4 space-y-6 overflow-auto">
                        <div className="space-y-4">
                            <div className="space-y-4">
                                {/* Label and Description removed */}
                            </div>
                        </div>
                    </TabsContent>



                    <TabsContent value="rules" className="flex-1 p-4 space-y-6 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-medium">Move Validation Rules</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Configure rules that devices must meet to be moved into this department.
                            </p>

                            {['tested', 'sellable', 'serialized'].map((ruleKey) => {
                                const currentRule = entity.departmentRules?.[ruleKey as keyof DepartmentRules] || 'OFF';
                                const label = ruleKey === 'sellable' ? 'Processed' : ruleKey;
                                return (
                                    <div key={ruleKey} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="text-base capitalize">{label}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Device must be {label}
                                            </p>
                                        </div>
                                        <Select
                                            value={currentRule}
                                            onValueChange={(val: RuleCondition) => {
                                                const newRules = {
                                                    ...(entity.departmentRules || { tested: 'OFF', sellable: 'OFF', serialized: 'OFF' }),
                                                    [ruleKey]: val
                                                };
                                                updateEntity(entity.id, { departmentRules: newRules as DepartmentRules });
                                            }}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="OFF">Off (Ignore)</SelectItem>
                                                <SelectItem value="MUST_HAVE">Must Have</SelectItem>
                                                <SelectItem value="MUST_NOT_HAVE">Must Not Have</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>
                </Tabs>

                <QuickMoveDialog
                    isOpen={quickMoveOpen}
                    onClose={() => setQuickMoveOpen(false)}
                    selectedIds={new Set(entity.children)}
                    onMove={(targetId) => {
                        moveEntities(entity.children, targetId);
                        setQuickMoveOpen(false);
                        toast.success(`Moved ${entity.children.length} items`);
                    }}
                />

                <DeleteConfirmationDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={handleDelete}
                    entityName={entity.label}
                />

                {importTargetId && (
                    <XlsxImportDialog
                        isOpen={!!importTargetId}
                        onClose={() => setImportTargetId(null)}
                        targetId={importTargetId}
                    />
                )}
            </div>
        );
    }

    const Icon = (Icons as any)[ENTITY_CONFIG[entity.type].icon] || Icons.Box;

    const getPathSegments = (entityId: string) => {
        const segments: { label: string; id: string }[] = [];
        let curr = state.entities[entityId];

        // If it's a device in a queue, add the queue segment
        if (curr?.type === 'Device' && curr.deviceAttributes?.queue && curr.parentId) {
            const queueName = curr.deviceAttributes.queue;
            const queueId = `queue-${curr.parentId}-${queueName}`;
            segments.unshift({ label: queueName, id: queueId });
        }

        while (curr?.parentId) {
            curr = state.entities[curr.parentId];
            if (curr) {
                segments.unshift({ label: curr.label, id: curr.id });
            }
        }

        // Always prepend Root
        segments.unshift({ label: 'Warehouse Root', id: 'warehouse-root' });

        return segments;
    };

    const pathSegments = getPathSegments(entity.id);

    return (
        <div className="h-full p-4 border-l bg-background flex flex-col">
            <div className="mb-4 text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded flex items-center flex-wrap gap-1">
                {pathSegments.map((segment, index) => (
                    <React.Fragment key={segment.id}>
                        {index > 0 && <span className="text-muted-foreground/50">/</span>}
                        <span
                            className="hover:underline cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => onSelect?.(new Set([segment.id]))}
                        >
                            {segment.label}
                        </span>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-muted rounded-md">
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        {entity.type} <span className="text-muted-foreground">-</span> <HeaderEditableLabel value={entity.label} onSave={(val) => updateEntity(entity.id, { label: val })} />
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">{entity.id.slice(0, 8)}</p>
                </div>

                <BarcodeHeaderControl
                    value={entity.type === 'Device' ? (entity.deviceAttributes?.barcode || '') : (entity.barcode || '')}
                    onSave={(val) => {
                        if (entity.type === 'Device') {
                            updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, barcode: val } });
                        } else {
                            updateEntity(entity.id, { barcode: val });
                        }
                    }}
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {(entity.type === 'Bin' || entity.type === 'Workstation' || entity.type === 'Device') && (
                            <DropdownMenuItem onClick={() => setQuickMoveOpen(true)}>
                                <Move className="h-4 w-4 mr-2" /> {entity.type === 'Device' ? 'Quick Move' : 'Quick Move Contents'}
                            </DropdownMenuItem>
                        )}
                        {entity.type === 'Box' && (
                            <DropdownMenuItem onClick={() => setUnboxDialogOpen(true)}>
                                <Icons.PackageOpen className="h-4 w-4 mr-2" /> Unbox In Place
                            </DropdownMenuItem>
                        )}
                        {entity.type === 'Bin' && (
                            <DropdownMenuItem onClick={() => setImportTargetId(entity.id)}>
                                <Upload className="h-4 w-4 mr-2" /> Import Devices
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Entity
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Add Child</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {Object.keys(ENTITY_CONFIG)
                                    .filter(type => ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG].allowedParents.includes(entity.type as any))
                                    .map((type) => (
                                        <DropdownMenuItem key={type} onClick={() => {
                                            addEntity(type, entity.id);
                                            toast.success(`Added ${type} to ${entity.label}`);
                                        }}>
                                            {type}
                                        </DropdownMenuItem>
                                    ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="space-y-4 flex-1 overflow-auto">
                {/* Description removed */}

                <div className="space-y-2">
                    {/* Barcode moved to header */}
                </div>

                {entity.type === 'Box' && (
                    <div className="pt-4 border-t space-y-4">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setUnboxDialogOpen(true)}
                        >
                            <Icons.PackageOpen className="h-4 w-4 mr-2" />
                            Unbox In Place
                        </Button>

                        <BinContentsList
                            devices={entity.children
                                .map(id => state.entities[id])
                                .filter(e => e && e.type === 'Device')}
                            onSelect={(id) => onSelect?.(new Set([id]))}
                        />
                    </div>
                )}

                {entity.type === 'Bin' && (
                    <div className="pt-4 border-t">
                        <BinContentsList
                            devices={entity.children
                                .map(id => state.entities[id])
                                .filter(e => e && e.type === 'Device')}
                            onSelect={(id) => onSelect?.(new Set([id]))}
                        />
                    </div>
                )}



                {entity.type === 'Device' && (
                    <Tabs defaultValue="attributes" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 pt-2">
                            <TabsList className="w-full">
                                <TabsTrigger value="attributes" className="flex-1">ATTRIBUTES</TabsTrigger>
                                <TabsTrigger value="testing" className="flex-1 flex items-center justify-center gap-2">
                                    TESTING
                                    {entity.deviceAttributes?.test_result?.status && (
                                        <Badge
                                            variant={entity.deviceAttributes.test_result.status === 'PASS' ? 'default' : 'destructive'}
                                            className="h-5 px-1.5 text-[10px]"
                                        >
                                            {entity.deviceAttributes.test_result.status}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="history" className="flex-1">HISTORY</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="attributes" className="flex-1 p-4 space-y-6 overflow-auto">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm">Device Attributes</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKU</Label>
                                        <Input
                                            value={entity.deviceAttributes?.sku || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, sku: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vendor SKU</Label>
                                        <Input
                                            value={entity.deviceAttributes?.vendor_sku || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, vendor_sku: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>PO Number</Label>
                                        <Input
                                            value={entity.deviceAttributes?.po_number || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, po_number: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Presold Order #</Label>
                                        <Input
                                            value={entity.deviceAttributes?.presold_order_number || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, presold_order_number: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IMEI</Label>
                                        <Input
                                            value={entity.deviceAttributes?.imei || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, imei: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {/* Barcode moved to header */}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Manufacturer</Label>
                                        <Input
                                            value={entity.deviceAttributes?.manufacturer || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, manufacturer: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Model</Label>
                                        <Input
                                            value={entity.deviceAttributes?.model || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, model: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Input
                                            value={entity.deviceAttributes?.category || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, category: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Capacity (GB)</Label>
                                        <Input
                                            value={entity.deviceAttributes?.capacity_gb || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, capacity_gb: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Color</Label>
                                        <Input
                                            value={entity.deviceAttributes?.color || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, color: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Carrier</Label>
                                        <Input
                                            value={entity.deviceAttributes?.carrier || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, carrier: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lock Status</Label>
                                        <Input
                                            value={entity.deviceAttributes?.lock_status || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, lock_status: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Grade</Label>
                                        <Input
                                            value={entity.deviceAttributes?.grade || ''}
                                            onChange={(e) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, grade: e.target.value } })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="tested"
                                            checked={entity.deviceAttributes?.tested || false}
                                            onCheckedChange={(checked) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, tested: checked as boolean } })}
                                        />
                                        <Label htmlFor="tested">Tested</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="sellable"
                                            checked={entity.deviceAttributes?.sellable || false}
                                            onCheckedChange={(checked) => updateEntity(entity.id, { deviceAttributes: { ...entity.deviceAttributes, sellable: checked as boolean } })}
                                        />
                                        <Label htmlFor="sellable">Processed</Label>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="testing" className="flex-1 p-0 flex flex-col overflow-hidden">
                            <TestingTabContent
                                testResult={entity.deviceAttributes?.test_result}
                                onClear={() => handleClearTestResult(entity.id)}
                            />
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 p-0 overflow-hidden">
                            <HistoryTable entityId={entity.id} />
                        </TabsContent>
                    </Tabs>
                )}


            </div>

            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                entityName={entity.label}
            />

            {importTargetId && (
                <XlsxImportDialog
                    isOpen={!!importTargetId}
                    onClose={() => setImportTargetId(null)}
                    targetId={importTargetId}
                />
            )}

            <UnboxInPlaceDialog
                isOpen={isUnboxDialogOpen}
                onClose={() => setUnboxDialogOpen(false)}
                deviceCount={entity.children.length}
                onConfirm={handleUnboxInPlace}
            />

            {moveBlockedInfo && (
                <MoveBlockedDialog
                    isOpen={!!moveBlockedInfo}
                    onClose={() => setMoveBlockedInfo(null)}
                    blockedBy={moveBlockedInfo.blockedBy}
                    failedDeviceIds={moveBlockedInfo.failedDeviceIds}
                />
            )}

            <QuickMoveDialog
                isOpen={quickMoveOpen}
                onClose={() => setQuickMoveOpen(false)}
                selectedIds={selectedIds}
                onMove={(targetId) => {
                    // Validate move
                    const deviceIds: string[] = [];
                    selectedIds.forEach(id => {
                        const entity = state.entities[id];
                        if (!entity) return; // Ensure entity exists

                        if (entity.type === 'Device') {
                            deviceIds.push(id);
                        } else {
                            // If container, get all descendant devices
                            // Simplified: just check direct children for now or need recursive?
                            // QuickMove usually moves the entity itself.
                            // If we move a Bin, we need to validate all devices inside it.
                            // Let's do a recursive gather.
                            const gatherDevices = (entId: string) => {
                                const ent = state.entities[entId];
                                if (!ent) return;
                                if (ent.type === 'Device') deviceIds.push(entId);
                                ent.children.forEach(gatherDevices);
                            };
                            gatherDevices(id);
                        }
                    });

                    const validation = validateMove(state, deviceIds, targetId);
                    if (!validation.allowed && validation.blockedBy && validation.failedDeviceIds) {
                        setMoveBlockedInfo({
                            blockedBy: validation.blockedBy,
                            failedDeviceIds: validation.failedDeviceIds
                        });
                        setQuickMoveOpen(false);
                        return;
                    }

                    if (deviceIds.length > maxMoveWithoutConfirm) {
                        const targetName = targetId ? (state.entities[targetId]?.label || 'Unknown') : 'Warehouse Root';

                        // Calculate Source Name
                        let sourceName = 'Unknown';
                        const firstItem = state.entities[deviceIds[0]];
                        if (firstItem && firstItem.parentId) {
                            const parent = state.entities[firstItem.parentId];
                            if (parent) {
                                const allSameParent = deviceIds.every(id => state.entities[id]?.parentId === firstItem.parentId);
                                sourceName = allSameParent ? parent.label : 'Various Locations';
                            } else if (firstItem.parentId === 'warehouse-root') {
                                sourceName = 'Warehouse Root';
                            }
                        }

                        // Calculate SKU Summary
                        const skuCounts: Record<string, number> = {};
                        deviceIds.forEach(id => {
                            const entity = state.entities[id];
                            if (entity && entity.type === 'Device') {
                                const sku = entity.deviceAttributes?.sku || 'Unknown SKU';
                                skuCounts[sku] = (skuCounts[sku] || 0) + 1;
                            } else {
                                const type = entity ? entity.type : 'Item';
                                skuCounts[type] = (skuCounts[type] || 0) + 1;
                            }
                        });

                        const sortedSkus = Object.entries(skuCounts).sort((a, b) => b[1] - a[1]);
                        let skuSummary = '';
                        if (sortedSkus.length > 0) {
                            const [mostFrequentSku, count] = sortedSkus[0];
                            if (sortedSkus.length === 1) {
                                skuSummary = mostFrequentSku;
                            } else {
                                const otherCount = sortedSkus.slice(1).reduce((acc, [, c]) => acc + c, 0);
                                skuSummary = `${mostFrequentSku} + ${otherCount} MORE`;
                            }
                        } else {
                            skuSummary = `${deviceIds.length} Items`;
                        }

                        setMoveConfirmationInfo({
                            count: deviceIds.length,
                            targetName,
                            sourceName,
                            skuSummary,
                            draggedIds: deviceIds,
                            targetId
                        });
                        setQuickMoveOpen(false);
                    } else {
                        moveEntities(Array.from(selectedIds), targetId);
                        setQuickMoveOpen(false);
                        toast.success(`Moved ${selectedIds.size} items`);
                    }
                }}
            />

            {moveConfirmationInfo && (
                <MoveConfirmationDialog
                    isOpen={!!moveConfirmationInfo}
                    onClose={() => setMoveConfirmationInfo(null)}
                    onConfirm={() => {
                        moveEntities(moveConfirmationInfo.draggedIds, moveConfirmationInfo.targetId);
                        toast.success(`Moved ${moveConfirmationInfo.count} items to ${moveConfirmationInfo.targetName}`);
                        setMoveConfirmationInfo(null);
                    }}
                    count={moveConfirmationInfo.count}
                    targetName={moveConfirmationInfo.targetName}
                    sourceName={moveConfirmationInfo.sourceName}
                    skuSummary={moveConfirmationInfo.skuSummary}
                />
            )}
        </div>
    );
}
