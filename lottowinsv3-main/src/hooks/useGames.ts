import { useState, useEffect } from 'react';
import gameService, { Game } from '../services/gameService';

// Crie um cache global para armazenar resultados por estado
const gamesCache: Record<string, { data: Game[], timestamp: number }> = {};
// Tempo de validade do cache em milissegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000;

export const useGames = (stateCode?: string) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cria uma chave de cache baseada no stateCode
  const cacheKey = stateCode || 'all_states';

  useEffect(() => {
    // Se já temos dados em cache válidos, use-os imediatamente
    if (gamesCache[cacheKey] && (Date.now() - gamesCache[cacheKey].timestamp < CACHE_TTL)) {
      setGames(gamesCache[cacheKey].data);
      setLoading(false);
      return;
    }
    setLoading(true);
    gameService.getGamesWithResults(stateCode)
      .then(data => {
        setGames(data);
        // Armazene no cache
        gamesCache[cacheKey] = {
          data,
          timestamp: Date.now()
        };
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching games:', err);
        setError('Failed to load games data');
        setLoading(false);
      });
  }, [stateCode, cacheKey]);

  return { games, loading, error };
};

export default useGames; 