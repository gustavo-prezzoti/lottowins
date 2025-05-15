import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useGames from '../hooks/useGames';
import Button from '../components/Button';
import LotteryNumberBall from '../components/LotteryNumberBall';
import { Calendar, MapPin, ChevronRight, ChevronDown, Search, Clock } from 'lucide-react';
import { formatDate } from '../utils/format';
import { Game } from '../services/gameService';

const PAGE_SIZE = 5;

type SortType = 'date-asc' | 'jackpot-desc' | 'jackpot-asc' | 'name-asc' | 'name-desc';

const GamesListScreen: React.FC = () => {
  const { games, loading } = useGames();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortType>('date-asc'); // Default to date ascending (nearest first)
  const [stateFilter, setStateFilter] = useState<string>('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true); // Default to showing only upcoming games
  const navigate = useNavigate();

  // Extrair todos os estados únicos dos jogos
  const allStates = useMemo(() => {
    const set = new Set<string>();
    games.forEach(game => {
      game.states?.forEach(state => set.add(state.name));
    });
    return Array.from(set).sort();
  }, [games]);

  // Função para extrair o valor numérico do jackpot
  const parseJackpot = (jackpot: string | undefined): number => {
    if (!jackpot) return 0;
    const num = jackpot.replace(/[^\d]/g, '');
    return parseInt(num, 10) || 0;
  };

  // Filtro e ordenação antes da paginação
  const filteredGames = useMemo(() => {
    let result = [...games];
    
    // Filter by upcoming games if enabled
    if (showUpcomingOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      result = result.filter(game => {
        if (!game.results || !game.results[0]?.next_draw_date) return false;
        const drawDate = new Date(game.results[0].next_draw_date);
        drawDate.setHours(0, 0, 0, 0);
        return drawDate >= today;
      });
    }
    
    // Filter by search term
    if (search.trim()) {
      result = result.filter(game =>
        game.name.toLowerCase().includes(search.trim().toLowerCase())
      );
    }
    
    // Filter by state
    if (stateFilter) {
      result = result.filter(game =>
        game.states?.some(state => state.name === stateFilter)
      );
    }
    
    // Sort the filtered games
    switch (sort) {
      case 'date-asc': {
        // Sort by upcoming draw date (nearest first)
        result.sort((a, b) => {
          // Helper function to get draw date
          const getDrawDate = (game: Game) => {
            if (!game.results?.[0]?.next_draw_date) return Infinity;
            return new Date(game.results[0].next_draw_date).getTime();
          };
          
          const dateA = getDrawDate(a);
          const dateB = getDrawDate(b);
          
          // If both have dates, compare them
          if (isFinite(dateA) && isFinite(dateB)) {
            return dateA - dateB; // Ascending (nearest first)
          }
          
          // If only one has a date, prioritize it
          if (isFinite(dateA)) return -1;
          if (isFinite(dateB)) return 1;
          
          // If neither has a date, sort alphabetically
          return a.name.localeCompare(b.name);
        });
        break;
      }
      case 'jackpot-desc':
        result.sort((a, b) => parseJackpot(b.results[0]?.next_jackpot) - parseJackpot(a.results[0]?.next_jackpot));
        break;
      case 'jackpot-asc':
        result.sort((a, b) => parseJackpot(a.results[0]?.next_jackpot) - parseJackpot(b.results[0]?.next_jackpot));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    
    return result;
  }, [games, search, sort, stateFilter, showUpcomingOnly]);

  // Paginação
  const totalPages = Math.ceil(filteredGames.length / PAGE_SIZE) || 1;
  const paginatedGames = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredGames.slice(start, start + PAGE_SIZE);
  }, [filteredGames, page]);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const goToPage = (p: number) => {
    setPage(p);
    setExpandedId(null);
  };

  // Reset para página 1 ao filtrar
  React.useEffect(() => {
    setPage(1);
  }, [search, games, stateFilter, sort, showUpcomingOnly]);

  // Função para gerar os números de página com reticências
  const getPagination = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Sempre mostrar 1, 2, ... [current-2, current-1, current, current+1, current+2] ... last-1, last
      const left = Math.max(1, page - 2);
      const right = Math.min(totalPages, page + 2);
      const showLeftDots = left > 3;
      const showRightDots = right < totalPages - 2;
      pages.push(1);
      if (totalPages > 1) pages.push(2);
      if (showLeftDots) pages.push('left-dots');
      for (let i = left; i <= right; i++) {
        if (i > 2 && i < totalPages - 1) pages.push(i);
      }
      if (showRightDots) pages.push('right-dots');
      if (totalPages > 2) pages.push(totalPages - 1);
      if (totalPages > 3) pages.push(totalPages);
    }
    // Remover duplicados e ordenar
    return [...new Set(pages)].filter(Boolean).sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : 0));
  };

  return (
    <div className="min-h-screen bg-[#16181d] pb-10">
      <div className="w-full max-w-[1100px] mx-auto px-2 sm:px-4 pt-10">
        <h1 className="text-3xl font-bold text-white mb-8 text-center tracking-tight">All Lottery Games</h1>
        {/* Filtros e ordenação */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full py-3 pl-10 pr-4 rounded-xl bg-[#23272f] border border-[#23272f] text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent text-base shadow-sm"
              />
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="py-3 px-4 rounded-xl bg-[#23272f] border border-[#23272f] text-white text-base focus:outline-none focus:ring-2 focus:ring-accent shadow-sm min-w-[120px]"
            >
              <option value="">All States</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              className="py-3 px-4 rounded-xl bg-[#23272f] border border-[#23272f] text-white text-base focus:outline-none focus:ring-2 focus:ring-accent shadow-sm min-w-[180px]"
            >
              <option value="date-asc">Draw Date: Soonest First</option>
              <option value="jackpot-desc">Jackpot: Highest First</option>
              <option value="jackpot-asc">Jackpot: Lowest First</option>
              <option value="name-asc">Name: A-Z</option>
              <option value="name-desc">Name: Z-A</option>
            </select>
            
            <button
              onClick={() => setShowUpcomingOnly(!showUpcomingOnly)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-base transition-colors ${
                showUpcomingOnly 
                  ? 'bg-accent text-white' 
                  : 'bg-[#23272f] text-gray-300 hover:bg-accent/10'
              }`}
            >
              <Clock size={18} />
              <span className="whitespace-nowrap">
                {showUpcomingOnly ? 'Upcoming Only' : 'Show All'}
              </span>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {paginatedGames.length === 0 ? (
                <div className="text-center text-gray-400 py-16 text-lg">
                  {showUpcomingOnly ? (
                    <>
                      <p>No upcoming games found.</p>
                      <button 
                        onClick={() => setShowUpcomingOnly(false)}
                        className="mt-4 text-accent underline hover:text-accent/80"
                      >
                        Show all games
                      </button>
                    </>
                  ) : (
                    'No games found.'
                  )}
                </div>
              ) : (
                paginatedGames.map(game => {
                  const isExpanded = expandedId === game.id;
                  const latestResult = game.results && game.results[0];
                  
                  // Check if this is an upcoming game
                  const isUpcoming = latestResult?.next_draw_date ? 
                    new Date(latestResult.next_draw_date) >= new Date() : 
                    false;
                  
                  return (
                    <div
                      key={game.id}
                      className={`w-full bg-[#20232b] rounded-2xl shadow-md border border-[#23272f] hover:border-accent/60 transition-all duration-200 group overflow-hidden ${isExpanded ? 'ring-2 ring-accent/30' : ''}`}
                    >
                      <div
                        className="flex flex-col md:flex-row items-center justify-between px-6 py-4 cursor-pointer select-none gap-3 md:gap-0"
                        onClick={() => toggleExpand(game.id)}
                      >
                        {/* Left: Logo + Name + States */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl bg-[#181a1e] flex items-center justify-center overflow-hidden border-2 border-[#23272f] group-hover:border-accent/60 transition-all duration-200">
                            {game.logo_url ? (
                              <img src={game.logo_url} alt={game.name} className="w-10 h-10 object-contain" />
                            ) : (
                              <span className="text-accent font-bold text-xl">{game.name.substring(0, 2)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-lg truncate mb-1 tracking-tight">{game.name}</h3>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                              {game.states && game.states.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={13} />{game.states.map(s => s.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Center: Jackpot + Next Draw */}
                        <div className="flex flex-col items-center md:items-end gap-1 min-w-[120px]">
                          {latestResult?.next_jackpot && (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent/80 to-accent/60 text-white font-bold text-base shadow-accent/30 shadow-md border border-accent/30 animate-pulse-slow mb-1">
                              {latestResult.next_jackpot}
                            </span>
                          )}
                          {latestResult?.next_draw_date && (
                            <span className={`flex items-center gap-1 text-xs ${isUpcoming ? 'text-green-400' : 'text-gray-400'}`}>
                              <Calendar size={13} />{formatDate(latestResult.next_draw_date)}
                              {isUpcoming && <span className="bg-green-400/20 px-1.5 py-0.5 rounded-full text-[10px] text-green-400">Upcoming</span>}
                            </span>
                          )}
                        </div>
                        {/* Right: Expand Icon */}
                        <div className="flex items-center gap-2 ml-2">
                          <ChevronDown size={24} className={`transition-transform text-gray-400 group-hover:text-accent ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-2 bg-[#23272f] border-t border-[#23272f]">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-0">
                            <div className="flex flex-wrap gap-1 items-center">
                              {latestResult && latestResult.numbers && latestResult.numbers.split(/[,+]/).map((num: string, idx: number, arr: string[]) => (
                                <LotteryNumberBall
                                  key={idx}
                                  number={parseInt(num, 10)}
                                  isSpecial={idx === arr.length - 1 && arr.length > 1}
                                  size="sm"
                                />
                              ))}
                              {latestResult?.draw_date && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 ml-4">
                                  <Calendar size={13} />
                                  <span>Last Draw: {formatDate(latestResult.draw_date)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex md:justify-end md:items-center w-full md:w-auto mt-4 md:mt-0">
                              <Button
                                variant="outline"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg border-accent text-accent font-semibold hover:bg-accent/20 hover:text-white transition text-base shadow-md md:ml-auto md:w-auto w-full md:max-w-xs max-w-full"
                                onClick={() => navigate(`/lottery/games/${game.id}`)}
                              >
                                Details <ChevronRight size={18} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-8 select-none flex-wrap">
                <button
                  className={`px-3 py-2 rounded-lg text-sm font-medium bg-[#23272f] text-gray-300 border border-[#23272f] hover:bg-accent/10 transition ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => page > 1 && goToPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
                {getPagination().map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={p + idx} className="w-8 h-9 flex items-center justify-center text-gray-500 text-lg font-bold select-none">...</span>
                  ) : (
                    <button
                      key={p}
                      className={`w-8 h-9 rounded-lg text-base font-semibold border transition-all duration-150 mx-0.5
                        ${page === p
                          ? 'bg-accent text-white border-accent shadow-lg'
                          : 'bg-[#23272f] text-gray-300 border-[#23272f] hover:bg-accent/10 hover:text-accent'}
                      `}
                      onClick={() => goToPage(Number(p))}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className={`px-3 py-2 rounded-lg text-sm font-medium bg-[#23272f] text-gray-300 border border-[#23272f] hover:bg-accent/10 transition ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => page < totalPages && goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GamesListScreen; 