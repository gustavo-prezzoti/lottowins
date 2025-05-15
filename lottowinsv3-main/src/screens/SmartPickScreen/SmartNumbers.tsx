import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SmartPickLotteryBall from './SmartPickLotteryBall';
import { Brain, Copy, Save, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { playSuccessSound, triggerCelebration } from '../../utils/sound';
import { formatDate } from '../../utils/format';
import predictionService from '../../services/predictionService';
import { Game } from '../../services/gameService';

interface SmartNumbersProps {
  selectedGame: Game | undefined;
  numbers: number[];
  setNumbers: React.Dispatch<React.SetStateAction<number[]>>;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  hasGenerated: boolean;
  setHasGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  showHistory: boolean;
}

const gameOddsMap: Record<string, string> = {
  'Powerball': '1:292,201,338',
  'Mega Millions': '1:302,575,350',
  'Cash4Life': '1:21,846,048',
  // ... (adicione outros jogos conforme necessário)
};

const getGameOdds = (gameName: string): string => {
  return gameOddsMap[gameName] || 'Odds not available';
};

const getDaysUntilDraw = (drawDate: string): string => {
  if (!drawDate) return 'TBD';
  const now = new Date();
  const draw = new Date(drawDate);
  now.setHours(0, 0, 0, 0);
  draw.setHours(0, 0, 0, 0);
  const diffTime = draw.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return 'Drawing today';
  } else if (diffDays === 1) {
    return 'Drawing tomorrow';
  } else if (diffDays > 0) {
    return `Drawing in ${diffDays} days`;
  } else {
    return 'Drawing soon';
  }
};

const parseNumbers = (numbersString: string): number[] => {
  if (!numbersString) return [];
  return numbersString.split(/[,+]/).map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num));
};

