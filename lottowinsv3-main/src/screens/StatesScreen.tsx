import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Search, Star, ArrowLeft, TrendingUp, Award, Zap, Globe, AlertTriangle, MapPin, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useNavigate, useLocation } from 'react-router-dom';
import useStates from '../hooks/useStates';

// Mock de loterias e jackpots por estado
interface StateStats {
  [code: string]: { lotteries: number; jackpot: number };
}
const stateStats: StateStats = {
  CA: { lotteries: 8, jackpot: 220_000_000 },
  NY: { lotteries: 7, jackpot: 180_000_000 },
  TX: { lotteries: 6, jackpot: 150_000_000 },
  FL: { lotteries: 5, jackpot: 120_000_000 },
  IL: { lotteries: 4, jackpot: 90_000_000 },
  GA: { lotteries: 4, jackpot: 80_000_000 },
  PA: { lotteries: 3, jackpot: 70_000_000 },
  OH: { lotteries: 3, jackpot: 60_000_000 },
  MI: { lotteries: 2, jackpot: 50_000_000 },
  NJ: { lotteries: 2, jackpot: 45_000_000 },
  WA: { lotteries: 2, jackpot: 40_000_000 },
  AZ: { lotteries: 2, jackpot: 35_000_000 },
  MA: { lotteries: 2, jackpot: 30_000_000 },
  TN: { lotteries: 2, jackpot: 25_000_000 },
  IN: { lotteries: 2, jackpot: 20_000_000 },
  MO: { lotteries: 2, jackpot: 18_000_000 },
  MD: { lotteries: 2, jackpot: 16_000_000 },
  WI: { lotteries: 2, jackpot: 14_000_000 },
  CO: { lotteries: 2, jackpot: 12_000_000 },
  MN: { lotteries: 2, jackpot: 10_000_000 },
};

// Estados populares para destaque
const popularStates = ['CA', 'NY', 'TX', 'FL'];

const badgeColors: Record<string, string> = {
  West: 'bg-gradient-to-r from-purple-500/20 to-accent/20 text-accent border border-accent/20',
  Northeast: 'bg-gradient-to-r from-blue-800/20 to-blue-500/20 text-blue-300 border border-blue-500/20',
  Midwest: 'bg-gradient-to-r from-emerald-800/20 to-emerald-500/20 text-emerald-300 border border-emerald-500/20',
  Southeast: 'bg-gradient-to-r from-orange-800/20 to-orange-500/20 text-orange-300 border border-orange-500/20',
  Southwest: 'bg-gradient-to-r from-red-800/20 to-red-500/20 text-red-300 border border-red-500/20',
  Other: 'bg-gradient-to-r from-gray-800/20 to-gray-500/20 text-gray-300 border border-gray-500/20',
};

const regionIcons: Record<string, React.ReactNode> = {
  West: <Globe size={14} className="text-accent" />,
  Northeast: <Globe size={14} className="text-blue-300" />,
  Midwest: <Globe size={14} className="text-emerald-300" />,
  Southeast: <Globe size={14} className="text-orange-300" />,
  Southwest: <Globe size={14} className="text-red-300" />,
  Other: <Globe size={14} className="text-gray-300" />
};

// Helper to assign regions based on state code
const getRegionForState = (code: string): string => {
  // This is a simplified mapping - in a real app, you might want to use a more complete mapping
  const regionMap: Record<string, string> = {
    // West Coast
    'WA': 'West', 'OR': 'West', 'CA': 'West', 'NV': 'West', 'ID': 'West', 
    'MT': 'West', 'WY': 'West', 'UT': 'West', 'CO': 'West', 'AZ': 'West',
    
    // Northeast
    'ME': 'Northeast', 'NH': 'Northeast', 'VT': 'Northeast', 'MA': 'Northeast',
    'RI': 'Northeast', 'CT': 'Northeast', 'NY': 'Northeast', 'NJ': 'Northeast',
    'PA': 'Northeast', 'DE': 'Northeast', 'MD': 'Northeast',
    
    // Midwest
    'OH': 'Midwest', 'MI': 'Midwest', 'IN': 'Midwest', 'IL': 'Midwest',
    'WI': 'Midwest', 'MN': 'Midwest', 'IA': 'Midwest', 'MO': 'Midwest',
    'ND': 'Midwest', 'SD': 'Midwest', 'NE': 'Midwest', 'KS': 'Midwest',
    
    // Southeast
    'VA': 'Southeast', 'WV': 'Southeast', 'KY': 'Southeast', 'NC': 'Southeast',
    'SC': 'Southeast', 'TN': 'Southeast', 'GA': 'Southeast', 'FL': 'Southeast',
    'AL': 'Southeast', 'MS': 'Southeast', 'AR': 'Southeast', 'LA': 'Southeast',
    
    // Southwest
    'OK': 'Southwest', 'TX': 'Southwest', 'NM': 'Southwest',
  };
  
  return regionMap[code] || 'Other';
};

