import React from 'react';
import { Home, Search, Sparkles, Bell, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const isActive = path === to;
    
    return (
      <Link 
        to={to} 
        className={`flex flex-col items-center justify-center px-3 transition-colors ${
          isActive ? 'text-accent' : 'text-white hover:text-accent/80'
        }`}
      >
        {icon}
        <span className="text-xs mt-1 font-medium">{label}</span>
      </Link>
    );
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-primary border-t border-white/10 flex justify-around items-center px-2 backdrop-blur-lg bg-opacity-95">
      <NavItem 
        to="/" 
        icon={<Home size={24} />} 
        label="Home" 
      />
      <NavItem 
        to="/results" 
        icon={<Search size={24} />} 
        label="Results" 
      />
      <NavItem 
        to="/smart-pick" 
        icon={<Sparkles size={24} />} 
        label="Smart Pick" 
      />
      <NavItem 
        to="/notifications" 
        icon={<Bell size={24} />} 
        label="Alerts" 
      />
      <NavItem 
        to="/profile" 
        icon={<User size={24} />} 
        label="Profile" 
      />
    </div>
  );
};

export default BottomNavigation;