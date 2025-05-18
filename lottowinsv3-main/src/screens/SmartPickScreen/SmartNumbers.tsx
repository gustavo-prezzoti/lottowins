import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SmartPickLotteryBall from './SmartPickLotteryBall';
import { Brain, Copy, Save, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { formatDate } from '../../utils/format';
import predictionService from '../../services/predictionService';
import gameOddsService from '../../services/gameOddsService';
import { Game } from '../../services/gameService';
import { useToast } from '../../components/Toast';
import { Prediction } from '../../services/predictionService';

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
  aiConfidence?: number;
  setAiConfidence?: React.Dispatch<React.SetStateAction<number>>;
}

const getGameOdds = (gameName: string): string => {
  return gameOddsService.getGameOdds(gameName);
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

// Componente para exibição de texto com transição
const FadeMessage: React.FC<{ message: string; isActive: boolean }> = ({ message, isActive }) => (
  <div 
    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
      isActive ? 'opacity-100' : 'opacity-0'
    }`}
    style={{ pointerEvents: isActive ? 'auto' : 'none' }}
  >
    <div className="bg-black/30 px-6 py-3 rounded-xl backdrop-blur-sm">
      <span className="text-xl font-bold text-white">{message}</span>
    </div>
  </div>
);

const SmartNumbers: React.FC<SmartNumbersProps> = ({
  selectedGame,
  numbers,
  setNumbers,
  isGenerating,
  setIsGenerating,
  hasGenerated,
  setHasGenerated,
  isMobile,
  showHistory,
  aiConfidence,
  setAiConfidence
}) => {
  const [specialNumber, setSpecialNumber] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [messageStep, setMessageStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<number>(5000);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [generatedPrediction, setGeneratedPrediction] = useState<Prediction | null>(null);
  
  // Array de mensagens de carregamento
  const loadingMessages = [
    'LottoWins AI is searching for your prediction…',
    'Calculating prediction…',
    'Prediction found!'
  ];

  // Efeito para controlar a sequência de mensagens e o progresso da barra
  useEffect(() => {
    if (!isGenerating) {
      setMessageStep(0);
      setProgress(0);
      return;
    }

    // Gerar um tempo de processamento aleatório entre 14 e 25 segundos
    const randomTime = Math.floor(Math.random() * (25000 - 14000 + 1)) + 14000;
    setProcessingTime(randomTime);

    // Configurar os pontos de transição das mensagens
    const firstTransition = randomTime * 0.35; // Primeira mensagem até ~35% do tempo
    const secondTransition = randomTime * 0.75; // Segunda mensagem até ~75% do tempo

    // Primeira mensagem
    setLoadingMessage(loadingMessages[0]);
    setMessageStep(0);
    
    // Segunda mensagem
    const timer1 = setTimeout(() => {
      setMessageStep(1);
      setLoadingMessage(loadingMessages[1]);
    }, firstTransition);
    
    // Terceira mensagem
    const timer2 = setTimeout(() => {
      setMessageStep(2);
      setLoadingMessage(loadingMessages[2]);
    }, secondTransition);
    
    // Progresso suave da barra
    const progressInterval = 50; // Atualizar a cada 50ms
    const totalSteps = randomTime / progressInterval;
    const progressStep = 100 / totalSteps;
    
    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      currentProgress += progressStep;
      if (currentProgress > 100) currentProgress = 100;
      
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressTimer);
      }
    }, progressInterval);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(progressTimer);
    };
  }, [isGenerating]);

  const handleGenerateNumbers = async () => {
    if (!selectedGame) return;
    setIsGenerating(true);
    setMessageStep(0);
    setProgress(0);
    // Reset AI confidence when starting new generation
    if (setAiConfidence) {
      setAiConfidence(0);
    }
    
    try {
      // Usar o tempo de processamento gerado aleatoriamente
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Get state ID if available
      const stateId = selectedGame.states && selectedGame.states.length > 0 
        ? selectedGame.states[0].id 
        : undefined;
      
      // Call the prediction API
      const response = await predictionService.generatePrediction(selectedGame.id, stateId);
      
      
      if (response.success && response.prediction) {
        setGeneratedPrediction(response.prediction);
        
        // Parse the numbers from the response
        const regularNumbers = predictionService.parseNumbersString(response.prediction.numbers);
        
        // Set the AI confidence value
        if (setAiConfidence && response.prediction.confidence) {
          setAiConfidence(response.prediction.confidence);
        }
        
        // Check if there's a special number in the response
        if (response.prediction.special_number) {
          // If special number exists in response, use it
          const specialNum = parseInt(response.prediction.special_number, 10);
          setSpecialNumber(specialNum);
          
          // Sort the regular numbers (without removing the special number)
          const sortedRegularNumbers = [...regularNumbers].sort((a, b) => a - b);
          
          // Final array with sorted regular numbers and special number at the end
          const finalNumbers = [...sortedRegularNumbers, specialNum];
          
          setNumbers(finalNumbers);
        } else {
          // Sort the numbers in ascending order
          const sortedNumbers = [...regularNumbers].sort((a, b) => a - b);
          setNumbers(sortedNumbers);
          setSpecialNumber(null);
        }
        
        predictionService.savePrediction(response.prediction);
      } else {
        if (setAiConfidence) {
          setAiConfidence(0);
        }
        generateRandomNumbers();
      }
    } catch (error) {
      console.error('Error generating prediction:', error);
      // On error, reset confidence
      if (setAiConfidence) {
        setAiConfidence(0);
      }
      generateRandomNumbers();
    } finally {
      setIsGenerating(false);
      setHasGenerated(true);
      setLoadingMessage('');
    }
  };

  // Fallback random number generation
  const generateRandomNumbers = () => {
    if (!selectedGame) return;

    let mainNumbersMax = 69;
    let numberCount = 5;
    
    if (selectedGame.results && selectedGame.results.length > 0 && selectedGame.results[0].numbers) {
      const sampleNumbers = parseNumbers(selectedGame.results[0].numbers);
      if (sampleNumbers.length > 0) {
        const maxSampleNumber = Math.max(...sampleNumbers);
        mainNumbersMax = Math.max(maxSampleNumber + 5, 45);
        numberCount = sampleNumbers.length;
      }
    } else {
      if (selectedGame.name.includes('Powerball')) {
        mainNumbersMax = 69;
        numberCount = 5;
      } else if (selectedGame.name.includes('Mega')) {
        mainNumbersMax = 70;
        numberCount = 5;
      } else if (selectedGame.name.includes('Cash4Life')) {
        mainNumbersMax = 60;
        numberCount = 5;
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
    
    // We should not assume which games have special numbers - follow the API response pattern
    // If we're in the random generator, we should check if the most recent API call had a special number
    
    // Default to no special number
    setSpecialNumber(null);
  };

  // Função para salvar predição no backend
  const handleSavePrediction = async () => {
    
    // Verify game is selected
    if (!selectedGame) {
      showToast('No game selected!', { type: 'error' });
      return;
    }

    // Verify game ID is valid
    if (!selectedGame.id) {
      showToast('Invalid game ID!', { type: 'error' });
      return;
    }
    
    setSaving(true);
    
    try {
      // Just directly send the data from the generated prediction
      await predictionService.savePredictionToBackend({
        game_id: selectedGame.id,
        state_id: selectedGame.states?.[0]?.id,
        predicted_numbers: generatedPrediction ? generatedPrediction.numbers : numbers.join(', '),
        predicted_special_number: generatedPrediction ? generatedPrediction.special_number : (specialNumber !== null ? String(specialNumber) : null),
        confidence_score: generatedPrediction ? generatedPrediction.confidence : (aiConfidence || 50.0),
        analysis_summary: generatedPrediction ? (generatedPrediction.summary || `Smart Pick for ${selectedGame.name}`) : `Smart Pick for ${selectedGame.name}`,
        hot_numbers: generatedPrediction?.analysis_data?.hot_numbers || '',
        cold_numbers: generatedPrediction?.analysis_data?.cold_numbers || '',
        overdue_numbers: generatedPrediction?.analysis_data?.overdue_numbers || ''
      });
      
      showToast('Prediction saved successfully!', { type: 'success' });
    } catch (error) {
      console.error("Error saving prediction:", error);
      
      // Display the exact error message from the backend if available
      if (error instanceof Error) {
        showToast(error.message, { type: 'error' });
      } else {
        showToast('Failed to save prediction!', { type: 'error' });
      }
    } finally {
      setSaving(false);
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

  // Exibir mensagem de carregamento durante a geração com efeitos visuais atraentes
  if (isGenerating && loadingMessage) {
    return (
      <Card className="flex flex-col items-center justify-center min-h-[260px] p-8 text-center relative overflow-hidden bg-gradient-to-br from-[#1A1D23] to-[#151821] border border-[#2A2F38]">
        {/* Efeito de fundo pulsante */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-accent/0 to-accent/5 animate-pulse-slow"></div>
        
        {/* Círculos animados ao redor */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32">
          <div className="absolute inset-0 border-2 border-accent/10 rounded-full animate-ping-slow opacity-30"></div>
          <div className="absolute inset-0 border-2 border-accent/20 rounded-full animate-ping opacity-20" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>
          <div className="absolute inset-0 border border-accent/30 rounded-full animate-ping opacity-10" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
        </div>
        
        {/* Ícone do cérebro com brilho pulsante */}
        <div className="relative z-10 mb-16">
          <div className="absolute -inset-1 bg-accent/20 rounded-full blur-lg animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-accent to-accent/70 p-4 rounded-full shadow-lg shadow-accent/20">
            <Brain size={40} className="text-white" />
          </div>
        </div>
        
        {/* Container para mensagens com transição */}
        <div className="relative z-10 h-20 w-full">
          {loadingMessages.map((message, index) => (
            <FadeMessage 
              key={index} 
              message={message} 
              isActive={messageStep === index} 
            />
          ))}
        </div>
        
        {/* Indicador de progresso com animação suave */}
        <div className="w-64 h-2 bg-[#2A2F38] rounded-full relative mb-3 z-10 mt-6">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent/80 to-accent rounded-full"
            style={{
              width: `${progress}%`,
              transition: 'width 0.3s ease-out'
            }}
          ></div>
        </div>
        
        {/* Tempo estimado */}
        <span className="text-text-muted text-xs mb-3 z-10">
          {progress < 100 
            ? `AI analysis in progress... ${Math.round(progress)}%` 
            : 'Finalizing results...'}
        </span>
        
        {/* Pequenos elementos decorativos */}
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-accent rounded-full animate-ping opacity-70"></div>
        <div className="absolute top-4 left-4 w-1.5 h-1.5 bg-accent rounded-full animate-ping opacity-50" style={{animationDuration: '2.5s'}}></div>
        <div className="absolute bottom-5 left-6 w-1 h-1 bg-accent rounded-full animate-ping opacity-30" style={{animationDuration: '3s'}}></div>
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
            {hasGenerated && numbers.length > 0 ? (
              <>
                {/* Game Header with Logo and Info */}
                <div className={`${isMobile ? 'flex flex-col sm:flex-row items-center gap-3 mb-4' : 'flex items-center justify-center gap-6 mb-8'}`}>
                  {/* Circular Game Logo */}
                  <div className="relative">
                    <div className="absolute inset-0 scale-110 bg-accent/20 rounded-full blur-lg"></div>
                    <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-32 h-32'} rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden`}>
                      {selectedGame?.logo_url ? (
                        <img
                          src={selectedGame.logo_url}
                          alt={selectedGame.name}
                          className="w-full h-full object-scale-down p-2"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-accent font-bold text-2xl">{selectedGame?.name.substring(0, 2)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Game Info */}
                  <div className={isMobile ? 'text-center' : 'text-left'}>
                    <h3 className={isMobile ? 'text-text font-bold text-base' : 'text-text font-bold text-2xl'}>
                      {selectedGame?.name}
                    </h3>
                    {/* Always show jackpot section, with fallback text when not available */}
                    <div className={`flex ${isMobile ? 'justify-center' : ''} items-center gap-2 mt-1`}>
                      <div className={`px-2 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        selectedGame?.results && selectedGame.results[0]?.next_jackpot 
                          ? 'bg-accent/10 text-accent' 
                          : 'bg-gray-700/30 text-gray-400'
                      }`}>
                        {selectedGame?.results && selectedGame.results[0]?.next_jackpot 
                          ? selectedGame.results[0].next_jackpot 
                          : 'Not Estimated'}
                      </div>
                      <span className="text-text-muted text-xs">Next Jackpot</span>
                    </div>
                  </div>
                </div>
                
                <h3 className={isMobile ? 'text-text font-bold text-lg mb-4' : 'text-text font-bold text-xl mb-6'}>Your Smart Numbers</h3>
                
                <div className={isMobile ? 'flex justify-center gap-2 flex-wrap mb-2' : 'flex justify-center gap-4 flex-wrap'}>
                  {/* First display regular numbers */}
                  {numbers
                    .filter(num => specialNumber === null || num !== specialNumber)
                    .map((num, i) => (
                      <SmartPickLotteryBall
                        key={i}
                        number={num}
                        isSpecial={false}
                        size={isMobile ? 'lg' : 'xl'}
                      />
                    ))}
                  
                  {/* Then display the special number last, if it exists */}
                  {specialNumber !== null && (
                    <SmartPickLotteryBall
                      key="special"
                      number={specialNumber}
                      isSpecial={true}
                      size={isMobile ? 'lg' : 'xl'}
                    />
                  )}
                </div>
                <p className={isMobile ? 'text-text-muted text-xs mt-2' : 'text-text-muted text-lg mt-6'}>
                  Generated for {selectedGame?.name} on {new Date().toLocaleDateString()}
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
                  onClick={async () => {
                    await navigator.clipboard.writeText(numbers.join(', '));
                    showToast('Numbers copied!', { type: 'success' });
                  }}
                  disabled={!hasGenerated}
                >
                  <Copy size={isMobile ? 18 : 20} className={isMobile ? 'mb-0.5' : ''} />
                  <span>Copy</span>
                </Button>
                <Button
                  variant="outline"
                  className={isMobile ? 'flex flex-col items-center justify-center py-3 text-xs border-accent/30 hover:bg-accent/10 text-accent' : 'flex items-center gap-2 py-4 border-accent/30 hover:bg-accent/10 text-accent'}
                  disabled={!hasGenerated || saving}
                  onClick={handleSavePrediction}
                >
                  {saving ? (
                    <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={isMobile ? 18 : 20} />Saving...</span>
                  ) : (
                    <><Save size={isMobile ? 18 : 20} className={isMobile ? 'mb-0.5' : ''} /><span>Save</span></>
                  )}
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