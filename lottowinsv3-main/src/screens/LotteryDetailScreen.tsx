import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import LotteryNumberBall from '../components/LotteryNumberBall';
import { BarChart3, Loader2, Clock, MapPin, TrendingUp, Flame, Snowflake, ChevronLeft, ChevronRight, Brain, AlertCircle } from 'lucide-react';
import gameService, { Game, GameResult } from '../services/gameService';
import predictionService, { Prediction } from '../services/predictionService';
import { formatDate, formatTime } from '../utils/format';
import MainLayout from '../layouts/MainLayout';
import SmartPickLotteryBall from './SmartPickScreen/SmartPickLotteryBall';

// Extend the Prediction interface to include predicted_special_number
declare module '../services/predictionService' {
  interface Prediction {
    predicted_special_number?: string | null;
  }
}

/**
 * Returns the appropriate CSS class for AI confidence based on thresholds
 * @param confidence The confidence value as a percentage
 * @returns CSS class name for the appropriate confidence level
 */
const getConfidenceColorClass = (confidence: number): string => {
  if (confidence > 80) return 'text-green-500'; // High confidence
  if (confidence >= 60) return 'text-yellow-500'; // Medium confidence
  return 'text-red-500'; // Low confidence
};

const TabButton: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    className={`py-2 px-4 text-sm font-medium transition-colors ${
      active 
        ? 'text-accent border-b-2 border-accent' 
        : 'text-text border-b-2 border-transparent'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

// Custom styled lottery ball component for games with many numbers
const StyledLotteryBall: React.FC<{ 
  number: number; 
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isHighlighted?: boolean;
}> = ({ number, size = 'md', isHighlighted = false }) => {
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold
        ${isHighlighted 
          ? 'bg-gradient-to-br from-accent to-accent-dark text-white shadow-[0_0_15px_rgba(228,0,43,0.3)]' 
          : 'bg-gradient-to-br from-gray-100 to-white text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.15)]'}
        transition-all duration-300 hover:shadow-[0_0_15px_rgba(90,120,230,0.4)] hover:scale-105`}
    >
      {number}
    </div>
  );
};

