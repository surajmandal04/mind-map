import { generateColorHSL } from './utils';

export interface Node {
  id: string;
  text: string;
  type: string;
  details?: string;
  x?: number;
  y?: number;
}

export interface Link {
  source: string;
  target: string;
  distance: number;
  type?: string;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export type NodeType = {
  id: string;
  name: string;
  color: string;
};

export const NODE_TYPES: NodeType[] = [
  { id: 'information', name: 'Information', color: '#6C5B7B' },
  { id: 'task', name: 'Task', color: '#FF6B6B' },
  { id: 'idea', name: 'Idea', color: '#4ECDC4' },
  { id: 'resource', name: 'Resource', color: '#45B7D1' },
  { id: 'condition', name: 'Condition', color: '#96CEB4' },
  { id: 'milestone', name: 'Milestone', color: '#FFB347' },
  { id: 'goal', name: 'Goal', color: '#9B59B6' },
  { id: 'note', name: 'Note', color: '#F1C40F' }
];

// Utility function to generate a unique ID
export const generateId = () => crypto.randomUUID();

// Utility function to create a new node type
export const createNodeType = (name: string): NodeType => ({
  id: name.toLowerCase(),
  name: name.charAt(0).toUpperCase() + name.slice(1),
  color: generateColorHSL()
});