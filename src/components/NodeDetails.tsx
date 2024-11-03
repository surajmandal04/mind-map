import React, { useState } from 'react';
import { X, Type, Tag, AlignLeft } from 'lucide-react';
import { useMindMapStore } from '../store';

export default function NodeDetails() {
  const { selectedNode, updateNode, removeNode, setSelectedNode } = useMindMapStore();
  const [tagInput, setTagInput] = useState('');
  const [synonymInput, setSynonymInput] = useState('');

  if (!selectedNode) return null;

  const handleInputChange = (field: string, value: string) => {
    // Preserve other fields when updating
    const updates = {
      ...selectedNode,
      [field]: value,
      tags: selectedNode.tags || [],
      synonyms: selectedNode.synonyms || []
    };
    updateNode(selectedNode.id, updates);
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    
    const uniqueTags = Array.from(new Set(tags));
    
    // Preserve other fields when updating tags
    updateNode(selectedNode.id, {
      ...selectedNode,
      tags: uniqueTags,
      synonyms: selectedNode.synonyms || []
    });
  };

  const handleSynonymsChange = (value: string) => {
    const synonyms = value.split(',')
      .map(synonym => synonym.trim())
      .filter(synonym => synonym.length > 0);
    
    const uniqueSynonyms = Array.from(new Set(synonyms));
    
    // Preserve other fields when updating synonyms
    updateNode(selectedNode.id, {
      ...selectedNode,
      synonyms: uniqueSynonyms,
      tags: selectedNode.tags || []
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag) {
        const currentTags = selectedNode.tags || [];
        if (!currentTags.includes(newTag)) {
          handleTagsChange([...currentTags, newTag].join(','));
        }
        setTagInput('');
      }
    }
  };

  const handleSynonymInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newSynonym = synonymInput.trim();
      if (newSynonym) {
        const currentSynonyms = selectedNode.synonyms || [];
        if (!currentSynonyms.includes(newSynonym)) {
          handleSynonymsChange([...currentSynonyms, newSynonym].join(','));
        }
        setSynonymInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = selectedNode.tags || [];
    handleTagsChange(currentTags.filter(tag => tag !== tagToRemove).join(','));
  };

  const removeSynonym = (synonymToRemove: string) => {
    const currentSynonyms = selectedNode.synonyms || [];
    handleSynonymsChange(currentSynonyms.filter(synonym => synonym !== synonymToRemove).join(','));
  };

  return (
    <div className="fixed left-0 top-0 h-full w-96 bg-white shadow-xl overflow-y-auto">
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
          <label htmlFor="nodeTags" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4" />
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(selectedNode.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            id="nodeTags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="Add tags (press Enter or comma to add)..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="nodeSynonyms" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlignLeft className="w-4 h-4" />
            Synonyms
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(selectedNode.synonyms || []).map((synonym) => (
              <span
                key={synonym}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm"
              >
                {synonym}
                <button
                  onClick={() => removeSynonym(synonym)}
                  className="w-4 h-4 rounded-full hover:bg-green-200 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            id="nodeSynonyms"
            type="text"
            value={synonymInput}
            onChange={(e) => setSynonymInput(e.target.value)}
            onKeyDown={handleSynonymInputKeyDown}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="Add synonyms (press Enter or comma to add)..."
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
}