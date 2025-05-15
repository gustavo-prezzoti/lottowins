# Lotto Wins AI Documentation

## Overview
Lotto Wins AI is a modern lottery application that uses artificial intelligence to help users make smarter lottery number picks. The application provides real-time lottery information, smart number generation, and comprehensive tracking of lottery results across multiple states.

## Architecture

### Frontend
- React 18.3.1 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- React Router for navigation

### Backend
- Supabase for database and authentication
- Edge Functions for API integration
- Real-time subscriptions for live updates

## Core Features

### 1. Smart Pick Generator
- AI-powered number generation
- Historical pattern analysis
- Customizable for different lottery types
- Visual feedback with animations and sound effects

### 2. Interactive US Map
- State-by-state lottery information
- Region-based color coding
- Responsive design with hover effects
- Quick access to state-specific lotteries

### 3. Real-time Results
- Live drawing results
- Push notifications
- Historical data tracking
- Winning number visualization

### 4. Investment Tools
- Jackpot tracking
- Financial planning resources
- Investment strategy guides
- ROI calculators

## Component Structure

### Layout Components
- `AppHeader`: Main navigation header
- `BottomNavigation`: Mobile-friendly bottom navigation
- `Card`: Reusable card container
- `Button`: Customizable button component

### Feature Components
- `LotteryCard`: Displays lottery information
- `LotteryList`: List of available lotteries
- `LotteryNumberBall`: Number visualization
- `USMap`: Interactive state map
- `NotificationItem`: Notification display

### Screens
- `DashboardScreen`: Main application dashboard
- `LotteryDetailScreen`: Individual lottery details
- `SmartPickScreen`: Number generation interface
- `ResultsScreen`: Drawing results display
- `NotificationsScreen`: User notifications
- `InvestmentsScreen`: Financial tools

## State Management
- React Context for authentication
- Custom hooks for data fetching
- Real-time subscriptions for live updates

## Database Schema

### Tables
1. `lotteries`
   - Basic lottery information
   - State associations
   - Drawing schedules

2. `lottery_draws`
   - Drawing results
   - Jackpot amounts
   - Timestamps

3. `lottery_numbers`
   - Winning numbers
   - Special numbers
   - Draw associations

## API Integration

### Edge Functions
- `lottery-sync`: Synchronizes lottery data
- Real-time data fetching
- Error handling
- CORS configuration

## Styling

### Theme Configuration
- Custom color palette
- Responsive breakpoints
- Typography system
- Shadow definitions

### Animation System
- Transition effects
- Loading states
- Success animations
- Confetti effects

## Security

### Authentication
- Email/password authentication
- Session management
- Protected routes
- Error handling

### Database Security
- Row Level Security (RLS)
- Public read access
- Protected write operations
- Data validation

## Performance Optimization
- Code splitting
- Lazy loading
- Image optimization
- Caching strategies

## Future Enhancements
1. Social features
2. Advanced analytics
3. Mobile applications
4. Additional payment methods

## Contributing
Guidelines for contributing to the project, including:
- Code style
- Testing requirements
- Pull request process
- Issue reporting