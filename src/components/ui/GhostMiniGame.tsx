import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, KeyRound, RotateCcw, Trophy, CheckCircle2, ShieldAlert } from 'lucide-react';
import { playKeyClick, playCoinClink, playLevelUp, playVaultLock } from '../../lib/soundEngine';

interface GhostMiniGameProps {
  onEarnXP: (xp: number, badgeId?: string) => void;
  onClose?: () => void;
  soundEnabled?: boolean;
}

type MiniGameMode = 'select' | 'snake' | 'lockpick';

export const GhostMiniGame: React.FC<GhostMiniGameProps> = ({
  onEarnXP,
  onClose,
  soundEnabled = true,
}) => {
  const [mode, setMode] = useState<MiniGameMode>('select');

  return (
    <div className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-4 shadow-xl text-gray-900 dark:text-zinc-100">
      {mode === 'select' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold tracking-tight">Break Mini-Games</h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
              >
                Close
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Quick 2-minute distraction to reset your focus and earn companion XP.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => {
                if (soundEnabled) playKeyClick();
                setMode('snake');
              }}
              className="p-3 text-left rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-accent dark:hover:border-accent hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-zinc-200 group-hover:text-accent">
                <Gamepad2 className="w-3.5 h-3.5 text-accent" />
                Cyber Snake
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Collect encrypted packets. Score 5+ for the Cyber Viper badge.
              </p>
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playKeyClick();
                setMode('lockpick');
              }}
              className="p-3 text-left rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-accent dark:hover:border-accent hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-zinc-200 group-hover:text-accent">
                <KeyRound className="w-3.5 h-3.5 text-accent" />
                Lock Pick Reflex
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Time the tumbler pins correctly to pick the security vault.
              </p>
            </button>
          </div>
        </div>
      )}

      {mode === 'snake' && (
        <CyberSnakeGame
          onEarnXP={onEarnXP}
          onBack={() => setMode('select')}
          soundEnabled={soundEnabled}
        />
      )}

      {mode === 'lockpick' && (
        <LockPickGame
          onEarnXP={onEarnXP}
          onBack={() => setMode('select')}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  );
};

