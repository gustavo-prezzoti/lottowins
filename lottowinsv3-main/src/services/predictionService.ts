import api from './api';
import axios from 'axios';

export interface PredictionRequest {
  game_id: number;
  state_id?: number;
}

export interface PredictionAnalysisData {
  hot_numbers: string;
  cold_numbers: string;
  overdue_numbers: string;
}

export interface Prediction {
  id: number;
  game_name: string;
  state_code: string;
  numbers: string;
  special_number: string | null;
  confidence: number;
  summary: string;
  analysis_data: PredictionAnalysisData;
  created_at?: string;
}

// Interface para a resposta da API de predições por usuário
export interface UserPredictionItem {
  id: number;
  game_id: number;
  state_id: number;
  game_name: string;
  state_code: string;
  predicted_numbers: string;
  predicted_special_number: string | null;
  confidence_score: string;
  hot_numbers: string;
  cold_numbers: string;
  overdue_numbers: string;
  created_at: string;
}

export interface UserPredictionsResponse {
  count: number;
  results: UserPredictionItem[];
}

export interface PredictionResponse {
  message: string;
  prediction: Prediction;
  success: boolean;
}

export interface PredictionListResponse {
  predictions: Prediction[];
  total_count: number;
  page: number;
  page_size: number;
  success: boolean;
}

class PredictionService {
  /**
   * Generate smart pick numbers for a specific game
   * @param gameId The game ID to generate numbers for
   * @param stateId Optional state ID for state-specific games
   */
  async generatePrediction(gameId: number, stateId?: number): Promise<PredictionResponse> {
    try {
      const requestData: PredictionRequest = {
        game_id: gameId
      };
      
      if (stateId) {
        requestData.state_id = stateId;
      }
      
      const response = await api.post<any>('/lottery/predictions/generate/', requestData);
      
      
      // Handle direct response format
      if (response) {
        // Map API fields to our Prediction interface
        const prediction: Prediction = {
          id: response.data.id || Math.floor(Math.random() * 10000),
          game_name: response.data.game_name || "Lottery Game",
          state_code: response.data.state_code || "",
          numbers: response.data.predicted_numbers || "",
          special_number: response.data.predicted_special_number,
          confidence: response.data.confidence_score || 0,
          summary: response.data.analysis_summary || "Smart prediction",
          analysis_data: {
            hot_numbers: response.data.hot_numbers || "",
            cold_numbers: response.data.cold_numbers || "",
            overdue_numbers: response.data.overdue_numbers || ""
          },
          created_at: new Date().toISOString()
        };
        
        
        return {
          message: "Prediction generated successfully",
          prediction,
          success: true
        };
      }
      
      return {
        message: "Failed to generate prediction",
        prediction: null as any,
        success: false
      };
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw new Error('Failed to generate smart pick numbers');
    }
  }
  
