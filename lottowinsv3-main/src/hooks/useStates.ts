import { useState, useEffect } from 'react';
import stateService, { State } from '../services/stateService';

export const useStates = () => {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        const statesData = await stateService.getAllStates();
        setStates(statesData);
        setError(null);
      } catch (err) {
        setError('Failed to load states data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  return { states, loading, error };
};

export default useStates; 