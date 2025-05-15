import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select date',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return new Date(value);
    }
    return new Date();
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update current month when value changes
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);
  
  const handleDayClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setIsOpen(false);
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };
  
  // Calendar generation helpers
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Generate calendar days
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
    }
    
    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      
      const dateString = date.toISOString().split('T')[0];
      const isSelected = dateString === value;
      const isToday = new Date().toISOString().split('T')[0] === dateString;
      
      days.push(
        <button
          key={`day-${i}`}
          type="button"
          onClick={() => handleDayClick(date)}
          className={`
            h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all
            ${isSelected 
              ? 'bg-accent text-white font-medium shadow-lg shadow-accent/30' 
              : isToday
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text hover:bg-[#2a303a] hover:text-white'
            }
          `}
        >
          {i}
        </button>
      );
    }
    
    return days;
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className="w-full relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <CalendarIcon size={22} className="text-text-muted" />
        </div>
        <div className={`
          w-full pl-12 pr-4 py-4 bg-[#181b20] border border-[#23272f] rounded-xl
          text-text text-lg placeholder-text-muted/60 flex items-center
          ${isOpen ? 'ring-2 ring-accent border-transparent' : 'focus:outline-none focus:ring-2 focus:ring-accent'}
          shadow-lg h-[60px] overflow-hidden
        `}>
          {value ? (
            <div className="flex justify-between items-center w-full truncate">
              <span className="truncate">{formatDisplayDate(value)}</span>
              {value && (
                <button 
                  onClick={handleClear}
                  className="text-text-muted hover:text-accent p-1 rounded-full hover:bg-accent/10 transition-colors flex-shrink-0 ml-2"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ) : (
            <span className="text-text-muted/60 truncate">{placeholder}</span>
          )}
        </div>
      </div>
      
      {/* Dropdown calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-2 py-3 px-4 bg-[#1a1f28] border border-[#2a303a] rounded-xl shadow-2xl animate-fadeIn w-[300px] left-0 md:left-auto md:right-0">
          {/* Month navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-[#2a303a] rounded-full transition-colors"
            >
              <ChevronLeft size={20} className="text-text-muted" />
            </button>
            <h3 className="text-text font-medium">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-[#2a303a] rounded-full transition-colors"
            >
              <ChevronRight size={20} className="text-text-muted" />
            </button>
          </div>
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div 
                key={day} 
                className="h-9 flex items-center justify-center text-xs font-medium text-text-muted"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
          
          {/* Today button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => handleDayClick(new Date())}
              className="px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker; 