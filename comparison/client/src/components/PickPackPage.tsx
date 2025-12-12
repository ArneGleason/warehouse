import React, { useState } from 'react';
import { useWarehouse } from '@/components/context/WarehouseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, PackageCheck } from 'lucide-react';
import { Order } from '@/lib/warehouse';

export function PickPackPage() {
    const { state } = useWarehouse();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Filter for "Ready for Picking" orders
    const pickingOrders = Object.values(state.orders)
        .filter(o => o.status === 'Ready for Picking')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (selectedOrderId) {
        const order = state.orders[selectedOrderId];
        if (!order) return <div>Order not found</div>;

        // Start Pick List View
        const allocatedDevices = Object.values(state.entities).filter(
            e => e.type === 'Device' && e.deviceAttributes?.allocatedToOrder?.orderId === selectedOrderId
        );

        // Group allocated devices by SKU to show locations (simplified for stub)
        // In reality, we'd group by picking path.
        const pickListItems = order.lines.map(line => {
            // Find devices for this line
            const devices = allocatedDevices.filter(d => d.deviceAttributes?.sku === line.skuId);

            // Get locations
            const locations = devices.map(d => {
                const parent = d.parentId ? state.entities[d.parentId] : null;
                return parent ? parent.label : 'Unknown';
            });
            // Unique locations
            const uniqueLocations = Array.from(new Set(locations)).join(', ');

            return {
                ...line,
                locations: uniqueLocations || 'Pending Allocation'
            };
        });

        return (
            <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between no-print">
                    <Button variant="ghost" onClick={() => setSelectedOrderId(null)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to List
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={() => window.print()}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print Pick List
                        </Button>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto w-full bg-white dark:bg-slate-900 p-8 rounded-lg border shadow-sm print:shadow-none print:border-none">
                    <div className="flex justify-between items-start mb-8 border-b pb-6">
                        <div>
                            <h1 className="text-3xl font-bold">Pick List</h1>
                            <div className="text-muted-foreground mt-1">Order #{order.orderNumber}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold">{order.buyer.name}</div>
                            <div className="text-sm text-muted-foreground">{order.buyer.company}</div>
                            <div className="text-sm text-muted-foreground mt-2">{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left font-medium py-2">Item / SKU</th>
                                    <th className="text-left font-medium py-2">Location</th>
                                    <th className="text-right font-medium py-2">Qty</th>
                                    <th className="text-center font-medium py-2 w-16">Chk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pickListItems.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                        <td className="py-4 pr-4">
                                            <div className="font-semibold">{item.skuDisplay}</div>
                                            <div className="text-xs text-muted-foreground">{item.skuId}</div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <Badge variant="outline" className="font-mono">
                                                {item.locations}
                                            </Badge>
                                        </td>
                                        <td className="py-4 text-right font-semibold">
                                            {item.qty}
                                        </td>
                                        <td className="py-4">
                                            <div className="w-6 h-6 border-2 border-slate-300 rounded mx-auto"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {order.notes && (
                            <div className="mt-8 p-4 bg-muted/30 rounded-md border text-sm">
                                <span className="font-semibold">Notes:</span> {order.notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950/50">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <PackageCheck className="h-6 w-6" />
                    Pick & Pack
                </h1>
                <p className="text-muted-foreground">Orders ready for picking and fulfillment</p>
            </div>

            <div className="grid gap-4">
                {pickingOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                        No orders ready for picking.
                        <div className="text-sm mt-2">Move orders to "Ready for Picking" status to see them here.</div>
                    </div>
                ) : (
                    pickingOrders.map(order => (
                        <Card
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedOrderId(order.id)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">
                                    {order.orderNumber}
                                    <span className="ml-2 font-normal text-muted-foreground">
                                        • {order.buyer.name}
                                    </span>
                                </CardTitle>
                                <Badge className="bg-amber-500 hover:bg-amber-600">
                                    Ready for Picking
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{order.lines.reduce((s, l) => s + l.qty, 0)} items to pick</span>
                                    <span>Created {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
