import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMindMapStore } from '../store';
import { Node, Link, NODE_TYPES } from '../types';

const MIN_NODE_SIZE = 60;
const PADDING = 20;
const ARROW_SIZE = 10;
const VERTICAL_GAP = 150;
const HORIZONTAL_OFFSET = 300;

export const Graph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const [linkingNode, setLinkingNode] = useState<Node | null>(null);
  const [tempLine, setTempLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const { nodes, links, setSelectedNode, addLink, cleanupInvalidLinks, nodeTypes } = useMindMapStore();

  useEffect(() => {
    cleanupInvalidLinks();
  }, []);

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

  const getNodeTypeInfo = (typeId: string) => {
    const customType = nodeTypes.find(t => t.id === typeId);
    if (customType) return customType;
    const predefinedType = NODE_TYPES.find(t => t.id === typeId);
    if (predefinedType) return predefinedType;
    return NODE_TYPES[0];
  };

  const organizeNodesVertically = () => {
    // Create a map to store node chains
    const chains = new Map<string, Node[]>();
    const processedNodes = new Set<string>();

    // Helper function to find root nodes (nodes with no incoming links)
    const findRootNodes = () => {
      const targetNodes = new Set(links.map(l => l.target));
      return nodes.filter(node => !targetNodes.has(node.id));
    };

    // Helper function to build chain from root node
    const buildChain = (startNode: Node) => {
      const chain: Node[] = [startNode];
      let currentNode = startNode;
      
      while (true) {
        const nextLink = links.find(l => l.source === currentNode.id);
        if (!nextLink) break;
        
        const nextNode = nodes.find(n => n.id === nextLink.target);
        if (!nextNode || processedNodes.has(nextNode.id)) break;
        
        chain.push(nextNode);
        processedNodes.add(nextNode.id);
        currentNode = nextNode;
      }
      
      return chain;
    };

    // Process all root nodes and their chains
    const rootNodes = findRootNodes();
    rootNodes.forEach((rootNode, index) => {
      if (!processedNodes.has(rootNode.id)) {
        processedNodes.add(rootNode.id);
        const chain = buildChain(rootNode);
        chains.set(rootNode.id, chain);
      }
    });

    // Position nodes in vertical chains
    let currentX = HORIZONTAL_OFFSET;
    chains.forEach((chain) => {
      chain.forEach((node, index) => {
        node.x = currentX;
        node.y = VERTICAL_GAP * (index + 1);
      });
      currentX += HORIZONTAL_OFFSET;
    });

    // Handle remaining nodes that aren't part of any chain
    const unprocessedNodes = nodes.filter(node => !processedNodes.has(node.id));
    unprocessedNodes.forEach((node, index) => {
      node.x = currentX;
      node.y = VERTICAL_GAP * (index + 1);
    });
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Organize nodes vertically before rendering
    organizeNodesVertically();

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight - 200;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Define arrow marker
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

    svg.call(zoom);

    // Add subtle grid pattern
    const gridSize = 50;
    const grid = g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1);

    grid.append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', gridSize)
      .attr('height', gridSize)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path')
      .attr('d', `M ${gridSize} 0 L 0 0 0 ${gridSize}`)
      .attr('fill', 'none')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 0.5);

    grid.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#grid-pattern)');

    // Create links
    const validLinks = links.map(link => ({
      source: nodes.find(n => n.id === link.source)!,
      target: nodes.find(n => n.id === link.target)!
    }));

    // Create simulation with minimal forces
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(validLinks)
        .id((d: any) => d.id)
        .distance(VERTICAL_GAP)
        .strength(0.1))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('collide', d3.forceCollide().radius(80))
      .alpha(0.1)
      .alphaDecay(0.02);

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

    // Add drop shadow filter
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
      const nodeType = getNodeTypeInfo(d.type);
      
      group.append('rect')
        .attr('width', size.width)
        .attr('height', size.height)
        .attr('x', -size.width / 2)
        .attr('y', -size.height / 2)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', nodeType.color)
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

      group.append('text')
        .text(nodeType.name)
        .attr('text-anchor', 'middle')
        .attr('dy', size.height / 2 + 15)
        .style('fill', '#666')
        .style('font-size', '10px')
        .style('pointer-events', 'none');
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

    simulation.on('tick', () => {
      node.attr('transform', d => `translate(${d.x},${d.y})`);
      updateLinks();
    });

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

    // Center the initial view
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8);
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, linkingNode, tempLine, nodeTypes]);

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-gray-900 rounded-lg">
      <div className="absolute top-4 left-4 bg-white/80 p-2 rounded-lg text-sm">
        <p>Hold Ctrl/Cmd + Click to link nodes</p>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};