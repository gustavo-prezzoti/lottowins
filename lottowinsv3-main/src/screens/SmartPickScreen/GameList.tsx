import React, { useRef, useState } from 'react';
import Card from '../../components/Card';
import { MapPin, ChevronDown, ChevronRight, Calendar, Filter } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface State {
  id: string | number;
  code: string;
  name: string;
}

interface GameResult {
  id?: number;
  draw_date?: string;
  draw_time?: string;
  numbers?: string;
  jackpot?: string;
  next_draw_date?: string;
  next_draw_time?: string;
  next_jackpot?: string;
  collected_at?: string;
  state_id?: number;
  state_code?: string;
}

interface Game {
  id: string | number;
  slug: string;
  name: string;
  logo_url?: string;
  results: GameResult[];
  states?: { code: string; name: string }[];
}

type SortOption = 'date' | 'jackpot' | 'name';

interface GameListProps {
  games: Game[];
  selectedLottery: string;
  onSelect: (slug: string) => void;
  selectedState: string;
  onStateChange: (code: string) => void;
  loading: boolean;
  states: State[];
  isMobile: boolean;
}

const GameList: React.FC<GameListProps> = ({
  games,
  selectedLottery,
  onSelect,
  selectedState,
  onStateChange,
  loading,
  states,
  isMobile
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  
  // Helper function to get jackpot amount
  const getJackpotAmount = (game: Game): number => {
    if (!game.results?.[0]?.next_jackpot) return 0;
    const jackpot = game.results[0].next_jackpot;
    // Extract numeric value from jackpot string (e.g. "$10M" -> 10)
    const match = jackpot.match(/\$?(\d+(?:\.\d+)?)[MmKk]?/);
    if (!match) return 0;
    let amount = parseFloat(match[1]);
    // Adjust for millions/thousands
    if (jackpot.includes('M') || jackpot.includes('m')) amount *= 1000000;
    if (jackpot.includes('K') || jackpot.includes('k')) amount *= 1000;
    return amount;
  };
  
  // Sort games based on selected option
  const sortedGames = React.useMemo(() => {
    if (loading || games.length === 0) return games;
    
    return [...games].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          // Sort by upcoming draw date (nearest first)
          if (a.results?.[0]?.next_draw_date && b.results?.[0]?.next_draw_date) {
            const dateA = new Date(a.results[0].next_draw_date);
            const dateB = new Date(b.results[0].next_draw_date);
            return dateA.getTime() - dateB.getTime();
          }
          if (a.results?.[0]?.next_draw_date) return -1;
          if (b.results?.[0]?.next_draw_date) return 1;
          return a.name.localeCompare(b.name);
          
        case 'jackpot': {
          const jackpotA = getJackpotAmount(a);
          const jackpotB = getJackpotAmount(b);
          
          if (jackpotA === jackpotB) {
            // If jackpots are equal, sort by date
            if (a.results?.[0]?.next_draw_date && b.results?.[0]?.next_draw_date) {
              const dateA = new Date(a.results[0].next_draw_date);
              const dateB = new Date(b.results[0].next_draw_date);
              return dateA.getTime() - dateB.getTime();
            }
          }
          return jackpotB - jackpotA; // Descending order (highest first)
        }
        
        case 'name':
        default:
          // Alphabetical sort
          return a.name.localeCompare(b.name);
      }
    });
  }, [games, sortBy, loading]);

  return (
    <Card className={isMobile ? 'mb-4 rounded-2xl shadow-md p-3 bg-[#1A1D23] border border-[#2A2F38]' : 'mb-0 bg-[#1A1D23] border border-[#2A2F38] shadow-xl p-6'}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={isMobile ? 'text-text font-bold text-base' : 'text-text font-bold text-xl mb-4'}>Select Game</h2>
        <div className="text-text-muted text-xs">
          AI Confidence: <span className="text-accent font-semibold">92%</span>
        </div>
      </div>
      
      <div className="mb-4 space-y-3">
        {/* State Selection */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={isMobile ? 16 : 18} className="text-accent" />
            <label className={isMobile ? 'text-text-muted text-sm' : 'text-text text-base font-medium'}>Select State</label>
          </div>
          <select
            className="w-full appearance-none px-4 pr-10 py-3 bg-[#151821] border border-[#2A2F38] rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent text-base cursor-pointer"
            value={selectedState}
            onChange={e => onStateChange(e.target.value)}
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state.id} value={state.code}>{state.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none top-6">
            <ChevronDown size={20} className="text-text-muted" />
          </div>
        </div>
        
        {/* Sort Options */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Filter size={isMobile ? 16 : 18} className="text-accent" />
            <label className={isMobile ? 'text-text-muted text-sm' : 'text-text text-base font-medium'}>Sort By</label>
          </div>
          <select
            className="w-full appearance-none px-4 pr-10 py-3 bg-[#151821] border border-[#2A2F38] rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent text-base cursor-pointer"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
          >
            <option value="date">Next Draw Date (Soonest First)</option>
            <option value="jackpot">Jackpot Amount (Highest First)</option>
            <option value="name">Game Name (A-Z)</option>
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none top-6">
            <ChevronDown size={20} className="text-text-muted" />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto mb-3"></div>
          <p className="text-text text-sm">Loading games...</p>
        </div>
      ) : (
        <div
          ref={listRef}
          className={isMobile ? 'flex flex-col gap-3 mb-4 max-h-[300px] overflow-y-auto py-1' : 'space-y-4 max-h-[400px] overflow-y-auto pr-1'}
        >
          {sortedGames.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-text text-sm mb-2">No games available for this state</p>
              <p className="text-text-muted text-xs">Try selecting a different state</p>
            </div>
          ) : (
            sortedGames.map(game => (
              <button
                key={game.id}
                className={`group flex items-center gap-4 w-full px-4 py-4 rounded-2xl border-2 transition-all duration-150
                  ${selectedLottery === game.slug
                    ? 'bg-accent/90 border-accent shadow-lg scale-[1.03] text-text'
                    : 'bg-[#20232b] border-transparent hover:border-accent/60 hover:bg-accent/10 text-text'}
                `}
                onClick={() => onSelect(game.slug)}
              >
                <div className="w-20 h-14 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  {game.logo_url ? (
                    <img
                      src={game.logo_url}
                      alt={game.name}
                      className="w-20 h-14 object-contain bg-white rounded-lg shadow-md p-1 mx-auto"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-accent font-bold text-lg">{game.name.substring(0, 2)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-base">{game.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                    {game.results[0]?.next_draw_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(game.results[0].next_draw_date)}
                      </span>
                    )}
                    {game.results[0]?.next_jackpot && (
                      <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-[10px] font-medium">
                        {game.results[0].next_jackpot}
                      </span>
                    )}
                    {game.states && game.states.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {game.states[0].name}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-30 group-hover:opacity-80 transition" />
              </button>
            ))
          )}
        </div>
      )}
    </Card>
  );
};

export default GameList; 