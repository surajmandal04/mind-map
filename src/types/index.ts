export interface Node {
  id: string;
  label: string;
  type: 'task' | 'idea' | 'note';
}

export interface Link {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}