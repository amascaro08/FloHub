# FloHub Production Email Setup Checklist

## 🎯 Quick Setup for flohubofficial@gmail.com on Vercel

### 📧 Gmail Configuration

- [ ] **Enable 2FA** on flohubofficial@gmail.com
  - Go to [Google Account Security](https://myaccount.google.com/security)
  - Enable 2-Step Verification if not already enabled

- [ ] **Generate App Password**
  - Navigate to Security → 2-Step Verification → App passwords
  - Create new app password for "Mail" → "FloHub Vercel"
  - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### ⚡ Vercel Environment Variables

Set these in your Vercel project settings → Environment Variables:

```
EMAIL_PROVIDER = gmail
EMAIL_USER = flohubofficial@gmail.com  
EMAIL_PASS = [your-16-character-app-password]
EMAIL_FROM = FloHub <flohubofficial@gmail.com>
NEXTAUTH_URL = https://your-vercel-domain.vercel.app
```

**Important**: Apply to Production, Preview, AND Development environments.

### 🚀 Deployment & Testing

- [ ] **Redeploy** your Vercel application to pick up new environment variables
- [ ] **Test password reset flow**:
  1. Go to your live site
  2. Click "Forgot Password?"
  3. Enter a test email address
  4. Check email inbox for reset email
- [ ] **Test welcome email**:
  1. Register a new test account
  2. Check email for welcome message
- [ ] **Monitor Vercel logs** for email sending confirmations

### 📊 Verification

Check Vercel function logs for these messages:
- ✅ `"Email sent successfully: [message-id]"` = Working correctly
- ⚠️ `"Email service not configured"` = Environment variables missing
- ❌ `"Failed to send email: [error]"` = Configuration issue

### 🔧 Troubleshooting

**If emails aren't sending**:
1. Verify 2FA is enabled on Gmail account
2. Double-check app password (16 characters, no spaces)
3. Ensure all Vercel environment variables are set
4. Check that NEXTAUTH_URL matches your deployed domain
5. Look at Vercel function logs for specific error messages

**If emails go to spam** (initially normal):
- Ask users to check spam folder
- Consider setting up custom domain email later

### 📱 User Experience

Once configured, users will receive:

**Password Reset**: Professional email with secure reset link (expires in 1 hour)
**Welcome Email**: Feature overview and getting started guide
**From Address**: "FloHub <flohubofficial@gmail.com>"

### ✅ Final Checklist

- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] Vercel environment variables set
- [ ] Application redeployed
- [ ] Password reset tested
- [ ] Welcome email tested
- [ ] Logs verified

**Status**: Ready for production! 🎉

---

**Need help?** Check the full guide: [VERCEL_EMAIL_SETUP.md](./VERCEL_EMAIL_SETUP.md)