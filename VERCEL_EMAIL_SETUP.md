# Vercel Email Setup Guide - FloHub Production

## Quick Setup for Vercel Deployment

### Step 1: Gmail App Password Setup

1. **Access Gmail Account**: Go to [flohubofficial@gmail.com](mailto:flohubofficial@gmail.com)

2. **Enable 2-Factor Authentication** (if not already enabled):
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

3. **Generate App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click "2-Step Verification"
   - Scroll down to "App passwords"
   - Select "Mail" and "Other (custom name)"
   - Enter "FloHub Vercel" as the name
   - **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

### Step 2: Configure Vercel Environment Variables

In your Vercel dashboard:

1. **Go to Project Settings**:
   - Navigate to your FloHub project on Vercel
   - Click "Settings" tab
   - Click "Environment Variables"

2. **Add Email Variables**:
   ```
   EMAIL_PROVIDER = gmail
   EMAIL_USER = flohubofficial@gmail.com
   EMAIL_PASS = [your-16-character-app-password]
   EMAIL_FROM = FloHub <flohubofficial@gmail.com>
   ```

3. **Set Environment**:
   - Apply to: Production, Preview, and Development
   - This ensures emails work across all deployments

### Step 3: Update Other Required Variables

Make sure these are also set in Vercel:

```
JWT_SECRET = [your-secure-jwt-secret]
NEON_DATABASE_URL = [your-neon-database-url]
NEXTAUTH_URL = https://your-domain.vercel.app
```

### Step 4: Deploy and Test

1. **Redeploy your application** on Vercel to pick up the new environment variables

2. **Test email functionality**:
   - Go to your deployed app
   - Try the "Forgot Password?" flow
   - Register a new test account
   - Check the server logs in Vercel for email confirmation

## Environment Variables Summary

For Vercel production deployment, set these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `EMAIL_PROVIDER` | `gmail` | Email service provider |
| `EMAIL_USER` | `flohubofficial@gmail.com` | Gmail account |
| `EMAIL_PASS` | `[app-password]` | 16-character Gmail app password |
| `EMAIL_FROM` | `FloHub <flohubofficial@gmail.com>` | Display name for emails |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Your deployed URL |

## Email Templates Preview

Your users will receive professional emails like:

### Password Reset Email:
```
Subject: Reset Your Password - FloHub
From: FloHub <flohubofficial@gmail.com>

Hi [User Name],

We received a request to reset your password for your FloHub account...
[Professional HTML template with reset button]
```

### Welcome Email:
```
Subject: Welcome to FloHub!
From: FloHub <flohubofficial@gmail.com>

Hi [User Name],

Welcome to FloHub! We're excited to have you on board...
[Feature overview with professional styling]
```

## Troubleshooting

### Common Issues:

1. **"Authentication failed" error**:
   - Verify 2FA is enabled on flohubofficial@gmail.com
   - Double-check the app password (16 characters, no spaces)
   - Ensure the app password is for "Mail" application

2. **Emails not sending**:
   - Check Vercel function logs for error messages
   - Verify all environment variables are set correctly
   - Make sure NEXTAUTH_URL matches your deployed domain

3. **Emails going to spam**:
   - This is normal initially for new Gmail sending addresses
   - Users should check spam folder
   - Consider adding SPF record to your domain (advanced)

### Testing Commands:

If you need to test email functionality, you can use the development endpoint:

```bash
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","type":"test"}'
```

**Note**: This endpoint only works in development mode for security.

## Security Notes

- The Gmail app password is specific to FloHub and can be revoked anytime
- App passwords are safer than using the main Gmail password
- All email content is secure and doesn't include sensitive user data
- Reset tokens expire in 1 hour automatically

## Domain Configuration (Optional Enhancement)

For better email deliverability, consider:

1. **Custom Domain**: Use a custom domain for EMAIL_FROM (e.g., `noreply@flohub.app`)
2. **SPF Record**: Add SPF record to your DNS to authorize Gmail sending
3. **DKIM**: Set up DKIM signing for better deliverability

## Next Steps

1. ✅ Set up Gmail app password for flohubofficial@gmail.com
2. ✅ Configure Vercel environment variables
3. ✅ Deploy and test password reset flow
4. ✅ Test new user registration welcome emails
5. ✅ Monitor Vercel logs for email delivery confirmation

Your FloHub email system is now production-ready on Vercel! 🚀