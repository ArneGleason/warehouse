import React from 'react';
import {
    Map,
    ClipboardList,
    Workflow,
    Receipt,
    PackageCheck,
    Library,
    Handshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
    currentView: 'explorer' | 'processing' | 'items' | 'orders' | 'pickpack' | 'vendors' | 'purchase-orders';
    onViewChange: (view: 'explorer' | 'processing' | 'items' | 'orders' | 'pickpack' | 'vendors' | 'purchase-orders') => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
    return (
        <div className="w-16 border-r bg-muted/10 flex flex-col items-center py-4 gap-4 shrink-0">
            {/* Workflow Section */}
            <Button
                variant={currentView === 'explorer' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('explorer')}
                title="Warehouse Explorer"
            >
                <Map className="h-6 w-6" />
            </Button>

            <Button
                variant={currentView === 'purchase-orders' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('purchase-orders')}
                title="Purchase Orders"
            >
                <ClipboardList className="h-6 w-6" />
            </Button>

            <Button
                variant={currentView === 'processing' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('processing')}
                title="Processing"
            >
                <Workflow className="h-6 w-6" />
            </Button>

            <Button
                variant={currentView === 'orders' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('orders')}
                title="Sales Orders"
            >
                <Receipt className="h-6 w-6" />
            </Button>

            <Button
                variant={currentView === 'pickpack' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('pickpack')}
                title="Pick/Pack/Ship"
            >
                <PackageCheck className="h-6 w-6" />
            </Button>

            {/* Divider */}
            <div className="w-8 h-px bg-border my-2" />

            {/* Configuration Section */}
            <Button
                variant={currentView === 'items' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('items')}
                title="Items Master"
            >
                <Library className="h-6 w-6" />
            </Button>

            <Button
                variant={currentView === 'vendors' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('vendors')}
                title="Vendors"
            >
                <Handshake className="h-6 w-6" />
            </Button>
        </div>
    );
}
