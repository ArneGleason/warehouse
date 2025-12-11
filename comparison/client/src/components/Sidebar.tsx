import React from 'react';
import { LayoutDashboard, ClipboardList, Database, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
    currentView: 'explorer' | 'processing' | 'items';
    onViewChange: (view: 'explorer' | 'processing' | 'items') => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
    return (
        <div className="w-16 border-r bg-muted/10 flex flex-col items-center py-4 gap-4 shrink-0">
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
                variant={currentView === 'items' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onViewChange('items')}
                title="Items Master"
            >
                <Database className="h-6 w-6" />
            </Button>
        </div>
    );
}
