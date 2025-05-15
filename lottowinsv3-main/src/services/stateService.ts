import api from './api';

export interface State {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface StatesResponse {
  states: State[];
}

class StateService {
  /**
   * Get all states
   */
  async getAllStates(): Promise<State[]> {
    try {
      const response = await api.get<StatesResponse>('/lottery/states/');
      return response.data.states;
    } catch (error) {
      console.error('Error fetching states:', error);
      throw new Error('Failed to fetch states data');
    }
  }

  /**
   * Get state by code
   */
  async getStateByCode(code: string): Promise<State | undefined> {
    try {
      const states = await this.getAllStates();
      return states.find(state => state.code.toLowerCase() === code.toLowerCase());
    } catch (error) {
      console.error(`Error fetching state with code ${code}:`, error);
      throw new Error(`Failed to fetch state with code ${code}`);
    }
  }
}

export default new StateService(); 