const ResultCard: React.FC<{ 
  result: GameResult; 
  stateName?: string; 
  setActiveTab: React.Dispatch<React.SetStateAction<string>> 
}> = ({ result, stateName, setActiveTab }) => {
  // Get numbers array 
  const numbersArray = result.numbers.split(/[,+]/).map(num => parseInt(num.trim(), 10));
  const hasLargeNumberSet = numbersArray.length > 6;
  const hasVeryLargeNumberSet = numbersArray.length > 10;
  
  // Verificar se há um número especial
  const specialNumber = result.special_number ? parseInt(result.special_number.toString(), 10) : null;
  
  // Preparar o array de exibição para incluir o número especial no final se necessário
  let displayNumbers = [...numbersArray];
  if (specialNumber !== null && !hasLargeNumberSet) {
    displayNumbers = [...numbersArray, specialNumber];
  }
  
  // Estado do resultado - usar o stateName passado como prop ou verificar state_code
  const displayStateName = stateName || (result.state_code ? result.state_code.toUpperCase() : undefined);
  
  // Get the appropriate layout style based on number count
  const getLayoutStyle = () => {
    if (hasVeryLargeNumberSet) {
      return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mx-auto max-w-[90%]';
    } else if (hasLargeNumberSet) {
      return 'flex flex-wrap gap-2 justify-center mx-auto';
    } else {
      return 'flex flex-wrap gap-3 justify-center';
    }
  };
  
  return (
    <Card 
      variant="dark" 
      className="mb-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_15px_rgba(90,120,230,0.2)] group relative glow-card"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h4 className="font-medium text-white text-lg">{formatDate(result.draw_date)}</h4>
            <div className="flex items-center mt-1 text-gray-400 text-sm">
              <Clock size={14} className="mr-1" />
              <span>{formatTime(result.draw_time)}</span>
              
              {displayStateName && (
                <>
                  <span className="mx-2">•</span>
                  <MapPin size={14} className="mr-1" />
                  <span>{displayStateName}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-accent/20 text-accent text-xs font-medium px-3 py-1 rounded-full border border-accent/30">
            Official Result
          </div>
        </div>
        
        {hasLargeNumberSet && (
          <div className="text-center text-sm text-blue-400 font-medium mb-4">
            <span className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              {numbersArray.length} numbers drawn
            </span>
          </div>
        )}
        
        <div className={`${getLayoutStyle()} my-6 relative`}>
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent rounded-full blur-xl -z-10 animate-pulse"></div>
          
          {/* Use different components based on number count */}
          {hasLargeNumberSet ? (
            // Use styled balls for large number sets
            numbersArray.map((num, i) => (
              <div 
                key={i} 
                className="flex justify-center"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <StyledLotteryBall 
                  number={num}
                  size={hasVeryLargeNumberSet ? "sm" : "md"}
                  isHighlighted={specialNumber !== null && num === specialNumber}
                />
              </div>
            ))
          ) : (
            // Use standard LotteryNumberBall for regular games
            displayNumbers
              .slice(0, specialNumber !== null ? displayNumbers.length - 1 : displayNumbers.length)
              .map((num, i) => (
                <div key={i} className="flex justify-center transform transition-transform duration-300 hover:scale-110 hover:-translate-y-1">
                  <LotteryNumberBall 
                    number={num} 
                    isSpecial={false}
                    size="lg"
                  />
                </div>
              ))
          )}
          
          {/* Exibir o número especial por último, se existir e não for um jogo com muitos números */}
          {specialNumber !== null && !hasLargeNumberSet && (
            <div className="flex justify-center transform transition-transform duration-300 hover:scale-110 hover:-translate-y-1">
              <LotteryNumberBall 
                number={specialNumber} 
                isSpecial={true}
                size="lg"
              />
            </div>
          )}
        </div>
        
        {hasLargeNumberSet && (
          <div className="mt-4 text-center">
            <button 
              className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors px-4 py-2 rounded-full border border-blue-500/20 hover:bg-blue-500/10"
              onClick={() => setActiveTab('frequency')}
            >
              Check Frequency Analysis
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

// Frequency Analysis Component
const FrequencyAnalysis: React.FC<{
  results: GameResult[];
  maxNumber?: number;
}> = ({ results, maxNumber = 50 }) => {
  // Calculate frequency of each number across all results
  const frequencyData = useMemo(() => {
    const frequency: Record<number, number> = {};
    let maxFrequency = 0;
    const totalDraws = results.length;
    
    // Initialize all numbers from 1 to maxNumber with 0 frequency
    for (let i = 1; i <= maxNumber; i++) {
      frequency[i] = 0;
    }
    
    // Count occurrences of each number
    results.forEach(result => {
      const numbers = result.numbers.split(/[,+]/).map(num => parseInt(num.trim(), 10));
      numbers.forEach(num => {
        if (num > 0 && num <= maxNumber) {
          frequency[num] = (frequency[num] || 0) + 1;
          maxFrequency = Math.max(maxFrequency, frequency[num]);
        }
      });
    });
    
    // Convert to array for sorting
    const frequencyArray = Object.entries(frequency)
      .map(([num, count]) => ({
        number: parseInt(num),
        count,
        percentage: totalDraws > 0 ? Math.round((count / totalDraws) * 100) : 0
      }))
      .filter(item => item.count > 0); // Only include numbers that appeared at least once
    
    // Sort by frequency (descending)
    frequencyArray.sort((a, b) => b.count - a.count);
    
    return {
      frequency: frequencyArray,
      maxFrequency,
      totalDraws
    };
  }, [results, maxNumber]);
  
  // Get hot and cold numbers
  const hotNumbers = useMemo(() => 
    frequencyData.frequency.slice(0, 5), 
    [frequencyData]
  );
  
  const coldNumbers = useMemo(() => 
    [...frequencyData.frequency].sort((a, b) => a.count - b.count).slice(0, 5), 
    [frequencyData]
  );
  
  return (
    <div className="animate-fadeIn">
      <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20">
        <div className="flex items-center mb-2">
          <TrendingUp size={18} className="text-blue-400 mr-2" />
          <h3 className="font-semibold text-white text-xl">Frequency Analysis</h3>
        </div>
        <p className="text-gray-400 text-sm">
          Based on {frequencyData.totalDraws} previous draws. Use this data to identify patterns and trends.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Hot Numbers Card */}
        <Card variant="dark" className="p-4 border border-red-500/20 hover:border-red-500/40 transition-colors">
          <div className="flex items-center mb-3">
            <Flame size={18} className="text-red-400 mr-2" />
            <h4 className="font-medium text-white">Hot Numbers</h4>
          </div>
          
          <div className="space-y-3">
            {hotNumbers.map(item => (
              <div key={item.number} className="flex items-center justify-between">
                <div className="flex items-center">
                  <StyledLotteryBall 
                    number={item.number} 
                    size="sm" 
                    isHighlighted={item === hotNumbers[0]}
                  />
                  <span className="ml-3 text-gray-300">Drawn {item.count} times</span>
                </div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(item.count / frequencyData.maxFrequency) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Cold Numbers Card */}
        <Card variant="dark" className="p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center mb-3">
            <Snowflake size={18} className="text-blue-400 mr-2" />
            <h4 className="font-medium text-white">Cold Numbers</h4>
          </div>
          
          <div className="space-y-3">
            {coldNumbers.map(item => (
              <div key={item.number} className="flex items-center justify-between">
                <div className="flex items-center">
                  <StyledLotteryBall 
                    number={item.number} 
                    size="sm" 
                  />
                  <span className="ml-3 text-gray-300">Drawn {item.count} times</span>
                </div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" 
                    style={{ width: `${(item.count / frequencyData.maxFrequency) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* All Numbers Frequency */}
      <Card variant="dark" className="p-5 border border-gray-800 mb-6">
        <h4 className="font-medium text-white mb-4 text-center">All Numbers Frequency</h4>
        
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {frequencyData.frequency.map(item => (
            <div key={item.number} className="flex flex-col items-center p-1 hover:bg-blue-900/10 rounded transition-colors">
              <StyledLotteryBall 
                number={item.number} 
                size="xs" 
                isHighlighted={item.count === frequencyData.maxFrequency}
              />
              <span className="text-xs text-gray-400 mt-1">{item.count}x</span>
            </div>
          ))}
        </div>
      </Card>
      
      <div className="text-center text-sm text-gray-500">
        <p>Numbers appearing more frequently may be considered "hot" but past results don't guarantee future outcomes.</p>
      </div>
    </div>
  );
};

// Função para formatar a data corretamente
const formatPredictionDate = (dateString: string | number) => {
  try {
    
    // Se for uma string de data
    if (typeof dateString === 'string') {
      // Try to parse the date string
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    // Se for um timestamp numérico
    if (typeof dateString === 'number') {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    // If string can be converted to a number (timestamp)
    if (typeof dateString === 'string' && !isNaN(Number(dateString))) {
      const timestamp = Number(dateString);
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    return 'Date unavailable';
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return 'Date unavailable';
  }
};

// Smart Picks Component
const SmartPicksTab: React.FC<{
  gameId: number;
}> = ({ gameId }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(3);
  
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const response = await predictionService.getGamePredictions(gameId, page, pageSize);
        
        if (response.success) {
          // Map API response to include created_at field
          const mappedPredictions = response.predictions.map(prediction => {

            return {
              ...prediction,
              // Make sure created_at is properly mapped from the API response
              created_at: prediction.created_at || new Date().toISOString()
            };
          });
          
          setPredictions(mappedPredictions);
          setTotalPages(Math.ceil(response.total_count / response.page_size));
        } else {
          setError('Failed to load predictions');
        }
      } catch (err) {
        setError('An error occurred while fetching predictions');
        console.error('Error fetching predictions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPredictions();
  }, [gameId, page, pageSize]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 size={40} className="animate-spin text-accent" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#1A1D23] rounded-xl border border-[#2A2F38]">
        <AlertCircle size={40} className="text-red-400 mb-4" />
        <p className="text-gray-300 text-center font-medium">{error}</p>
      </div>
    );
  }
  
  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#1A1D23] rounded-xl border border-[#2A2F38]">
        <Brain size={56} className="text-gray-600 mb-4" />
        <p className="text-gray-300 text-xl font-medium text-center">No smart picks available</p>
        <p className="text-gray-500 text-center mt-2 max-w-md">
          Generate smart picks for this game to see predictions here.
        </p>
      </div>
    );
  }
  
  return (
    <div className="animate-fadeIn">
      <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20">
        <div className="flex items-center mb-2">
          <Brain size={18} className="text-blue-400 mr-2" />
          <h3 className="font-semibold text-white text-xl">Smart Pick Analysis</h3>
        </div>
        <p className="text-gray-400 text-sm">
          View AI-generated predictions for this lottery game with detailed analysis.
        </p>
      </div>
      
      <div className="space-y-4">
        {predictions.map((prediction) => {
          const mainNumbers = predictionService.parseNumbersString(prediction.numbers);
          // Handle both predicted_special_number and special_number fields
          const specialNumberValue = prediction.predicted_special_number || prediction.special_number;
          const specialNumber = specialNumberValue ? parseInt(String(specialNumberValue), 10) : null;
          
          // Adicionar o número especial no final do array se ele não for null
          let displayNumbers = [...mainNumbers];
          if (specialNumber !== null) {
            // Adicionar o número especial no final se ele não estiver presente
            // ou duplicá-lo se já estiver presente nos números regulares
            displayNumbers = [...mainNumbers, specialNumber];
          }
          
          // Determinar a data de geração
          let generatedDate = 'Unknown date';
          
          // First try to use created_at from API
          if (prediction.created_at) {
            generatedDate = formatPredictionDate(prediction.created_at);
          } 
          // Fall back to using ID as timestamp if created_at is not available
          else if (prediction.id) {
            const timestamp = typeof prediction.id === 'number' ? prediction.id : parseInt(String(prediction.id), 10);
            if (!isNaN(timestamp)) {
              generatedDate = formatPredictionDate(timestamp);
            }
          }
          
          const confidence = Math.round(prediction.confidence);
          
          return (
            <Card key={prediction.id} variant="dark" className="overflow-hidden border border-gray-800 hover:border-accent/30 transition-all duration-300">
              {/* Cabeçalho do card */}
              <div className="bg-[#151821] p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center">
                  <div className="mr-3 p-2 bg-accent/10 rounded-full">
                    <Brain size={18} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-lg">{prediction.game_name}</h4>
                    <div className="flex items-center text-gray-400 text-xs">
                      <MapPin size={12} className="mr-1" />
                      <span>{prediction.state_code.toUpperCase()}</span>
                      <span className="mx-2">•</span>
                      <Clock size={12} className="mr-1" />
                      <span>Generated on {generatedDate}</span>
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full border self-start sm:self-auto
                  ${confidence > 80 
                    ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                    : confidence >= 60 
                      ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' 
                      : 'bg-red-500/20 text-red-500 border-red-500/30'
                  }`}>
                  {Math.round(prediction.confidence)}% Confidence
                </div>
              </div>
              
              {/* Corpo do card */}
              <div className="p-4">
                {/* Números da predição */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {/* Primeiro exibir números regulares (exceto o último quando há número especial) */}
                  {displayNumbers
                    .slice(0, specialNumber !== null ? displayNumbers.length - 1 : displayNumbers.length)
                    .map((num, i) => (
                      <SmartPickLotteryBall
                        key={i}
                        number={num}
                        isSpecial={false}
                        size="md"
                      />
                    ))}
                  
                  {/* Então exibir o número especial por último, se existir */}
                  {specialNumber !== null && (
                    <SmartPickLotteryBall
                      key="special"
                      number={specialNumber}
                      isSpecial={true}
                      size="md"
                    />
                  )}
                </div>
                
                {/* Análise de números */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Hot Numbers */}
                  {prediction.analysis_data.hot_numbers && (
                    <div className="p-4 bg-[#1A1D23] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-center mb-3">
                        <Flame size={16} className="text-red-400 mr-2" />
                        <h5 className="font-medium text-white text-sm">Hot Numbers</h5>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {prediction.analysis_data.hot_numbers.split(',').map((num, i) => (
                          <div 
                            key={i} 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#2A1A1A] text-red-400 border border-red-500/30"
                          >
                            {num.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Cold Numbers */}
                  {prediction.analysis_data.cold_numbers && (
                    <div className="p-4 bg-[#1A1D23] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-center mb-3">
                        <Snowflake size={16} className="text-blue-400 mr-2" />
                        <h5 className="font-medium text-white text-sm">Cold Numbers</h5>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {prediction.analysis_data.cold_numbers.split(',').map((num, i) => (
                          <div 
                            key={i} 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#1A2A33] text-blue-400 border border-blue-500/30"
                          >
                            {num.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Overdue Numbers - Only show if available */}
                {prediction.analysis_data.overdue_numbers && (
                  <div className="mt-4 p-4 bg-[#1A1D23] rounded-lg border border-gray-800">
                    <div className="flex items-center justify-center mb-3">
                      <Clock size={16} className="text-purple-400 mr-2" />
                      <h5 className="font-medium text-white text-sm">Overdue Numbers</h5>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prediction.analysis_data.overdue_numbers.split(',').map((num, i) => (
                        <div 
                          key={i} 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#231A2A] text-purple-400 border border-purple-500/30"
                        >
                          {num.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Pagination - Mais compacta e responsiva */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            className={`flex items-center p-2 rounded-lg font-medium border ${
              page === 1 
                ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
            }`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="hidden sm:flex items-center">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              // Show pages around current page
              let pageNum = page;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  className={`w-8 h-8 mx-1 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-accent text-white'
                      : 'bg-[#151821] text-gray-400 hover:bg-[#1A1D23] border border-[#2A2F38]'
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          {/* Mobile pagination indicator */}
          <div className="sm:hidden px-3 py-1.5 bg-[#151821] border border-[#2A2F38] rounded-lg">
            <span className="text-gray-300 text-sm font-medium">
              {page} / {totalPages}
            </span>
          </div>
          
          <button
            className={`flex items-center p-2 rounded-lg font-medium border ${
              page === totalPages 
                ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
            }`}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

const LotteryDetailScreen: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('results');
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Set active tab from URL query parameter if present
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    if (tabParam && ['results', 'frequency', 'smart-picks', 'predictions'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  
  // Calcular o número máximo para a análise de frequência
  const maxNumber = useMemo(() => {
    if (!game || !game.results || game.results.length === 0) return 50;
    
    let max = 0;
    game.results.forEach(result => {
      const numbers = result.numbers.split(/[,+]/).map(num => parseInt(num.trim(), 10));
      const currentMax = Math.max(...numbers);
      max = Math.max(max, currentMax);
    });
    // Add a buffer to ensure we cover all possible numbers
    return Math.max(max + 5, 50);
  }, [game]);
  
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        if (!id) {
          throw new Error('Game ID is required');
        }
        
        const gameData = await gameService.getGameById(parseInt(id, 10));
        
        
        setGame(gameData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game details');
        console.error('Error fetching game details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [id]);
  
  const tabs = [
    { id: 'results', label: 'Results' },
    { id: 'frequency', label: 'Frequency' },
    { id: 'smart-picks', label: 'All Smart Picks' },
  ];
  
  // Example Smart Pick numbers
  const smartPickNumbers = [8, 16, 24, 32, 48, 7];
  
  // Get state name by ID function
  const getStateName = (stateId: number, stateCode?: string): string | undefined => {
    // Se houver um código de estado, tentar usar primeiro
    if (stateCode) {
      // Procurar estado pelo código primeiro (mais confiável)
      const stateByCode = game?.states.find(s => s.code.toLowerCase() === stateCode.toLowerCase());
      if (stateByCode) return stateByCode.name;
    }

    // Caso não encontre pelo código, tentar pelo ID
    if (!game || !game.states) return undefined;
    
    const state = game.states.find(s => s.id === stateId);
    return state?.name;
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={40} className="animate-spin text-accent" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="text-center text-text-muted">
            <p className="text-lg mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      );
    }

    if (!game) {
      return (
        <div className="text-center py-12 text-text-muted">
          <p className="text-lg">Game data not available</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'predictions':
        return (
          <div>
            <Card className="mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-text-dark">Smart Pick for {game?.results?.[0]?.next_draw_date ? formatDate(game.results[0].next_draw_date) : 'Next Draw'}</h3>
                  <p className="text-text-muted text-sm mt-1">Generated today</p>
                </div>
                <div className="bg-accent/10 text-accent text-xs font-medium px-2 py-1 rounded-full">
                  AI Optimized
                </div>
              </div>
              
              <div className="flex justify-center gap-2 my-4">
                {smartPickNumbers.map((num, i) => (
                  <LotteryNumberBall 
                    key={i} 
                    number={num} 
                    isSpecial={i === smartPickNumbers.length - 1 && smartPickNumbers.length > 1 && game?.results?.[0]?.special_number !== null}
                    size="lg"
                  />
                ))}
              </div>
              
              <Button 
                variant="outline"
                fullWidth
                className="mt-2"
                onClick={() => navigate('/smart-pick')}
              >
                Generate New Numbers
              </Button>
            </Card>
            
            <div className="bg-primary border border-[#333333] rounded-lg p-4">
              <div className="flex items-start">
                <BarChart3 size={20} className="text-accent mt-1 mr-3" />
                <div>
                  <h4 className="font-medium text-text">AI Analysis</h4>
                  <p className="text-text/70 text-sm mt-1">
                    Our AI analyzed the past 10 years of {game?.name} draws and optimized these numbers based on frequency patterns and statistical anomalies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'results': {
        // Check if results array exists and has items
        const hasResults = Array.isArray(game.results) && game.results.length > 0;
        
        
        if (!hasResults) {
          return (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg">No results available for this lottery game</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          );
        }
        
        const sortedResults = [...game.results].sort((a, b) => 
          new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime()
        );
        
        // Pagination for results
        const resultsPerPage = 3;
        const resultsTotalPages = Math.ceil(sortedResults.length / resultsPerPage);
        
        // Get current page results
        const currentResults = sortedResults.slice(
          (resultsPage - 1) * resultsPerPage, 
          resultsPage * resultsPerPage
        );
        
        return (
          <div className="animate-fadeIn">
            <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20">
              <h3 className="font-semibold text-white text-xl mb-2">{game.name} Results</h3>
              <p className="text-gray-400 text-sm">
                View the latest {game.name} draw results, including winning numbers and draw dates.
              </p>
            </div>
            
            <div className="space-y-4">
              {currentResults.map((result) => (
                <ResultCard 
                  key={result.id} 
                  result={result}
                  stateName={getStateName(result.state_id, result.state_code)}
                  setActiveTab={setActiveTab}
                />
              ))}
            </div>
            
            {/* Pagination controls - similar to Smart Picks tab */}
            {resultsTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  className={`flex items-center p-2 rounded-lg font-medium border ${
                    resultsPage === 1 
                      ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                      : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
                  }`}
                  onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                  disabled={resultsPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="hidden sm:flex items-center">
                  {Array.from({ length: Math.min(5, resultsTotalPages) }).map((_, i) => {
                    // Show pages around current page
                    let pageNum = resultsPage;
                    if (resultsTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (resultsPage <= 3) {
                      pageNum = i + 1;
                    } else if (resultsPage >= resultsTotalPages - 2) {
                      pageNum = resultsTotalPages - 4 + i;
                    } else {
                      pageNum = resultsPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={i}
                        className={`w-8 h-8 mx-1 rounded-lg text-sm font-medium transition-colors ${
                          resultsPage === pageNum
                            ? 'bg-accent text-white'
                            : 'bg-[#151821] text-gray-400 hover:bg-[#1A1D23] border border-[#2A2F38]'
                        }`}
                        onClick={() => setResultsPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                {/* Mobile pagination indicator */}
                <div className="sm:hidden px-3 py-1.5 bg-[#151821] border border-[#2A2F38] rounded-lg">
                  <span className="text-gray-300 text-sm font-medium">
                    {resultsPage} / {resultsTotalPages}
                  </span>
                </div>
                
                <button
                  className={`flex items-center p-2 rounded-lg font-medium border ${
                    resultsPage === resultsTotalPages 
                      ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                      : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
                  }`}
                  onClick={() => setResultsPage((p) => Math.min(resultsTotalPages, p + 1))}
                  disabled={resultsPage === resultsTotalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        );
      }
        
      case 'frequency': {
        // Check if results array exists and has items
        const hasResults = Array.isArray(game.results) && game.results.length > 0;
        
        if (!hasResults) {
          return (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg">No historical data available for frequency analysis</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          );
        }
        
        return <FrequencyAnalysis results={game.results} maxNumber={maxNumber} />;
      }
      
      case 'smart-picks':
        return <SmartPicksTab gameId={game.id} />;
        
      default:
        return (
          <div className="flex justify-center items-center py-12">
            <p className="text-text text-center">
              This section is under development.<br />
              Check back soon for updates!
            </p>
          </div>
        );
    }
  };
  
  // Function to render main content that works for both mobile and desktop
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={40} className="animate-spin text-accent" />
        </div>
      );
    }

    return (
      <div className={typeof window !== 'undefined' && window.innerWidth <= 768 ? 'max-w-4xl mx-auto pb-24' : 'max-w-4xl mx-auto'}>
        {/* Tabs Navigation */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex border-b border-[#333333] min-w-max">
            {tabs.map((tab) => (
              <TabButton 
                key={tab.id}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        {renderTabContent()}
      </div>
    );
  };

  return (
    <MainLayout title={game?.name || 'Lottery Detail'}>
      {renderMainContent()}
    </MainLayout>
  );
};

export default LotteryDetailScreen;