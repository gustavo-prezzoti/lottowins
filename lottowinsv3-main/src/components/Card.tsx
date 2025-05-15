import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'light' | 'lighter' | 'dark';
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'auto';
  responsive?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  size = 'auto',
  responsive = true,
}) => {
  const baseClasses = 'rounded-lg overflow-hidden';
  
  const variantClasses = {
    default: 'bg-card',
    light: 'bg-card-light',
    lighter: 'bg-card-lighter',
    dark: 'bg-[#1e2229] border border-[#333]',
  };
  
  const sizeClasses = {
    sm: 'p-0',
    md: 'p-4 sm:p-5 lg:p-6',
    lg: 'p-5 sm:p-6 lg:p-8 xl:p-10',
    auto: 'p-4 sm:p-5 lg:p-6',
  };
  
  const responsiveClass = responsive ? 'w-full h-full' : '';
  const clickableClass = onClick ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : '';
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${responsiveClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;