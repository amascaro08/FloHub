# Email Setup Guide for FloHub

## Overview
FloHub now supports email functionality for:
- Password reset emails
- Welcome emails for new users
- Future email notifications

## Email Service Configuration

### Option 1: Gmail Setup (Recommended for Development)

1. **Enable 2FA on your Gmail account** (required for app passwords)
2. **Generate an App Password**:
   - Go to [Google Account settings](https://myaccount.google.com/)
   - Navigate to Security → 2-Step Verification → App passwords
   - Select "Mail" and generate a password
3. **Add to your `.env.local` file**:
   ```bash
   EMAIL_PROVIDER=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=noreply@yourapp.com  # Optional custom from address
   ```

### Option 2: SMTP Setup (Recommended for Production)

For production environments, use a dedicated email service:

#### Using Gmail SMTP:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

#### Using SendGrid:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### Using Mailgun:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

## Environment Variables

Copy the `.env.example` file to `.env.local` and configure the email section:

```bash
cp .env.example .env.local
```

### Required Variables:
- `EMAIL_PROVIDER`: Either `'smtp'` or `'gmail'`
- `EMAIL_USER` or `SMTP_USER`: Your email address
- `EMAIL_PASS` or `SMTP_PASS`: Your email password/app password

### Optional Variables:
- `EMAIL_FROM`: Custom "from" address (defaults to `EMAIL_USER`)
- `SMTP_HOST`: SMTP server host (required for SMTP provider)
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_SECURE`: Use TLS/SSL (default: false for port 587)

## Features

### Password Reset Flow
1. User enters email on forgot password page
2. System generates secure reset token
3. Email sent with reset link (expires in 1 hour)
4. User clicks link and sets new password

### Welcome Email
- Automatically sent when new users register
- Includes overview of FloHub features
- Professional HTML template with fallback text

### Development Mode
- If email is not configured, reset URLs are logged to console
- All email functionality gracefully degrades
- No errors thrown if email service is unavailable

## Testing Email Functionality

### 1. Test Password Reset:
```bash
# Start the development server
npm run dev

# Navigate to the login page
# Click "Forgot Password?"
# Enter a valid email address
# Check your email or console logs
```

### 2. Test Welcome Email:
```bash
# Register a new user account
# Check your email for the welcome message
```

### 3. Verify Email Configuration:
```bash
# Check the server logs for:
# "Email sent successfully: [message-id]" (success)
# "Email service not configured" (needs setup)
# "Failed to send email: [error]" (configuration issue)
```

## Troubleshooting

### Common Issues:

1. **"Email service not configured"**
   - Ensure `EMAIL_PROVIDER` is set to either `'smtp'` or `'gmail'`
   - Verify all required environment variables are set

2. **Gmail "Less secure app access" error**
   - Enable 2FA on your Gmail account
   - Use an App Password instead of your regular password

3. **SMTP authentication failed**
   - Verify your SMTP credentials
   - Check if the email provider requires specific settings
   - Ensure firewall isn't blocking SMTP ports

4. **Emails going to spam**
   - Add a proper `EMAIL_FROM` address
   - Consider using a dedicated email service (SendGrid, Mailgun)
   - Set up SPF/DKIM records for your domain

### Development Fallback:
If email configuration fails, the system will:
- Log reset URLs to the console in development mode
- Continue normal operation without breaking
- Show appropriate warnings in server logs

## Production Considerations

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES)
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Use a custom domain** for the `EMAIL_FROM` address
4. **Monitor email delivery** and bounce rates
5. **Implement rate limiting** for password reset requests

## Security Notes

- Reset tokens expire after 1 hour
- Tokens are cryptographically secure (32 random bytes)
- Email content is sanitized and uses templates
- No sensitive information is included in emails
- Failed email attempts don't expose user existence

## Email Templates

The system includes professional HTML email templates with:
- Responsive design for mobile devices
- Fallback text versions
- Brand-consistent styling
- Clear call-to-action buttons
- Security warnings and instructions