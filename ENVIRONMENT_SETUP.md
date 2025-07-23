# Environment Setup for Login Fix

## Issue
The "Remember Me" login functionality is causing internal server errors because required environment variables are missing.

## Required Environment Variables

Create a `.env.local` file in the root directory. You can copy from the template:

```bash
cp .env.example .env.local
```

Then update the following required variables:

```bash
# Authentication Configuration
JWT_SECRET=4e2554bd3b511513d3be970405fa60eb1818a6327bf0d4f0ca24b0071dd08e89e4671d531154a17758159ef19e309532491514eb2171f9df23de00197ae697d9

# Database Configuration
NEON_DATABASE_URL=your-actual-neon-database-url-here

# Email Configuration (for password reset emails)
EMAIL_PROVIDER=gmail
EMAIL_USER=flohubofficial@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=FloHub <flohubofficial@gmail.com>

# Node Environment
NODE_ENV=development
```

### Email Setup (Optional but Recommended)
For password reset emails to work, you need to configure email settings. See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed instructions.

## Steps to Fix the Login Issue

1. **Set up Database URL**: Replace `your-actual-neon-database-url-here` with your actual Neon database connection string
   - Format: `postgresql://username:password@hostname/database?sslmode=require`

2. **JWT Secret**: The JWT_SECRET has been generated using a cryptographically secure random string

3. **Initialize Database** (if needed):
   ```bash
   npm run db:init
   ```

4. **Start the Application**:
   ```bash
   npm run dev
   ```

## What Was Causing the Error

1. **Missing JWT_SECRET**: The login endpoint tries to sign JWT tokens but fails when this environment variable is undefined
2. **Missing NEON_DATABASE_URL**: Database connection fails during user authentication queries
3. **Environment Configuration**: The application wasn't loading the required environment variables

## Testing the Fix

After setting up the environment variables, you should be able to:
1. Start the development server without errors
2. Login with existing user credentials
3. Use the "Remember Me" functionality for extended sessions (30 days vs 24 hours)

## Security Notes

- The generated JWT_SECRET is cryptographically secure (64 bytes of random data)
- In production, use different secrets and secure environment variable management
- The JWT tokens expire automatically (30 days with Remember Me, 24 hours without)