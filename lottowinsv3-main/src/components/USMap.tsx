import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWindowSize } from '../hooks/useWindowSize';
import useStates from '../hooks/useStates';

// Interface for component props
interface USMapProps {
  // Target page when clicking a state: 'states' or 'lotteries'
  navigateTo?: 'states' | 'lotteries';
}

interface StateData {
  id: string;
  name: string;
  abbr: string;
  gridPosition: { col: number; row: number };
  region: string;
}

// Create states with grid positions instead of percentage positions
const statePositions: Record<string, { gridPosition: { col: number; row: number }; region: string }> = {
  // West Coast
  "wa": { gridPosition: { col: 1, row: 1 }, region: "west" },
  "or": { gridPosition: { col: 1, row: 2 }, region: "west" },
  "ca": { gridPosition: { col: 1, row: 4 }, region: "west" },
  
  // Mountain
  "id": { gridPosition: { col: 2, row: 2 }, region: "west" },
  "nv": { gridPosition: { col: 2, row: 3 }, region: "west" },
  "mt": { gridPosition: { col: 3, row: 1 }, region: "west" },
  "ut": { gridPosition: { col: 2, row: 4 }, region: "west" },
  "az": { gridPosition: { col: 2, row: 5 }, region: "west" },
  "wy": { gridPosition: { col: 3, row: 2 }, region: "west" },
  "co": { gridPosition: { col: 3, row: 4 }, region: "west" },
  "nm": { gridPosition: { col: 3, row: 5 }, region: "southwest" },
  
  // Central
  "nd": { gridPosition: { col: 4, row: 1 }, region: "midwest" },
  "sd": { gridPosition: { col: 4, row: 2 }, region: "midwest" },
  "ne": { gridPosition: { col: 4, row: 3 }, region: "midwest" },
  "ks": { gridPosition: { col: 4, row: 4 }, region: "midwest" },
  "ok": { gridPosition: { col: 4, row: 5 }, region: "southwest" },
  "tx": { gridPosition: { col: 4, row: 7 }, region: "southwest" },
  
  // Midwest
  "mn": { gridPosition: { col: 5, row: 1 }, region: "midwest" },
  "ia": { gridPosition: { col: 5, row: 3 }, region: "midwest" },
  "mo": { gridPosition: { col: 5, row: 4 }, region: "midwest" },
  "ar": { gridPosition: { col: 5, row: 6 }, region: "southeast" },
  "la": { gridPosition: { col: 5, row: 7 }, region: "southeast" },
  "wi": { gridPosition: { col: 6, row: 2 }, region: "midwest" },
  "il": { gridPosition: { col: 6, row: 3 }, region: "midwest" },
  "mi": { gridPosition: { col: 6, row: 1 }, region: "midwest" },
  "in": { gridPosition: { col: 7, row: 3 }, region: "midwest" },
  "oh": { gridPosition: { col: 7, row: 2 }, region: "midwest" },
  
  // Southeast
  "ky": { gridPosition: { col: 7, row: 4 }, region: "southeast" },
  "tn": { gridPosition: { col: 6, row: 5 }, region: "southeast" },
  "ms": { gridPosition: { col: 6, row: 6 }, region: "southeast" },
  "al": { gridPosition: { col: 7, row: 6 }, region: "southeast" },
  "ga": { gridPosition: { col: 8, row: 5 }, region: "southeast" },
  "fl": { gridPosition: { col: 8, row: 7 }, region: "southeast" },
  
  // Northeast
  "wv": { gridPosition: { col: 8, row: 3 }, region: "northeast" },
  "va": { gridPosition: { col: 8, row: 4 }, region: "southeast" },
  "nc": { gridPosition: { col: 9, row: 4 }, region: "southeast" },
  "sc": { gridPosition: { col: 9, row: 5 }, region: "southeast" },
  "pa": { gridPosition: { col: 9, row: 2 }, region: "northeast" },
  "ny": { gridPosition: { col: 9, row: 1 }, region: "northeast" },
  "me": { gridPosition: { col: 11, row: 1 }, region: "northeast" },
  "vt": { gridPosition: { col: 10, row: 1 }, region: "northeast" },
  "nh": { gridPosition: { col: 10, row: 2 }, region: "northeast" },
  "ma": { gridPosition: { col: 11, row: 2 }, region: "northeast" },
  "ri": { gridPosition: { col: 11, row: 3 }, region: "northeast" },
  "ct": { gridPosition: { col: 10, row: 3 }, region: "northeast" },
  "nj": { gridPosition: { col: 10, row: 4 }, region: "northeast" },
  "de": { gridPosition: { col: 9, row: 3 }, region: "northeast" },
  "md": { gridPosition: { col: 8, row: 2 }, region: "northeast" },
  
  // Non-contiguous
  "ak": { gridPosition: { col: 1, row: 9 }, region: "other" },
  "hi": { gridPosition: { col: 3, row: 9 }, region: "other" },
};

