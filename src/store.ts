import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GraphData, Node, Link, NodeType, NODE_TYPES } from './types';

interface NodeHistory {
  nodeTexts: string[];
  markupPatterns: string[];
  synonyms: string[];
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
  removeLink: (source: string, target: string) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  setSelectedNode: (node: Node | null) => void;
  addNodeType: (nodeType: NodeType) => void;
  updateNodeType: (id: string, updates: Partial<NodeType>) => void;
  removeNodeType: (id: string) => void;
  cleanupInvalidLinks: () => void;
  addToHistory: (text: string, synonyms?: string[]) => void;
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
        markupPatterns: [],
        synonyms: []
      },

      addNode: (node) =>
        set((state) => {
          const nodeWithDefaults = {
            ...node,
            tags: node.tags || [],
            synonyms: node.synonyms || [],
            x: node.x || 0,
            y: node.y || 0
          };

          if (state.nodes.some((n) => 
            n.text.toLowerCase() === node.text.toLowerCase() ||
            (n.synonyms || []).some(s => s.toLowerCase() === node.text.toLowerCase())
          )) {
            return state;
          }
          return { nodes: [...state.nodes, nodeWithDefaults] };
        }),

      addLink: (source, target) =>
        set((state) => {
          if (state.links.some((l) => l.source === source && l.target === target)) {
            return state;
          }
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

      removeLink: (source, target) =>
        set((state) => ({
          links: state.links.filter(
            (l) => !(l.source === source && l.target === target)
          ),
        })),

      removeNode: (id) =>
        set((state) => {
          const updatedNodes = state.nodes.filter((n) => n.id !== id);
          const updatedLinks = state.links.filter((l) => l.source !== id && l.target !== id);
          const updatedSelectedNode = state.selectedNode?.id === id ? null : state.selectedNode;
          
          return {
            nodes: updatedNodes,
            links: updatedLinks,
            selectedNode: updatedSelectedNode,
          };
        }),

      updateNode: (id, updates) =>
        set((state) => {
          if (updates.text) {
            const existingNode = state.nodes.find(n => 
              n.id !== id && 
              (n.text.toLowerCase() === updates.text?.toLowerCase() ||
               (n.synonyms || []).some(s => s.toLowerCase() === updates.text?.toLowerCase()))
            );
            if (existingNode) return state;
          }

          const sanitizedUpdates = {
            ...updates,
            tags: updates.tags || [],
            synonyms: updates.synonyms || []
          };

          const updatedNodes = state.nodes.map((n) => 
            n.id === id ? { ...n, ...sanitizedUpdates } : n
          );
          
          const updatedSelectedNode = state.selectedNode?.id === id
            ? { ...state.selectedNode, ...sanitizedUpdates }
            : state.selectedNode;
          
          return {
            nodes: updatedNodes,
            selectedNode: updatedSelectedNode
          };
        }),

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

      addToHistory: (text: string, synonyms: string[] = []) =>
        set((state) => {
          const nodeTexts = new Set(state.nodeHistory.nodeTexts);
          const markupPatterns = new Set(state.nodeHistory.markupPatterns);
          const allSynonyms = new Set(state.nodeHistory.synonyms);

          const parts = text.split('->').map(p => p.trim());
          parts.forEach(part => {
            const cleanText = part.includes(':') ? part.split(':')[1].trim() : part;
            nodeTexts.add(cleanText);
          });

          synonyms.forEach(synonym => {
            allSynonyms.add(synonym);
          });

          const pattern = text.includes('->') ? text : '';
          if (pattern) {
            markupPatterns.add(pattern);
          }

          const newNodeTexts = Array.from(nodeTexts).slice(0, MAX_HISTORY_ITEMS);
          const newMarkupPatterns = Array.from(markupPatterns).slice(0, MAX_HISTORY_ITEMS);
          const newSynonyms = Array.from(allSynonyms).slice(0, MAX_HISTORY_ITEMS);

          return {
            nodeHistory: {
              nodeTexts: newNodeTexts,
              markupPatterns: newMarkupPatterns,
              synonyms: newSynonyms
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
          details: node.details || '',
          tags: node.tags || [],
          synonyms: node.synonyms || []
        })),
        links: state.links,
        nodeTypes: state.nodeTypes,
        nodeHistory: state.nodeHistory,
      }),
    }
  )
);

export const clearMindMapStorage = () => localStorage.removeItem('mind-map-storage');

export const exportMindMapData = () => {
  const state = useMindMapStore.getState();
  return {
    nodes: state.nodes.map(node => ({
      ...node,
      x: node.x || 0,
      y: node.y || 0,
      tags: node.tags || [],
      synonyms: node.synonyms || []
    })),
    links: state.links,
  };
};

export const importMindMapData = (data: GraphData) => {
  const store = useMindMapStore.getState();
  
  store.nodes.length = 0;
  store.links.length = 0;
  
  data.nodes.forEach(node => {
    store.addNode({
      ...node,
      x: node.x || 0,
      y: node.y || 0,
      tags: node.tags || [],
      synonyms: node.synonyms || []
    });
  });
  
  data.links.forEach(link => {
    if (data.nodes.some(n => n.id === link.source) && 
        data.nodes.some(n => n.id === link.target)) {
      store.addLink(link.source, link.target);
    }
  });
};