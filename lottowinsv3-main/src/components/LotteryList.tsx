import React from 'react';
import { useNavigate } from 'react-router-dom';
import LotteryCard from './LotteryCard';
import { LotteryDraw } from '../lib/api';
import { formatCurrency } from '../utils/format';

interface LotteryListProps {
  draws: LotteryDraw[];
  loading?: boolean;
  error?: string | null;
}

const LotteryList: React.FC<LotteryListProps> = ({ draws, loading, error }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-card-dark rounded-lg h-48"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-card-light rounded-lg p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (draws.length === 0) {
    return (
      <div className="text-center py-8 bg-card-light rounded-lg p-6">
        <p className="text-text-muted">No upcoming draws available at this time.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {draws.map((draw) => (
        <LotteryCard
          key={draw.id}
          name={draw.lottery?.name || ''}
          jackpot={formatCurrency(draw.jackpot_amount)}
          drawDate={new Date(draw.draw_date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
          logoUrl={draw.lottery?.logo_url || ''}
          onClick={() => navigate(`/lottery/${draw.lottery_id}`)}
        />
      ))}
    </div>
  );
};

export default LotteryList;