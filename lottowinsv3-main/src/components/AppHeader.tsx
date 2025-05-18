import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWindowSize } from '../hooks/useWindowSize';
import { useAuth } from '../contexts/AuthContext';
import { ensureHttps } from '../utils/url';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = false,
}) => {
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const { user } = useAuth();
  
  return (
    <header className="bg-primary sticky top-0 z-20 border-b border-white/10">
      <div className={`${!isMobile ? 'px-0' : 'container mx-auto'}`}>
        <div className={`h-16 flex items-center justify-between ${!isMobile ? 'pl-[6rem] pr-8' : 'px-4'}`}>
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button 
                onClick={() => navigate(-1)}
                className="text-white hover:text-accent transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className={`text-white font-bold ${isMobile ? 'text-sm max-w-[80px] truncate' : 'text-xl'}`}>{title}</h1>
          </div>

          {/* Center logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <img 
              src="/logo-menu.png" 
              alt="Lotto Wins" 
              className={isMobile ? "h-10" : "h-14"}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            />
          </div>
          
          <button className="flex items-center gap-3 group cursor-pointer" type="button" onClick={() => navigate('/profile')}>
            <div className="w-10 h-10 rounded-full bg-accent/20 overflow-hidden flex items-center justify-center text-white group-hover:ring-2 group-hover:ring-accent transition">
              {user?.profile_photo ? (
                <img
                  src={ensureHttps(user.profile_photo) ?? ''}
                  alt={user.name}
                  onError={e => {
                    e.currentTarget.style.display = 'none';
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
        </div>
      </div>
    </header>
  );
};

export default AppHeader;