const SmartNumbers: React.FC<SmartNumbersProps> = ({
  selectedGame,
  numbers,
  setNumbers,
  isGenerating,
  setIsGenerating,
  hasGenerated,
  setHasGenerated,
  isMobile,
  showHistory
}) => {
  const [specialNumber, setSpecialNumber] = useState<number | null>(null);

  const handleGenerateNumbers = async () => {
    if (!selectedGame) return;
    setIsGenerating(true);
    
    try {
      // Get state ID if available
      const stateId = selectedGame.states && selectedGame.states.length > 0 
        ? selectedGame.states[0].id 
        : undefined;
      
      // Call the prediction API
      const response = await predictionService.generatePrediction(selectedGame.id, stateId);
      
      if (response.success && response.prediction) {
        // Parse the numbers from the response
        const mainNumbers = predictionService.parseNumbersString(response.prediction.numbers);
        
        // Parse special number if it exists
        let special: number | null = null;
        if (response.prediction.special_number) {
          special = parseInt(response.prediction.special_number, 10);
        }
        
        // Set the numbers directly from the API response - don't add the special number to the array
        setNumbers(mainNumbers);
        setSpecialNumber(special);
        
        // Save prediction to local storage
        predictionService.savePrediction(response.prediction);
      } else {
        // Fallback to random generation if API response is not successful
        generateRandomNumbers();
      }
    } catch (error) {
      console.error('Error generating prediction:', error);
      // Fallback to random generation on error
      generateRandomNumbers();
    } finally {
      setIsGenerating(false);
      setHasGenerated(true);
      playSuccessSound();
      triggerCelebration();
    }
  };
  
  // Fallback random number generation
  const generateRandomNumbers = () => {
    if (!selectedGame) return;
    
    let mainNumbersMax = 69;
    let specialNumberMax = 0;
    let numberCount = 5;
    let hasSpecialNumber = false;
    
    if (selectedGame.results && selectedGame.results.length > 0 && selectedGame.results[0].numbers) {
      const sampleNumbers = parseNumbers(selectedGame.results[0].numbers);
      if (sampleNumbers.length > 0) {
        const maxSampleNumber = Math.max(...sampleNumbers);
        mainNumbersMax = Math.max(maxSampleNumber + 5, 45);
        numberCount = sampleNumbers.length;
        if (selectedGame.name.includes('Powerball') || 
            selectedGame.name.includes('Mega') || 
            selectedGame.name.includes('Cash4Life')) {
          hasSpecialNumber = true;
          specialNumberMax = maxSampleNumber < 26 ? 26 : maxSampleNumber;
        }
      }
    } else {
      if (selectedGame.name.includes('Powerball')) {
        mainNumbersMax = 69;
        specialNumberMax = 26;
        numberCount = 5;
        hasSpecialNumber = true;
      } else if (selectedGame.name.includes('Mega')) {
        mainNumbersMax = 70;
        specialNumberMax = 25;
        numberCount = 5;
        hasSpecialNumber = true;
      } else if (selectedGame.name.includes('Cash4Life')) {
        mainNumbersMax = 60;
        specialNumberMax = 4;
        numberCount = 5;
        hasSpecialNumber = true;
      } else if (selectedGame.name.includes('Take 5')) {
        mainNumbersMax = 39;
        numberCount = 5;
      } else if (selectedGame.name.includes('Pick 10')) {
        mainNumbersMax = 80;
        numberCount = 10;
      } else if (selectedGame.name.includes('Pick 3')) {
        mainNumbersMax = 9;
        numberCount = 3;
      } else if (selectedGame.name.includes('Pick 4')) {
        mainNumbersMax = 9;
        numberCount = 4;
      } else if (selectedGame.name.includes('Fantasy 5')) {
        mainNumbersMax = 39;
        numberCount = 5;
      } else if (selectedGame.name.includes('2by2')) {
        mainNumbersMax = 26;
        numberCount = 4;
      } else if (selectedGame.name.includes('All or Nothing')) {
        mainNumbersMax = 24;
        numberCount = 12;
      } else {
        mainNumbersMax = 49;
        numberCount = 6;
      }
    }
    
    const mainNumbers: number[] = [];
    while (mainNumbers.length < numberCount) {
      const num = Math.floor(Math.random() * mainNumbersMax) + 1;
      if (!mainNumbers.includes(num)) {
        mainNumbers.push(num);
      }
    }
    
    mainNumbers.sort((a, b) => a - b);
    setNumbers(mainNumbers);
    
    if (hasSpecialNumber && specialNumberMax > 0) {
      // Generate special number (could be the same as one of the main numbers)
      const special = Math.floor(Math.random() * specialNumberMax) + 1;
      setSpecialNumber(special);
    } else {
      setSpecialNumber(null);
    }
  };

  // If no game is selected, show a message
  if (!selectedGame) {
    return (
      <Card className={isMobile ? 'p-4' : 'p-8'}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Brain size={isMobile ? 48 : 64} className="text-gray-400 mb-4" />
          <h3 className="text-text font-semibold text-xl mb-2">Select a Lottery Game</h3>
          <p className="text-text-muted max-w-md">
            Choose a lottery game from the list to generate smart picks based on AI analysis.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={isMobile ? 'relative bg-[#1A1D23] rounded-xl p-4 mb-3 border border-[#2A2F38]' : 'mb-0 relative bg-[#1A1D23] p-8 border border-[#2A2F38] shadow-xl'}>
      {!isGenerating ? (
        <div className="flex flex-col">
          <div className="absolute top-0 right-0 m-2 lg:m-6">
            <div className={isMobile ? 'text-accent text-[10px] font-semibold px-2 py-0.5 bg-accent/10 rounded-full' : 'text-accent text-sm font-medium px-3 py-1.5 bg-accent/10 rounded-full'}>
              AI Optimized
            </div>
          </div>
          <div className="text-center mb-4 lg:mb-8">
            <h3 className={isMobile ? 'text-text font-bold text-lg mb-4' : 'text-text font-bold text-2xl mb-8'}>Your Smart Numbers</h3>
            {hasGenerated && numbers.length > 0 ? (
              <>
                <div className={isMobile ? 'flex justify-center gap-2 flex-wrap mb-2' : 'flex justify-center gap-4 flex-wrap'}>
                  {numbers.map((num, i) => (
                    <SmartPickLotteryBall
                      key={i}
                      number={num}
                      isSpecial={specialNumber !== null && num === specialNumber}
                      size={isMobile ? 'lg' : 'xl'}
                    />
                  ))}
                </div>
                <p className={isMobile ? 'text-text-muted text-xs mt-2' : 'text-text-muted text-lg mt-6'}>
                  Generated for {selectedGame?.name} - {new Date().toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className={isMobile ? 'flex flex-col items-center justify-center py-6' : 'flex flex-col items-center justify-center py-12'}>
                <Brain size={isMobile ? 32 : 48} className="text-accent mb-2 lg:mb-4" />
                <p className={isMobile ? 'text-text text-base font-medium' : 'text-text text-lg font-medium'}>Click to generate your smart numbers!</p>
                <p className={isMobile ? 'text-text-muted text-xs mt-1' : 'text-text-muted text-sm mt-2'}>Press the button below to analyze and generate a new combination.</p>
              </div>
            )}
          </div>
          
          {!showHistory && (
            <>
              <div className={isMobile ? 'grid grid-cols-1 gap-2' : 'flex gap-4'}>
                <Button
                  className={isMobile ? 'mt-3 text-base font-semibold py-3 rounded-xl shadow-md bg-accent hover:bg-accent/90' : 'flex-1 py-4 text-lg bg-accent hover:bg-accent/90'}
                  onClick={handleGenerateNumbers}
                  disabled={isGenerating || !selectedGame}
                  fullWidth={isMobile}
                >
                  {isGenerating ? 'Generating...' : 'Generate Smart Numbers'}
                </Button>
                <Button
                  variant="outline"
                  className={isMobile ? 'flex flex-col items-center justify-center py-3 text-xs border-accent/30 hover:bg-accent/10 text-accent' : 'flex items-center gap-2 py-4 border-accent/30 hover:bg-accent/10 text-accent'}
                  onClick={() => navigator.clipboard.writeText(numbers.join(', '))}
                  disabled={!hasGenerated}
                >
                  <Copy size={isMobile ? 18 : 20} className={isMobile ? 'mb-0.5' : ''} />
                  <span>Copy</span>
                </Button>
                <Button
                  variant="outline"
                  className={isMobile ? 'flex flex-col items-center justify-center py-3 text-xs border-accent/30 hover:bg-accent/10 text-accent' : 'flex items-center gap-2 py-4 border-accent/30 hover:bg-accent/10 text-accent'}
                  disabled={!hasGenerated}
                  onClick={() => {
                    if (selectedGame && numbers.length > 0) {
                      const mainNumbers = specialNumber !== null 
                        ? numbers.filter(num => num !== specialNumber) 
                        : numbers;
                      
                      const prediction = {
                        id: Date.now(),
                        game_name: selectedGame.name,
                        state_code: selectedGame.states && selectedGame.states.length > 0 
                          ? selectedGame.states[0].code 
                          : '',
                        numbers: mainNumbers.join(', '),
                        special_number: specialNumber !== null ? specialNumber.toString() : null,
                        confidence: 85,
                        summary: `Smart Pick for ${selectedGame.name}`,
                        analysis_data: {
                          hot_numbers: '',
                          cold_numbers: '',
                          overdue_numbers: ''
                        }
                      };
                      
                      predictionService.savePrediction(prediction);
                    }
                  }}
                >
                  <Save size={isMobile ? 18 : 20} className={isMobile ? 'mb-0.5' : ''} />
                  <span>Save</span>
                </Button>
                <Button
                  variant="outline"
                  className={isMobile ? 'flex flex-col items-center justify-center py-3 text-xs border-accent/30 hover:bg-accent/10 text-accent' : 'flex items-center gap-2 py-4 border-accent/30 hover:bg-accent/10 text-accent'}
                  onClick={handleGenerateNumbers}
                  disabled={!hasGenerated}
                >
                  <RefreshCw size={isMobile ? 18 : 20} className={isMobile ? 'mb-0.5' : ''} />
                  <span>New Set</span>
                </Button>
              </div>
              
              <div className="space-y-2 mt-4">
                <Card variant="dark" className="p-3 rounded-xl bg-[#151821] border border-[#2A2F38]">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-accent/10 rounded-lg">
                      <TrendingUp size={16} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text text-sm">Winning Odds</h3>
                      <p className="text-text-muted text-xs mt-0.5">
                        {selectedGame ? `${selectedGame.name} odds: ${getGameOdds(selectedGame.name)}` : 'Select a game to see odds'}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card variant="dark" className="p-4 bg-[#151821] border border-[#2A2F38]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Clock size={16} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text text-sm">Next Draw</h3>
                      <p className="text-text-muted text-xs mt-0.5">
                        {selectedGame && selectedGame.results && selectedGame.results.length > 0 ? (
                          (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const validResults = selectedGame.results
                              .filter((r: { next_draw_date?: string }) => r.next_draw_date)
                              .filter((r: { next_draw_date: string }) => {
                                const drawDate = new Date(r.next_draw_date);
                                drawDate.setHours(0, 0, 0, 0);
                                return drawDate >= today;
                              });
                            
                            if (validResults.length > 0) {
                              const result = validResults[0];
                              return (
                                <>
                                  <span className="block">{formatDate(result.next_draw_date)}</span>
                                  <span className="block mt-1">{getDaysUntilDraw(result.next_draw_date)}</span>
                                </>
                              );
                            } else {
                              return 'Next draw date not available';
                            }
                          })()
                        ) : 'Select a game to see next draw'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent"></div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <Brain size={24} className="text-accent animate-pulse" />
            </div>
          </div>
          <p className="text-text font-medium text-lg mt-4">Generating Smart Numbers...</p>
          <p className="text-text-muted text-sm mt-1">Analyzing patterns and historical data</p>
        </div>
      )}
    </Card>
  );
};

export default SmartNumbers; 