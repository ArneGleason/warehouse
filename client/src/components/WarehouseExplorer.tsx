import React, { useState } from 'react';
import { HierarchyView } from '@/components/HierarchyView';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export function WarehouseExplorer() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [grouping, setGrouping] = useState<'none' | 'po' | 'sku'>('none');

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            <header className="h-12 border-b flex items-center px-4 shrink-0 bg-background">
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
                        <PropertiesPanel selectedIds={selectedIds} grouping={grouping} onSelect={setSelectedIds} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
