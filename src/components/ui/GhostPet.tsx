import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { calculatePasswordStrength } from '../../lib/passwordUtils';

export const GhostPet: React.FC<{activeTab: string}> = ({ activeTab }) => {
  const { vaultData } = useVault();
  const ghostBehavior = vaultData?.settings?.ghostBehavior || 'random';

  const [isOpen, setIsOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Track window size to ensure fixed position is always correct on resize
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track mouse for the ghost to look at / drift towards
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate context-aware lines
  const getContextLines = useCallback(() => {
    let lines: string[] = [];

    if (activeTab.toLowerCase().includes('vault')) {
      lines.push("Oops! I'll close my eyes! Your secrets are safe.");
      lines.push("I love staring at encrypted hashes.");
      lines.push("AES-256? More like AES-2-spooky-6!");
      lines.push("No one is getting in here... not even other ghosts.");
      
      const weakCount = (vaultData?.credentials || []).filter(c => calculatePasswordStrength(c.password || '').score < 50).length;
      if (weakCount > 0) {
        lines.push(`Yikes, ${weakCount} weak passwords! That's scarier than me.`);
        lines.push("I sense a disturbance in your password strength.");
      } else if (vaultData?.credentials && vaultData.credentials.length > 0) {
        lines.push("Military-grade encryption detected. I like it!");
        lines.push("Your passwords are a fortress!");
      }
    } else if (activeTab.toLowerCase().includes('task')) {
      lines.push("So much to do, so little time...");
      lines.push("Let's get productive! Or we can just haunt this board.");
      lines.push("Drag and drop! It's like telekinesis.");
      
      if (vaultData?.tasks) {
        const todoCount = vaultData.tasks.filter(t => t.status === 'todo').length;
        if (todoCount > 4) {
          lines.push(`Our To-Do list has ${todoCount} items... It's looking a bit scary!`);
          lines.push("Procrastination is the real ghost haunting you.");
        }
        
        const doneCount = vaultData.tasks.filter(t => t.status === 'done').length;
        if (doneCount > 0) {
          lines.push(`Look at all those finished tasks! Great job!`);
        }
      }
    } else if (activeTab.toLowerCase().includes('income')) {
      lines.push("Money makes the virtual world go round.");
      lines.push("I don't have a wallet, so I just hoard data.");
      lines.push("Accounting? More like A-haunting! ...Sorry.");
      
      const netWorth = (vaultData?.transactions || []).reduce((acc, curr) => {
        if (curr.type === 'income') return acc + curr.amount;
        if (curr.type === 'expense') return acc - curr.amount;
        return acc;
      }, 0);

      if (netWorth > 0) {
        lines.push("Stonks! ?? Look at those numbers go up!");
        lines.push("You're making bank! Buy me some more RAM?");
      } else if (netWorth < 0) {
        lines.push("We're in the red! Time to save some ghost coins.");
        lines.push("Ouch, those expenses are spooky.");
      }
    } else if (activeTab.toLowerCase().includes('calendar')) {
      lines.push("Time is just an illusion anyway...");
      lines.push("Got any spooky events coming up?");
      lines.push("I don't age, so I don't really use calendars.");
    } else if (activeTab.toLowerCase().includes('note')) {
      lines.push("A penny for your thoughts... oh wait, I don't use money.");
      lines.push("I love a good ghost story. Writing any?");
      lines.push("Scribble, scribble... your secrets are safe here.");
      lines.push("Markdown is my second favorite language, after Boo++.");
      
      if (vaultData?.notes && vaultData.notes.length > 5) {
        lines.push("You sure have a lot of thoughts!");
      }
    } else {
      lines.push("Welcome back to HQ!");
      lines.push("All systems nominal.");
      lines.push("Dashboard is looking clean today.");
    }

    // 20% chance to say a general line instead, just for variety
    if (lines.length === 0 || Math.random() < 0.2) {
      lines = [
        "Boo! Did I scare you?", 
        "I'm just floating around...", 
        "Did you know? I eat bytes for breakfast.",
        "Just hanging out in the mainframe.",
        "Do you think ghosts use cloud storage?",
        "I used to be a generic robot, but I got a spectral upgrade!",
        "I'm keeping an eye on your data. The left one, mostly.",
        "Don't mind me, I'm just here for the WiFi."
      ];
    }

    return lines;
  }, [activeTab, vaultData]);

  const speak = useCallback(() => {
    const lines = getContextLines();
    const newQuote = lines[Math.floor(Math.random() * lines.length)];
    setCurrentQuote(newQuote);
    setIsOpen(true);
  }, [getContextLines]);

  // Handle route change behaviors
  useEffect(() => {
    if (ghostBehavior === 'random') {
      const spawnX = Math.max(100, Math.random() * (winSize.w - 200));
      const spawnY = Math.max(150, Math.random() * (winSize.h - 200));
      setPosition({ x: spawnX, y: spawnY });
    }
    // If draggable, we don't automatically teleport them on route change
    
    // Slight delay so the ghost appears first, then talks
    const timer = setTimeout(() => {
      speak();
    }, 600);
    return () => clearTimeout(timer);
  }, [activeTab, speak, ghostBehavior]);

  // If fixed, constantly update position to be bottom right relative to current winSize
  useEffect(() => {
    if (ghostBehavior === 'fixed') {
      setPosition({ x: winSize.w - 100, y: winSize.h - 100 });
    }
  }, [ghostBehavior, winSize.w, winSize.h]);

  const handleClick = () => {
    if (!isOpen) speak();
    else setIsOpen(false);
  };

  // Close bubble after 5s
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Spontaneous talking
  useEffect(() => {
    const talkInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        speak();
      }
    }, 25000); 
    
    return () => clearInterval(talkInterval);
  }, [speak]);

  // Random blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, Math.random() * 4000 + 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Determine if looking left or right based on mouse pos relative to ghost
  const xDiff = mousePos.x - position.x;
  let eyeOffset = 0;
  if (xDiff < -40) eyeOffset = -1;
  else if (xDiff > 40) eyeOffset = 1;
  
  // Decide which side the bubble should appear on based on screen position
  // If ghost is on the left half of the screen, bubble goes on his right.
  const bubbleOnRight = position.x < (winSize.w / 2);

  // Handle the different rendering modes
  if (ghostBehavior === 'draggable') {
    return (
      <motion.div 
        className="fixed z-50 flex items-center justify-center cursor-grab active:cursor-grabbing"
        drag
        dragMomentum={false}
        initial={{ x: position.x, y: position.y }}
        onDragEnd={(e, info) => setPosition({ x: info.point.x, y: info.point.y })}
        style={{ width: 64, height: 64 }}
      >
        <GhostUI 
          isOpen={isOpen} 
          currentQuote={currentQuote} 
          isBlinking={isBlinking} 
          eyeOffset={eyeOffset} 
          bubbleOnRight={bubbleOnRight}
          handleClick={handleClick} 
        />
      </motion.div>
    );
  }

  // Random or Fixed (Uses tween drifting)
  const driftX = ghostBehavior === 'fixed' ? position.x : position.x + (mousePos.x - position.x) * 0.02;
  const driftY = ghostBehavior === 'fixed' ? position.y : position.y + (mousePos.y - position.y) * 0.02;

  return (
    <motion.div 
      className="fixed z-50 pointer-events-none flex items-center justify-center"
      animate={{ x: driftX, y: driftY }}
      transition={{ type: "tween", ease: "linear", duration: 0.1 }}
      style={{ top: 0, left: 0, width: 64, height: 64 }}
    >
      <div className="pointer-events-auto relative">
        <GhostUI 
          isOpen={isOpen} 
          currentQuote={currentQuote} 
          isBlinking={isBlinking} 
          eyeOffset={eyeOffset} 
          bubbleOnRight={bubbleOnRight}
          handleClick={handleClick} 
        />
      </div>
    </motion.div>
  );
};

