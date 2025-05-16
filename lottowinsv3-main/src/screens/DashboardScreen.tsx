import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import LotteryNumberBall from '../components/LotteryNumberBall';
import USMap from '../components/USMap';
import GamesWithResults from '../components/GamesWithResults';
import { Sparkles, Search, Bell, Trophy, DollarSign, Users, Percent, BarChart, Calendar, ChevronRight } from 'lucide-react';
import { useLotteryData } from '../hooks/useLotteryData';
import { formatCurrency, formatDate } from '../utils/format'; 
import { useWindowSize } from '../hooks/useWindowSize';
import useGames from '../hooks/useGames';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { Game } from '../services/gameService';

// Helper function to parse numbers string into array
const parseNumbers = (numbersString: string): number[] => {
  if (!numbersString) return [];
  return numbersString.split(/[,+]/).map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num));
};

// Helper function to get special number from result
const getSpecialNumber = (result: GameResult): number | null => {
  if (!result || !result.special_number) return null;
  const specialNum = parseInt(result.special_number.toString().trim(), 10);
  return !isNaN(specialNum) ? specialNum : null;
};

// Função helper para verificar se um jogo tem muitos números
const hasLargeNumberSet = (game: Game): boolean => {
  if (!game.results || !game.results[0] || !game.results[0].numbers) return false;
  const numbersCount = parseNumbers(game.results[0].numbers).length;
  return numbersCount > 6;
};

