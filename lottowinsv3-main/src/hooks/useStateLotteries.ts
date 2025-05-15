import { useEffect, useState } from 'react';
import { api, Lottery } from '../lib/api';

export function useStateLotteries(stateCode: string) {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.lotteries.getByState(stateCode);
        setLotteries(data);
      } catch (err) {
        console.error('Error fetching state lotteries:', err);
        setError('Failed to load state lotteries');
      } finally {
        setLoading(false);
      }
    };

    if (stateCode) {
      fetchData();
    }
  }, [stateCode]);

  return { lotteries, loading, error };
}