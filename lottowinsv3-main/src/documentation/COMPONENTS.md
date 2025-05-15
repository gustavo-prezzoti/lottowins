# Component Documentation

## Core Components

### AppHeader
```typescript
interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
}
```
Primary navigation component that displays the page title and optional navigation elements.

### BottomNavigation
Mobile-first navigation bar with animated transitions and active state indicators.

### Card
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'light' | 'lighter';
  className?: string;
  onClick?: () => void;
}
```
Versatile card component with multiple visual variants and optional click handling.

### Button
```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  onClick?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
}
```
Customizable button component with multiple styles and states.

### LotteryNumberBall
```typescript
interface LotteryNumberBallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```
Visual representation of lottery numbers with size variants and special number highlighting.

## Feature Components

### USMap
Interactive United States map with:
- Region-based coloring
- Hover effects
- Click handling for state selection
- Legend display

### LotteryCard
```typescript
interface LotteryCardProps {
  name: string;
  jackpot: string;
  drawDate: string;
  logoUrl: string;
  onClick?: () => void;
}
```
Displays comprehensive lottery information with visual enhancements.

### NotificationItem
```typescript
interface NotificationItemProps {
  type: 'win' | 'reminder' | 'smart-pick';
  title: string;
  message: string;
  time: string;
  isUnread?: boolean;
}
```
Notification display with type-based icons and styling.

## Hooks

### useLotteryData
```typescript
function useLotteryData() {
  return {
    lotteries: Lottery[];
    upcomingDraws: LotteryDraw[];
    loading: boolean;
    error: string | null;
  }
}
```
Manages lottery data fetching and real-time updates.

### useStateLotteries
```typescript
function useStateLotteries(stateCode: string) {
  return {
    lotteries: Lottery[];
    loading: boolean;
    error: string | null;
  }
}
```
Handles state-specific lottery data.