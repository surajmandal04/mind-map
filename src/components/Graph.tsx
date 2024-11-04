import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMindMapStore } from '../store';
import { Node, Link } from '../types';
import { Trash2 } from 'lucide-react';

const MIN_NODE_SIZE = 60;
const PADDING = 20;
const ARROW_SIZE = 10;
const TRANSITION_DURATION = 300;
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
  const [hoveredLink, setHoveredLink] = useState<{ source: string; target: string } | null>(null);
  const { nodes, links, setSelectedNode, addLink, cleanupInvalidLinks, removeLink } = useMindMapStore();

  useEffect(() => {
    cleanupInvalidLinks();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && hoveredLink) {
      e.preventDefault();
      e.stopPropagation();
      removeLink(hoveredLink.source, hoveredLink.target);
      setHoveredLink(null);
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('keydown', handleKeyDown);
      return () => svg.removeEventListener('keydown', handleKeyDown);
    }
  }, [hoveredLink]);

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

      const scale = 0.8;
      const transform = d3.zoomIdentity
        .translate(width / 2 - searchedNode.x * scale, height / 2 - searchedNode.y * scale)
        .scale(scale);

      svg.transition()
        .duration(750)
        .call(zoomRef.current.transform, transform);

      svg.selectAll('.node')
        .transition()
        .duration(750)
        .style('opacity', (d: any) => d.id === searchedNode.id ? 1 : 0.4);

      svg.selectAll('.link')
        .transition()
        .duration(750)
        .style('opacity', 0.2);

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
      .attr('height', height)
      .attr('tabindex', '0'); // Make SVG focusable

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

    const linkGroup = g.selectAll('.link-group')
      .data(validLinks)
      .enter()
      .append('g')
      .attr('class', 'link-group')
      .style('cursor', 'pointer');

    const link = linkGroup.append('path')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrow)')
      .style('stroke', '#999')
      .style('stroke-width', 2)
      .style('fill', 'none')
      .style('opacity', 0.6);

    const deleteButton = linkGroup.append('g')
      .attr('class', 'delete-button')
      .style('opacity', 0)
      .style('cursor', 'pointer');

    deleteButton.append('circle')
      .attr('r', 12)
      .style('fill', '#ef4444')
      .style('stroke', '#fff')
      .style('stroke-width', 2);

    deleteButton.append('g')
      .attr('transform', 'translate(-6, -6)')
      .append('path')
      .attr('d', 'M3 6L6 9M6 6L3 9M14.5 3.5L14.5 3.5')
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('stroke-linecap', 'round')
      .style('stroke-linejoin', 'round');

    linkGroup
      .on('mouseover', function(event, d: any) {
        d3.select(this).select('.link')
          .transition()
          .duration(200)
          .style('opacity', 1)
          .style('stroke-width', 3);

        d3.select(this).select('.delete-button')
          .transition()
          .duration(200)
          .style('opacity', 1);

        setHoveredLink({ source: d.source.id, target: d.target.id });
        svgRef.current?.focus(); // Focus the SVG when hovering over a link
      })
      .on('mouseout', function() {
        d3.select(this).select('.link')
          .transition()
          .duration(200)
          .style('opacity', 0.6)
          .style('stroke-width', 2);

        d3.select(this).select('.delete-button')
          .transition()
          .duration(200)
          .style('opacity', 0);

        setHoveredLink(null);
      });

    deleteButton.on('click', (event, d: any) => {
      event.stopPropagation();
      removeLink(d.source.id, d.target.id);
    });

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
      linkGroup.each(function(d: any) {
        const sourceSize = getNodeSize(d.source.text);
        const targetSize = getNodeSize(d.target.text);
        const sourceRadius = Math.max(sourceSize.width, sourceSize.height) / 2;
        const targetRadius = Math.max(targetSize.width, targetSize.height) / 2;

        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        if (dr === 0) return;

        const sourceX = d.source.x + (dx * sourceRadius) / dr;
        const sourceY = d.source.y + (dy * sourceRadius) / dr;
        const targetX = d.target.x - (dx * (targetRadius + ARROW_SIZE)) / dr;
        const targetY = d.target.y - (dy * (targetRadius + ARROW_SIZE)) / dr;

        d3.select(this).select('.link')
          .attr('d', `M${sourceX},${sourceY}L${targetX},${targetY}`);

        const buttonX = (sourceX + targetX) / 2;
        const buttonY = (sourceY + targetY) / 2;
        
        d3.select(this).select('.delete-button')
          .attr('transform', `translate(${buttonX},${buttonY})`);
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
        <p>Press Delete or click the red button to remove links</p>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}