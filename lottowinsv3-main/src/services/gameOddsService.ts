/**
 * Game Odds Service
 * 
 * Provides odds information for lottery games.
 * The odds represent the chances of winning the jackpot/main prize.
 */

interface GameOddsMap {
  [gameName: string]: string;
}

class GameOddsService {
  private gameOddsMap: GameOddsMap = {
    // Major national games
    'Powerball': '1:292,201,338',
    'Mega Millions': '1:302,575,350',
    'Cash4Life': '1:21,846,048',
    'Lucky for Life': '1:30,821,472',
    
    // Pick 3/4/5 type games (generally similar odds within type)
    'Pick 3': '1:1,000',
    'Pick 4': '1:10,000',
    'Pick 5': '1:100,000',
    'Daily 3': '1:1,000',
    'Daily 4': '1:10,000',
    'Daily 5': '1:100,000',
    'Cash 3': '1:1,000',
    'Cash 4': '1:10,000',
    'Cash 5': '1:324,632',
    'Play 3': '1:1,000',
    'Play 4': '1:10,000',
    'Play 5': '1:100,000',
    'Win 4': '1:10,000',
    
    // Time-specific Pick games (same odds as regular versions)
    'Pick 3 Day': '1:1,000',
    'Pick 3 Night': '1:1,000',
    'Pick 3 Midday': '1:1,000',
    'Pick 3 Evening': '1:1,000',
    'Pick 3 Morning': '1:1,000',
    'Pick 4 Day': '1:10,000',
    'Pick 4 Night': '1:10,000',
    'Pick 4 Midday': '1:10,000',
    'Pick 4 Evening': '1:10,000',
    'Pick 4 Morning': '1:10,000',
    'Pick 5 Day': '1:100,000',
    'Pick 5 Night': '1:100,000',
    'Pick 5 Midday': '1:100,000',
    'Pick 5 Evening': '1:100,000',
    'Daily 3 Midday': '1:1,000',
    'Daily 3 Evening': '1:1,000',
    'Daily 4 Midday': '1:10,000',
    'Daily 4 Evening': '1:10,000',
    'Daily 4 Morning': '1:10,000',
    'Daily 4 Night': '1:10,000',
    'Daily 4 Day': '1:10,000',
    
    // Cash Pop variants (all have same odds based on number selection)
    'Cash Pop': '1:15',
    'Cash Pop Morning': '1:15',
    'Cash Pop Afternoon': '1:15',
    'Cash Pop Evening': '1:15',
    'Cash Pop Late Night': '1:15',
    'Cash Pop Coffee Break': '1:15',
    'Cash Pop Brunch': '1:15',
    'Cash Pop Lunch Break': '1:15',
    'Cash Pop Supper Time': '1:15',
    'Cash Pop After Hours': '1:15',
    'Cash Pop Rush Hour': '1:15',
    'Cash Pop EarlyBird': '1:15',
    'Cash Pop Late Morning': '1:15',
    'Cash Pop PrimeTime': '1:15',
    'Cash Pop Midday': '1:15',
    'Cash Pop Morning Buzz': '1:15',
    'Cash Pop Lunch Rush': '1:15',
    'Cash Pop Clock Out Cash': '1:15',
    'Cash Pop Primetime Pop': '1:15',
    'Cash Pop Midnight Money': '1:15',
    'Cash Pop Prime Time': '1:15', 
    'Cash Pop Early Bird': '1:15',
    'Cash Pop Matinee': '1:15',
    'Cash Pop Night Owl': '1:15',
    'Cash Pop Drive Time': '1:15',
    'Cash Pop 9am': '1:15',
    'Cash Pop 1pm': '1:15',
    'Cash Pop 6pm': '1:15',
    'Cash Pop 11pm': '1:15',
    
    // State-specific games
    'Fantasy 5': '1:376,992',
    'Fantasy 5 Midday': '1:376,992',
    'Take 5': '1:575,757',
    'Take 5 Midday': '1:575,757',
    'Take 5 Evening': '1:575,757',
    'Numbers Game Midday': '1:1,000',
    'Numbers Game Evening': '1:1,000',
    'Numbers Midday': '1:1,000',
    'Numbers Evening': '1:1,000',
    'Win For Life': '1:7,059,052',
    'Lucky Day Lotto Midday': '1:1,221,759',
    'Lucky Day Lotto Evening': '1:1,221,759',
    'Jersey Cash 5': '1:962,598',
    'Lotto': '1:13,983,816',
    'Classic Lotto': '1:13,983,816',
    'Classic Lotto 47': '1:10,737,573',
    'Easy 5': '1:435,897',
    'Cash Ball': '1:1,309,000',
    'Quick Draw Midday': '1:8,911,711',
    'Quick Draw Evening': '1:8,911,711',
    'Keno': '1:8,911,711',
    'Daily Keno': '1:8,911,711',
    'Match 5': '1:575,757',
    'Match 4': '1:10,625',
    'Match 6': '1:4,661,272',
    'Super Cash': '1:1,631,312',
    'Tennessee Cash': '1:1,623,160',
    'Badger 5': '1:169,911',
    'Show Me Cash': '1:575,757',
    'All or Nothing Midday': '1:2,704,156',
    'All or Nothing Evening': '1:2,704,156',
    'All or Nothing Morning': '1:2,704,156',
    'All or Nothing Day': '1:2,704,156',
    'All or Nothing Night': '1:2,704,156',
    '2by2': '1:105,625',
    'Megabucks': '1:6,991,908',
    'Idaho Cash': '1:170,115',
    'Montana Cash': '1:179,386',
    'Dakota Cash': '1:324,632',
    'Gimme 5': '1:575,757',
    'Gopher 5': '1:1,533,939',
    'North 5': '1:169,911',
    'Palmetto Cash 5': '1:501,942',
    'Hit 5': '1:575,757',
    'Cash 25': '1:177,100',
    'Cash Five': '1:324,632',
    'Rolling Cash 5': '1:575,757',
    
    // Other games with specific odds
    'Pega 2 Diacutea': '1:100',
    'Pega 2 Noche': '1:100',
    'Pega 3 Diacutea': '1:1,000',
    'Pega 3 Noche': '1:1,000',
    'Pega 4 Diacutea': '1:10,000',
    'Pega 4 Noche': '1:10,000',
    'Tri-State Pick 3 Day': '1:1,000',
    'Tri-State Pick 3 Evening': '1:1,000',
    'Tri-State Pick 4 Day': '1:10,000',
    'Tri-State Pick 4 Evening': '1:10,000',
    'Wild Money': '1:142,506',
    'MyDay': '1:36,525',
    'Bank a Million': '1:3,838,380',
    'Pick 10': '1:8,911,711',
    'Pick 6': '1:13,983,816',
    'Daily Game': '1:1,000',
    'Treasure Hunt': '1:142,506',
    'Texas Two Step': '1:1,832,600',
    'Lotto Texas': '1:25,827,165',
    'Cowboy Draw': '1:435,897',
    'Natural State Jackpot': '1:575,757',
    'SuperLotto Plus': '1:41,416,353',
    'The Pick': '1:7,059,052',
    'Triple Twist': '1:795,000',
    'Lotto Plus': '1:8,145,060',
    'Multi-Win Lotto': '1:1,072,950',
    'Jackpot Triple Play': '1:3,122,273',
    'Jumbo Bucks Lotto': '1:10,737,573',
    'Lotto America': '1:25,989,600',
    'Multi Match': '1:8,911,711',
    'Pick 2 Midday': '1:100',
    'Pick 2 Evening': '1:100',
    'DC-2 Midday': '1:100',
    'DC-2 Evening': '1:100',
    'DC-3 Midday': '1:1,000',
    'DC-3 Evening': '1:1,000',
    'DC-4 Midday': '1:10,000',
    'DC-4 Evening': '1:10,000',
    'DC-5 Midday': '1:100,000',
    'DC-5 Evening': '1:100,000',
    'Road Runner Cash': '1:435,897',
    'Georgia Five Midday': '1:100,000',
    'Georgia Five Evening': '1:100,000',
    'Mass Cash': '1:324,632',
    'Big Sky Bonus': '1:250,000',
    'Daily Tennessee Jackpot': '1:435,897',
    'Poker Lotto': '1:2,598,960',
    'Super Lotto': '1:3,262,623',
    'Lucky Pick': '1:435,897',
    'Revancha': '1:3,838,380',
    '5 Star Draw': '1:376,992',
    'Bonus Match 5': '1:575,757',
    'Loto': '1:8,145,060',
    'Kentucky-5': '1:142,506',
    'Tri-State Megabucks Plus': '1:4,496,388'
  };
  
