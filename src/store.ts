import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GraphData, Node, Link, NodeType, NODE_TYPES } from './types';

interface NodeHistory {
  nodeTexts: string[];
  markupPatterns: string[];
}

interface MindMapStore {
  nodes: Node[];
  links: Link[];
  selectedNode: Node | null;
  nodeTypes: NodeType[];
  nodeHistory: NodeHistory;
  addNode: (node: Node) => void;
  addLink: (source: string, target: string) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  setSelectedNode: (node: Node | null) => void;
  addNodeType: (nodeType: NodeType) => void;
  updateNodeType: (id: string, updates: Partial<NodeType>) => void;
  removeNodeType: (id: string) => void;
  cleanupInvalidLinks: () => void;
  addToHistory: (text: string) => void;
}

const MAX_HISTORY_ITEMS = 50;

export const useMindMapStore = create<MindMapStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      links: [],
      selectedNode: null,
      nodeTypes: NODE_TYPES,
      nodeHistory: {
        nodeTexts: [],
        markupPatterns: []
      },

      addNode: (node) =>
        set((state) => {
          if (state.nodes.some((n) => n.text === node.text)) return state;
          return { nodes: [...state.nodes, { ...node, x: node.x, y: node.y }] };
        }),

      addLink: (source, target) =>
        set((state) => {
          if (state.links.some((l) => l.source === source && l.target === target)) {
            return state;
          }
          // Verify both nodes exist before creating the link
          const sourceNode = state.nodes.find(n => n.id === source);
          const targetNode = state.nodes.find(n => n.id === target);
          if (!sourceNode || !targetNode) return state;

          const newLink = {
            source,
            target,
            distance: 150,
          };
          return {
            links: [...state.links, newLink],
          };
        }),

      removeNode: (id) =>
        set((state) => {
          // Remove the node and its associated links
          const updatedNodes = state.nodes.filter((n) => n.id !== id);
          const updatedLinks = state.links.filter((l) => l.source !== id && l.target !== id);
          
          // Clear selected node if it's the one being removed
          const updatedSelectedNode = state.selectedNode?.id === id ? null : state.selectedNode;
          
          return {
            nodes: updatedNodes,
            links: updatedLinks,
            selectedNode: updatedSelectedNode,
          };
        }),

      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

      setSelectedNode: (node) => set({ selectedNode: node }),

      addNodeType: (nodeType) =>
        set((state) => ({
          nodeTypes: [...state.nodeTypes, nodeType],
        })),

      updateNodeType: (id, updates) =>
        set((state) => ({
          nodeTypes: state.nodeTypes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      removeNodeType: (id) =>
        set((state) => ({
          nodeTypes: state.nodeTypes.filter((t) => t.id !== id),
        })),

      cleanupInvalidLinks: () =>
        set((state) => {
          const validLinks = state.links.filter(link => {
            const sourceExists = state.nodes.some(n => n.id === link.source);
            const targetExists = state.nodes.some(n => n.id === link.target);
            return sourceExists && targetExists;
          });
          return { links: validLinks };
        }),

      addToHistory: (text: string) =>
        set((state) => {
          const nodeTexts = new Set(state.nodeHistory.nodeTexts);
          const markupPatterns = new Set(state.nodeHistory.markupPatterns);

          // Extract individual node texts and add to history
          const parts = text.split('->').map(p => p.trim());
          parts.forEach(part => {
            const cleanText = part.includes(':') ? part.split(':')[1].trim() : part;
            nodeTexts.add(cleanText);
          });

          // Extract markup patterns (if any)
          const pattern = text.includes('->') ? text : '';
          if (pattern) {
            markupPatterns.add(pattern);
          }

          // Convert sets back to arrays and limit size
          const newNodeTexts = Array.from(nodeTexts).slice(0, MAX_HISTORY_ITEMS);
          const newMarkupPatterns = Array.from(markupPatterns).slice(0, MAX_HISTORY_ITEMS);

          return {
            nodeHistory: {
              nodeTexts: newNodeTexts,
              markupPatterns: newMarkupPatterns
            }
          };
        }),
    }),
    {
      name: 'mind-map-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes.map(node => ({
          ...node,
          x: node.x || 0,
          y: node.y || 0,
        })),
        links: state.links,
        nodeTypes: state.nodeTypes,
        nodeHistory: state.nodeHistory,
      }),
    }
  )
);

export const clearMindMapStorage = () => localStorage.removeItem('mind-map-storage');

export const exportMindMapData = (): GraphData => {
  const state = useMindMapStore.getState();
  return {
    nodes: state.nodes.map(node => ({
      ...node,
      x: node.x || 0,
      y: node.y || 0,
    })),
    links: state.links,
  };
};

export const importMindMapData = (data: GraphData) => {
  const store = useMindMapStore.getState();
  
  // Clear existing data
  store.nodes.length = 0;
  store.links.length = 0;
  
  // Import nodes with positions
  data.nodes.forEach(node => {
    store.addNode({
      ...node,
      x: node.x || 0,
      y: node.y || 0,
    });
  });
  
  // Import only valid links
  data.links.forEach(link => {
    if (data.nodes.some(n => n.id === link.source) && 
        data.nodes.some(n => n.id === link.target)) {
      store.addLink(link.source, link.target);
    }
  });
};