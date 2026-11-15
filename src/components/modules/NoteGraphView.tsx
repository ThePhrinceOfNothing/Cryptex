import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Note } from '../../lib/vault';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Share2, 
  ArrowLeft, 
  Search, 
  Info
} from 'lucide-react';

interface Node {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  linkCount: number;
  connectedIds: string[];
}

interface Edge {
  source: string;
  target: string;
}

export interface NoteGraphViewProps {
  notes?: Note[];
  selectedId?: string | null;
  onSelectNote: (id: string) => void;
  onClose?: () => void;
}

export const NoteGraphView: React.FC<NoteGraphViewProps> = ({
  notes: propNotes,
  selectedId,
  onSelectNote,
  onClose,
}) => {
  const { vaultData } = useVault();
  const notes = propNotes || vaultData?.notes || [];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'connected'>('all');
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isDraggingCanvasRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<Node | null>(null);
  const dragDistanceRef = useRef<number>(0);

  // 1. Build nodes & edges from both [[Title]] and TipTap mention tags
  const { initialNodes, edges } = useMemo(() => {
    const titleToId = new Map<string, string>();
    notes.forEach((n) => {
      titleToId.set(n.title.toLowerCase().trim(), n.id);
    });

    const parsedEdges: Edge[] = [];
    const connectedMap = new Map<string, Set<string>>();

    notes.forEach((n) => connectedMap.set(n.id, new Set<string>()));

    const addEdge = (src: string, tgt: string) => {
      if (src === tgt) return;
      const alreadyExists = parsedEdges.some(
        (e) => (e.source === src && e.target === tgt) || (e.source === tgt && e.target === src)
      );
      if (!alreadyExists) {
        parsedEdges.push({ source: src, target: tgt });
        connectedMap.get(src)?.add(tgt);
        connectedMap.get(tgt)?.add(src);
      }
    };

    notes.forEach((n) => {
      const content = n.content || '';

      // Match [[Note Title]] wiki-links
      const wikiRegex = /\[\[(.*?)\]\]/g;
      let wikiMatch;
      while ((wikiMatch = wikiRegex.exec(content)) !== null) {
        const targetTitle = wikiMatch[1].toLowerCase().trim();
        const targetId = titleToId.get(targetTitle);
        if (targetId) {
          addEdge(n.id, targetId);
        }
      }

      // Match TipTap mention tags: data-type="mention" data-id="UUID"
      const mentionRegex = /data-type="mention"[^>]*data-id="([^"]+)"/g;
      let mentionMatch;
      while ((mentionMatch = mentionRegex.exec(content)) !== null) {
        const targetId = mentionMatch[1];
        if (targetId && notes.some((note) => note.id === targetId)) {
          addEdge(n.id, targetId);
        }
      }
    });

    const totalNotes = notes.length || 1;
    const angleStep = (2 * Math.PI) / totalNotes;

    const parsedNodes: Node[] = notes.map((n, i) => {
      const connSet = connectedMap.get(n.id) || new Set<string>();
      const count = connSet.size;
      const radius = 10 + Math.min(16, count * 3);
      const orbit = 160 + (i % 2 === 0 ? 40 : -40);
      return {
        id: n.id,
        title: n.title || 'Untitled Note',
        content: n.content || '',
        x: Math.cos(i * angleStep) * orbit,
        y: Math.sin(i * angleStep) * orbit,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius,
        linkCount: count,
        connectedIds: Array.from(connSet),
      };
    });

    return { initialNodes: parsedNodes, edges: parsedEdges };
  }, [notes]);

  const nodesRef = useRef<Node[]>(initialNodes);
  useEffect(() => {
    nodesRef.current = initialNodes;
  }, [initialNodes]);

  // 2. High-DPI Canvas Simulation & Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const step = () => {
      const container = containerRef.current;
      const width = container ? container.clientWidth : 800;
      const height = container ? container.clientHeight : 600;

      const currentNodes = nodesRef.current;
      const idToNode = new Map<string, Node>();
      currentNodes.forEach((n) => idToNode.set(n.id, n));

      // Force Simulation:
      // A. Repulsion between nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist < 320) {
            const force = 1400 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // B. Spring attraction along links
      edges.forEach((e) => {
        const a = idToNode.get(e.source);
        const b = idToNode.get(e.target);
        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 130;
          const force = (dist - desiredDist) * 0.035;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx += fx;
          b.vy += fy;
        }
      });

      // C. Center gravity & friction
      currentNodes.forEach((n) => {
        if (n !== draggedNodeRef.current) {
          n.vx -= n.x * 0.01;
          n.vy -= n.y * 0.01;
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      // Render Stage:
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');

      // Subtle Background Grid / Coordinate Dots
      ctx.save();
      ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
      ctx.scale(zoom, zoom);

      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
      const gridSize = 45;
      const startX = -1200;
      const endX = 1200;
      const startY = -1200;
      const endY = 1200;
      for (let gx = startX; gx <= endX; gx += gridSize) {
        for (let gy = startY; gy <= endY; gy += gridSize) {
          ctx.fillRect(gx - 1, gy - 1, 2, 2);
        }
      }

      // 1. Draw Links (Edges)
      edges.forEach((e) => {
        const a = idToNode.get(e.source);
        const b = idToNode.get(e.target);
        if (a && b) {
          const isHighlight =
            (selectedId && (selectedId === a.id || selectedId === b.id)) ||
            (hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id));

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);

          if (isHighlight) {
            ctx.strokeStyle = '#008EFF';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#008EFF';
            ctx.shadowBlur = 8;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1.25;
            ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // 2. Draw Nodes
      currentNodes.forEach((n) => {
        if (filterMode === 'connected' && n.linkCount === 0) return;

        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedId === n.id;
        const matchesSearch =
          !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase());

        const opacity = matchesSearch ? 1.0 : 0.25;
        ctx.globalAlpha = opacity;

        // Selected Pulse Halo
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 142, 255, 0.22)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 142, 255, 0.08)';
          ctx.fill();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          ctx.fill();
        }

        // Main Node Body
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = '#008EFF';
        } else if (isHovered) {
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        } else if (n.linkCount > 0) {
          ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        } else {
          ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
        }
        ctx.fill();

        // High-contrast Node Border
        ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Badge pill for link count if > 0
        if (n.linkCount > 0) {
          const badgeX = n.x + n.radius * 0.7;
          const badgeY = n.y - n.radius * 0.7;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#008EFF';
          ctx.fill();

          ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = 'bold 8px ui-sans-serif, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(n.linkCount), badgeX, badgeY);
        }

        // Label Badge
        ctx.textBaseline = 'alphabetic';
        ctx.font = isSelected
          ? '600 12px ui-sans-serif, system-ui, sans-serif'
          : '500 11px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';

        const labelY = n.y + n.radius + 15;

        // Label Background Card for 100% Readability
        const textWidth = ctx.measureText(n.title).width;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect(n.x - textWidth / 2 - 6, labelY - 11, textWidth + 12, 16, 4);
        ctx.fill();

        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label Text
        if (isSelected) {
          ctx.fillStyle = '#008EFF';
        } else if (isHovered) {
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        } else {
          ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        }
        ctx.fillText(n.title, n.x, labelY + 1);

        ctx.globalAlpha = 1.0;
      });

      ctx.restore();
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [edges, zoom, offset, hoveredNode, selectedId, filterMode, searchQuery]);

  // Mouse Coordinate Helpers
  const getCanvasMousePos = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const cx = clientX - rect.left - container.clientWidth / 2 - offset.x;
      const cy = clientY - rect.top - container.clientHeight / 2 - offset.y;
      return { x: cx / zoom, y: cy / zoom };
    },
    [offset, zoom]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingCanvasRef.current) {
      dragDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    const { x, y } = getCanvasMousePos(e.clientX, e.clientY);
    if (draggedNodeRef.current) {
      dragDistanceRef.current += 1;
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    const hit = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
    });

    setHoveredNode(hit || null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragDistanceRef.current = 0;
    const { x, y } = getCanvasMousePos(e.clientX, e.clientY);
    const hit = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
    });

    if (hit) {
      draggedNodeRef.current = hit;
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      };
    }
  };

  const handleMouseUp = () => {
    if (dragDistanceRef.current < 6) {
      const clicked = draggedNodeRef.current || hoveredNode;
      if (clicked) {
        onSelectNote(clicked.id);
        if (onClose) onClose();
      }
    }
    draggedNodeRef.current = null;
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.35, Math.min(2.8, prev * zoomFactor)));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] dark:bg-[#090b10] select-none relative overflow-hidden">
      {/* 1. Header Toolbar (Responsive & Clean) */}
      <div className="h-14 border-b border-gray-200 dark:border-[#1e2330] px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0f131c] shrink-0 z-20 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5 text-xs font-medium active:scale-95 shrink-0"
              title="Return to Note Editor"
            >
              <ArrowLeft size={14} strokeWidth={1.75} />
              <span>Editor</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <Share2 size={16} strokeWidth={1.75} className="text-accent shrink-0" />
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white tracking-tight truncate">
              Knowledge Constellation
            </h2>
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 pl-2 font-mono shrink-0">
            <span>{notes.length} notes</span>
            <span>&middot;</span>
            <span>{edges.length} connections</span>
          </div>
        </div>

        {/* Search, Filters & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-2.5 py-1.5 bg-gray-100 dark:bg-[#161b26] border border-gray-200 dark:border-[#222938] rounded-lg text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:border-accent w-24 sm:w-36 md:w-44 transition-all"
            />
          </div>

          <div className="flex bg-gray-100 dark:bg-[#161b26] p-0.5 rounded-lg border border-gray-200 dark:border-[#222938]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-[#222938] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('connected')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'connected'
                  ? 'bg-white dark:bg-[#222938] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              Connected
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 dark:border-[#222938] mx-0.5" />

          {/* Zoom & Viewport Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(2.8, z + 0.2))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-[#222938] bg-white dark:bg-[#161b26] text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.35, z - 0.2))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-[#222938] bg-white dark:bg-[#161b26] text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={14} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-[#222938] bg-white dark:bg-[#161b26] text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Reset View"
            >
              <RotateCcw size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Full Width Canvas Workspace (Inspector Removed) */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-[#f8fafc] dark:bg-[#07090e] overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Hovered Node Tooltip (Non-intrusive floating pill) */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-[#0f131c]/95 backdrop-blur-md border border-gray-200 dark:border-[#1e2330] px-3.5 py-2 rounded-lg shadow-lg pointer-events-none text-xs z-20">
            <p className="font-semibold text-gray-900 dark:text-white">{hoveredNode.title}</p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
              {hoveredNode.linkCount} cross-reference{hoveredNode.linkCount === 1 ? '' : 's'} &bull; Click to open in editor
            </p>
          </div>
        )}

        {/* Quick User Instruction Tooltip */}
        {!hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-[#0f131c]/95 backdrop-blur-md border border-gray-200 dark:border-[#1e2330] px-3.5 py-2 rounded-lg shadow-sm text-xs pointer-events-none flex items-center gap-2 text-gray-600 dark:text-zinc-300">
            <Info size={14} className="text-accent shrink-0" />
            <span>Click any node to open &bull; Drag to rearrange &bull; Type <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono font-bold">[[</code> in notes to link</span>
          </div>
        )}
      </div>
    </div>
  );
};
