# Widget Toggle Implementation

## Overview

This implementation adds a widget toggle system that appears when the layout is unlocked, allowing users to easily control widget visibility and order. The system synchronizes with the settings page and provides different functionality for desktop and mobile layouts.

## Features Implemented

### 1. Layout Lock Integration
- Widget toggle only appears when the layout is unlocked
- Integrates with existing lock/unlock button in the header
- Positioned as a floating action button when unlocked

### 2. Desktop Experience
- **Widget Visibility Toggle**: Users can turn widgets on/off
- Eye/EyeOff icons clearly indicate widget state
- Real-time updates to dashboard without page refresh
- Synchronizes with settings page widget configuration

### 3. Mobile Experience
- **Widget Order Management**: Users can reorder widgets using up/down arrows
- **Widget Visibility**: Can also toggle widgets on/off
- Shows active widgets first, inactive widgets below
- Order changes are immediately reflected in the mobile dashboard

### 4. Settings Synchronization
- Changes made in the widget toggle sync instantly with the settings page
- Changes made in settings page sync back to the dashboard
- Uses custom events (`widgetSettingsChanged`) for real-time synchronization
- Cache invalidation ensures fresh data after changes

## Technical Implementation

### New Components

#### `components/ui/WidgetToggle.tsx`
- Main widget toggle component
- Responsive design (different UI for mobile vs desktop)
- Real-time settings synchronization
- Loading states and error handling

### Modified Components

#### `components/ui/Layout.tsx`
- Added WidgetToggle component
- Passes lock state to the toggle
- Positioned as overlay when unlocked

#### `components/dashboard/DashboardGrid.tsx`
- Added event listener for `widgetSettingsChanged`
- Improved fetchUserSettings with useCallback
- Real-time refresh when widget settings change

#### `components/dashboard/MobileDashboard.tsx`
- Added event listener for `widgetSettingsChanged`
- Real-time refresh when widget settings change
- Improved fetchUserSettings structure

#### `components/ui/WidgetManager.tsx`
- Emits `widgetSettingsChanged` event when settings change
- Ensures bi-directional sync with dashboard components

## User Experience

### When Layout is Locked
- Widget toggle button is hidden
- Users see normal dashboard with locked widgets
- Maintains clean interface without distractions

### When Layout is Unlocked
- Widget toggle button appears in top-right corner
- Click to open widget management panel
- Different experience based on device:

#### Desktop
- Focus on widget visibility (on/off toggle)
- Clear visual indicators with eye icons
- Immediate preview of changes

#### Mobile
- Focus on widget order (reordering controls)
- Up/down arrows for easy reordering
- Toggle visibility as secondary action

## Data Flow

1. **Widget Toggle Changes** → API call to `/api/userSettings/update`
2. **Event Emission** → `widgetSettingsChanged` custom event
3. **Cache Invalidation** → Session storage cache cleared
4. **Component Refresh** → Dashboard components re-fetch settings
5. **UI Update** → Dashboard reflects new widget configuration

## API Integration

- Uses existing `/api/userSettings` endpoints
- Updates `activeWidgets` array in user settings
- Maintains compatibility with existing widget system
- Preserves widget order for both desktop and mobile

## Styling

- Consistent with app's design system
- Primary blue color for active states
- Smooth transitions and hover effects
- Responsive design patterns
- Dark mode support

## Benefits

1. **Improved UX**: Easy widget management without going to settings
2. **Mobile-First**: Dedicated mobile experience for widget ordering
3. **Real-time Sync**: Changes reflect immediately across all views
4. **Non-intrusive**: Only appears when layout is unlocked
5. **Consistent**: Uses existing settings infrastructure
6. **Responsive**: Adapts to screen size and context

## Future Enhancements

- Drag and drop widget ordering for desktop
- Widget preview before enabling
- Bulk widget operations
- Widget categories/grouping
- Custom widget sizing options