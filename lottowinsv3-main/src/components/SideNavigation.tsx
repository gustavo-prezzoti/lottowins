import React from 'react';
import { Home, Search, Sparkles, Bell, LogOut } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import useGames from '../hooks/useGames';

const SideNavigation: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { games } = useGames();
  
  // Get top 2 games with highest jackpot
  const getTopJackpotGames = () => {
    const parseJackpot = (jackpot: string | undefined): number => {
      if (!jackpot) return 0;
      const num = jackpot.replace(/[^\d]/g, '');
      return parseInt(num, 10) || 0;
    };
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return [...games]
      .filter(game => {
        // Filtrar jogos com jackpot e com data de sorteio futura
        if (!game.results || !game.results[0]?.next_jackpot || !game.results[0]?.next_draw_date) {
          return false;
        }
        
        const drawDate = new Date(game.results[0].next_draw_date);
        drawDate.setHours(0, 0, 0, 0);
        
        // Incluir apenas jogos com datas futuras ou de hoje
        return drawDate.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const jackpotA = parseJackpot(a.results[0]?.next_jackpot);
        const jackpotB = parseJackpot(b.results[0]?.next_jackpot);
        return jackpotB - jackpotA;
      })
      .slice(0, 2);
  };
  
  // Calcula quantos dias faltam para o próximo sorteio
  const getDaysUntilDraw = (drawDate: string): string => {
    if (!drawDate) return 'TBD';
    
    const now = new Date();
    const draw = new Date(drawDate);
    
    // Resetar as horas para comparar apenas as datas
    now.setHours(0, 0, 0, 0);
    draw.setHours(0, 0, 0, 0);
    
    // Calcular a diferença em dias
    const diffTime = draw.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Drawing today';
    } else if (diffDays === 1) {
      return 'Drawing tomorrow';
    } else {
      return `Drawing in ${diffDays} days`;
    }
  };
  
  const upcomingDraws = getTopJackpotGames();
  
  // Define main navigation items
  const mainNavItems = [
    { to: '/', icon: <Home size={24} />, label: 'Home' },
    { to: '/results', icon: <Search size={24} />, label: 'Results' },
    { to: '/smart-pick', icon: <Sparkles size={24} />, label: 'Smart Pick' },
    { to: '/notifications', icon: <Bell size={24} />, label: 'Alerts' },
  ];
  
  const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const isActive = path === to;
    
    return (
      <Link 
        to={to} 
        className={`flex items-center gap-4 py-5 px-6 rounded-lg transition-colors ${
          isActive 
            ? 'bg-accent text-white font-medium' 
            : 'text-white hover:bg-primary-light hover:text-white'
        }`}
      >
        {icon}
        <span className="text-base">{label}</span>
      </Link>
    );
  };
  
  return (
    <div className="hidden lg:flex flex-col w-80 bg-primary border-r border-primary-light/20 fixed h-full top-0 left-0 shadow-[5px_0px_15px_rgba(0,0,0,0.15)]">
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="pt-24"></div>
        
        {/* Navigation section */}
        <div className="px-6 mb-12">
          <nav className="flex flex-col space-y-3">
            {mainNavItems.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </nav>
        </div>
        
        {/* Quick stats section */}
        <div className="px-6 mb-8">
          <p className="text-text-muted text-sm uppercase font-medium mb-4 px-2 ml-1">Upcoming Draws</p>
          
          {upcomingDraws.length > 0 ? (
            upcomingDraws.map((game, index) => (
              <div key={index} className="bg-primary-light p-5 rounded-lg mb-4 last:mb-0">
                <p className="text-accent font-medium">{game.name}</p>
                <p className="text-white text-xl font-bold">{game.results[0]?.next_jackpot || 'Jackpot TBD'}</p>
                <p className="text-text-muted text-sm">
                  {game.results[0]?.next_draw_date 
                    ? getDaysUntilDraw(game.results[0].next_draw_date)
                    : 'Drawing date TBD'}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="bg-primary-light p-5 rounded-lg mb-4">
                <p className="text-accent font-medium">Powerball</p>
                <p className="text-white text-xl font-bold">$86,000,000</p>
                <p className="text-text-muted text-sm">Drawing in 2 days</p>
              </div>
              <div className="bg-primary-light p-5 rounded-lg">
                <p className="text-accent font-medium">Mega Millions</p>
                <p className="text-white text-xl font-bold">$112,000,000</p>
                <p className="text-text-muted text-sm">Drawing in 3 days</p>
              </div>
            </>
          )}
        </div>
        
        {/* Spacer to push logout to the bottom */}
        <div className="flex-grow"></div>
        
        {/* Bottom section */}
        <div className="px-6 mb-10 mt-auto">
          <nav className="flex flex-col space-y-3">
            <NavItem to="/logout" icon={<LogOut size={24} />} label="Logout" />
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SideNavigation; 