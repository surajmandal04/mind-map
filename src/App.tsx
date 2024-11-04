import React from 'react';
import Graph from './components/Graph';
import NodePanel from './components/NodePanel';
import NodeDetails from './components/NodeDetails';
import { Brain } from 'lucide-react';
import { useState } from 'react';

function App() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Mind Map</h1>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto p-6">
        <div className="flex gap-6">
          <div className="w-1/3 flex flex-col gap-6">
            <NodePanel onSearch={setSearchTerm} />
          </div>
          <div className="w-2/3">
            <Graph searchTerm={searchTerm} />
          </div>
        </div>
      </main>
      <NodeDetails />
    </div>
  );
}

export default App;