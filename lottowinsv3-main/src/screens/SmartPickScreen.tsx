import React, { useState, useMemo, useEffect } from 'react';
import Button from '../components/Button';
import useGames from '../hooks/useGames';
import useStates from '../hooks/useStates';
import { useWindowSize } from '../hooks/useWindowSize';
import GameList from './SmartPickScreen/GameList';
import SmartNumbers from './SmartPickScreen/SmartNumbers';
import predictionService from '../services/predictionService';
import { useNavigate } from 'react-router-dom';

// Custom styles for dark theme in SmartPickScreen
import './SmartPickScreen/smartPickStyles.css';

const SmartPickScreen: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLottery, setSelectedLottery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { isMobile } = useWindowSize();
  const { states } = useStates();
  
  // Load saved predictions on component mount
  useEffect(() => {
    const loadPredictions = async () => {
      // Implementation remains the same but we don't need to store the results
      // since we're navigating to another screen instead
      try {
        if (selectedLottery && games.length > 0) {
          const selectedGame = games.find(game => game.slug === selectedLottery);
          if (selectedGame) {
            const stateId = selectedGame.states && selectedGame.states.length > 0 
              ? selectedGame.states[0].id 
              : undefined;
            await predictionService.getPredictionsByGame(selectedGame.id, stateId);
          }
        }
      } catch (error) {
        console.error('Error fetching predictions from API:', error);
      }
    };
    
    loadPredictions();
    
    // Reset numbers and generated state when selected lottery changes
    setNumbers([]);
    setHasGenerated(false);
  }, [selectedLottery]);
  
  const stateCodeLowercase = selectedState ? selectedState.toLowerCase() : undefined;
  const gamesParams = useMemo(() => ({
    stateCode: stateCodeLowercase
  }), [stateCodeLowercase]);
  const { games, loading: gamesLoading } = useGames(gamesParams.stateCode);
  
  useEffect(() => {
    setSelectedLottery('');
    setNumbers([]);
    setHasGenerated(false);
  }, [selectedState]);
  
  const sortedGames = useMemo(() => {
    // Get current date for filtering upcoming games
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First, filter for games with future draws (upcoming games)
    const gamesWithFutureDraws = games.filter(game => {
      if (!game.results || !game.results[0]?.next_draw_date) return false;
      const drawDate = new Date(game.results[0].next_draw_date);
      drawDate.setHours(0, 0, 0, 0);
      return drawDate >= today;
    });
    
    // Use upcoming games if available, otherwise fall back to all games
    const filteredGames = gamesWithFutureDraws.length > 0 ? gamesWithFutureDraws : games;
    
    // Sort by upcoming draw date (nearest first)
    return [...filteredGames].sort((a, b) => {
      // If both games have next draw dates, sort by date
      if (a.results?.[0]?.next_draw_date && b.results?.[0]?.next_draw_date) {
        const dateA = new Date(a.results[0].next_draw_date);
        const dateB = new Date(b.results[0].next_draw_date);
        return dateA.getTime() - dateB.getTime(); // Ascending order (nearest first)
      }
      
      // If only one has a next draw date, prioritize it
      if (a.results?.[0]?.next_draw_date) return -1;
      if (b.results?.[0]?.next_draw_date) return 1;
      
      // If neither has a next draw date, fall back to alphabetical sorting
      return a.name.localeCompare(b.name);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, selectedState]);
  
  const selectedGame = useMemo(() => {
    return games.find(game => game.slug === selectedLottery);
  }, [games, selectedLottery]);

  // Navigate to lottery detail screen with smart picks tab
  const navigateToSmartPicks = () => {
    if (selectedGame) {
      navigate(`/lottery/games/${selectedGame.id}?tab=smart-picks`);
    }
  };

  // Handle lottery selection with reset
  const handleLotterySelect = (lottery: string) => {
    if (lottery !== selectedLottery) {
      setSelectedLottery(lottery);
      setNumbers([]);
      setHasGenerated(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary smart-pick-screen">
      <main className={isMobile ? 'px-2 py-3 pb-24' : 'pt-10 pb-16 px-8'}>
        <div className={isMobile ? '' : 'max-w-[1200px] mx-auto'}>
          <div className="flex justify-between items-center mb-4 lg:mb-8">
            <h2 className={isMobile ? 'text-text font-semibold text-xl' : 'text-text font-semibold text-3xl'}>Smart Pick Generator</h2>
            <Button 
              variant="outline" 
              size={isMobile ? 'sm' : undefined}
              className={isMobile ? 'text-xs border-accent/30 hover:bg-accent/10 text-accent' : 'border-accent/30 hover:bg-accent/10 text-accent'}
              onClick={navigateToSmartPicks}
              disabled={!selectedGame}
            >
              View History
            </Button>
          </div>
          {isMobile ? (
            <>
              {/* Seleção de jogo */}
              <div className="mb-6">
                <GameList
                  games={sortedGames}
                  selectedLottery={selectedLottery}
                  onSelect={handleLotterySelect}
                  selectedState={selectedState}
                  onStateChange={setSelectedState}
                  loading={gamesLoading}
                  states={states}
                  isMobile={isMobile}
                />
              </div>
              {/* Geração de números */}
              <div className="mb-6">
                <h3 className="text-text font-semibold text-lg mb-2 text-center">Generate Your Smart Numbers</h3>
                <SmartNumbers
                  selectedGame={selectedGame}
                  numbers={numbers}
                  setNumbers={setNumbers}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  hasGenerated={hasGenerated}
                  setHasGenerated={setHasGenerated}
                  isMobile={isMobile}
                  showHistory={false}
                />
              </div>
              {/* Instruções/ajuda */}
              <div className="mb-6">
                <div className="bg-[#181b20] border border-[#2A2F38] rounded-xl p-4 text-center text-text-muted text-sm">
                  Select a game and tap "Generate Smart Numbers" to get your AI-optimized picks. You can view your history or try different games and states!
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-12 gap-8 items-start">
              <div className="col-span-4">
                <GameList
                  games={sortedGames}
                  selectedLottery={selectedLottery}
                  onSelect={handleLotterySelect}
                  selectedState={selectedState}
                  onStateChange={setSelectedState}
                  loading={gamesLoading}
                  states={states}
                  isMobile={isMobile}
                />
              </div>
              <div className="col-span-8">
                <SmartNumbers
                  selectedGame={selectedGame}
                  numbers={numbers}
                  setNumbers={setNumbers}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  hasGenerated={hasGenerated}
                  setHasGenerated={setHasGenerated}
                  isMobile={isMobile}
                  showHistory={false}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SmartPickScreen;