import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { Calendar, TrendingUp } from 'lucide-react';

interface LotteryCardProps {
  name: string;
  jackpot: string;
  drawDate: string;
  logoUrl: string;
  onClick?: () => void;
}

const LotteryCard: React.FC<LotteryCardProps> = ({
  name,
  jackpot,
  drawDate,
  logoUrl,
  onClick,
}) => {
  const jackpotRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState<string>('text-2xl');

  // Adjust font size based on jackpot length
  useEffect(() => {
    if (jackpotRef.current) {
      const checkSize = () => {
        if (!jackpotRef.current) return;
        
        // Reset to default size first
        jackpotRef.current.className = `text-accent font-bold text-center text-2xl`;
        
        // Check if content is overflowing
        const isOverflowing = jackpotRef.current.scrollWidth > jackpotRef.current.clientWidth;
        
        if (isOverflowing && jackpot.length > 12) {
          setFontSize('text-xl');
        } else if (isOverflowing && jackpot.length > 9) {
          setFontSize('text-lg');
        } else if (isOverflowing) {
          setFontSize('text-base');
        } else {
          setFontSize('text-2xl');
        }
      };
      
      // Check on mount and when jackpot changes
      checkSize();
      
      // Also check on window resize
      window.addEventListener('resize', checkSize);
      return () => window.removeEventListener('resize', checkSize);
    }
  }, [jackpot]);

  return (
    <Card 
      variant="light" 
      className="hover:scale-[1.02] transition-transform duration-200 overflow-hidden h-full" 
      onClick={onClick}
    >
      <div className="relative h-full flex flex-col p-5">
        {/* Accent bar at top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
        
        {/* Card header with logo and name */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
            <img 
              src={logoUrl} 
              alt={`${name} logo`}
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                if (e.currentTarget) {
                  if (!e.currentTarget.src.includes('lottery-placeholder.png')) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/lottery-placeholder.png';
                  }
                }
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-dark text-xl truncate">{name}</h3>
            <div className="mt-2 inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-3 py-1.5 rounded-full">
              <Calendar size={14} />
              <span className="whitespace-nowrap">{drawDate}</span>
            </div>
          </div>
        </div>
        
        {/* Jackpot amount */}
        <div className="mt-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendingUp size={18} className="text-accent flex-shrink-0" />
            <p className="text-text-dark text-base font-medium">
              Estimated Jackpot:
            </p>
          </div>
          <div className="bg-primary/5 rounded-md px-4 py-3">
            <p 
              ref={jackpotRef}
              className={`text-accent font-bold text-center ${fontSize} overflow-hidden whitespace-nowrap text-ellipsis`}
            >
              {jackpot}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LotteryCard;