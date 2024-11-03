import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Search, Edit2, Link, Download, Upload } from 'lucide-react';
import { useMindMapStore } from '../store';
import { generateId } from '../types';
import { exportMindMapData, importMindMapData } from '../store';

interface Suggestion {
  type: 'pattern' | 'node' | 'history' | 'markup';
  value: string;
}

export default function NodePanel() {
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { 
    nodes, 
    addNode, 
    addLink,
    updateNode, 
    setSelectedNode,
    nodeHistory,
    addToHistory 
  } = useMindMapStore();

  useEffect(() => {
    if (input && showSuggestions) {
      const lowerInput = input.toLowerCase();
      
      const nodeSuggestions = nodes
        .filter(node => node.text.toLowerCase().includes(lowerInput))
        .map(node => ({ type: 'node' as const, value: node.text }));

      const historySuggestions = nodeHistory.nodeTexts
        .filter(text => text.toLowerCase().includes(lowerInput))
        .map(text => ({ type: 'history' as const, value: text }));

      const markupSuggestions = nodeHistory.markupPatterns
        .filter(pattern => pattern.toLowerCase().includes(lowerInput))
        .map(pattern => ({ type: 'markup' as const, value: pattern }));

      const allSuggestions = [
        ...nodeSuggestions,
        ...historySuggestions,
        ...markupSuggestions
      ];

      const uniqueSuggestions = Array.from(
        new Map(allSuggestions.map(item => [item.value, item])).values()
      );

      setSuggestions(uniqueSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [input, nodes, nodeHistory, showSuggestions]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.value);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const processNodeText = (text: string) => {
    let nodeText = text;
    let tags: string[] = [];

    if (text.includes(':')) {
      const [tagStr, textStr] = text.split(':');
      nodeText = textStr.trim();
      tags = [tagStr.toLowerCase().trim()];
    }

    return { nodeText, tags };
  };

  const processNodeMetadata = (nodeText: string, existingNode: any = null) => {
    const parts = nodeText.split('~').map(p => p.trim());
    const baseText = parts[0];
    let details = existingNode?.details || '';
    let synonyms = existingNode?.synonyms || [];

    // First process any tag:text format
    const { nodeText: finalText, tags: colonTags } = processNodeText(baseText);
    let tags = existingNode?.tags || [];
    tags = [...tags, ...colonTags];

    if (parts.length > 1) {
      const metadata = parts[1];
      if (metadata.toLowerCase().startsWith('tag@') || 
          metadata.toLowerCase().startsWith('tags@')) {
        const newTags = metadata.split('@')[1].split(',').map(t => t.trim());
        tags = [...new Set([...tags, ...newTags])];
      } else if (metadata.toLowerCase().startsWith('detail@') || 
                 metadata.toLowerCase().startsWith('details@')) {
        details = metadata.split('@')[1].trim();
        if (details.startsWith('"') && details.endsWith('"')) {
          details = details.slice(1, -1);
        }
      } else if (metadata.toLowerCase().startsWith('synonym@') ||
                 metadata.toLowerCase().startsWith('synonyms@')) {
        const newSynonyms = metadata.split('@')[1].split(',').map(s => s.trim());
        synonyms = [...new Set([...synonyms, ...newSynonyms])];
      }
    }

    return { baseText: finalText, tags, details, synonyms };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToHistory(input);
    
    const lines = input.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (line.includes('->')) {
        const parts = line.split('->').map(p => p.trim());
        const createdNodes = parts.map(part => {
          const { baseText, tags, details, synonyms } = processNodeMetadata(part);
          let existingNode = nodes.find(n => n.text.toLowerCase() === baseText.toLowerCase());
          
          if (!existingNode) {
            const newNode = {
              id: generateId(),
              text: baseText,
              tags,
              details,
              synonyms,
              x: Math.random() * 500,
              y: Math.random() * 500
            };
            addNode(newNode);
            return newNode;
          } else {
            if (tags.length > 0 || details || synonyms.length > 0) {
              updateNode(existingNode.id, {
                tags: [...new Set([...existingNode.tags, ...tags])],
                details: details || existingNode.details,
                synonyms: [...new Set([...existingNode.synonyms, ...synonyms])]
              });
            }
            return existingNode;
          }
        });

        for (let i = 0; i < createdNodes.length - 1; i++) {
          addLink(createdNodes[i].id, createdNodes[i + 1].id);
        }
      } else {
        const { baseText, tags, details, synonyms } = processNodeMetadata(line);
        const existingNode = nodes.find(n => n.text.toLowerCase() === baseText.toLowerCase());
        
        if (!existingNode) {
          addNode({
            id: generateId(),
            text: baseText,
            tags,
            details,
            synonyms,
            x: Math.random() * 500,
            y: Math.random() * 500
          });
        } else if (tags.length > 0 || details || synonyms.length > 0) {
          updateNode(existingNode.id, {
            tags: [...new Set([...existingNode.tags, ...tags])],
            details: details || existingNode.details,
            synonyms: [...new Set([...existingNode.synonyms, ...synonyms])]
          });
        }
      }
    });
    
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

  const filteredNodes = nodes.filter(node => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      node.text.toLowerCase().includes(searchTermLower) ||
      (Array.isArray(node.synonyms) && node.synonyms.some(synonym => 
        synonym.toLowerCase().includes(searchTermLower)
      ))
    );
  });

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
          <div className="relative">
            <label htmlFor="nodeInput" className="block text-sm font-medium text-gray-700 mb-1">
              Node Text
            </label>
            <textarea
              ref={textareaRef}
              id="nodeInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Add nodes (e.g., 'dialysis -> treatment:kidney transplant' or 'malaria ~ synonyms@fever,chills')"
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
            placeholder="Search nodes or synonyms..."
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
            <div className="flex flex-col">
              <span className="font-medium">{node.text}</span>
              {Array.isArray(node.synonyms) && node.synonyms.length > 0 && (
                <span className="text-sm text-gray-500">
                  Synonyms: {node.synonyms.join(', ')}
                </span>
              )}
              {node.details && (
                <span className="text-sm text-gray-600 mt-1">
                  {node.details}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {node.tags && node.tags.length > 0 && (
                <div className="flex gap-1">
                  {node.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
}