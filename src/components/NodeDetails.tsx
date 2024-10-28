import React from 'react';
import { X } from 'lucide-react';
import { useMindMapStore } from '../store';
import { NODE_TYPES } from '../types';

export const NodeDetails: React.FC = () => {
  const { selectedNode, updateNode, removeNode, setSelectedNode } = useMindMapStore();

  if (!selectedNode) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Node Details</h2>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="nodeText" className="block text-sm font-medium text-gray-700">
            Text
          </label>
          <input
            id="nodeText"
            type="text"
            value={selectedNode.text}
            onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="nodeType" className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="nodeType"
            value={selectedNode.type}
            onChange={(e) => updateNode(selectedNode.id, { type: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {NODE_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nodeDetails" className="block text-sm font-medium text-gray-700">
            Details
          </label>
          <textarea
            id="nodeDetails"
            value={selectedNode.details || ''}
            onChange={(e) => updateNode(selectedNode.id, { details: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            removeNode(selectedNode.id);
            setSelectedNode(null);
          }}
          className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
};