// ==========================================
// 1. HIGH-PERFORMANCE CYBER SNAKE GAME
// ==========================================
interface SubGameProps {
  onEarnXP: (xp: number, badgeId?: string) => void;
  onBack: () => void;
  soundEnabled: boolean;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 14;
const CELL_SIZE = 18; // 14 * 18 = 252px canvas
const TICK_RATE = 110; // ms per tick

const CyberSnakeGame: React.FC<SubGameProps> = ({ onEarnXP, onBack, soundEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [earnedXP, setEarnedXP] = useState<number>(0);

  // Game state stored in refs to eliminate closure stale state & input lag
  const snakeRef = useRef<Point[]>([
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
  ]);
  const foodRef = useRef<Point>({ x: 4, y: 4 });
  const dirRef = useRef<Direction>('UP');
  const dirQueueRef = useRef<Direction[]>([]);
  const isGameOverRef = useRef<boolean>(false);
  const badgeAwardedRef = useRef<boolean>(false);
  const lastTickTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const spawnFood = (currentSnake: Point[]): Point => {
    let newFood: Point;
    let collision = true;
    let attempts = 0;
    while (collision && attempts < 200) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      collision = currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
      attempts++;
      if (!collision) return newFood;
    }
    return { x: 2, y: 2 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#0a0b0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid Dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.fillRect(x * CELL_SIZE + CELL_SIZE / 2 - 1, y * CELL_SIZE + CELL_SIZE / 2 - 1, 2, 2);
      }
    }

    // Draw Food (Encrypted Data Bit)
    const food = foodRef.current;
    const fx = food.x * CELL_SIZE;
    const fy = food.y * CELL_SIZE;

    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(fx + 3, fy + 3, CELL_SIZE - 6, CELL_SIZE - 6, 4);
    ctx.fill();

    // Food inner pulse dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx + CELL_SIZE / 2, fy + CELL_SIZE / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake
    const snake = snakeRef.current;
    snake.forEach((seg, idx) => {
      const sx = seg.x * CELL_SIZE;
      const sy = seg.y * CELL_SIZE;

      ctx.save();
      if (idx === 0) {
        // Snake Head
        ctx.fillStyle = '#008EFF';
        ctx.shadowColor = '#008EFF';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
        ctx.fill();

        // Eyes on head
        ctx.fillStyle = '#ffffff';
        const curDir = dirRef.current;
        if (curDir === 'UP') {
          ctx.fillRect(sx + 4, sy + 3, 3, 3);
          ctx.fillRect(sx + CELL_SIZE - 7, sy + 3, 3, 3);
        } else if (curDir === 'DOWN') {
          ctx.fillRect(sx + 4, sy + CELL_SIZE - 6, 3, 3);
          ctx.fillRect(sx + CELL_SIZE - 7, sy + CELL_SIZE - 6, 3, 3);
        } else if (curDir === 'LEFT') {
          ctx.fillRect(sx + 3, sy + 4, 3, 3);
          ctx.fillRect(sx + 3, sy + CELL_SIZE - 7, 3, 3);
        } else {
          ctx.fillRect(sx + CELL_SIZE - 6, sy + 4, 3, 3);
          ctx.fillRect(sx + CELL_SIZE - 6, sy + CELL_SIZE - 7, 3, 3);
        }
      } else {
        // Snake Body (smooth tapering)
        const alpha = Math.max(0.4, 1 - idx / (snake.length + 4));
        ctx.fillStyle = `rgba(0, 142, 255, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
        ctx.fill();
      }
      ctx.restore();
    });
  }, []);

  const queueDirection = useCallback((newDir: Direction) => {
    const queue = dirQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;

    // Prevent immediate reverse turn
    const isOpposite =
      (newDir === 'UP' && lastDir === 'DOWN') ||
      (newDir === 'DOWN' && lastDir === 'UP') ||
      (newDir === 'LEFT' && lastDir === 'RIGHT') ||
      (newDir === 'RIGHT' && lastDir === 'LEFT');

    if (!isOpposite && queue.length < 2) {
      queue.push(newDir);
    }
  }, []);

  const resetGame = () => {
    snakeRef.current = [
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 9 },
    ];
    dirRef.current = 'UP';
    dirQueueRef.current = [];
    foodRef.current = spawnFood(snakeRef.current);
    isGameOverRef.current = false;
    setScore(0);
    setEarnedXP(0);
    setGameOver(false);
    draw();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        queueDirection('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        queueDirection('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        queueDirection('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        queueDirection('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueDirection]);

  // Game Loop using requestAnimationFrame with delta clock
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (!lastTickTimeRef.current) lastTickTimeRef.current = timestamp;
      const delta = timestamp - lastTickTimeRef.current;

      if (delta >= TICK_RATE && !isGameOverRef.current) {
        lastTickTimeRef.current = timestamp;

        // Consume next queued direction
        if (dirQueueRef.current.length > 0) {
          dirRef.current = dirQueueRef.current.shift()!;
        }

        const snake = snakeRef.current;
        const currentDir = dirRef.current;
        const head = { ...snake[0] };

        if (currentDir === 'UP') head.y -= 1;
        else if (currentDir === 'DOWN') head.y += 1;
        else if (currentDir === 'LEFT') head.x -= 1;
        else if (currentDir === 'RIGHT') head.x += 1;

        // Collision Check: Walls
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          isGameOverRef.current = true;
          setGameOver(true);
          draw();
          return;
        }

        // Collision Check: Self
        if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          isGameOverRef.current = true;
          setGameOver(true);
          draw();
          return;
        }

        const food = foodRef.current;
        if (head.x === food.x && head.y === food.y) {
          // FOOD EATEN: Snake GROWS by keeping tail
          const newSnake = [head, ...snake];
          snakeRef.current = newSnake;
          foodRef.current = spawnFood(newSnake);

          if (soundEnabled) playCoinClink();
          setScore((prev) => {
            const nextScore = prev + 1;
            setEarnedXP((x) => x + 5);

            if (nextScore >= 5 && !badgeAwardedRef.current) {
              badgeAwardedRef.current = true;
              onEarnXP(25, 'snake_champ');
              if (soundEnabled) playLevelUp();
            } else {
              onEarnXP(5);
            }
            return nextScore;
          });
        } else {
          // Normal Move: pop tail so length remains constant
          snakeRef.current = [head, ...snake.slice(0, -1)];
        }

        draw();
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, onEarnXP, soundEnabled]);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center justify-between w-full text-xs">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Games
        </button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-accent tabular-nums">Packets: {score}</span>
          <span className="text-gray-400 font-mono text-[11px]">+{earnedXP} XP</span>
        </div>
      </div>

      <div className="relative border border-zinc-800 rounded-lg overflow-hidden shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="block"
        />

        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-150">
            <p className="text-xs font-bold text-rose-400 mb-1">Signal Terminated</p>
            <p className="text-[11px] text-zinc-400 mb-3 font-mono">
              Packets Captured: {score} &middot; XP: +{earnedXP}
            </p>
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 shadow-sm transition-transform active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reboot Snake
            </button>
          </div>
        )}
      </div>

      {/* Tactile D-Pad Controls */}
      <div className="grid grid-cols-3 gap-1 w-32 pt-1">
        <div />
        <button
          onPointerDown={() => queueDirection('UP')}
          className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none"
        >
          &uarr;
        </button>
        <div />
        <button
          onPointerDown={() => queueDirection('LEFT')}
          className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none"
        >
          &larr;
        </button>
        <button
          onPointerDown={() => queueDirection('DOWN')}
          className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none"
        >
          &darr;
        </button>
        <button
          onPointerDown={() => queueDirection('RIGHT')}
          className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 2. PRECISION LOCK PICK REFLEX GAME
// ==========================================
const LockPickGame: React.FC<SubGameProps> = ({ onEarnXP, onBack, soundEnabled }) => {
  const [pinsUnlocked, setPinsUnlocked] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Press Spacebar or click Pick Pin when aligned.');

  const needlePosRef = useRef<number>(10);
  const needleSpeedRef = useRef<number>(1.2);
  const needleElemRef = useRef<HTMLDivElement>(null);
  const sweetSpotRef = useRef<{ start: number; width: number }>({ start: 35, width: 30 });
  const [sweetSpotVisual, setSweetSpotVisual] = useState<{ start: number; width: number }>({ start: 35, width: 30 });
  const totalPins = 4;
  const isWonRef = useRef(false);
  const isFailedRef = useRef(false);

  // 60fps needle motion without React re-renders or CSS transition lag
  useEffect(() => {
    let animId: number;
    const updateNeedle = () => {
      if (!isWonRef.current && !isFailedRef.current) {
        needlePosRef.current += needleSpeedRef.current;
        if (needlePosRef.current >= 96) {
          needlePosRef.current = 96;
          needleSpeedRef.current = -Math.abs(needleSpeedRef.current);
        } else if (needlePosRef.current <= 4) {
          needlePosRef.current = 4;
          needleSpeedRef.current = Math.abs(needleSpeedRef.current);
        }

        if (needleElemRef.current) {
          needleElemRef.current.style.left = `${needlePosRef.current}%`;
        }
      }
      animId = requestAnimationFrame(updateNeedle);
    };

    animId = requestAnimationFrame(updateNeedle);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePickAttempt = useCallback(() => {
    if (isWonRef.current || isFailedRef.current) return;

    const currentPos = needlePosRef.current;
    const spot = sweetSpotRef.current;
    const inZone = currentPos >= spot.start && currentPos <= spot.start + spot.width;

    if (inZone) {
      if (soundEnabled) playKeyClick();
      setPinsUnlocked((prev) => {
        const next = prev + 1;
        if (next >= totalPins) {
          isWonRef.current = true;
          setIsWon(true);
          setStatusMessage('Vault Breached! All pins picked.');
          if (soundEnabled) {
            playVaultLock();
            playLevelUp();
          }
          onEarnXP(35, 'locksmith');
        } else {
          setStatusMessage(`Pin ${next}/${totalPins} set into place!`);
          // Generate new sweet spot: narrower as pins increase
          const newWidth = Math.max(16, 30 - next * 4);
          const newStart = Math.floor(Math.random() * (85 - newWidth)) + 10;
          sweetSpotRef.current = { start: newStart, width: newWidth };
          setSweetSpotVisual({ start: newStart, width: newWidth });
          // Slightly faster sweep
          needleSpeedRef.current = (needleSpeedRef.current > 0 ? 1 : -1) * (1.2 + next * 0.25);
        }
        return next;
      });
    } else {
      if (soundEnabled) playKeyClick();
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          isFailedRef.current = true;
          setIsFailed(true);
          setStatusMessage('Pick snapped! Tension lost.');
        } else {
          setStatusMessage(`Tension slipped! ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        }
        return remaining;
      });
    }
  }, [onEarnXP, soundEnabled]);

  // Spacebar trigger bound once
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePickAttempt();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePickAttempt]);

  const handleReset = () => {
    isWonRef.current = false;
    isFailedRef.current = false;
    setIsWon(false);
    setIsFailed(false);
    setPinsUnlocked(0);
    setLives(3);
    setStatusMessage('Press Spacebar or click Pick Pin when aligned.');
    const initialSpot = { start: 35, width: 30 };
    sweetSpotRef.current = initialSpot;
    setSweetSpotVisual(initialSpot);
    needleSpeedRef.current = 1.2;
    needlePosRef.current = 10;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full text-xs">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Games
        </button>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">Pins: {pinsUnlocked}/{totalPins}</span>
          <span className="text-rose-500 font-mono text-[11px]">&middot; Lives: {lives}</span>
        </div>
      </div>

      {/* Tumbler Pins Representation */}
      <div className="flex gap-2 w-full justify-center py-1">
        {Array.from({ length: totalPins }).map((_, idx) => (
          <div
            key={idx}
            className={`w-11 h-13 rounded-lg border flex flex-col items-center justify-between p-1.5 transition-all duration-200 ${
              idx < pinsUnlocked
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                : 'bg-gray-100 dark:bg-zinc-800/80 border-gray-300 dark:border-zinc-700 text-gray-400'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <div
              className={`w-full rounded transition-all duration-200 ${
                idx < pinsUnlocked ? 'h-7 bg-emerald-400 shadow-sm' : 'h-2 bg-gray-400 dark:bg-zinc-600'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Tension Meter Track */}
      <div className="w-full relative h-8 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shadow-inner">
        {/* Sweet spot target (NO transition, instant CSS) */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400"
          style={{
            left: `${sweetSpotVisual.start}%`,
            width: `${sweetSpotVisual.width}%`,
          }}
        />

        {/* Needle: rendered with style.left directly via RAF, NO transition delay */}
        <div
          ref={needleElemRef}
          className="absolute top-0 bottom-0 w-2 bg-amber-400 rounded-full shadow-md shadow-amber-400/80 -translate-x-1/2 pointer-events-none"
          style={{ left: '10%' }}
        />
      </div>

      <p className="text-xs text-center text-gray-600 dark:text-zinc-400 min-h-[18px]">
        {statusMessage}
      </p>

      {isWon ? (
        <div className="flex flex-col items-center gap-2 pt-1 w-full">
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <Trophy className="w-4 h-4" />
            Vault Breached! +35 XP awarded.
          </div>
          <button
            onClick={handleReset}
            className="w-full py-2 text-xs font-semibold rounded-lg bg-accent text-white hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Pick Another Vault
          </button>
        </div>
      ) : isFailed ? (
        <div className="flex flex-col items-center gap-2 pt-1 w-full">
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            Lock Mechanism Jammed.
          </div>
          <button
            onClick={handleReset}
            className="w-full py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 shadow-sm flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      ) : (
        <button
          onPointerDown={handlePickAttempt}
          className="w-full py-2.5 bg-accent hover:opacity-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-transform active:scale-[0.98] select-none"
        >
          Pick Pin (or Spacebar)
        </button>
      )}
    </div>
  );
};
