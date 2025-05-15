import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import LotteryNumberBall from '../components/LotteryNumberBall';
import DatePicker from '../components/DatePicker';
import { Search, Calendar, MapPin, ChevronDown, Award, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import useGames from '../hooks/useGames';
import useStates from '../hooks/useStates';
import { formatDate } from '../utils/format';
import { useNavigate } from 'react-router-dom';

const ResultsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 5;
  const { isMobile } = useWindowSize();
  const { games, loading } = useGames();
  const { states, loading: statesLoading } = useStates();
  const navigate = useNavigate();
  
  // Função para converter string de números em array de números
  const parseNumbers = (numbersString: string): number[] => {
    if (!numbersString) return [];
    return numbersString.split(/[,+]/).map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num));
  };
  
  // Mapeamento de IDs de estado para códigos e nomes de estado
  const stateMap = useMemo(() => {
    const codeMap = new Map<number, string>();
    const nameMap = new Map<number, string>();
    states.forEach(state => {
      codeMap.set(state.id, state.code.toUpperCase());
      nameMap.set(state.id, state.name);
    });
    return { codeMap, nameMap };
  }, [states]);
  
  // Processar resultados de jogos
  const gameResults = useMemo(() => {
    if (!games || games.length === 0) return [];
    
    const allResults: {
      id: number;
      gameId: number;
      lottery: string;
      date: string;
      numbers: number[];
      userParticipated: boolean;
      stateId: number;
      stateCode: string;
      stateName: string;
    }[] = [];
    
    games.forEach(game => {
      game.results.forEach((result, index) => {
        if (result.numbers) {
          // Pegar o primeiro estado associado ao jogo, ou o estado do resultado se disponível
          const stateId = result.state_id || (game.states && game.states.length > 0 ? game.states[0].id : 0);
          const stateCode = stateMap.codeMap.get(stateId) || '';
          const stateName = stateMap.nameMap.get(stateId) || '';
          
          allResults.push({
            id: result.id || index,
            gameId: game.id,
            lottery: game.name,
            date: result.draw_date,
            numbers: parseNumbers(result.numbers),
            userParticipated: Math.random() > 0.7,
            stateId,
            stateCode,
            stateName
          });
        }
      });
    });
    
    // Ordenar por data decrescente (mais recente primeiro)
    return allResults.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [games, stateMap]);
  
  // Filter results based on search query, state, and date
  const filteredResults = useMemo(() => {
    return gameResults.filter(
      (result) => {
        const matchesSearch = 
          result.lottery.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatDate(result.date).toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesState = !selectedState || result.stateCode === selectedState;
        
        const matchesDate = !dateFilter || 
          (result.date && new Date(result.date).toISOString().split('T')[0] === dateFilter);
        
        return matchesSearch && matchesState && matchesDate;
      }
    );
  }, [gameResults, searchQuery, selectedState, dateFilter]);
  
  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    return filteredResults.slice(startIndex, startIndex + resultsPerPage);
  }, [filteredResults, currentPage, resultsPerPage]);
  
  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Conteúdo principal para ser usado no MainLayout
  return (
    <div className="min-h-screen bg-primary">
      <main className={isMobile ? 'px-3 py-4' : 'pt-10 pb-16 px-8'}>
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-text font-semibold text-3xl">Latest Results</h2>
          </div>
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 md:flex-initial md:w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={20} className="text-text-muted" />
              </div>
              <input
                type="text"
                className="w-full pl-12 pr-4 py-4 bg-[#1A1D23] border border-[#2A2F38] rounded-lg text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent text-lg shadow-xl transition-all duration-300 hover:border-accent/30 focus:border-accent/60"
                placeholder="Search by lottery or date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative w-full md:w-56">
              <select
                className="w-full appearance-none px-4 pr-10 py-4 bg-[#1A1D23] border border-[#2A2F38] rounded-lg text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent text-lg shadow-xl transition-all duration-300 hover:border-accent/30 focus:border-accent/60"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={statesLoading}
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state.id} value={state.code.toUpperCase()}>
                    {state.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown size={20} className="text-text-muted" />
              </div>
            </div>
            
            <DatePicker
              value={dateFilter}
              onChange={setDateFilter}
              className="w-full md:w-56"
              placeholder="Filter by date"
            />
          </div>
          
          {/* Filter indicators */}
          {(searchQuery || selectedState || dateFilter) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchQuery && (
                <div className="bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span>Search: {searchQuery}</span>
                  <button onClick={() => setSearchQuery('')} className="hover:bg-accent/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              {selectedState && (
                <div className="bg-blue-500/10 text-blue-400 text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span>State: {states.find(s => s.code.toUpperCase() === selectedState)?.name || selectedState}</span>
                  <button onClick={() => setSelectedState('')} className="hover:bg-blue-500/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              {dateFilter && (
                <div className="bg-purple-500/10 text-purple-400 text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span>Date: {new Date(dateFilter).toLocaleDateString()}</span>
                  <button onClick={() => setDateFilter('')} className="hover:bg-purple-500/20 p-1 rounded-full">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              
              {/* Clear All Filters */}
              {(searchQuery || selectedState || dateFilter) && (
                <button 
                  className="ml-auto text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-gray-700/30 transition-colors flex items-center gap-1"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedState('');
                    setDateFilter('');
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
          
          {/* Results count */}
          <div className="mb-6">
            <p className="text-text-muted">
              Found <span className="text-accent font-semibold">{filteredResults.length}</span> results
              {filteredResults.length > 0 && (
                <span> • Showing <span className="text-accent font-semibold">{(currentPage - 1) * resultsPerPage + 1}</span>-<span className="text-accent font-semibold">{Math.min(currentPage * resultsPerPage, filteredResults.length)}</span></span>
              )}
            </p>
          </div>
          
          {loading || statesLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
          ) : (
            <>
              {/* Results List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedResults.map((result, index) => (
                  <div 
                    key={`${result.gameId}-${result.id}`} 
                    className="group relative rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-[1.02] hover:shadow-2xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Glowing background effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary to-accent/30 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-300"></div>
                    
                    <Card 
                      variant="dark" 
                      className="p-6 bg-gradient-to-br from-[#1A1D23] to-[#151821] border border-[#2A2F38] group-hover:border-accent/50 transition-all duration-300 relative z-10 h-full"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl filter opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="relative">
                          <h3 className="font-semibold text-white text-xl tracking-wide">{result.lottery}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <p className="text-text-muted flex items-center gap-1">
                              <Calendar size={14} className="text-accent/80" />
                              {formatDate(result.date)}
                            </p>
                            {result.stateName && (
                              <p className="text-text-muted flex items-center gap-1">
                                <MapPin size={14} className="text-accent" />
                                <span className="text-accent/80">{result.stateName}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {result.userParticipated && (
                          <div className="bg-gradient-to-r from-accent/90 to-accent/70 text-white text-sm font-medium px-3 py-1.5 rounded-full shadow-lg shadow-accent/20 flex items-center gap-1 animate-pulse-slow">
                            <Award size={14} />
                            You Played
                          </div>
                        )}
                      </div>
                      
                      <div className="relative flex flex-wrap justify-center gap-3 my-8 py-2">
                        {/* Sparkling effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-700"></div>
                        
                        {result.numbers.map((num, i) => (
                          <div 
                            key={i} 
                            className="transform transition-all duration-500 hover:scale-110 hover:-translate-y-1 z-10"
                            style={{ transitionDelay: `${i * 50}ms` }}
                          >
                            <LotteryNumberBall 
                              number={num} 
                              isSpecial={i === result.numbers.length - 1 && result.numbers.length > 1}
                              size="lg"
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button 
                          className="text-accent text-base font-medium hover:underline flex items-center gap-2 group-hover:scale-105 transition-transform duration-300"
                          onClick={() => navigate(`/lottery/games/${result.gameId}`)}
                        >
                          <TrendingUp size={16} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          Check Your Ticket
                        </button>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-10">
                  <div className="flex items-center gap-2 bg-[#1A1D23] px-4 py-2 rounded-lg border border-[#2A2F38]">
                    <button 
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        currentPage === 1 
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-text hover:bg-accent/20 hover:text-accent'
                      }`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      
                      // Show first page, last page, current page, and pages around current page
                      if (
                        pageNumber === 1 || 
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => goToPage(pageNumber)}
                            className={`min-w-[32px] h-8 flex items-center justify-center px-2 rounded-md text-sm font-medium transition-all duration-300 ${
                              currentPage === pageNumber
                                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                : 'text-text-muted hover:bg-accent/10 hover:text-accent'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        (pageNumber === 2 && currentPage > 3) || 
                        (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        // Show ellipsis
                        return (
                          <span key={pageNumber} className="text-text-muted px-1">
                            ...
                          </span>
                        );
                      }
                      
                      return null;
                    })}
                    
                    <button 
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        currentPage === totalPages 
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-text hover:bg-accent/20 hover:text-accent'
                      }`}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
              
              {filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-[#1A1D23]/50 to-[#151821]/50 rounded-lg border border-[#2A2F38] shadow-xl">
                  <Search size={60} className="text-accent/30 mb-4" />
                  <p className="text-text/70 text-xl text-center">
                    {searchQuery || selectedState || dateFilter
                      ? `No results found ${searchQuery ? `for "${searchQuery}"` : ''}${selectedState ? ` in ${states.find(s => s.code.toUpperCase() === selectedState)?.name || selectedState}` : ''}${dateFilter ? ` on ${new Date(dateFilter).toLocaleDateString()}` : ''}`
                      : 'No lottery results available'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsScreen;