import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Search, Edit2, Link, Download, Upload } from 'lucide-react';
import { useMindMapStore } from '../store';
import { NODE_TYPES, generateId, createNodeType } from '../types';
import { exportMindMapData, importMindMapData } from '../store';

interface Suggestion {
  type: 'pattern' | 'node' | 'history' | 'markup';
  value: string;
}

export const NodePanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('information');
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { 
    nodes, 
    addNode, 
    addLink, 
    setSelectedNode, 
    addNodeType, 
    nodeTypes,
    nodeHistory,
    addToHistory 
  } = useMindMapStore();

  const markupPatterns = [
    'condition:if x > 0',
    'task:complete project',
    'idea:new feature',
    'milestone:phase 1',
    'resource:team member',
    'goal:increase sales'
  ];

  useEffect(() => {
    if (input) {
      const lowerInput = input.toLowerCase();
      
      // Get suggestions from current nodes
      const nodeSuggestions = nodes
        .filter(node => node.text.toLowerCase().includes(lowerInput))
        .map(node => ({ type: 'node' as const, value: node.text }));

      // Get suggestions from node history
      const historySuggestions = nodeHistory.nodeTexts
        .filter(text => text.toLowerCase().includes(lowerInput))
        .map(text => ({ type: 'history' as const, value: text }));

      // Get suggestions from markup patterns history
      const markupSuggestions = nodeHistory.markupPatterns
        .filter(pattern => pattern.toLowerCase().includes(lowerInput))
        .map(pattern => ({ type: 'markup' as const, value: pattern }));

      // Get suggestions from predefined markup patterns
      const patternSuggestions = markupPatterns
        .filter(pattern => pattern.toLowerCase().includes(lowerInput))
        .map(pattern => ({ type: 'pattern' as const, value: pattern }));

      // Combine and deduplicate suggestions
      const allSuggestions = [
        ...nodeSuggestions,
        ...historySuggestions,
        ...markupSuggestions,
        ...patternSuggestions
      ];

      // Remove duplicates based on value
      const uniqueSuggestions = Array.from(
        new Map(allSuggestions.map(item => [item.value, item])).values()
      );

      setSuggestions(uniqueSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input, nodes, nodeHistory]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.value);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add to history before processing
    addToHistory(input);
    
    const parts = input.split('->').map(p => p.trim());
    
    if (parts.length >= 2) {
      const createdNodes = parts.map(part => {
        let nodeText = part;
        let nodeType = selectedType;

        if (part.includes(':')) {
          const [typeStr, textStr] = part.split(':');
          const typeId = typeStr.trim().toLowerCase();
          nodeText = textStr.trim();

          if (!nodeTypes.some(t => t.id === typeId)) {
            const newNodeType = createNodeType(typeStr.trim());
            addNodeType(newNodeType);
            nodeType = newNodeType.id;
          } else {
            nodeType = typeId;
          }
        }

        let existingNode = nodes.find(n => n.text === nodeText);
        if (!existingNode) {
          const newNode = {
            id: generateId(),
            text: nodeText,
            type: nodeType,
            x: Math.random() * 500,
            y: Math.random() * 500
          };
          addNode(newNode);
          return newNode;
        }
        return existingNode;
      });

      for (let i = 0; i < createdNodes.length - 1; i++) {
        const sourceNode = createdNodes[i];
        const targetNode = createdNodes[i + 1];
        addLink(sourceNode.id, targetNode.id);
      }
    } else {
      let nodeText = input;
      let nodeType = selectedType;

      if (input.includes(':')) {
        const [typeStr, textStr] = input.split(':');
        const typeId = typeStr.trim().toLowerCase();
        nodeText = textStr.trim();

        if (!nodeTypes.some(t => t.id === typeId)) {
          const newNodeType = createNodeType(typeStr.trim());
          addNodeType(newNodeType);
          nodeType = newNodeType.id;
        } else {
          nodeType = typeId;
        }
      }

      addNode({
        id: generateId(),
        text: nodeText,
        type: nodeType,
        x: Math.random() * 500,
        y: Math.random() * 500
      });
    }
    setInput('');
  };

  const handleLinkClick = (nodeId: string) => {
    if (linkingFrom === null) {
      setLinkingFrom(nodeId);
    } else if (linkingFrom !== nodeId) {
      addLink(linkingFrom, nodeId);
      setLinkingFrom(null);
    }
  };

  const handleExport = () => {
    const data = exportMindMapData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          importMindMapData(data);
        } catch (error) {
          console.error('Error importing data:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredNodes = nodes.filter(node => 
    node.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'node':
        return '🔍';
      case 'history':
        return '⏱️';
      case 'markup':
        return '🔗';
      case 'pattern':
        return '📝';
      default:
        return '💡';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Mind Map Nodes</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              title="Export Mind Map"
            >
              <Download className="w-5 h-5" />
            </button>
            <label className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Upload className="w-5 h-5" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nodeType" className="block text-sm font-medium text-gray-700 mb-1">
              Default Node Type
            </label>
            <select
              id="nodeType"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {nodeTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label htmlFor="nodeInput" className="block text-sm font-medium text-gray-700 mb-1">
              Node Text
            </label>
            <textarea
              ref={textareaRef}
              id="nodeInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add node (e.g., 'fruit -> tension:rotten -> bad apple')"
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="text-sm text-gray-600 mr-2">
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <span>{suggestion.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Node
          </button>
        </form>
      </div>

      <div className="p-4 border-b">
        <label htmlFor="searchNodes" className="block text-sm font-medium text-gray-700 mb-1">
          Search Nodes
        </label>
        <div className="relative">
          <input
            id="searchNodes"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search nodes..."
            className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {linkingFrom && (
        <div className="p-4 bg-blue-50 border-b text-sm text-blue-700">
          Select another node to create a link
          <button
            onClick={() => setLinkingFrom(null)}
            className="ml-2 text-blue-500 hover:text-blue-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {filteredNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg mb-2"
          >
            <span className="font-medium">{node.text}</span>
            <div className="flex items-center gap-2">
              <span 
                className="text-sm px-2 py-1 rounded"
                style={{ 
                  backgroundColor: nodeTypes.find(t => t.id === node.type)?.color,
                  color: 'white'
                }}
              >
                {nodeTypes.find(t => t.id === node.type)?.name}
              </span>
              <button
                onClick={() => setSelectedNode(node)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                title="Edit node"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleLinkClick(node.id)}
                className={`p-1 rounded-full hover:bg-gray-200 ${
                  linkingFrom === node.id 
                    ? 'text-blue-500 bg-blue-100' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Link with another node"
              >
                <Link className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};