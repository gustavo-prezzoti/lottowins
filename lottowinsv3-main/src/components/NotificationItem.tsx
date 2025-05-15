import React from 'react';
import { Trophy, Calendar, Sparkles } from 'lucide-react';

type NotificationType = 'win' | 'reminder' | 'smart-pick';

interface NotificationItemProps {
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isUnread?: boolean;
  subtitle?: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  type,
  title,
  message,
  time,
  isUnread = false,
  subtitle,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'win':
        return (
          <div className="p-2 bg-accent/10 rounded-full">
            <Trophy size={20} className="text-accent" />
          </div>
        );
      case 'reminder':
        return (
          <div className="p-2 bg-blue-500/10 rounded-full">
            <Calendar size={20} className="text-blue-400" />
          </div>
        );
      case 'smart-pick':
        return (
          <div className="p-2 bg-purple-500/10 rounded-full">
            <Sparkles size={20} className="text-purple-400" />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="flex">
      <div className="mr-3">
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white text-base">{title}</h3>
          {isUnread && (
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-blue-300 text-sm font-medium mt-1">{subtitle}</p>
        )}
        
        <p className="text-gray-300 text-sm mt-1">{message}</p>
        <p className="text-gray-500 text-xs mt-2">{time}</p>
      </div>
    </div>
  );
};

export default NotificationItem;