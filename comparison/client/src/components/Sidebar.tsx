import React from 'react';
import { LayoutDashboard, ClipboardList, Database, Package, ShoppingBag, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
    currentView: 'explorer' | 'processing' | 'items' | 'orders' | 'pickpack';
    onViewChange: (view: 'explorer' | 'processing' | 'items' | 'orders' | 'pickpack') => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
    return (
        <div className="w-16 border-r bg-muted/10 flex flex-col items-center py-4 gap-4 shrink-0">
            <Button
                variant={currentView === 'items' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('items')}
                title="Items Master"
            >
                <Database className="h-6 w-6" />
            </Button>
            <Button
                variant={currentView === 'explorer' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('explorer')}
                title="Warehouse Explorer"
            >
                <LayoutDashboard className="h-6 w-6" />
            </Button>
            <Button
                variant={currentView === 'processing' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('processing')}
                title="Processing"
            >
                <ClipboardList className="h-6 w-6" />
            </Button>
            <Button
                variant={currentView === 'orders' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('orders')}
                title="Sales Orders"
            >
                <ShoppingBag className="h-6 w-6" />
            </Button>
            <Button
                variant={currentView === 'pickpack' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('pickpack')}
                title="Pick/Pack/Ship"
            >
                <PackageCheck className="h-6 w-6" />
            </Button>
        </div>
    );
}
