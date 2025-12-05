"use client";

import { useState } from 'react';
import { WarehouseProvider } from '@/components/context/WarehouseContext';
import { HierarchyView } from '@/components/HierarchyView';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { WarehouseExplorer } from '@/components/WarehouseExplorer';
import { ProcessingPage } from '@/components/ProcessingPage';

export default function Home() {
  const [currentView, setCurrentView] = useState<'explorer' | 'processing'>('explorer');

  return (
    <WarehouseProvider>
      <div className="h-screen w-full bg-background flex overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 overflow-hidden">
          {currentView === 'explorer' ? <WarehouseExplorer /> : <ProcessingPage />}
        </div>
      </div>
      <Toaster />
    </WarehouseProvider>
  );
}
