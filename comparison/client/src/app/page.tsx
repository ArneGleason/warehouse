"use client";

import { useState } from 'react';
import { WarehouseProvider } from '@/components/context/WarehouseContext';
import { HierarchyView } from '@/components/HierarchyView';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { WarehouseExplorer } from '@/components/WarehouseExplorer';
import { ItemsPage } from '@/components/ItemsPage';
import { ProcessingPage } from '@/components/ProcessingPage';
import { OrdersPage } from '@/components/OrdersPage';
import { PickPackPage } from '@/components/PickPackPage';

export default function Home() {
  const [currentView, setCurrentView] = useState<'explorer' | 'processing' | 'items' | 'orders' | 'pickpack'>('explorer');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleNavigateToExplorer = (deviceId: string) => {
    setSelectedIds(new Set([deviceId]));
    setCurrentView('explorer');
  };

  return (
    <WarehouseProvider>
      <div className="h-screen w-full bg-background flex overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 overflow-hidden">
          {currentView === 'explorer' ? (
            <WarehouseExplorer selectedIds={selectedIds} onSelect={setSelectedIds} />
          ) : currentView === 'processing' ? (
            <ProcessingPage onNavigateToExplorer={handleNavigateToExplorer} />
          ) : currentView === 'items' ? (
            <ItemsPage />
          ) : currentView === 'orders' ? (
            <OrdersPage />
          ) : (
            <PickPackPage />
          )}
        </div>
      </div>
      <Toaster />
    </WarehouseProvider>
  );
}