// Extracted UI component so we can wrap it in different motion containers
const GhostUI: React.FC<{
  isOpen: boolean, 
  currentQuote: string, 
  isBlinking: boolean, 
  eyeOffset: number, 
  bubbleOnRight: boolean,
  handleClick: () => void
}> = ({ isOpen, currentQuote, isBlinking, eyeOffset, bubbleOnRight, handleClick }) => (
  <>
    {/* Speech Bubble (Dynamically swapped sides) */}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: bubbleOnRight ? -10 : 10, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={`absolute ${bubbleOnRight ? 'left-[75px]' : 'right-[75px]'} top-[-10px] w-max max-w-[220px] bg-white dark:bg-[#27272a] border border-gray-200 dark:border-[#262626] shadow-lg rounded-xl p-4 pointer-events-none ${bubbleOnRight ? 'origin-left' : 'origin-right'}`}
        >
          <p className="text-sm text-gray-700 dark:text-zinc-300 italic text-center font-medium">
            "{currentQuote}"
          </p>
          {/* Little arrow pointing at the ghost */}
          <div className={`absolute ${bubbleOnRight ? '-left-2 border-b border-l' : '-right-2 border-t border-r'} top-[32px] w-4 h-4 bg-white dark:bg-[#27272a] border-gray-200 dark:border-[#262626] transform rotate-45`}></div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Pixel Ghost Body */}
    <motion.button
      onClick={handleClick}
      className="outline-none relative cursor-pointer block"
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
      whileTap={{ scale: 0.9 }}
    >
            <svg 
        width="64" height="64" viewBox="0 0 14 14" 
        shapeRendering="crispEdges" 
        className="drop-shadow-xl filter"
      >
        {/* Main Body */}
        <path d="M 5 1 H 9 V 2 H 11 V 3 H 13 V 12 H 11 V 11 H 9 V 12 H 5 V 11 H 3 V 12 H 1 V 3 H 3 V 2 H 5 Z" fill="#ffffff" />
        
        {/* Face Elements wrapped in a translation group for eye-tracking */}
        <g transform={`translate(${eyeOffset}, 0)`}>
          {/* Eyes (Hide when blinking) */}
          {!isBlinking && (
            <>
              <rect x="4" y="5" width="2" height="2" fill="#18181b" />
              <rect x="8" y="5" width="2" height="2" fill="#18181b" />
            </>
          )}

          {/* Blink State (Closed eyes) */}
          {isBlinking && (
            <>
              <rect x="4" y="6" width="2" height="1" fill="#18181b" />
              <rect x="8" y="6" width="2" height="1" fill="#18181b" />
            </>
          )}

          {/* Blush */}
          <rect x="2" y="7" width="2" height="1" fill="#f472b6" opacity="0.6" />
          <rect x="10" y="7" width="2" height="1" fill="#f472b6" opacity="0.6" />
        </g>
      </svg>
    </motion.button>
  </>
);



