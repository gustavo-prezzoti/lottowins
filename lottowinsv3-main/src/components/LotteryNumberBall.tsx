import React from 'react';

interface LotteryNumberBallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LotteryNumberBall: React.FC<LotteryNumberBallProps> = ({
  number,
  isSpecial = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-3xl',
  };
  
  const colorClasses = isSpecial
    ? 'bg-gradient-to-br from-accent to-accent-dark text-text border border-accent/20'
    : 'bg-gradient-to-br from-[#23272f] to-[#151821] text-gray-300 border border-[#2A2F38]';
    
  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses} rounded-full flex items-center justify-center font-bold shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(90,120,230,0.2)] hover:scale-105`}
    >
      {number}
    </div>
  );
};

export default LotteryNumberBall;