const USMap: React.FC<USMapProps> = ({ navigateTo = 'states' }) => {
  const navigate = useNavigate();
  const [hoveredState, setHoveredState] = React.useState<string | null>(null);
  const { isMobile } = useWindowSize();
  const { states, loading, error } = useStates();

  // Map API states to our grid positions
  const mapStates = React.useMemo(() => {
    if (!states.length) return [];
    
    return states.map(state => {
      const stateCode = state.code.toLowerCase();
      const position = statePositions[stateCode];
      
      if (!position) {
        console.warn(`No position found for state: ${state.code}`);
        return null;
      }
      
      return {
        id: state.id.toString(),
        name: state.name,
        abbr: state.code.toUpperCase(),
        gridPosition: position.gridPosition,
        region: position.region
      };
    }).filter(Boolean) as StateData[];
  }, [states]);

  const handleStateClick = (stateAbbr: string, stateName: string) => {
    // Use full state name for a better experience
    console.log(`Clicking on state: ${stateAbbr} - ${stateName}`);
    
    // Ensure we pass the exact name as it appears in the API
    const exactState = states.find(s => s.code.toUpperCase() === stateAbbr);
    
    if (navigateTo === 'lotteries') {
      // Navigate to lotteries with state code
      navigate(`/lotteries?state=${stateAbbr}`);
    } else {
      // Navigate to states with state name
      if (exactState) {
        console.log("Found exact state name:", exactState.name);
        navigate(`/states?state=${encodeURIComponent(exactState.name)}`);
      } else {
        // Fallback to provided name
        navigate(`/states?state=${encodeURIComponent(stateName)}`);
      }
    }
  };

  const getRegionColor = (region: string, isHovered: boolean) => {
    const colors = {
      northeast: isHovered ? 'bg-blue-500' : 'bg-blue-500/40',
      southeast: isHovered ? 'bg-red-500' : 'bg-red-500/40',
      midwest: isHovered ? 'bg-green-500' : 'bg-green-500/40',
      southwest: isHovered ? 'bg-yellow-500' : 'bg-yellow-500/40',
      west: isHovered ? 'bg-purple-500' : 'bg-purple-500/40',
      other: isHovered ? 'bg-gray-500' : 'bg-gray-500/40',
    };
    return colors[region as keyof typeof colors] || colors.other;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-text-muted">Loading states...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Unified map component for both mobile and desktop
  return (
    <div className="relative w-full h-full">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light/30 rounded-lg"></div>
      
      {/* Map Container */}
      <div className="absolute inset-0 p-2 sm:p-4">
        {/* Grid for the map */}
        <div className="w-full h-full grid grid-cols-12 grid-rows-10 gap-0.5 sm:gap-1 p-1 sm:p-2">
          {/* Generate all grid cells */}
          {Array.from({ length: 120 }).map((_, i) => {
            const row = Math.floor(i / 12) + 1;
            const col = (i % 12) + 1;
            
            // Check if this cell should contain a state
            const stateForCell = mapStates.find(
              state => state.gridPosition.row === row && state.gridPosition.col === col
            );
            
            if (!stateForCell) {
              return (
                <div key={i} className="border border-white/10 bg-primary-light/10"></div>
              );
            } else {
              // Return a cell with a state
              return (
                <div 
                  key={i} 
                  className="relative group border border-white/10"
                  style={{
                    gridColumn: col,
                    gridRow: row,
                  }}
                >
                  <button
                    className={`
                      ${getRegionColor(stateForCell.region, hoveredState === stateForCell.abbr)}
                      w-full h-full flex items-center justify-center text-white font-bold 
                      text-xs sm:text-sm md:text-base lg:text-lg
                      transition-all duration-200 hover:scale-105 hover:z-50
                      border border-white/20 shadow-lg
                      ${hoveredState === stateForCell.abbr ? 'z-40 ring-1 sm:ring-2 ring-white shadow-xl' : 'z-10'}`}
                    onClick={() => handleStateClick(stateForCell.abbr, stateForCell.name)}
                    onMouseEnter={() => setHoveredState(stateForCell.abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    style={{ minHeight: isMobile ? 22 : 32 }}
                  >
                    {stateForCell.abbr}
                  </button>
                  {/* Full state name tooltip */}
                  <div className={`
                    absolute opacity-0 group-hover:opacity-100 
                    ${stateForCell.gridPosition.row === 1 ? 'top-full mt-1 sm:mt-2' : 'bottom-full mb-1 sm:mb-2'} 
                    left-1/2 -translate-x-1/2 
                    px-2 py-1 sm:px-3 sm:py-1.5 bg-black/90 text-white text-xs sm:text-sm rounded 
                    pointer-events-none whitespace-nowrap z-[200] 
                    transition-opacity shadow-lg
                  `}>
                    {stateForCell.name}
                  </div>
                </div>
              );
            }
          })}
        </div>
        
        {/* Legend */}
        <div className={`absolute ${isMobile ? 'bottom-1 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-1 sm:gap-2 px-2 py-1 bg-black/30 rounded-full' : 'bottom-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2 sm:gap-4 px-4 py-2 bg-black/30 rounded-full'}`}>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-blue-500/40 rounded-sm"></div>
            <span className="text-[9px] sm:text-xs text-white/70">{isMobile ? 'NE' : 'Northeast'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-red-500/40 rounded-sm"></div>
            <span className="text-[9px] sm:text-xs text-white/70">{isMobile ? 'SE' : 'Southeast'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-green-500/40 rounded-sm"></div>
            <span className="text-[9px] sm:text-xs text-white/70">{isMobile ? 'MW' : 'Midwest'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-yellow-500/40 rounded-sm"></div>
            <span className="text-[9px] sm:text-xs text-white/70">{isMobile ? 'SW' : 'Southwest'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-purple-500/40 rounded-sm"></div>
            <span className="text-[9px] sm:text-xs text-white/70">{isMobile ? 'W' : 'West'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default USMap;