// Helper function to find states with similar names
const findSimilarStates = (name: string, allStates: Array<{name: string, code: string}>, limit: number = 3) => {
  if (!name || name.length < 3) return [];
  
  // Convert to lowercase for case-insensitive comparison
  const searchTerm = name.toLowerCase();
  
  // Find states that include parts of the search term
  return allStates
    .filter(state => {
      const stateName = state.name.toLowerCase();
      // Check if state name includes any part of the search term
      // or if search term includes any part of the state name
      return stateName.includes(searchTerm.substring(0, 3)) || 
             searchTerm.includes(stateName.substring(0, 3));
    })
    .slice(0, limit);
};

const StatesScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const { states, loading, error } = useStates();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const initialLoadRef = useRef(true);

  // Read state query parameter from URL and scroll to top
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const stateParam = queryParams.get('state');
    console.log("URL param 'state':", stateParam);
    
    if (stateParam) {
      setSearch(stateParam);
      initialLoadRef.current = false;
      console.log("Setting search to:", stateParam);
      
      // Scroll to top of page
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      // Focus on search input with a small delay to ensure UI is ready
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 500);
    }
  }, [location.search]);

  // Transform API states to our format with regions and icons
  const formattedStates = useMemo(() => {
    console.log("Transforming states:", states.length);
    return states.map(state => ({
      code: state.code.toUpperCase(),
      name: state.name,
      icon: `/flags/${state.code.toLowerCase()}.svg`,
      region: getRegionForState(state.code.toUpperCase())
    }));
  }, [states]);

  const filtered = useMemo(() => {
    console.log("Filtering with search:", search);
    const results = formattedStates.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
    );
    
    console.log("Found results:", results.length);
    
    return results;
  }, [formattedStates, search]);

  const featured = filtered.filter(s => popularStates.includes(s.code));
  const others = filtered.filter(s => !popularStates.includes(s.code));

  // Reset initialLoadRef when search is cleared
  useEffect(() => {
    if (search === '') {
      // Nothing to do when clearing search
    } else {
      // Mark initial load as complete when user searches
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
      }
    }
  }, [search]);

  // Fix to remove unnecessary scroll space
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    
    return () => {
      // Reset styles when component unmounts
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  // Add animations CSS
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
      
      @keyframes glow {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      .animate-glow {
        animation: glow 4s ease-in-out infinite;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121417] flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-b-4 border-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121417] flex items-center justify-center">
        <div className="text-red-500">Error loading states: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121417] pb-20">
      <main className="max-w-7xl mx-auto w-full px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors hover:translate-x-[-5px] transition-transform duration-300"
          >
            <ArrowLeft size={24} />
            <span className="text-lg font-medium">Back</span>
          </button>
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-accent/80 tracking-tight">All State Lotteries</h1>
          <div className="w-[100px]"></div> {/* Espaço para equilibrar o layout */}
        </div>
        
        <div className="relative mb-12 max-w-lg mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/30 to-accent/10 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-1000 group-hover:duration-300"></div>
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={22} className="text-accent/80" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-12 pr-4 py-4 bg-[#1A1D23] border border-[#2A2F38] rounded-xl text-white text-lg placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent shadow-xl hover:border-accent/30 focus:border-accent/60 transition-all duration-300"
              placeholder="Search by state name or code"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => {
                  setSearch('');
                  navigate('/states');
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filtro ativo indicator */}
        {search && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/30 rounded-full text-white">
              <span>Filtering by: </span>
              <span className="font-bold">{search}</span>
              <button 
                className="ml-2 p-1 rounded-full hover:bg-accent/30"
                onClick={() => {
                  setSearch('');
                  navigate('/states');
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Destaque: Estados Populares */}
        {search === '' && featured.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-white mb-8 text-center flex items-center justify-center gap-2 tracking-wide">
              <Star className="text-accent animate-glow" size={32} /> Featured States
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {featured.map((state, index) => (
                <div 
                  key={state.code} 
                  className="group relative rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-[1.03] hover:shadow-2xl animate-float"
                  style={{ animationDelay: `${index * 0.25}s` }}
                >
                  {/* Glowing background effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary to-accent/30 rounded-xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-300"></div>
                  
                  <Card className="relative flex flex-col items-center gap-3 p-8 rounded-2xl border border-[#2A2F38] group-hover:border-accent/50 transition-all duration-300 bg-gradient-to-br from-[#1A1D23] to-[#151821] z-10 h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl filter opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full shadow-lg shadow-accent/20 mb-2 animate-pulse">
                      <Star size={14} className="text-accent" /> Popular
                    </span>
                    
                    <div className="w-20 h-20 rounded-full bg-[#1E2128] border-4 border-[#2A2F38] group-hover:border-accent/30 p-1 transition-all duration-300 shadow-2xl mb-4">
                      <img 
                        src={state.icon} 
                        alt={state.name} 
                        className="w-full h-full rounded-full object-cover" 
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    
                    <h3 className="text-2xl font-extrabold text-white drop-shadow-lg group-hover:text-accent transition-colors duration-300">{state.name}</h3>
                    
                    <span className="text-base font-semibold text-white/80 bg-[#20242C] px-3 py-1 rounded-full tracking-widest border border-[#2A2F38] mt-1 shadow-lg">
                      {state.code}
                    </span>
                    
                    <div className="flex flex-col items-center gap-1 mt-4">
                      <span className="text-lg text-text-muted flex items-center gap-2">
                        <Award className="text-accent/80" size={20} />
                        <span>Lotteries: <span className="font-bold text-white">{stateStats[state.code]?.lotteries ?? 2}</span></span>
                      </span>
                      <span className="text-lg text-text-muted flex items-center gap-2">
                        <Zap className="text-accent/80" size={20} />
                        <span>Jackpot: <span className="font-bold text-accent">{formatCurrency(stateStats[state.code]?.jackpot ?? 10_000_000)}</span></span>
                      </span>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full mt-3 shadow-lg ${badgeColors[state.region]}`}>
                      {regionIcons[state.region]} {state.region}
                    </span>
                    
                    <Button 
                      className="w-full mt-5 text-base font-bold shadow-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 transition-all duration-300 group-hover:translate-y-[-2px]"
                      onClick={() => navigate(`/lotteries?state=${state.code}`)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>View Lotteries</span>
                        <TrendingUp size={18} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </Button>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results count */}
        {filtered.length > 0 && search !== '' && (
          <div className="mb-8 text-center">
            <p className="text-text/80 text-lg">
              Found <span className="text-accent font-bold">{filtered.length}</span> state{filtered.length !== 1 ? 's' : ''} matching your search
            </p>
          </div>
        )}

        {/* Outros estados */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {(search !== '' ? filtered : others).map((state, index) => (
              <div 
                key={state.code} 
                className="group relative rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/10 via-primary to-accent/20 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500 group-hover:duration-200"></div>
                
                <Card className="relative flex flex-col items-center gap-2 p-5 border border-[#2A2F38] group-hover:border-accent/30 transition-all duration-300 bg-gradient-to-br from-[#1A1D23] to-[#151821] z-10 h-full">
                  <div className="w-14 h-14 rounded-full bg-[#1E2128] border-2 border-[#2A2F38] group-hover:border-accent/20 p-1 transition-all duration-300 shadow-lg mb-2">
                    <img 
                      src={state.icon} 
                      alt={state.name} 
                      className="w-full h-full rounded-full object-cover" 
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white drop-shadow group-hover:text-accent/90 transition-colors duration-300">{state.name}</h3>
                  
                  <span className="text-xs font-semibold text-white/80 bg-[#20242C] px-2 py-1 rounded-full tracking-widest border border-[#2A2F38] shadow-md">{state.code}</span>
                  
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <span className="text-sm text-text-muted flex items-center gap-1">
                      <Award className="text-accent/70" size={14} />
                      <span>Lotteries: <span className="font-bold text-white">{stateStats[state.code]?.lotteries ?? 2}</span></span>
                    </span>
                    <span className="text-sm text-text-muted flex items-center gap-1">
                      <Zap className="text-accent/70" size={14} />
                      <span>Jackpot: <span className="font-bold text-accent">{formatCurrency(stateStats[state.code]?.jackpot ?? 10_000_000)}</span></span>
                    </span>
                  </div>
                  
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full mt-2 shadow-md ${badgeColors[state.region]}`}>
                    {regionIcons[state.region]} {state.region}
                  </span>
                  
                  <Button 
                    className="w-full mt-3 font-semibold shadow-lg border border-accent/40 hover:bg-accent/20 transition-all duration-300 group-hover:translate-y-[-2px]"
                    variant="outline"
                    onClick={() => navigate(`/lotteries?state=${state.code}`)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>View Lotteries</span>
                      <TrendingUp size={14} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </Button>
                </Card>
              </div>
            ))}
          </div>
        )}
        
        {!loading && states.length > 0 && filtered.length === 0 && search !== '' && (
          <div className="text-center py-20 bg-gradient-to-b from-[#1A1D23]/50 to-[#151821]/50 rounded-2xl border border-[#2A2F38] mt-8 shadow-2xl">
            <AlertTriangle size={60} className="text-accent/60 mx-auto mb-4" />
            <p className="text-text/70 text-xl mb-4">
              No states found matching "<span className="text-accent">{search}</span>".
            </p>
            
            {/* Similar states suggestions */}
            {findSimilarStates(search, states, 3).length > 0 && (
              <div className="mt-6 mb-6">
                <p className="text-text/80 text-base mb-3">Did you mean one of these?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {findSimilarStates(search, states, 3).map(state => (
                    <Button
                      key={state.code}
                      variant="outline"
                      onClick={() => setSearch(state.name)}
                      className="px-4 py-2 border-accent/30 bg-accent/10 hover:bg-accent/20 flex items-center gap-2"
                    >
                      <MapPin size={14} />
                      {state.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                navigate('/states');
              }}
              className="mt-4 px-8 py-2 border-accent/30 hover:bg-accent/10"
            >
              Clear Filter
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default StatesScreen; 