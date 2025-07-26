# Multi-Domain Cookie Management - FloHub

## 🎯 **Overview**

Updated FloHub's authentication system to support cookies across multiple domains:
- `flohub.xyz` and `www.flohub.xyz` (custom domain)
- `flohub.vercel.app` (Vercel domain)

## 🔧 **Implementation**

### New Cookie Utility System

Created `lib/cookieUtils.ts` with dynamic domain detection:

```typescript
// Automatically detects the correct cookie domain
getCookieDomain(req) → '.flohub.xyz' | undefined

// Creates secure cookies with proper domain settings
createSecureCookie(req, name, value, options)

// Creates clearing cookies with matching domain
createClearCookie(req, name, path)
```

### Updated Authentication Endpoints

✅ **Files Modified:**
- `/pages/api/auth/login.ts` - Dynamic cookie creation
- `/pages/api/auth/refresh.ts` - Dynamic cookie refresh
- `/pages/api/auth/logout.ts` - Dynamic cookie clearing

## 🌐 **Domain Handling Logic**

### For `*.flohub.xyz` domains:
```
Domain: '.flohub.xyz'
Result: Works for both flohub.xyz and www.flohub.xyz
```

### For `*.vercel.app` domains:
```
Domain: undefined (no explicit domain)
Result: Works for the exact Vercel subdomain
```

### For development:
```
Domain: undefined
Result: Works for localhost
```

## 🧪 **Testing**

### Debug Endpoint (Development Only)
```bash
# Test cookie domain detection
GET /api/debug/cookie-test?action=info

# Set a test cookie
GET /api/debug/cookie-test?action=set

# Clear the test cookie
GET /api/debug/cookie-test?action=clear
```

### Manual Testing Steps

1. **Test on flohub.xyz:**
   - Login at `https://flohub.xyz`
   - Verify redirect to `https://www.flohub.xyz` preserves session
   - Check cookie domain in browser dev tools

2. **Test on Vercel domain:**
   - Login at `https://flohub.vercel.app`
   - Verify authentication works independently
   - Check cookie scope in browser dev tools

3. **Cross-domain verification:**
   - Login on one domain
   - Visit the other domain
   - Verify appropriate session behavior

## 🔍 **Cookie Security Features**

### Automatic Security Settings
- `httpOnly: true` - Prevents XSS attacks
- `secure: true` (production) - HTTPS only
- `sameSite: 'lax'` - CSRF protection
- `sameSite: 'none'` (PWA) - Cross-context support

### PWA Support
- Automatically detects PWA/standalone mode
- Uses `sameSite: 'none'` for cross-context requests
- Maintains security while enabling functionality

## 📊 **Domain Configuration Matrix**

| Request Host | Cookie Domain | Works For | Notes |
|-------------|---------------|-----------|--------|
| `flohub.xyz` | `.flohub.xyz` | `flohub.xyz`, `www.flohub.xyz` | Covers all subdomains |
| `www.flohub.xyz` | `.flohub.xyz` | `flohub.xyz`, `www.flohub.xyz` | Same as above |
| `flohub.vercel.app` | `undefined` | `flohub.vercel.app` only | Vercel-specific |
| `localhost:3000` | `undefined` | `localhost:3000` only | Development |

## 🚀 **Benefits**

1. **Seamless Domain Switching**: Users can switch between domains without re-authentication
2. **Flexible Deployment**: Supports both custom domains and Vercel domains
3. **Maintained Security**: Each domain has appropriate cookie scope
4. **PWA Compatibility**: Handles standalone app requirements
5. **Development Friendly**: Works locally without domain restrictions

## 🔧 **Environment Variables**

No additional environment variables needed! The system automatically detects:
- Production vs development environment
- Request hostname
- PWA/standalone mode

## 🛡️ **Security Considerations**

### Domain Isolation
- `flohub.xyz` cookies don't leak to other `.xyz` domains
- Vercel cookies are scoped to the specific subdomain
- Development cookies are localhost-only

### Cross-Domain Protection
- Each domain gets appropriate cookie scope
- No overly broad domain settings
- Maintains browser security policies

## 📝 **Usage Examples**

### Setting Authentication Cookie
```typescript
// Old way (fixed domain)
domain: process.env.NODE_ENV === 'production' ? '.flohub.xyz' : undefined

// New way (dynamic detection)
const cookie = createSecureCookie(req, 'auth-token', token, {
  maxAge: 60 * 60 * 24 * 30 // 30 days
});
```

### Clearing Authentication Cookie
```typescript
// Old way
domain: process.env.NODE_ENV === 'production' ? '.flohub.xyz' : undefined

// New way
const cookie = createClearCookie(req, 'auth-token');
```

## 🔍 **Debugging**

### Check Domain Detection
```typescript
const domainInfo = getDomainInfo(req);
console.log('Domain info:', domainInfo);
// Outputs: { host, cookieDomain, isProduction, isFlohubDomain, isVercelDomain }
```

### Browser Dev Tools
1. Open Developer Tools
2. Go to Application/Storage tab
3. Check Cookies section
4. Verify domain scope and security flags

## ✅ **Verification Checklist**

- [ ] Login works on `flohub.xyz`
- [ ] Login works on `www.flohub.xyz`  
- [ ] Login works on `flohub.vercel.app`
- [ ] Session persists across domain redirects
- [ ] Logout clears cookies properly
- [ ] PWA functionality maintained
- [ ] No cookie domain errors in console