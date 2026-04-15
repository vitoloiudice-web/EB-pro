
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  content: {
    title: string;
    description: string;
    usage: string;
  };
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Kept for compatibility but ignored for mouse-follow
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 400);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isVisible) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`} 
      onMouseEnter={handleMouseEnter} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[99999] w-64 p-4 neu-flat bg-white/98 backdrop-blur-xl border border-white/60 shadow-2xl pointer-events-none"
            style={{
              left: Math.min(window.innerWidth - 270, Math.max(10, mousePos.x + 15)),
              top: Math.min(window.innerHeight - 200, Math.max(10, mousePos.y + 15)),
            }}
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-100/50 pb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <h5 className="text-[9px] font-black text-slate-800 uppercase tracking-[0.15em]">{content.title}</h5>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Funzione</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{content.description}</p>
              </div>
              <div className="pt-1 border-t border-slate-50">
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight mb-1">Utilizzo</p>
                <p className="text-[10px] text-slate-500 italic leading-snug bg-blue-50/30 p-1.5 rounded-lg border border-blue-100/20">{content.usage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
