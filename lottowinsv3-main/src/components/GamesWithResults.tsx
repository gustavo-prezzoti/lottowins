import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import Button from './Button';
import LotteryNumberBall from './LotteryNumberBall';
import { Calendar, Clock, MapPin, ChevronRight, ChevronDown } from 'lucide-react';
import { Game } from '../services/gameService';
import { formatDate, formatTime } from '../utils/format';

interface GamesWithResultsProps {
  games: Game[];
  loading: boolean;
  error: string | null;
  maxGames?: number;
  compact?: boolean;
}

const GamesWithResults: React.FC<GamesWithResultsProps> = ({ 
  games, 
  loading, 
  error, 
  maxGames = 3,
  compact = false
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        No games found.
      </div>
    );
  }

  // Function to parse numbers string into an array
  const parseNumbers = (numbersString: string): number[] => {
    return numbersString.split(/[,+]/).map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num));
  };

  // Função para converter jackpot string para número (ex: "$22,000" -> 22000)
  const parseJackpot = (jackpot: string | undefined): number => {
    if (!jackpot) return 0;
    // Remove símbolos e vírgulas, pega só números
    const num = jackpot.replace(/[^\d]/g, '');
    return parseInt(num, 10) || 0;
  };

  // Ordenação: mais recente, depois maior prêmio
  const sortedGames = [...games].sort((a, b) => {
    const aResult = a.results[0];
    const bResult = b.results[0];
    if (!aResult && !bResult) return 0;
    if (!aResult) return 1;
    if (!bResult) return -1;
    // Ordena por data mais recente
    const dateA = new Date(aResult.draw_date).getTime();
    const dateB = new Date(bResult.draw_date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    // Se empate, ordena por maior jackpot (ignora se não definido)
    const jackpotA = aResult.next_jackpot ? parseJackpot(aResult.next_jackpot) : 0;
    const jackpotB = bResult.next_jackpot ? parseJackpot(bResult.next_jackpot) : 0;
    return jackpotB - jackpotA;
  });

  // Determine which games to display based on showAll state
  const displayGames = showAll ? sortedGames : sortedGames.slice(0, maxGames);

  return (
    <div className="flex flex-col space-y-4">
      <div className={`overflow-y-auto scrollbar-dark ${showAll ? 'max-h-[600px]' : ''}`}>
        <div className={`space-y-${compact ? '1' : '2'}`}>
          {displayGames.map((game) => {
            const latestResult = game.results[0];
            const numbers = latestResult ? parseNumbers(latestResult.numbers) : [];
            
            return (
              <Card 
                key={game.id} 
                variant={compact ? undefined : "dark"}
                className={`${compact ? 'p-3 border border-[#333] bg-transparent' : 'p-4'} hover:shadow-lg transition-shadow duration-200`}
              >
                {compact ? (
                  <div className="flex flex-col gap-2">
                    {/* Top: Logo + Nome + Jackpot */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-md">
                          {game.logo_url ? (
                            <img 
                              src={game.logo_url} 
                              alt={game.name} 
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null; // Prevent infinite loop
                                target.style.display = 'none';
                                // Show initials as fallback
                                if (target.parentElement) {
                                  target.parentElement.innerHTML = `<div class="text-accent font-bold text-base">${game.name.substring(0, 2)}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="text-accent font-bold text-base">{game.name.substring(0, 2)}</div>
                          )}
                        </div>
                        <span className="font-semibold text-white text-xs truncate max-w-[90px]">{game.name}</span>
                      </div>
                      {latestResult && (
                        <span className="text-accent font-bold text-sm whitespace-nowrap">{latestResult.next_jackpot}</span>
                      )}
                    </div>
                    {/* Números sorteados */}
                    {latestResult ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1 justify-center mb-1">
                          {numbers.slice(0, 5).map((num, idx) => (
                            <LotteryNumberBall
                              key={idx}
                              number={num}
                              isSpecial={idx === numbers.length - 1 && numbers.length > 1}
                              size="sm"
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} />
                          <span>{formatDate(latestResult.draw_date)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-xs">No recent results</div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Game Logo and Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-md">
                        {game.logo_url ? (
                          <img 
                            src={game.logo_url} 
                            alt={game.name} 
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null; // Prevent infinite loop
                              target.style.display = 'none';
                              // Show initials as fallback
                              if (target.parentElement) {
                                target.parentElement.innerHTML = `<div class="text-accent font-bold text-lg">${game.name.substring(0, 2)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="text-accent font-bold text-lg">{game.name.substring(0, 2)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-white text-lg`}>{game.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {game.states.slice(0, 3).map((state) => (
                            <span 
                              key={state.id}
                              className="inline-flex items-center text-xs text-gray-300 bg-[#2a2f3a] px-1.5 py-0.5 rounded"
                            >
                              <MapPin size={10} className="mr-1" />
                              {state.name}
                            </span>
                          ))}
                          {game.states.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{game.states.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Latest Results */}
                    <div className="flex-1">
                      {latestResult ? (
                        <div className="flex flex-col items-center">
                          <div className="flex flex-wrap justify-center gap-1 mb-2">
                            {numbers.slice(0, 6).map((num, idx) => (
                              <LotteryNumberBall
                                key={idx}
                                number={num}
                                isSpecial={idx === numbers.length - 1 && numbers.length > 1}
                                size="sm"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar size={12} />
                            <span>{formatDate(latestResult.draw_date)}</span>
                            <Clock size={12} />
                            <span>{formatTime(latestResult.draw_time)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 text-sm">
                          No recent results
                        </div>
                      )}
                    </div>
                    {/* Jackpot and Action */}
                    <div className="flex flex-col items-end gap-2">
                      {latestResult && (
                        <div className="text-accent font-bold">
                          {latestResult.next_jackpot}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => navigate(`/lottery/games/${game.id}`)}
                      >
                        <span>Details</span>
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
      
      {games.length > maxGames && !compact && (
        <div className="text-center pt-3 border-t border-[#333]">
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center justify-center gap-2 w-full bg-[#2a2f3a] hover:bg-[#343a46] text-white"
            onClick={() => setShowAll(!showAll)}
          >
            <span>{showAll ? 'Show Less' : 'Show All Games'}</span>
            <ChevronDown size={16} className={`transform transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default GamesWithResults; 