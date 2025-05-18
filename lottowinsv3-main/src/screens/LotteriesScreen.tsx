import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import DatePicker from '../components/DatePicker';
import { Search, Zap, Star, Infinity, Target, Hash, ChevronDown, ChevronUp, Globe2, ArrowLeft, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/format';
import { useNavigate, useLocation } from 'react-router-dom';
import useGames from '../hooks/useGames';
import { Game } from '../services/gameService';
import { useWindowSize } from '../hooks/useWindowSize';

// Mock do mapeamento de ícones para jogos
const getGameIcon = (gameName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Powerball': <Zap size={28} className="text-accent" />,
    'Mega Millions': <Star size={28} className="text-yellow-400" />,
    'Cash4Life': <Infinity size={28} className="text-green-400" />,
    'Take 5': <Target size={28} className="text-blue-400" />,
    'Pick 10': <Hash size={28} className="text-purple-400" />,
  };
  
  // Fallback para jogos sem ícone específico
  return icons[gameName] || <Star size={28} className="text-accent" />;
};

// Versão menor dos ícones para mobile
const getMobileGameIcon = (gameName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Powerball': <Zap size={20} className="text-accent" />,
    'Mega Millions': <Star size={20} className="text-yellow-400" />,
    'Cash4Life': <Infinity size={20} className="text-green-400" />,
    'Take 5': <Target size={20} className="text-blue-400" />,
    'Pick 10': <Hash size={20} className="text-purple-400" />,
  };
  
  // Fallback para jogos sem ícone específico
  return icons[gameName] || <Star size={20} className="text-accent" />;
};

// Helper para estimar odds com base no nome do jogo
const getGameOdds = (game: Game): string => {
  const oddsMap: Record<string, string> = {
    'Powerball': '1:292,201,338',
    'Mega Millions': '1:302,575,350',
    'Cash4Life': '1:21,846,048',
    'Take 5': '1:575,757',
    'Pick 10': '1:8,911,711',
    'Lotto America': '1:25,989,600',
    'New York Lotto': '1:45,057,474',
  };
  
  return oddsMap[game.name] || '1:1,000,000';
};

// Helper para verificar se um jogo é multi-estado
const isMultiStateGame = (game: Game): boolean => {
  // Verificar se o jogo tem múltiplos estados
  return game.states && game.states.length > 1;
};

// Mapeamento de código de estados para nomes
const stateNames: Record<string, string> = {
  CA: 'California', NY: 'New York', TX: 'Texas', FL: 'Florida', GA: 'Georgia', IL: 'Illinois', NJ: 'New Jersey',
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', HI: 'Hawaii', ID: 'Idaho', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NM: 'New Mexico', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming'
};

const LotteriesScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useWindowSize();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const { games, loading, error } = useGames();

  // Read state from URL parameters when component loads
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const stateParam = queryParams.get('state');
    
    if (stateParam) {
      setSelectedState(stateParam);
    }
  }, [location.search]);

  // Update URL when state filter changes
  useEffect(() => {
    // Skip initial render to avoid double navigation
    const prevUrl = location.search;
    const currentStateParam = new URLSearchParams(prevUrl).get('state');
    
    if (selectedState === '' && !currentStateParam) {
      // If both are empty, do nothing
      return;
    }
    
    if (selectedState !== currentStateParam) {
      if (selectedState) {
        navigate(`/lotteries?state=${selectedState}`, { replace: true });
      } else {
        navigate('/lotteries', { replace: true });
      }
    }
  }, [selectedState, navigate, location.search]);

  // Extract all unique state codes from games
  const allStates = React.useMemo(() => {
    if (!games || games.length === 0) return [];
    
    const stateSet = new Set<string>();
    games.forEach(game => {
      if (game.states && Array.isArray(game.states)) {
        game.states.forEach(state => {
          if (state.code) {
            stateSet.add(state.code.toUpperCase());
          }
        });
      }
    });
    
    return Array.from(stateSet).sort();
  }, [games]);

  const filtered = React.useMemo(() => {
    if (!games) return [];
    
    return games.filter(game => {
      // Filter by name if search is provided
      const matchesName = !search || game.name.toLowerCase().includes(search.toLowerCase());
      
      // Filter by state if selectedState is provided
      const matchesState = !selectedState || (
        game.states && game.states.some(state => 
          state.code.toUpperCase() === selectedState.toUpperCase()
        )
      );
      
      // Filter by date if dateFilter is provided
      const matchesDate = !dateFilter || (game.results && game.results.some(result => {
        // Check if next_draw_date exists and convert to date string for comparison
        const drawDate = result.next_draw_date 
          ? new Date(result.next_draw_date).toISOString().split('T')[0]
          : '';
        return drawDate === dateFilter;
      }));
      
      return matchesName && matchesState && matchesDate;
    });
  }, [games, search, selectedState, dateFilter]);

  const handleToggle = (id: number) => {
    setExpanded(expanded === id.toString() ? null : id.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={50} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-text-muted">Loading lotteries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl mb-4">Error loading lotteries</p>
          <p className="text-text-muted">{error}</p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => navigate('/')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Versão mobile do card para dispositivos pequenos
  const MobileLotteryCard = ({ game }: { game: Game }) => {
    const isOpen = expanded === game.id.toString();
    const latestResult = game.results && game.results.length > 0 ? game.results[0] : null;
    const nextDrawDate = latestResult?.next_draw_date || new Date().toISOString();
    const jackpot = latestResult?.next_jackpot || 'TBD';
    
    return (
      <div
        className={`bg-[#1a1f28] border border-[#2a303a] rounded-xl shadow group transition-all duration-200 overflow-hidden ${isOpen ? 'ring-1 ring-accent/30' : ''}`}
      >
        <button
          className={`w-full flex items-start justify-between py-3 px-3 focus:outline-none hover:bg-[#252a35] transition`}
          onClick={() => handleToggle(game.id)}
          aria-expanded={isOpen}
        >
          {/* Layout simplificado para mobile */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center mr-2">
              {getMobileGameIcon(game.name)}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="text-base font-bold text-white truncate">{game.name}</h3>
                {isMultiStateGame(game) && (
                  <span className="inline-flex items-center text-xs font-semibold text-blue-200 bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                    <Globe2 size={10} className="text-blue-300 mr-0.5" /> Multi
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                <span className="truncate mr-1">
                  ${jackpot === 'TBD' ? 'Not Est.' : jackpot}
                </span>
                <span className="truncate text-gray-300 text-xs">
                  {formatDate(nextDrawDate)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Chevron */}
          <div className="ml-2 flex-shrink-0">
            {isOpen ? 
              <ChevronUp size={16} className="text-gray-400" /> : 
              <ChevronDown size={16} className="text-gray-400" />
            }
          </div>
        </button>

        {/* Conteúdo expandido otimizado para mobile */}
        {isOpen && (
          <div className="border-t border-[#2a303a] p-3 bg-[#1a1f28]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <div className="text-xs text-gray-400 mb-2 line-clamp-2">
                  Play the {game.name} lottery for your chance to win!
                </div>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded-full">
                    Odds: {getGameOdds(game)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-400 line-clamp-1">
                  <span className="text-gray-300">States:</span> {game.states?.map(state => stateNames[state.code.toUpperCase()] || state.code).join(', ')}
                </div>
                
                {/* Latest Results */}
                {game.results && game.results.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#2a303a]">
                    <h4 className="text-white text-xs font-medium mb-1">Latest Results</h4>
                    <div className="text-xs text-gray-400">
                      <p>Draw: <span className="text-white">{formatDate(game.results[0].draw_date)}</span></p>
                      {game.results[0].numbers && (
                        <p className="truncate">Numbers: <span className="text-white">{game.results[0].numbers}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full py-1 text-xs mt-1" 
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/lottery/games/${game.id}`);
                }}
              >
                View Details
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Versão desktop do card
  const DesktopLotteryCard = ({ game }: { game: Game }) => {
    const isOpen = expanded === game.id.toString();
    const latestResult = game.results && game.results.length > 0 ? game.results[0] : null;
    const nextDrawDate = latestResult?.next_draw_date || new Date().toISOString();
    const jackpot = latestResult?.next_jackpot || 'TBD';
    
    return (
      <div
        className={`bg-[#1a1f28] border border-[#2a303a] rounded-xl shadow group transition-all duration-200 overflow-hidden ${isOpen ? 'ring-1 ring-accent/30' : ''}`}
      >
        <button
          className={`w-full flex items-center justify-between py-4 px-5 focus:outline-none hover:bg-[#252a35] transition`}
          onClick={() => handleToggle(game.id)}
          aria-expanded={isOpen}
        >
          {/* Ícone e informações principais */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 flex items-center justify-center">
                {getGameIcon(game.name)}
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white truncate">{game.name}</h3>
                {isMultiStateGame(game) && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-200 bg-blue-900/20 px-2 py-0.5 rounded-full">
                    <Globe2 size={12} className="text-blue-300" /> Multi-State
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-sm mt-1 text-gray-400">
                <span className="mr-3">Jackpot: <span className="text-red-500 font-semibold">${jackpot}</span></span>
                <span>Next Draw: <span className="text-gray-300">{formatDate(nextDrawDate)}</span></span>
              </div>
            </div>
          </div>
          
          {/* Chevron */}
          <div className="ml-4">
            {isOpen ? 
              <ChevronUp size={22} className="text-gray-400" /> : 
              <ChevronDown size={22} className="text-gray-400" />
            }
          </div>
        </button>

        {/* Conteúdo expandido */}
        <div
          className={`transition-all duration-300 bg-[#1a1f28] border-t border-[#2a303a] ${isOpen ? 'max-h-[500px] py-4 px-5 opacity-100' : 'max-h-0 py-0 opacity-0'} overflow-hidden`}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          {isOpen && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <div className="mb-4 text-gray-400 text-sm">
                  Play the {game.name} lottery for your chance to win!
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-300 bg-blue-900/20 px-3 py-1 rounded-full">
                    Odds: {getGameOdds(game)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-300 bg-gray-700/30 px-3 py-1 rounded-full max-w-full">
                    States: {game.states?.map(state => stateNames[state.code.toUpperCase()] || state.code).join(', ')}
                  </span>
                </div>
                
                {/* Latest Results */}
                {game.results && game.results.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-white font-medium mb-2">Latest Results</h4>
                    <div className="text-sm text-gray-400">
                      <p>Draw Date: <span className="text-white">{formatDate(game.results[0].draw_date)}</span></p>
                      {game.results[0].numbers && (
                        <p className="mt-1">Numbers: <span className="text-white font-medium">{game.results[0].numbers}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-4 items-start md:items-end justify-between min-w-[160px] mt-4 md:mt-0">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Next Draw</div>
                  <div className="text-white font-bold text-lg">{formatDate(nextDrawDate)}</div>
                </div>
                <Button 
                  className="w-full" 
                  variant="primary"
                  onClick={() => navigate(`/lottery/games/${game.id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-primary pb-24">
      <main className="max-w-6xl mx-auto w-full px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft size={24} />
            <span className="text-lg font-medium">Back</span>
          </button>
          <h1 className="text-2xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg text-center md:text-left">All Lotteries</h1>
          <div className="hidden md:block w-[100px]"></div> {/* Espaço para equilibrar o layout apenas em desktop */}
        </div>
        <div className="flex flex-col gap-4 mb-10 max-w-6xl mx-auto">
          {/* Search, State, and Date filters in one row on desktop */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 md:flex-initial md:w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={isMobile ? 18 : 22} className="text-text-muted" />
              </div>
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3 md:py-4 bg-[#181b20] border border-[#23272f] rounded-xl text-text text-base md:text-lg placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent shadow-lg"
                placeholder="Search by lottery name"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="w-full md:w-56 px-4 py-3 md:py-4 bg-[#181b20] border border-[#23272f] rounded-xl text-text text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-accent shadow-lg"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              <option value="">All States</option>
              {allStates.map(code => (
                <option key={code} value={code}>{stateNames[code] || code}</option>
              ))}
            </select>
            
            {/* Custom DatePicker component */}
            <DatePicker
              value={dateFilter}
              onChange={setDateFilter}
              className="w-full md:w-56"
              placeholder="Filter by draw date"
            />
          </div>

          {/* Filter indicators - versão compacta para mobile */}
          {(search || selectedState || dateFilter) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {search && (
                <div className="bg-accent/10 text-accent text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full flex items-center gap-1 md:gap-2">
                  <span className="truncate max-w-[100px] md:max-w-none">Search: {search}</span>
                  <button onClick={() => setSearch('')} className="hover:bg-accent/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              {selectedState && (
                <div className="bg-blue-500/10 text-blue-400 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full flex items-center gap-1 md:gap-2">
                  <span className="truncate max-w-[100px] md:max-w-none">State: {stateNames[selectedState] || selectedState}</span>
                  <button onClick={() => setSelectedState('')} className="hover:bg-blue-500/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              {dateFilter && (
                <div className="bg-purple-500/10 text-purple-400 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full flex items-center gap-1 md:gap-2">
                  <span className="truncate max-w-[100px] md:max-w-none">Date: {new Date(dateFilter).toLocaleDateString()}</span>
                  <button onClick={() => setDateFilter('')} className="hover:bg-purple-500/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              
              {/* Clear All Filters button */}
              {(search || selectedState || dateFilter) && (
                <div className="ml-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSelectedState('');
                      setDateFilter('');
                    }}
                    className="text-xs md:text-sm px-2 py-1 md:py-1.5"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="mb-6 text-center">
          <p className="text-text-muted">
            Found <span className="text-accent font-semibold">{filtered.length}</span> lotteries
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {filtered.map(game => (
            isMobile 
              ? <MobileLotteryCard key={game.id} game={game} /> 
              : <DesktopLotteryCard key={game.id} game={game} />
          ))}
          
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-gradient-to-b from-[#1A1D23]/50 to-[#151821]/50 rounded-2xl border border-[#2A2F38] shadow-2xl">
              <div className="text-accent/40 text-6xl mb-4">
                {selectedState ? <Globe2 /> : <Search />}
              </div>
              <p className="text-text-muted text-base md:text-xl mb-4 px-4">
                {dateFilter 
                  ? `No lotteries found with draw date ${new Date(dateFilter).toLocaleDateString()}.`
                  : selectedState 
                    ? `No lotteries found for ${stateNames[selectedState] || selectedState}.` 
                    : "No lotteries found matching your search."}
              </p>
              {(selectedState || dateFilter || search) && (
                <Button 
                  variant="outline" 
                  className="mx-auto mt-4"
                  onClick={() => {
                    setSelectedState('');
                    setDateFilter('');
                    setSearch('');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LotteriesScreen; 