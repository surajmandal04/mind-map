import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GraphData, Node, Link } from '../types';

interface MindMapStore {
  graphData: GraphData;
  addNode: (node: Node) => void;
  addLink: (link: Link) => void;
  removeNode: (id: string) => void;
  removeLink: (source: string, target: string) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  isDuplicateLabel: (label: string) => boolean;
}

export const useStore = create<MindMapStore>()(
  persist(
    (set, get) => ({
      graphData: { nodes: [], links: [] },
      addNode: (node) => {
        if (get().isDuplicateLabel(node.label)) {
          throw new Error('Node with this label already exists');
        }
        set((state) => ({
          graphData: {
            ...state.graphData,
            nodes: [...state.graphData.nodes, node],
          },
        }));
      },
      addLink: (link) =>
        set((state) => ({
          graphData: {
            ...state.graphData,
            links: [...state.graphData.links, link],
          },
        })),
      removeNode: (id) =>
        set((state) => ({
          graphData: {
            nodes: state.graphData.nodes.filter((node) => node.id !== id),
            links: state.graphData.links.filter(
              (link) => link.source !== id && link.target !== id
            ),
          },
        })),
      removeLink: (source, target) =>
        set((state) => ({
          graphData: {
            ...state.graphData,
            links: state.graphData.links.filter(
              (link) => link.source !== source || link.target !== target
            ),
          },
        })),
      updateNode: (id, updates) =>
        set((state) => ({
          graphData: {
            ...state.graphData,
            nodes: state.graphData.nodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
          },
        })),
      isDuplicateLabel: (label) => {
        const state = get();
        return state.graphData.nodes.some((node) => node.label === label);
      },
    }),
    {
      name: 'mind-map-storage',
    }
  )
);