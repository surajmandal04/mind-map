import React from 'react';
import { X, Type, Tag, AlignLeft } from 'lucide-react';
import { useMindMapStore } from '../store';
import { NODE_TYPES } from '../types';

export const NodeDetails: React.FC = () => {
  const { selectedNode, updateNode, removeNode, setSelectedNode, nodeTypes } = useMindMapStore();

  if (!selectedNode) return null;

  const handleInputChange = (field: string, value: string) => {
    updateNode(selectedNode.id, { [field]: value });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-xl font-bold text-gray-900">Node Details</h2>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <label htmlFor="nodeText" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Type className="w-4 h-4" />
            Text
          </label>
          <input
            id="nodeText"
            type="text"
            value={selectedNode.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="Enter node text..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="nodeType" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4" />
            Type
          </label>
          <select
            id="nodeType"
            value={selectedNode.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            {nodeTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <div 
            className="h-2 w-full rounded-full mt-1"
            style={{ backgroundColor: nodeTypes.find(t => t.id === selectedNode.type)?.color }}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="nodeDetails" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlignLeft className="w-4 h-4" />
            Details
          </label>
          <textarea
            id="nodeDetails"
            value={selectedNode.details || ''}
            onChange={(e) => handleInputChange('details', e.target.value)}
            rows={8}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
            placeholder="Add additional details about this node..."
          />
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={() => {
              removeNode(selectedNode.id);
              setSelectedNode(null);
            }}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
};