import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Node } from '../types';

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  onNodeCreate: (position: { x: number; y: number }) => void;
}

export function DrawingCanvas({ onNodeCreate }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getMousePos = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getMousePos(e.nativeEvent);
    setPoints([pos]);
    setLastPoint(pos);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !lastPoint) return;

    const currentPoint = getMousePos(e.nativeEvent);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    setPoints([...points, currentPoint]);
    setLastPoint(currentPoint);
  };

  const endDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    analyzeDrawing();
  };

  const analyzeDrawing = () => {
    if (points.length < 10) return;

    // Check if it's a circle
    const isCircle = detectCircle(points);
    if (isCircle) {
      const center = calculateCenter(points);
      onNodeCreate(center);
    }

    // Clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    setPoints([]);
  };

  const detectCircle = (points: Point[]): boolean => {
    const center = calculateCenter(points);
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
    );
    
    const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((a, b) => a + Math.pow(b - avgRadius, 2), 0) / distances.length;
    
    return variance < 500; // Threshold for circle detection
  };

  const calculateCenter = (points: Point[]): Point => {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 cursor-crosshair"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    />
  );
}