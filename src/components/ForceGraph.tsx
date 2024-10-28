import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, Node } from '../types';

interface ForceGraphProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
}

export function ForceGraph({ data, onNodeClick }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = 800;
    const height = 600;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const links = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6);

    const nodes = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    nodes.append('circle')
      .attr('r', 10)
      .attr('fill', (d: Node) => {
        switch (d.type) {
          case 'task': return '#ff7675';
          case 'idea': return '#74b9ff';
          case 'note': return '#55efc4';
          default: return '#dfe6e9';
        }
      });

    nodes.append('text')
      .text((d: Node) => d.label)
      .attr('x', 15)
      .attr('y', 5);

    nodes.on('click', (event: MouseEvent, d: Node) => {
      if (onNodeClick) onNodeClick(d);
    });

    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full border border-gray-200 rounded-lg"
    />
  );
}