# Styling Documentation

## Tailwind Configuration

### Colors
```javascript
colors: {
  primary: {
    DEFAULT: '#1a1a1a',
    light: '#2a2a2a',
  },
  accent: {
    DEFAULT: '#E4002B',
    dark: '#C4001B',
  },
  card: {
    DEFAULT: '#ffffff',
    light: '#f8f8f8',
    dark: '#222222',
  },
  text: {
    DEFAULT: '#ffffff',
    dark: '#111111',
    muted: '#666666',
  }
}
```

### Typography
- Font Family: Inter
- Font Weights: 300, 400, 500, 600, 700
- Responsive Text Sizes

### Shadows
```javascript
boxShadow: {
  'card': '0 8px 16px rgba(0, 0, 0, 0.1)',
  'button': '0 4px 6px rgba(228, 0, 43, 0.25)',
}
```

## Component Styles

### Cards
- Rounded corners
- Shadow effects
- Hover transitions
- Multiple background variants

### Buttons
- Primary: Accent color with shadow
- Secondary: Dark background
- Outline: Transparent with border
- Hover and active states
- Disabled styling

### Navigation
- Bottom bar with icons
- Active state indicators
- Smooth transitions
- Mobile-optimized spacing

### Animations
- Hover scaling
- Transition effects
- Loading states
- Success animations

## Responsive Design

### Breakpoints
- Mobile: Default
- Tablet: md (768px)
- Desktop: lg (1024px)

### Grid System
- Single column (mobile)
- Two columns (tablet)
- Three columns (desktop)

### Container
```javascript
container: {
  center: true,
  padding: '1rem',
}
```

## Interactive Elements

### US Map
- Region-based colors
- Hover effects
- Active state
- Legend styling

### Number Balls
- Multiple sizes
- Special number variant
- Shadow effects
- Grid layout

### Notifications
- Unread indicators
- Icon variations
- Time stamps
- Hover states