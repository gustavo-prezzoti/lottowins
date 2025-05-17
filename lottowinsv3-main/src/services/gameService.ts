import api from './api';
import { State } from './stateService';

const API_BASE = 'https://server.lottowins.online/';
function completeLogoUrl(logo_url: string) {
  if (!logo_url) return '';
  if (logo_url.startsWith('http')) return logo_url;
  return API_BASE + logo_url;
}

export interface GameResult {
  id: number;
  draw_date: string;
  draw_time: string;
  numbers: string;
  jackpot: string;
  next_draw_date: string;
  next_draw_time: string;
  next_jackpot: string;
  collected_at: string;
  state_id: number;
  state_code?: string;
}

export interface Game {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
  states: State[];
  results: GameResult[];
}

export interface GamesResponse {
  games: Game[];
}

/**
 * Interface que representa a resposta direta da API ao buscar um jogo por ID
 * A API retorna diretamente o objeto do jogo, sem estar encapsulado em outro objeto
 */
export interface GameDetailResponse {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
  states: State[];
  results: GameResult[];
}

class GameService {
  /**
   * Get all lottery games with results
   * @param stateCode Optional state code to filter games by state
   */
  async getGamesWithResults(stateCode?: string): Promise<Game[]> {
    try {
      const params = stateCode ? { state_code: stateCode } : {};
      const response = await api.get<GamesResponse>('/lottery/games/with-results/', { params });
      return response.data.games.map(game => ({
        ...game,
        logo_url: completeLogoUrl(game.logo_url),
      }));
    } catch (error) {
      console.error('Error fetching games with results:', error);
      throw new Error('Failed to fetch games data');
    }
  }

  /**
   * Get a specific game by slug
   * @param slug The game slug to search for
   */
  async getGameBySlug(slug: string): Promise<Game | undefined> {
    try {
      const games = await this.getGamesWithResults();
      return games.find(game => game.slug === slug);
    } catch (error) {
      console.error(`Error fetching game with slug ${slug}:`, error);
      throw new Error(`Failed to fetch game with slug ${slug}`);
    }
  }

  /**
   * Get game details by ID
   * @param id The game ID to fetch
   */
  async getGameById(id: number): Promise<Game> {
    try {
      const response = await api.get<GameDetailResponse>(`/lottery/games/${id}/`);
      
      const gameData = response.data;
      
      if (!gameData.results) {
        gameData.results = [];
      }
      
      return {
        ...gameData,
        logo_url: completeLogoUrl(gameData.logo_url),
      };
    } catch (error) {
      console.error(`Error fetching game with id ${id}:`, error);
      throw new Error(`Failed to fetch game with id ${id}`);
    }
  }
}

export default new GameService(); 