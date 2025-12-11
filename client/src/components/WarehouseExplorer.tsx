import React, { useState } from 'react';
import { HierarchyView } from '@/components/HierarchyView';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface WarehouseExplorerProps {
    selectedIds: Set<string>;
    onSelect: (ids: Set<string>) => void;
}

export function WarehouseExplorer({ selectedIds, onSelect }: WarehouseExplorerProps) {
    const [grouping, setGrouping] = useState<'none' | 'po' | 'sku' | 'presold' | 'processed'>('none');

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            <header className="h-12 border-b flex items-center px-4 shrink-0 bg-background">
                <h1 className="font-bold text-lg">PXW-P-1</h1>
                <div className="ml-auto flex items-center gap-2">
                    {/* Toolbar items can go here */}
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={30} minSize={20}>
                        <HierarchyView
                            onSelect={onSelect}
                            selectedIds={selectedIds}
                            grouping={grouping}
                            setGrouping={setGrouping}
                        />
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={70} minSize={30}>
                        <PropertiesPanel selectedIds={selectedIds} grouping={grouping} onSelect={onSelect} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