  /**
   * Get predictions by user, game ID, and state ID
   * @param gameId The game ID to filter by
   * @param stateId Optional state ID to filter by
   */
  async getPredictionsByGame(gameId: number, stateId?: number): Promise<Prediction[]> {
    try {
      // Build query parameters
      const params: Record<string, string> = {
        game_id: gameId.toString()
      };
      
      if (stateId) {
        params.state_id = stateId.toString();
      }
      
      const response = await api.get<UserPredictionsResponse>('/lottery/predictions/by-user/', { params });
      
      if (response.data && response.data.results) {
        // Transformar os resultados da API no formato Prediction
        return response.data.results.map(item => ({
          id: item.id,
          game_name: item.game_name,
          state_code: item.state_code,
          numbers: item.predicted_numbers,
          special_number: item.predicted_special_number,
          confidence: parseFloat(item.confidence_score),
          summary: `Prediction generated on ${new Date(item.created_at).toLocaleDateString()}`,
          analysis_data: {
            hot_numbers: item.hot_numbers,
            cold_numbers: item.cold_numbers,
            overdue_numbers: item.overdue_numbers
          }
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
  }
  
  /**
   * Get predictions for a specific game with pagination
   * @param gameId The game ID to get predictions for
   * @param page The page number (1-based)
   * @param pageSize The number of items per page
   */
  async getGamePredictions(gameId: number, page: number = 1, pageSize: number = 5): Promise<PredictionListResponse> {
    try {
      const params = {
        game_id: gameId.toString(),
        page: page.toString(),
        page_size: pageSize.toString()
      };
      
      const response = await api.get<UserPredictionsResponse>('/lottery/predictions/by-user/', { params });
      
      if (response.data && response.data.results) {
        
        // Transformar os resultados da API no formato PredictionListResponse
        const predictions = response.data.results.map(item => ({
          id: item.id,
          game_name: item.game_name,
          state_code: item.state_code,
          numbers: item.predicted_numbers,
          special_number: item.predicted_special_number,
          confidence: parseFloat(item.confidence_score),
          summary: `Prediction generated on ${new Date(item.created_at).toLocaleDateString()}`,
          analysis_data: {
            hot_numbers: item.hot_numbers,
            cold_numbers: item.cold_numbers,
            overdue_numbers: item.overdue_numbers
          },
          created_at: item.created_at // Explicitly include the created_at field
        }));
        
        return {
          predictions,
          total_count: response.data.count,
          page,
          page_size: pageSize,
          success: true
        };
      } else {
        return {
          predictions: [],
          total_count: 0,
          page: 1,
          page_size: pageSize,
          success: false
        };
      }
    } catch (error) {
      console.error('Error fetching game predictions:', error);
      return {
        predictions: [],
        total_count: 0,
        page: 1,
        page_size: pageSize,
        success: false
      };
    }
  }
  
  /**
   * Parse a numbers string into an array of numbers
   * @param numbersString The string of numbers to parse (e.g. "1, 2, 3, 4, 5")
   */
  parseNumbersString(numbersString: string): number[] {
    if (!numbersString) {
      return [];
    }
    
    
    // Split by comma or plus sign
    const numberStrings = numbersString.split(/[,+]/);
    
    // Convert to numbers and filter out NaN
    const numbers = numberStrings
      .map(numStr => {
        const trimmed = numStr.trim();
        const parsed = parseInt(trimmed, 10);
        return parsed;
      })
      .filter(num => !isNaN(num));
    
    return numbers;
  }
  
  /**
   * Save a prediction for future reference
   * @param prediction The prediction to save
   */
  savePrediction(prediction: Prediction): void {
    try {
      // Get existing predictions from local storage
      const savedPredictions = localStorage.getItem('savedPredictions');
      let predictions: Prediction[] = savedPredictions ? JSON.parse(savedPredictions) : [];
      
      // Add the new prediction
      predictions.unshift(prediction);
      
      // Keep only the last 10 predictions
      if (predictions.length > 10) {
        predictions = predictions.slice(0, 10);
      }
      
      // Save back to local storage
      localStorage.setItem('savedPredictions', JSON.stringify(predictions));
    } catch (error) {
      console.error('Error saving prediction:', error);
    }
  }
  
  /**
   * Get saved predictions
   */
  getSavedPredictions(): Prediction[] {
    try {
      const savedPredictions = localStorage.getItem('savedPredictions');
      return savedPredictions ? JSON.parse(savedPredictions) : [];
    } catch (error) {
      console.error('Error getting saved predictions:', error);
      return [];
    }
  }

  /**
   * Salva uma predição no backend
   */
  async savePredictionToBackend(data: {
    game_id: number;
    state_id?: number;
    predicted_numbers: string;
    predicted_special_number?: string | null;
    confidence_score: number;
    analysis_summary: string;
    hot_numbers?: string;
    cold_numbers?: string;
    overdue_numbers?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> {
    try {
      const response = await api.post('/lottery/predictions/save/', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Error saving prediction:', error);
      
      // Log more detailed error information if available
      if (axios.isAxiosError(error) && error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Check for error message in various formats the API might return
        const responseData = error.response.data;
        if (typeof responseData === 'object') {
          // Check for message field first (most APIs use this)
          if ('message' in responseData && typeof responseData.message === 'string') {
            throw new Error(responseData.message);
          }
          // Then check for error field
          else if ('error' in responseData && typeof responseData.error === 'string') {
            throw new Error(responseData.error);
          }
          // Check for detail field (Django REST often uses this)
          else if ('detail' in responseData && typeof responseData.detail === 'string') {
            throw new Error(responseData.detail);
          }
        }
      }
      
      throw new Error('Failed to save prediction');
    }
  }
}

export default new PredictionService(); 