  // Default odds for games not explicitly listed
  private defaultOdds: { [category: string]: string } = {
    'pick3': '1:1,000',  // For any Pick 3 / Daily 3 / Cash 3 type games
    'pick4': '1:10,000', // For any Pick 4 / Daily 4 / Cash 4 type games
    'pick5': '1:100,000', // For any Pick 5 / Daily 5 type games
    'cash_pop': '1:15',  // For any Cash Pop variant
    'lottery': '1:5,000,000', // For general lottery games
    'default': '1:1,000,000' // Fallback default
  };
  
  /**
   * Get the odds for a specific game
   * @param gameName The name of the lottery game
   * @returns Formatted odds string (e.g. "1:292,201,338")
   */
  public getGameOdds(gameName: string): string {
    // If we have exact match, return it
    if (this.gameOddsMap[gameName]) {
      return this.gameOddsMap[gameName];
    }
    
    // Try to categorize the game if no exact match
    const nameLower = gameName.toLowerCase();
    
    if (nameLower.includes('pick 3') || nameLower.includes('daily 3') || nameLower.includes('cash 3') || 
        nameLower.includes('play 3') || nameLower.includes('numbers')) {
      return this.defaultOdds.pick3;
    }
    
    if (nameLower.includes('pick 4') || nameLower.includes('daily 4') || nameLower.includes('cash 4') || 
        nameLower.includes('play 4') || nameLower.includes('win 4')) {
      return this.defaultOdds.pick4;
    }
    
    if (nameLower.includes('pick 5') || nameLower.includes('daily 5') || nameLower.includes('cash 5') || 
        nameLower.includes('play 5') || nameLower.includes('fantasy 5')) {
      return this.defaultOdds.pick5;
    }
    
    if (nameLower.includes('cash pop')) {
      return this.defaultOdds.cash_pop;
    }
    
    if (nameLower.includes('lotto') || nameLower.includes('jackpot')) {
      return this.defaultOdds.lottery;
    }
    
    // Return default odds if no match found
    return this.defaultOdds.default;
  }
}

export default new GameOddsService(); 