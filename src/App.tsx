import React, { useState } from 'react';
import { ForceGraph } from './components/ForceGraph';
import { NodeForm } from './components/NodeForm';
import { DrawingCanvas } from './components/DrawingCanvas';
import { useStore } from './store/useStore';
import { Node } from './types';

function App() {
  const { graphData, addNode, addLink, removeNode, isDuplicateLabel } = useStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddNode = (label: string, type: 'task' | 'idea' | 'note') => {
    try {
      const newNode: Node = {
        id: Date.now().toString(),
        label,
        type,
      };
      addNode(newNode);

      if (selectedNode) {
        addLink({
          source: selectedNode.id,
          target: newNode.id,
        });
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
  };

  const handleDrawnNode = (position: { x: number; y: number }) => {
    const label = `Node ${graphData.nodes.length + 1}`;
    if (!isDuplicateLabel(label)) {
      handleAddNode(label, 'task');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Mind Map</h1>
        
        <div className="bg-white rounded-lg p-4 shadow-md relative">
          <NodeForm onSubmit={handleAddNode} />
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}
          
          {selectedNode && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium">Selected: {selectedNode.label}</p>
              <p className="text-sm text-gray-600">
                Add a new node to connect it with {selectedNode.label}
              </p>
              <button
                onClick={() => setSelectedNode(null)}
                className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg"
              >
                Clear Selection
              </button>
            </div>
          )}

          <div className="h-[600px] relative">
            <DrawingCanvas onNodeCreate={handleDrawnNode} />
            <ForceGraph data={graphData} onNodeClick={handleNodeClick} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;