const hasVeryLargeNumberSet = (game: Game): boolean => {
  if (!game.results || !game.results[0] || !game.results[0].numbers) return false;
  const numbersCount = parseNumbers(game.results[0].numbers).length;
  return numbersCount > 10;
};

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { upcomingDraws } = useLotteryData();
  const { games, loading: gamesLoading, error: gamesError } = useGames();
  const { isMobile } = useWindowSize();
  const nextDraw = upcomingDraws[0];
  const luckyNumbers = [8, 12, 23, 45, 56, 7];
  const statistics = [
    { label: 'Total Jackpot', value: '$158M', icon: <DollarSign className="text-green-500" size={24} /> },
    { label: 'Active Players', value: '2.3M', icon: <Users className="text-blue-500" size={24} /> },
    { label: 'Win Rate', value: '32%', icon: <Percent className="text-purple-500" size={24} /> },
    { label: 'Games Today', value: '12', icon: <BarChart className="text-orange-500" size={24} /> },
  ];

  // Mobile Dashboard Layout
  const MobileDashboard = () => (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95">
      <main className="px-4 py-4 pb-24">
        {/* Hero Section */}
        <section className="mb-6">
          <Card className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20">
            <div className="flex flex-col items-center gap-4 p-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-text-dark mb-1">
                  {nextDraw ? nextDraw.lottery?.name : 'Next Big Draw'}
                </h1>
                <p className="text-text-dark/80 text-sm mb-2">Don't miss your chance to win big!</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy size={20} className="text-accent" />
                  <span className="text-xl font-bold text-accent">
                    {nextDraw ? formatCurrency(nextDraw.jackpot_amount) : 'Loading...'}
                  </span>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={() => navigate('/smart-pick')}
              >
                Generate Smart Pick
              </Button>
            </div>
          </Card>
        </section>

        {/* Statistics Grid - 2 columns for mobile */}
        <section className="mb-6 grid grid-cols-2 gap-3">
          {statistics.map((stat, index) => (
            <Card key={index} variant="light" className="p-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-1">{stat.icon}</div>
                <p className="text-lg font-bold text-text-dark">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </Card>
          ))}
        </section>
        
        {/* Your Lucky Numbers */}
        <section className="mb-6">
          <Card variant="light" className="p-4">
            <h3 className="font-medium text-text-dark text-lg mb-3">Your Lucky Numbers</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {luckyNumbers.map((num, i) => (
                <LotteryNumberBall 
                  key={i} 
                  number={num} 
                  isSpecial={i === luckyNumbers.length - 1}
                  size="sm"
                />
              ))}
            </div>
          </Card>
        </section>

        {/* State Lotteries Mobile Section */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-text font-semibold text-xl">State Lotteries</h2>
            <button 
              className="text-accent text-sm font-medium hover:underline flex items-center justify-center"
              onClick={() => navigate('/states')}
            >
              View All
            </button>
          </div>
          
          <Card 
            variant="default" 
            className="h-[300px] w-full overflow-hidden border border-primary-light/20 shadow-lg bg-primary relative"
            size="sm"
          >
            <USMap navigateTo="states" />
          </Card>
        </section>
        
        {/* Winning Odds Section for Mobile */}
        <section className="mb-6">
          <Card variant="light" className="p-4">
            <h3 className="font-medium text-text-dark text-lg mb-3">Winning Odds</h3>
            <div className="space-y-3">
              {topJackpotGames.length > 0 ? (
                topJackpotGames.map((game, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-text-muted text-sm">{game.name}</span>
                    <span className="text-text-dark font-medium text-sm">{getGameOdds(game)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted text-sm">Powerball</span>
                    <span className="text-text-dark font-medium text-sm">1:292,201,338</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted text-sm">Mega Millions</span>
                    <span className="text-text-dark font-medium text-sm">1:302,575,350</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted text-sm">Cash4Life</span>
                    <span className="text-text-dark font-medium text-sm">1:21,846,048</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </section>
        
        {/* Available Lotteries Section */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-text font-semibold text-3xl">Available Lotteries</h2>
            <Button 
              variant="outline" 
              className="h-10 px-6 flex items-center justify-center"
              onClick={() => navigate('/lottery/games')}
            >
              View All Games
            </Button>
          </div>
          <div className="bg-[#181c22] p-6 rounded-lg border border-[#333] shadow-lg w-full">
            {isMobile ? (
              <div className="flex flex-col gap-4">
                {uniqueGames.slice(0, 12).map(game => (
                  <div
                    key={game.id}
                    className={`w-full max-w-xs mx-auto flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#23272f] to-[#181a1e] border border-[#23272f] shadow-xl hover:shadow-2xl hover:border-accent/70 transition-all duration-300 group relative overflow-hidden flex flex-col items-center px-3 ${hasLargeNumberSet(game) ? 'pt-3 pb-2' : 'pt-4 pb-3'}`}
                    style={{ height: '280px' }}
                  >
                    {/* Glow effect behind logo */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-0 w-14 h-14 bg-accent/20 blur-2xl rounded-full opacity-60 group-hover:opacity-90 transition" />
                    {/* Logo retangular arredondada */}
                    <div className="w-14 h-8 rounded-lg bg-[#23272f] flex items-center justify-center shadow-lg mb-1 border-2 border-[#23272f] group-hover:border-accent/60 transition-all duration-300 relative z-10">
                      {game.logo_url ? (
                        <img
                          src={game.logo_url}
                          alt={game.name}
                          className="w-20 h-14 object-contain bg-white rounded-lg shadow-md p-1 mx-auto"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-accent font-bold text-base drop-shadow">{game.name.substring(0, 2)}</span>
                      )}
                    </div>
                    {/* Nome do jogo */}
                    <div className="text-center w-full mb-0.5">
                      <span className="block font-semibold text-white text-sm truncate drop-shadow-sm tracking-wide">
                        {game.name}
                      </span>
                    </div>
                    {/* Jackpot */}
                    <div className="flex justify-center mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-accent/80 to-accent/60 text-white font-bold text-xs shadow-accent/30 shadow-md border border-accent/30 animate-pulse-slow">
                        {game.results[0]?.next_jackpot || 'Jackpot TBD'}
                      </span>
                    </div>
                    {/* Números sorteados */}
                    {game.results[0] && (
                      <div 
                        className={`flex flex-wrap justify-center ${
                          hasVeryLargeNumberSet(game) 
                            ? 'gap-0.5 grid grid-cols-4 w-full' 
                            : hasLargeNumberSet(game) 
                              ? 'gap-0.5 mx-auto' 
                              : 'gap-1'
                        } mb-1`}
                      >
                        {parseNumbers(game.results[0].numbers).map((num, idx, arr) => {
                          const hasManyNumbers = arr.length > 6;
                          const hasVeryManyNumbers = arr.length > 10;
                          const specialNumber = getSpecialNumber(game.results[0]);
                          
                          // Usar tamanho apropriado para as bolinhas de números
                          const ballSize = hasVeryManyNumbers ? "sm" : (hasManyNumbers ? "sm" : "md");
                          
                          // Check if this number is the special number
                          const isSpecial = specialNumber !== null && num === specialNumber;
                          
                          return (
                            <div key={idx} className="drop-shadow-lg flex justify-center">
                              <LotteryNumberBall
                                number={num}
                                isSpecial={isSpecial}
                                size={ballSize}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Data do sorteio */}
                    {game.results[0] && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Calendar size={11} />
                        <span>{formatDate(game.results[0].draw_date)}</span>
                      </div>
                    )}
                    {/* Botão de detalhes */}
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="flex items-center justify-center gap-1 bg-white/5 backdrop-blur border border-accent/30 group-hover:bg-accent/20 group-hover:text-white text-accent font-semibold shadow-md transition-all duration-300 mt-auto text-xs py-1"
                      onClick={() => navigate(`/lottery/games/${game.id}`)}
                    >
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Swiper
                  modules={[Pagination, Autoplay]}
                  spaceBetween={24}
                  slidesPerView={1}
                  breakpoints={{
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                  }}
                  pagination={{
                    clickable: true,
                    el: '.custom-swiper-pagination',
                    bulletClass: 'custom-swiper-bullet',
                    bulletActiveClass: 'custom-swiper-bullet-active',
                  }}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  className="w-full"
                >
                  {uniqueGames.slice(0, 12).map(game => (
                    <SwiperSlide key={game.id}>
                      <div
                        className={`w-full max-w-xs mx-auto flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#23272f] to-[#181a1e] border border-[#23272f] shadow-xl hover:shadow-2xl hover:border-accent/70 transition-all duration-300 group relative overflow-hidden flex flex-col items-center px-3 ${hasLargeNumberSet(game) ? 'pt-3 pb-2' : 'pt-4 pb-3'}`}
                        style={{ height: '280px' }}
                      >
                        {/* Glow effect behind logo */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-0 w-24 h-24 bg-accent/20 blur-2xl rounded-full opacity-60 group-hover:opacity-90 transition" />
                        {/* Logo retangular arredondada */}
                        <div className="w-20 h-12 rounded-xl bg-[#23272f] flex items-center justify-center shadow-lg mb-2 border-2 border-[#23272f] group-hover:border-accent/60 transition-all duration-300 relative z-10">
                          {game.logo_url ? (
                            <img
                              src={game.logo_url}
                              alt={game.name}
                              className="w-20 h-14 object-contain bg-white rounded-lg shadow-md p-1 mx-auto"
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-accent font-bold text-lg drop-shadow">{game.name.substring(0, 2)}</span>
                          )}
                        </div>
                        {/* Nome do jogo */}
                        <div className="text-center w-full mb-1">
                          <span className="block font-semibold text-white text-base md:text-lg truncate drop-shadow-sm tracking-wide">
                            {game.name}
                          </span>
                        </div>
                        {/* Jackpot */}
                        <div className="flex justify-center mb-2">
                          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent/80 to-accent/60 text-white font-bold text-sm shadow-accent/30 shadow-md border border-accent/30 animate-pulse-slow">
                            {game.results[0]?.next_jackpot || 'Jackpot TBD'}
                          </span>
                        </div>
                        {/* Números sorteados */}
                        {game.results[0] && (
                          <div 
                            className={`flex flex-wrap justify-center ${
                              hasVeryLargeNumberSet(game) 
                                ? 'gap-0.5 grid grid-cols-4 w-full' 
                                : hasLargeNumberSet(game) 
                                  ? 'gap-1 mx-auto' 
                                  : 'gap-2'
                            } mb-2`}
                          >
                            {parseNumbers(game.results[0].numbers).map((num, idx, arr) => {
                              const hasManyNumbers = arr.length > 6;
                              const hasVeryManyNumbers = arr.length > 10;
                              const specialNumber = getSpecialNumber(game.results[0]);
                              
                              // Usar tamanho apropriado para as bolinhas de números
                              const ballSize = hasVeryManyNumbers ? "sm" : (hasManyNumbers ? "sm" : "md");
                              
                              // Check if this number is the special number
                              const isSpecial = specialNumber !== null && num === specialNumber;
                              
                              return (
                                <div key={idx} className="drop-shadow-lg flex justify-center">
                                  <LotteryNumberBall
                                    number={num}
                                    isSpecial={isSpecial}
                                    size={ballSize}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Data do sorteio */}
                        {game.results[0] && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Calendar size={12} />
                            <span>{formatDate(game.results[0].draw_date)}</span>
                          </div>
                        )}
                        {/* Spacer para empurrar o botão para a base */}
                        <div className="flex-grow" />
                        {/* Botão de detalhes */}
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          className="flex items-center justify-center gap-1 bg-white/5 backdrop-blur border border-accent/30 group-hover:bg-accent/20 group-hover:text-white text-accent font-semibold shadow-md transition-all duration-300 mt-2"
                          onClick={() => navigate(`/lottery/games/${game.id}`)}
                        >
                          <span>View Details</span>
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <div className="custom-swiper-pagination flex justify-center mt-10 w-full" />
                {/* Custom Swiper bullets */}
                <style>{`
                  .custom-swiper-bullet {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    margin: 0 6px;
                    border-radius: 9999px;
                    background: #23272f;
                    border: 2px solid #444;
                    opacity: 0.5;
                    transition: all 0.3s;
                  }
                  .custom-swiper-bullet-active {
                    background: #ff2222;
                    border: 2px solid #ff2222;
                    opacity: 1;
                    box-shadow: 0 0 8px #ff222299;
                  }
                `}</style>
              </>
            )}
          </div>
        </section>
        
        {/* Quick Access Grid */}
        <section className="mb-6">
          <h2 className="text-text font-semibold text-xl mb-4">Quick Access</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="secondary"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform col-span-2"
              onClick={() => navigate('/smart-pick')}
            >
              <Sparkles size={22} />
              <span className="font-medium text-sm">Smart Pick</span>
            </Button>
            
            <Button 
              variant="secondary"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              onClick={() => navigate('/results')}
            >
              <Search size={22} />
              <span className="font-medium text-sm">Results</span>
            </Button>
            
            <Button 
              variant="secondary"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={22} />
              <span className="font-medium text-sm">Notifications</span>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );

  // Tablet & Desktop Dashboard Layout
  const DesktopDashboard = () => (
    <div className="min-h-screen bg-primary">
      <main className="pt-10 pb-16 px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Hero Banner */}
          <section className="mb-12">
            <Card className="bg-gradient-to-r from-accent/20 via-accent/10 to-primary-light border border-accent/20 overflow-hidden">
              <div className="p-10">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-1">
                    <h1 className="text-5xl font-bold text-text-dark mb-4">
                      {nextDraw ? nextDraw.lottery?.name : 'Next Big Draw'}
                    </h1>
                    <p className="text-text-dark/80 mb-8 text-xl">Don't miss your chance to win big with our AI-powered picks!</p>
                    
                    <div className="flex items-center gap-5 mb-10">
                      <Trophy size={48} className="text-accent" />
                      <div>
                        <p className="text-base text-text-dark font-medium">Estimated Jackpot</p>
                        <span className="text-5xl font-bold text-accent">
                          {nextDraw ? formatCurrency(nextDraw.jackpot_amount) : 'Loading...'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-5">
                      <Button 
                        className="px-10 py-4 text-lg"
                        onClick={() => navigate('/smart-pick')}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles size={24} />
                          <span>Generate Smart Pick</span>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="px-10 py-4 text-lg"
                        onClick={() => navigate('/results')}
                      >
                        <div className="flex items-center gap-3">
                          <Search size={24} />
                          <span>Check Results</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 bg-primary-light/50 p-8 rounded-xl">
                    <h3 className="text-text text-center font-semibold text-xl mb-6">Your Lucky Numbers</h3>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {luckyNumbers.map((num, i) => (
                        <LotteryNumberBall 
                          key={i} 
                          number={num} 
                          isSpecial={i === luckyNumbers.length - 1}
                          size="lg"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>
          
          {/* Statistics Grid */}
          <section className="mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {statistics.map((stat, index) => (
                <Card key={index} variant="light" className="p-8 border border-card/10">
                  <div className="flex items-center gap-5">
                    <div className="p-4 rounded-full bg-primary-light">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-text-dark">{stat.value}</p>
                      <p className="text-base text-text-muted">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
          
          {/* Main Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Map Section - 2/3 Width */}
            <div className="lg:col-span-2 space-y-10">
              {/* US Map Container */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-text font-semibold text-3xl">State Lotteries</h2>
                  <Button 
                    variant="outline" 
                    className="h-10 px-6 flex items-center justify-center"
                    onClick={() => navigate('/states')}
                  >
                    View All States
                  </Button>
                </div>
                <Card 
                  variant="default" 
                  className="h-[600px] lg:h-[700px] overflow-hidden border border-primary-light/20 shadow-lg bg-primary"
                  size="sm"
                >
                  <USMap navigateTo="states" />
                </Card>
              </div>
              
              {/* Available Lotteries Section */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-text font-semibold text-3xl">Available Lotteries</h2>
                  <Button 
                    variant="outline" 
                    className="h-10 px-6 flex items-center justify-center"
                    onClick={() => navigate('/lottery/games')}
                  >
                    View All Games
                  </Button>
                </div>
                
                <div className="bg-[#181c22] p-6 rounded-lg border border-[#333] shadow-lg w-full">
                  <div className="pb-8">
                  <Swiper
                    modules={[Pagination, Autoplay]}
                    spaceBetween={24}
                    slidesPerView={1}
                    breakpoints={{
                      640: { slidesPerView: 1 },
                      768: { slidesPerView: 2 },
                      1024: { slidesPerView: 3 },
                    }}
                    pagination={{
                      clickable: true,
                      el: '.custom-swiper-pagination',
                      bulletClass: 'custom-swiper-bullet',
                      bulletActiveClass: 'custom-swiper-bullet-active',
                    }}
                    autoplay={{ delay: 3500, disableOnInteraction: false }}
                    className="w-full"
                  >
                    {uniqueGames.slice(0, 12).map(game => (
                      <SwiperSlide key={game.id}>
                        <div
                          className={`w-full max-w-xs mx-auto flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#23272f] to-[#181a1e] border border-[#23272f] shadow-xl hover:shadow-2xl hover:border-accent/70 transition-all duration-300 group relative overflow-hidden flex flex-col items-center px-3 ${hasLargeNumberSet(game) ? 'pt-3 pb-2' : 'pt-4 pb-3'}`}
                          style={{ height: '280px' }}
                        >
                          {/* Glow effect behind logo */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-0 w-24 h-24 bg-accent/20 blur-2xl rounded-full opacity-60 group-hover:opacity-90 transition" />
                          {/* Logo retangular arredondada */}
                          <div className="w-20 h-12 rounded-xl bg-[#23272f] flex items-center justify-center shadow-lg mb-2 border-2 border-[#23272f] group-hover:border-accent/60 transition-all duration-300 relative z-10">
                            {game.logo_url ? (
                              <img
                                src={game.logo_url}
                                alt={game.name}
                                className="w-20 h-14 object-contain bg-white rounded-lg shadow-md p-1 mx-auto"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="text-accent font-bold text-lg drop-shadow">{game.name.substring(0, 2)}</span>
                            )}
                          </div>
                          {/* Nome do jogo */}
                          <div className="text-center w-full mb-1">
                            <span className="block font-semibold text-white text-base md:text-lg truncate drop-shadow-sm tracking-wide">
                              {game.name}
                            </span>
                          </div>
                          {/* Jackpot */}
                          <div className="flex justify-center mb-2">
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent/80 to-accent/60 text-white font-bold text-sm shadow-accent/30 shadow-md border border-accent/30 animate-pulse-slow">
                              {game.results[0]?.next_jackpot || 'Jackpot TBD'}
                            </span>
                          </div>
                          {/* Números sorteados */}
                          {game.results[0] && (
                            <div 
                              className={`flex flex-wrap justify-center ${
                                hasVeryLargeNumberSet(game) 
                                  ? 'gap-0.5 grid grid-cols-4 w-full' 
                                  : hasLargeNumberSet(game) 
                                    ? 'gap-1 mx-auto' 
                                    : 'gap-2'
                              } mb-2`}
                            >
                              {parseNumbers(game.results[0].numbers).map((num, idx, arr) => {
                                const hasManyNumbers = arr.length > 6;
                                const hasVeryManyNumbers = arr.length > 10;
                                const specialNumber = getSpecialNumber(game.results[0]);
                                
                                // Usar tamanho apropriado para as bolinhas de números
                                const ballSize = hasVeryManyNumbers ? "sm" : (hasManyNumbers ? "sm" : "md");
                                
                                // Check if this number is the special number
                                const isSpecial = specialNumber !== null && num === specialNumber;
                                
                                return (
                                  <div key={idx} className="drop-shadow-lg flex justify-center">
                                    <LotteryNumberBall
                                      number={num}
                                      isSpecial={isSpecial}
                                      size={ballSize}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Data do sorteio */}
                          {game.results[0] && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                              <Calendar size={12} />
                              <span>{formatDate(game.results[0].draw_date)}</span>
                            </div>
                          )}
                          {/* Spacer para empurrar o botão para a base */}
                          <div className="flex-grow" />
                          {/* Botão de detalhes */}
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            className="flex items-center justify-center gap-1 bg-white/5 backdrop-blur border border-accent/30 group-hover:bg-accent/20 group-hover:text-white text-accent font-semibold shadow-md transition-all duration-300 mt-2"
                            onClick={() => navigate(`/lottery/games/${game.id}`)}
                          >
                            <span>View Details</span>
                            <ChevronRight size={16} />
                          </Button>
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  <div className="custom-swiper-pagination flex justify-center mt-10 w-full" />
                  {/* Custom Swiper bullets */}
                  <style>{`
                    .custom-swiper-bullet {
                      display: inline-block;
                      width: 12px;
                      height: 12px;
                      margin: 0 6px;
                      border-radius: 9999px;
                      background: #23272f;
                      border: 2px solid #444;
                      opacity: 0.5;
                      transition: all 0.3s;
                    }
                    .custom-swiper-bullet-active {
                      background: #ff2222;
                      border: 2px solid #ff2222;
                      opacity: 1;
                      box-shadow: 0 0 8px #ff222299;
                    }
                  `}</style>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - 1/3 Width */}
            <div>
              <h2 className="text-text font-semibold text-3xl mb-8">Quick Access</h2>
              
              <div className="space-y-6">
                {/* Quick Access Buttons */}
                <div className="grid grid-cols-2 gap-6">
                  <Button 
                    variant="secondary"
                    className="h-40 flex flex-col items-center justify-center gap-4 hover:bg-card-dark/80 transition-colors col-span-2"
                    onClick={() => navigate('/smart-pick')}
                  >
                    <Sparkles size={32} className="text-accent" />
                    <span className="font-medium text-lg">Smart Pick</span>
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    className="h-40 flex flex-col items-center justify-center gap-4 hover:bg-card-dark/80 transition-colors"
                    onClick={() => navigate('/results')}
                  >
                    <Search size={32} className="text-accent" />
                    <span className="font-medium text-lg">Results</span>
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    className="h-40 flex flex-col items-center justify-center gap-4 hover:bg-card-dark/80 transition-colors"
                    onClick={() => navigate('/notifications')}
                  >
                    <Bell size={32} className="text-accent" />
                    <span className="font-medium text-lg">Alerts</span>
                  </Button>
                </div>
                
                {/* Stats Cards */}
                <div className="mt-6 bg-[#1a1a1a] rounded-xl p-2">
                  <h3 className="font-medium text-white text-xl mb-4">Latest Results</h3>
                  <GamesWithResults 
                    games={games} 
                    loading={gamesLoading} 
                    error={gamesError} 
                    maxGames={3}
                    compact={true}
                  />
                </div>
                
                <Card variant="dark" className="p-8 border border-[#333]">
                  <h3 className="font-medium text-white text-xl mb-6">Winning Odds</h3>
                  <div className="space-y-5">
                    {topJackpotGames.length > 0 ? (
                      topJackpotGames.map((game, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-400 text-base">{game.name}</span>
                          <span className="text-white font-medium text-base">{getGameOdds(game)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-base">Powerball</span>
                          <span className="text-white font-medium text-base">1:292,201,338</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-base">Mega Millions</span>
                          <span className="text-white font-medium text-base">1:302,575,350</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-base">Cash4Life</span>
                          <span className="text-white font-medium text-base">1:21,846,048</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // Remove duplicated games by slug, keeping the one with the highest next_jackpot
  const uniqueGamesBySlug = (gamesArr: Game[]) => {
    const map = new Map<string, Game>();
    const parseJackpot = (jackpot: string | undefined): number => {
      if (!jackpot) return 0;
      const num = jackpot.replace(/[^\d]/g, '');
      return parseInt(num, 10) || 0;
    };
    for (const game of gamesArr) {
      const key = game.slug;
      const currentJackpot = game.results[0]?.next_jackpot ? parseJackpot(game.results[0]?.next_jackpot) : 0;
      if (!map.has(key)) {
        map.set(key, game);
      } else {
        const existing = map.get(key)!;
        const existingJackpot = existing.results[0]?.next_jackpot ? parseJackpot(existing.results[0]?.next_jackpot) : 0;
        if (currentJackpot > existingJackpot) {
          map.set(key, game);
        }
      }
    }
    return Array.from(map.values());
  };

  const uniqueGames = uniqueGamesBySlug(games);
  
  // Get top 3 games with highest jackpot values for winning odds section
  const getTopJackpotGames = (gamesArr: Game[], count: number = 3) => {
    const parseJackpot = (jackpot: string | undefined): number => {
      if (!jackpot) return 0;
      const num = jackpot.replace(/[^\d]/g, '');
      return parseInt(num, 10) || 0;
    };
    
    return [...gamesArr]
      .filter(game => game.results && game.results[0]?.next_jackpot && gameOddsMap[game.name])
      .sort((a, b) => {
        const jackpotA = parseJackpot(a.results[0]?.next_jackpot);
        const jackpotB = parseJackpot(b.results[0]?.next_jackpot);
        return jackpotB - jackpotA;
      })
      .slice(0, count);
  };

  // Mapping of game names to their winning odds
  const gameOddsMap: Record<string, string> = {
    'Powerball': '1:292,201,338',
    'Mega Millions': '1:302,575,350',
    'Cash4Life': '1:21,846,048',
    'Take 5': '1:575,757',
    'Pick 10': '1:8,911,711',
    'Lucky for Life': '1:30,821,472',
    'Lotto America': '1:25,989,600',
    'New York Lotto': '1:45,057,474',
    'California SuperLotto Plus': '1:41,416,353',
    'Texas Lotto': '1:25,827,165',
    'Florida Lotto': '1:22,957,480',
    'Fantasy 5': '1:376,992',
    'Cash 3': '1:1,000',
    'Cash 4': '1:10,000',
    'Pick 3': '1:1,000',
    'Pick 4': '1:10,000',
    'Hit 5': '1:850,668',
    'Hot Lotto': '1:29,144,841',
    'Lotto Max': '1:33,294,800',
    'Daily 3': '1:1,000',
    'Daily 4': '1:10,000',
    'Daily Derby': '1:1,320,000',
    'Lotto 47': '1:10,737,573',
    'Classic Lotto': '1:13,983,816',
    'Wild Card': '1:1,359,288',
    'Megabucks': '1:6,991,908',
    'Tri-State Megabucks': '1:4,496,388',
    'Natural State Jackpot': '1:575,757',
    'Lotto Plus': '1:7,059,052',
    'Badger 5': '1:169,911',
    'Roadrunner Cash': '1:435,897',
  };

  // Get lottery odds for a game
  const getGameOdds = (game: Game): string => {
    return gameOddsMap[game.name];
  };

  const topJackpotGames = getTopJackpotGames(games);
  
  // Render the appropriate layout based on screen size
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />;
};

export default DashboardScreen;