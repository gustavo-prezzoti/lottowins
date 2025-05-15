import { useEffect, useState } from 'react';
// Removido: import { api, Lottery, LotteryDraw } from '../lib/api';

// Definindo interfaces localmente
interface Lottery {
  id: string;
  name: string;
  state_code: string;
  description: string | null;
  logo_url: string | null;
  draw_days: string[];
  created_at: string;
  updated_at: string;
}

interface LotteryDraw {
  id: string;
  lottery_id: string;
  draw_date: string;
  jackpot_amount: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  lottery?: Lottery;
  numbers?: LotteryNumbers;
}

interface LotteryNumbers {
  id: string;
  draw_id: string;
  numbers: number[];
  special_numbers: number[];
  created_at: string;
}

export function useLotteryData() {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [upcomingDraws, setUpcomingDraws] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let pollInterval: number;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dados mockados para substituir a chamada à API
        const mockLotteries: Lottery[] = [
          { id: '1', name: 'Powerball', state_code: 'US', description: 'America\'s favorite lottery game', logo_url: null, draw_days: ['Wednesday', 'Saturday'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', name: 'Mega Millions', state_code: 'US', description: 'Dream bigger!', logo_url: null, draw_days: ['Tuesday', 'Friday'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        
        const mockDraws: LotteryDraw[] = [
          { id: '1', lottery_id: '1', draw_date: new Date().toISOString(), jackpot_amount: 300000000, is_completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lottery: mockLotteries[0] }
        ];
        
        if (mounted) {
          setLotteries(mockLotteries);
          setUpcomingDraws(mockDraws);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching lottery data:', err);
        if (mounted) {
          setError('Failed to load lottery data');
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling every 30 seconds
    pollInterval = window.setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  return { lotteries, upcomingDraws, loading, error };
}