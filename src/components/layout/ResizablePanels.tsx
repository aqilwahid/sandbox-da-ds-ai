import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface ResizablePanelsProps {
  sidebar: React.ReactNode;
  instructions: React.ReactNode;
  editor: React.ReactNode;
  output: React.ReactNode;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  sidebar,
  instructions,
  editor,
  output,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [instructionWidthPct, setInstructionWidthPct] = useState<number>(36);
  const [editorHeightPct, setEditorHeightPct] = useState<number>(55);

  const isDraggingSidebar = useRef(false);
  const isDraggingInstruction = useRef(false);
  const isDraggingEditorSplit = useRef(false);

  // Drag listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar.current) {
        const newWidth = Math.max(180, Math.min(420, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isDraggingInstruction.current) {
        const containerWidth = window.innerWidth - sidebarWidth;
        const offsetLeft = e.clientX - sidebarWidth;
        const newPct = Math.max(20, Math.min(65, (offsetLeft / containerWidth) * 100));
        setInstructionWidthPct(newPct);
      } else if (isDraggingEditorSplit.current) {
        const editorContainer = document.getElementById('editor-output-container');
        if (editorContainer) {
          const rect = editorContainer.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const newPct = Math.max(25, Math.min(80, (offsetY / rect.height) * 100));
          setEditorHeightPct(newPct);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      isDraggingInstruction.current = false;
      isDraggingEditorSplit.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth]);

  const startDraggingSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startDraggingInstruction = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingInstruction.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startDraggingEditorSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingEditorSplit.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full bg-dark-950">
      {/* 1. Sidebar Panel */}
      <div style={{ width: `${sidebarWidth}px` }} className="h-full shrink-0 flex flex-col overflow-hidden">
        {sidebar}
      </div>

      {/* Sidebar Splitter */}
      <div
        onMouseDown={startDraggingSidebar}
        className="w-1.5 hover:w-2 bg-dark-850 hover:bg-brand-500/50 cursor-col-resize flex items-center justify-center transition-all z-20 group"
        title="Geser untuk mengubah lebar sidebar"
      >
        <div className="w-[1px] h-8 bg-slate-700 group-hover:bg-brand-300 rounded" />
      </div>

      {/* Main Workspace Area (Instructions + Editor/Output) */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* 2. Instruction Panel */}
        <div
          style={{ width: `${instructionWidthPct}%` }}
          className="h-full shrink-0 flex flex-col overflow-hidden"
        >
          {instructions}
        </div>

        {/* Instruction / Editor Splitter */}
        <div
          onMouseDown={startDraggingInstruction}
          className="w-1.5 hover:w-2 bg-dark-850 hover:bg-brand-500/50 cursor-col-resize flex items-center justify-center transition-all z-20 group"
          title="Geser untuk mengubah ukuran panel instruksi"
        >
          <div className="w-[1px] h-8 bg-slate-700 group-hover:bg-brand-300 rounded" />
        </div>

        {/* 3. Editor & Output Split Container */}
        <div
          id="editor-output-container"
          className="flex-1 flex flex-col h-full overflow-hidden min-w-[320px]"
        >
          {/* Top: Code Editor */}
          <div style={{ height: `${editorHeightPct}%` }} className="w-full flex flex-col overflow-hidden">
            {editor}
          </div>

          {/* Editor / Output Splitter */}
          <div
            onMouseDown={startDraggingEditorSplit}
            className="h-1.5 hover:h-2 bg-dark-850 hover:bg-brand-500/50 cursor-row-resize flex items-center justify-center transition-all z-20 group shrink-0"
            title="Geser untuk mengubah tinggi output"
          >
            <div className="h-[1px] w-8 bg-slate-700 group-hover:bg-brand-300 rounded" />
          </div>

          {/* Bottom: Output Panel */}
          <div className="flex-1 w-full flex flex-col overflow-hidden">
            {output}
          </div>
        </div>
      </div>
    </div>
  );
};
