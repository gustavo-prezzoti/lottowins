import React from 'react';
import Card from '../../components/Card';
import SmartPickLotteryBall from './SmartPickLotteryBall';

interface Pick {
  date: string;
  numbers: number[];
  specialNumber?: number | null;
}

interface SmartPickHistoryProps {
  previousPicks: Pick[];
  isMobile: boolean;
}

const SmartPickHistory: React.FC<SmartPickHistoryProps> = ({ previousPicks, isMobile }) => {
  return (
    <div className={isMobile ? 'space-y-2' : 'max-w-4xl mx-auto'}>
      <h2 className={isMobile ? 'text-text font-bold text-base mb-3' : 'text-text font-bold text-2xl mb-8'}>Previous Smart Picks</h2>
      <div className={isMobile ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
        {previousPicks.map((pick, index) => (
          <Card key={index} variant="dark" className={isMobile ? 'p-3 rounded-xl bg-[#1A1D23] border border-[#2A2F38]' : 'p-6 bg-[#1A1D23] border border-[#2A2F38]'}>
            <div className={isMobile ? 'mb-2' : 'mb-3'}>
              <div className={isMobile ? 'flex justify-between items-start mb-2' : 'flex justify-between items-start mb-6'}>
                <p className={isMobile ? 'text-text font-medium text-xs' : 'text-text font-medium text-lg'}>
                  {new Date(pick.date).toLocaleDateString()}
                </p>
                {index === 0 && (
                  <div className={isMobile ? 'bg-accent/10 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full' : 'bg-accent/10 text-accent text-sm font-medium px-3 py-1.5 rounded-full'}>
                    Latest Pick
                  </div>
                )}
              </div>
              <div className={isMobile ? 'flex justify-center gap-1' : 'flex justify-center gap-3 my-6'}>
                {pick.numbers.map((num, i) => (
                  <SmartPickLotteryBall
                    key={i}
                    number={num}
                    isSpecial={pick.specialNumber !== undefined && pick.specialNumber !== null && num === pick.specialNumber}
                    size={isMobile ? 'md' : 'lg'}
                  />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SmartPickHistory; 