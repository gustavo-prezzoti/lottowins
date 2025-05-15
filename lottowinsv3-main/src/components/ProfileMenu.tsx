import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const ProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-3 group cursor-pointer"
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <div className="w-10 h-10 rounded-full bg-accent/20 overflow-hidden flex items-center justify-center text-white group-hover:ring-2 group-hover:ring-accent transition">
          {user?.profile_photo ? (
            <img
              src={user.profile_photo}
              alt={user.name}
              onError={e => { 
                if (e.currentTarget) e.currentTarget.style.display = 'none'; 
                const parent = e.currentTarget.parentElement; 
                if (parent) parent.innerHTML = user?.name?.substring(0, 2).toUpperCase() || 'U'; 
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user?.name?.substring(0, 2).toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-white text-sm font-medium">{user?.name || 'User'}</p>
          <p className="text-text-muted text-xs">Account</p>
        </div>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => {
                navigate('/profile');
                setIsMenuOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User size={16} className="mr-2" />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu; 