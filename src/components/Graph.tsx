import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMindMapStore } from '../store';
import { Node, Link } from '../types';

const MIN_NODE_SIZE = 60;
const PADDING = 20;
const ARROW_SIZE = 10;
const TRANSITION_DURATION = 300;

// Layout constants for vertical positioning
const NODE_SPACING_Y = 150;
const NODE_SPACING_X = 250;
const INITIAL_OFFSET_X = 50;
const INITIAL_OFFSET_Y = 50;
const LEVEL_PADDING = 100;

interface GraphProps {
  searchTerm?: string;
}

export default function Graph({ searchTerm }: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const [linkingNode, setLinkingNode] = useState<Node | null>(null);
  const [tempLine, setTempLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const { nodes, links, setSelectedNode, addLink, cleanupInvalidLinks } = useMindMapStore();

  useEffect(() => {
    cleanupInvalidLinks();
  }, []);

  // Center view on searched node
  useEffect(() => {
    if (!searchTerm || !svgRef.current || !zoomRef.current) return;

    const searchedNode = nodes.find(node => 
      node.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.synonyms?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (searchedNode && searchedNode.x !== undefined && searchedNode.y !== undefined) {
      const svg = d3.select(svgRef.current);
      const container = svgRef.current.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Calculate the transform to center the node
      const scale = 0.8; // Zoom level
      const transform = d3.zoomIdentity
        .translate(width / 2 - searchedNode.x * scale, height / 2 - searchedNode.y * scale)
        .scale(scale);

      // Smoothly transition to the new view
      svg.transition()
        .duration(750)
        .call(zoomRef.current.transform, transform);

      // Highlight the searched node
      svg.selectAll('.node')
        .transition()
        .duration(750)
        .style('opacity', (d: any) => {
          const isMatch = d.id === searchedNode.id;
          return isMatch ? 1 : 0.4;
        });

      svg.selectAll('.link')
        .transition()
        .duration(750)
        .style('opacity', 0.2);

      // Reset highlighting after a delay
      setTimeout(() => {
        svg.selectAll('.node')
          .transition()
          .duration(750)
          .style('opacity', 1);

        svg.selectAll('.link')
          .transition()
          .duration(750)
          .style('opacity', 0.6);
      }, 2000);
    }
  }, [searchTerm, nodes]);

  const getNodeSize = (text: string): { width: number; height: number } => {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tempText.setAttribute('font-size', '12px');
    tempText.textContent = text;
    tempSvg.appendChild(tempText);
    document.body.appendChild(tempSvg);
    const bbox = tempText.getBBox();
    document.body.removeChild(tempSvg);
    
    return {
      width: Math.max(MIN_NODE_SIZE, bbox.width + PADDING * 2),
      height: Math.max(MIN_NODE_SIZE, bbox.height + PADDING * 2)
    };
  };

  const getNodeColor = (node: Node): string => {
    if (!node.tags || node.tags.length === 0) return '#6B7280';
    
    const tag = node.tags[0];
    const hue = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };

  const calculateNodePositions = () => {
    const positions = new Map<string, { x: number, y: number }>();
    const nodesByLevel = new Map<number, Node[]>();
    const nodeLevels = new Map<string, number>();
    const processedNodes = new Set<string>();
    
    const getNodeLevel = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      
      const incomingLinks = links.filter(l => l.target === nodeId);
      if (incomingLinks.length === 0) return 0;
      
      const parentLevels = incomingLinks.map(l => getNodeLevel(l.source, new Set(visited)));
      return Math.max(...parentLevels) + 1;
    };

    nodes.forEach(node => {
      if (!processedNodes.has(node.id)) {
        const level = getNodeLevel(node.id);
        nodeLevels.set(node.id, level);
        
        if (!nodesByLevel.has(level)) {
          nodesByLevel.set(level, []);
        }
        nodesByLevel.get(level)!.push(node);
        processedNodes.add(node.id);
      }
    });

    const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
    
    nodesByLevel.forEach((levelNodes, level) => {
      levelNodes.sort((a, b) => {
        const aConnections = links.filter(l => l.source === a.id || l.target === a.id).length;
        const bConnections = links.filter(l => l.source === b.id || l.target === b.id).length;
        return bConnections - aConnections;
      });

      const y = INITIAL_OFFSET_Y + level * (NODE_SPACING_Y + LEVEL_PADDING);

      levelNodes.forEach((node, index) => {
        const x = INITIAL_OFFSET_X + index * NODE_SPACING_X;
        positions.set(node.id, { x, y });
      });
    });

    return positions;
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight - 200;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    svg.append('defs').selectAll('marker')
      .data(['arrow'])
      .join('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', ARROW_SIZE)
      .attr('refY', 0)
      .attr('markerWidth', ARROW_SIZE)
      .attr('markerHeight', ARROW_SIZE)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    const nodePositions = calculateNodePositions();
    nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (pos) {
        if (!node.x || !node.y) {
          node.x = pos.x;
          node.y = pos.y;
        }
      }
    });

    const validLinks = links.map(link => ({
      source: nodes.find(n => n.id === link.source)!,
      target: nodes.find(n => n.id === link.target)!
    }));

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(validLinks)
        .id((d: any) => d.id)
        .distance(0)
        .strength(0))
      .force('charge', null)
      .force('collide', null)
      .force('x', null)
      .force('y', null)
      .alpha(0)
      .alphaTarget(0);

    simulationRef.current = simulation;

    const link = g.selectAll('.link')
      .data(validLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrow)')
      .style('stroke', '#999')
      .style('stroke-width', 2)
      .style('fill', 'none')
      .style('cursor', 'pointer')
      .style('opacity', 0.6)
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .style('stroke-width', 3);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.6)
          .style('stroke-width', 2);
      });

    if (tempLine) {
      g.append('line')
        .attr('class', 'temp-link')
        .attr('x1', tempLine.x1)
        .attr('y1', tempLine.y1)
        .attr('x2', tempLine.x2)
        .attr('y2', tempLine.y2)
        .style('stroke', '#666')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,5');
    }

    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%');

    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');

    node.each(function(d: Node) {
      const size = getNodeSize(d.text);
      const group = d3.select(this);
      const nodeColor = getNodeColor(d);
      
      group.append('rect')
        .attr('width', size.width)
        .attr('height', size.height)
        .attr('x', -size.width / 2)
        .attr('y', -size.height / 2)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', nodeColor)
        .style('filter', 'url(#drop-shadow)')
        .style('cursor', 'grab');

      group.append('text')
        .text(d.text)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('fill', 'white')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('pointer-events', 'none');

      if (d.tags && d.tags.length > 0) {
        group.append('text')
          .text(d.tags.join(', '))
          .attr('text-anchor', 'middle')
          .attr('dy', size.height / 2 + 15)
          .style('fill', '#666')
          .style('font-size', '10px')
          .style('pointer-events', 'none');
      }
    });

    node.on('click', (event: MouseEvent, d: Node) => {
      if (linkingNode && linkingNode.id !== d.id) {
        addLink(linkingNode.id, d.id);
        setLinkingNode(null);
        setTempLine(null);
      } else if (!event.ctrlKey && !event.metaKey) {
        setSelectedNode(d);
      }
    });

    function updateLinks() {
      link.attr('d', (d: any) => {
        const sourceSize = getNodeSize(d.source.text);
        const targetSize = getNodeSize(d.target.text);
        const sourceRadius = Math.max(sourceSize.width, sourceSize.height) / 2;
        const targetRadius = Math.max(targetSize.width, targetSize.height) / 2;

        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        if (dr === 0) return '';

        const sourceX = d.source.x + (dx * sourceRadius) / dr;
        const sourceY = d.source.y + (dy * sourceRadius) / dr;
        const targetX = d.target.x - (dx * (targetRadius + ARROW_SIZE)) / dr;
        const targetY = d.target.y - (dy * (targetRadius + ARROW_SIZE)) / dr;

        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
      });
    }

    function dragstarted(event: any) {
      d3.select(this).style('cursor', 'grabbing');
    }

    function dragged(event: any, d: any) {
      d.x = event.x;
      d.y = event.y;
      d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
      updateLinks();
    }

    function dragended(event: any) {
      d3.select(this).style('cursor', 'grab');
    }

    simulation.on('tick', updateLinks);

    svg.on('mousemove', (event: MouseEvent) => {
      if (linkingNode && tempLine) {
        const [x, y] = d3.pointer(event);
        setTempLine({
          ...tempLine,
          x2: x,
          y2: y
        });
      }
    });

    svg.on('mouseup', () => {
      if (linkingNode) {
        setLinkingNode(null);
        setTempLine(null);
      }
    });

    const initialTransform = d3.zoomIdentity
      .translate(0, 0)
      .scale(0.8);
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, linkingNode, tempLine]);

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-gray-900 rounded-lg">
      <div className="absolute top-4 left-4 bg-white/80 p-2 rounded-lg text-sm">
        <p>Hold Ctrl/Cmd + Click to link nodes</p>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}