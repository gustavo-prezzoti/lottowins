import React from 'react';
import Spinner from './Spinner';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  fullWidth = false,
  disabled = false,
  type = 'submit',
  isLoading = false,
}) => {
  const baseClasses = 'rounded-lg font-medium transition-all duration-200 text-center';
  
  const variantClasses = {
    primary: 'bg-accent text-white hover:bg-accent-dark shadow-button',
    secondary: 'bg-card-dark text-white hover:bg-opacity-90',
    outline: 'bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-white',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className} flex items-center justify-center gap-2`}
      onClick={onClick}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

export default Button;