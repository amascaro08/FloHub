# Login Persistence Features

## Overview
This application now includes enhanced login persistence features that keep users logged in across browser sessions and PWA installations.

## Features Implemented

### 1. Extended Session Duration
- **Default Session**: 30 days when "Remember Me" is enabled
- **Short Session**: 24 hours when "Remember Me" is disabled
- **Automatic Refresh**: Tokens are automatically refreshed every 12 hours
- **Activity-Based Refresh**: Tokens are refreshed after 10 minutes of user inactivity

### 2. PWA Compatibility
- **SameSite Cookie Policy**: Changed to 'lax' for better PWA compatibility
- **Offline Support**: Authentication state persists even when offline
- **Automatic Reconnection**: Seamless reconnection when network is restored

### 3. User Control
- **Remember Me Option**: Users can choose between 30-day and 24-hour sessions
- **Manual Logout**: Users can manually log out using the LogoutButton component
- **Session Management**: Automatic token refresh with user activity detection

### 4. Security Features
- **HttpOnly Cookies**: Authentication tokens are stored securely
- **Automatic Cleanup**: Failed refresh attempts redirect to login
- **Secure Headers**: Proper CORS and security headers for PWA

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login with remember me option
- `POST /api/auth/logout` - User logout and session cleanup
- `POST /api/auth/refresh` - Automatic token refresh
- `GET /api/auth/session` - Get current user session

### PWA Endpoints
- `GET /api/auth/*` - All auth endpoints are PWA-compatible
- Service Worker handles offline authentication state

## Usage

### Login Form
```tsx
<LoginForm />
// Includes "Remember me for 30 days" checkbox
```

### Logout Button
```tsx
import LogoutButton from '@/components/ui/LogoutButton';

<LogoutButton className="btn btn-primary">
  Sign Out
</LogoutButton>
```

### Automatic Persistence
The `useAuthPersistence` hook automatically handles:
- Token refresh every 12 hours
- Activity-based refresh after 10 minutes of inactivity
- Automatic redirect to login on authentication failure

## PWA Features

### Offline Support
- Authentication state persists offline
- Automatic reconnection when network is restored
- Service worker caches authentication resources

### Installation Benefits
- PWA installation maintains login state
- No need to re-login after PWA installation
- Seamless experience across browser and PWA

## Configuration

### Environment Variables
- `JWT_SECRET` - Secret key for JWT token signing
- `NODE_ENV` - Environment (development/production)

### Cookie Settings
- `httpOnly: true` - Secure cookie storage
- `secure: true` - HTTPS only in production
- `sameSite: 'lax'` - PWA compatibility
- `maxAge: 30 days` - Extended session duration

## Security Considerations

1. **Token Expiration**: JWT tokens expire after 30 days maximum
2. **Automatic Refresh**: Tokens are refreshed before expiration
3. **Secure Storage**: Tokens are stored in HttpOnly cookies
4. **Activity Monitoring**: Inactive sessions are refreshed on user activity
5. **Manual Logout**: Users can manually clear their session

## Troubleshooting

### Common Issues
1. **Session Expired**: User will be redirected to login automatically
2. **PWA Not Staying Logged In**: Ensure cookies are enabled and PWA is properly installed
3. **Offline Authentication**: Check service worker registration and network connectivity

### Debug Information
- Check browser console for authentication errors
- Verify cookie settings in browser developer tools
- Monitor network requests for authentication endpoints