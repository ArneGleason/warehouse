"use client";

import { useState } from 'react';
import { WarehouseProvider } from '@/components/context/WarehouseContext';
import { HierarchyView } from '@/components/HierarchyView';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';

export default function Home() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [grouping, setGrouping] = useState<'none' | 'po' | 'sku'>('none');

  return (
    <WarehouseProvider>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        <header className="h-12 border-b flex items-center px-4 shrink-0">
          <h1 className="font-bold text-lg">Warehouse Simulator</h1>
          <div className="ml-auto flex items-center gap-2">
            {/* Toolbar items can go here */}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30} minSize={20}>
              <HierarchyView
                onSelect={setSelectedIds}
                selectedIds={selectedIds}
                grouping={grouping}
                setGrouping={setGrouping}
              />
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={70} minSize={30}>
              <PropertiesPanel selectedIds={selectedIds} grouping={grouping} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      <Toaster />
    </WarehouseProvider>
  );
}
