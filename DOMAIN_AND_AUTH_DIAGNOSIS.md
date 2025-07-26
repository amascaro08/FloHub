# Domain and Authentication Issues Diagnosis - FloHub

## 🔍 **Issues Identified**

### 1. **Domain Redirect Configuration Problem**
- `https://flohub.xyz` → returns 308 redirect to `https://www.flohub.xyz/`
- This redirect is likely causing connection issues for users trying to access the main domain
- Users expect `flohub.xyz` to work directly, not redirect

### 2. **Authentication Configuration Mismatch**
- The app is hardcoded in many places to use `.flohub.xyz` domain for cookies
- OAuth callbacks are configured for `flohub.xyz` but the actual serving domain is `www.flohub.xyz`
- NEXTAUTH_URL environment variable mismatch between domains

### 3. **Environment Variable Issues**
- Based on the codebase, NEXTAUTH_URL should be set to `https://flohub.xyz`
- But the actual serving domain is `https://www.flohub.xyz`
- This causes OAuth and authentication to fail

## 🧪 **Test Results**

```bash
# flohub.xyz redirects to www.flohub.xyz
curl -I https://flohub.xyz
# Returns: 308 redirect to https://www.flohub.xyz/

# www.flohub.xyz works properly
curl -I https://www.flohub.xyz  
# Returns: 200 OK

# Vercel domain works
curl -I https://flohub.vercel.app
# Returns: 200 OK
```

## 🔧 **Root Cause Analysis**

1. **Domain Setup Issue**: The domain is configured to redirect `flohub.xyz` → `www.flohub.xyz` but:
   - OAuth callbacks are expecting `flohub.xyz`
   - Environment variables reference `flohub.xyz`
   - Cookie domains are set for `.flohub.xyz` (which should work for both)

2. **Authentication Flow Broken**: 
   - User goes to `flohub.xyz` → redirected to `www.flohub.xyz`
   - OAuth starts from `www.flohub.xyz` but callbacks are configured for `flohub.xyz`
   - Cookies set for `.flohub.xyz` but OAuth state is lost in redirect

## 🛠️ **Solutions Required**

### Option A: Make flohub.xyz the Primary Domain (Recommended)
1. Remove the redirect from `flohub.xyz` to `www.flohub.xyz`
2. Make `flohub.xyz` serve the content directly
3. Keep NEXTAUTH_URL as `https://flohub.xyz`
4. Update Vercel domain settings

### Option B: Update Everything to Use www.flohub.xyz
1. Change NEXTAUTH_URL to `https://www.flohub.xyz`
2. Update all OAuth callbacks to use `www.flohub.xyz`
3. Update Google Cloud Console redirect URIs
4. Keep the redirect from apex domain

### Option C: Fix Redirect Handling
1. Update authentication to handle domain redirects properly
2. Preserve OAuth state across redirects
3. Update cookie handling for redirects

## 🎯 **Immediate Action Items**

### 1. Check Vercel Domain Configuration
- Go to Vercel Dashboard → Project → Settings → Domains
- Check if `flohub.xyz` is set as redirect or primary
- Verify SSL certificates for both domains

### 2. Check Environment Variables in Vercel
- Verify NEXTAUTH_URL value in production
- Should match the actual serving domain

### 3. Check Google Cloud Console
- Verify OAuth redirect URIs match the serving domain
- Should be either:
  - `https://flohub.xyz/api/auth/callback/google-additional`
  - OR `https://www.flohub.xyz/api/auth/callback/google-additional`

### 4. Test Authentication Flow
- Try login flow on both domains
- Check browser developer tools for:
  - Cookie domain settings
  - Redirect chains
  - OAuth state preservation

## 📋 **Next Steps**

1. **Decide on Primary Domain Strategy**
2. **Update Vercel Domain Settings**
3. **Update Environment Variables**
4. **Update OAuth Configuration**
5. **Test Both Domains**
6. **Update DNS if needed**