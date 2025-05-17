import React from 'react';

interface SmartPickLotteryBallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SmartPickLotteryBall: React.FC<SmartPickLotteryBallProps> = ({
  number,
  isSpecial = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-16 h-16 text-2xl',
  };
  
  const specialStyles = isSpecial
    ? 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_0_15px_rgba(228,0,43,0.3)]'
    : 'bg-gradient-to-br from-white to-gray-100 text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.15)] border border-gray-200';
    
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold
        ${specialStyles}
        transition-all duration-300 hover:shadow-[0_0_15px_rgba(90,120,230,0.4)] hover:scale-105`}
    >
      {number}
    </div>
  );
};

export default SmartPickLotteryBall; 