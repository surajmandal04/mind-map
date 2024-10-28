import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface NodeFormProps {
  onSubmit: (label: string, type: 'task' | 'idea' | 'note') => void;
}

export function NodeForm({ onSubmit }: NodeFormProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'task' | 'idea' | 'note'>('task');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onSubmit(label, type);
      setLabel('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Enter node label"
        className="flex-1 px-3 py-2 border rounded-lg"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as 'task' | 'idea' | 'note')}
        className="px-3 py-2 border rounded-lg"
      >
        <option value="task">Task</option>
        <option value="idea">Idea</option>
        <option value="note">Note</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2"
      >
        <Plus size={20} />
        Add Node
      </button>
    </form>
  );
}