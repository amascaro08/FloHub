# Content Encryption Setup Guide

This document outlines how to set up and use the content encryption feature for securing user-generated content in FloHub.

## Overview

FloHub now includes end-to-end encryption for sensitive user content including:
- Notes (title, content, agenda, AI summaries)
- Journal entries (content)
- Habit completion notes
- Meeting notes and agendas

The encryption uses AES-256-GCM for maximum security while maintaining backward compatibility with existing data.

## Features

✅ **Non-destructive migration**: Existing content remains accessible during and after migration
✅ **Backward compatibility**: Old unencrypted content continues to work
✅ **Automatic encryption**: New content is automatically encrypted
✅ **Transparent decryption**: Content is seamlessly decrypted when retrieved
✅ **Database backup**: Migration creates backups before making changes
✅ **Dry run mode**: Test the migration without making actual changes

## Setup Instructions

### 1. Set Environment Variable

Add a strong encryption key to your environment variables:

```bash
# Add to your .env.local file or environment
CONTENT_ENCRYPTION_KEY="your-very-long-and-secure-encryption-key-minimum-32-characters-recommended-64-or-more"
```

**Important Security Notes:**
- Use a cryptographically secure random string (64+ characters recommended)
- Store this key securely - **losing it will make encrypted data unrecoverable**
- Never commit this key to version control
- Use different keys for different environments (dev, staging, prod)

### 2. Generate a Secure Key

You can generate a secure key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or using OpenSSL:

```bash
openssl rand -hex 64
```

### 3. Test the Migration (Dry Run)

Before making any changes, run a dry run to see what would be migrated:

```bash
npm run migrate-content-encryption:dry-run
```

This will:
- Check all tables for content that needs encryption
- Report statistics on what would be migrated
- Validate that the encryption key is set
- **Make no actual changes to the database**

### 4. Create Database Backups

The migration script automatically creates backup tables, but you may want to create additional backups:

```bash
# Example for PostgreSQL
pg_dump "your-neon-connection-string" > backup_before_encryption.sql
```

### 5. Run the Migration

Once you're satisfied with the dry run results, execute the actual migration:

```bash
npm run migrate-content-encryption
```

The migration will:
- Create backup tables with today's date
- Encrypt existing content in batches (100 records at a time)
- Skip content that's already encrypted
- Continue processing even if individual records fail
- Provide detailed progress reports

### 6. Verify the Migration

After migration, verify that:
1. Your application still works normally
2. Existing content is still readable
3. New content can be created and read
4. Search functionality works (if applicable)

## Migration Details

### What Gets Encrypted

| Table | Fields Encrypted |
|-------|-----------------|
| `notes` | `title`, `content`, `agenda`, `aiSummary` |
| `journal_entries` | `content` |
| `habitCompletions` | `notes` |

### Migration Process

1. **Backup Creation**: Tables are backed up with format `table_backup_YYYY_MM_DD`
2. **Batch Processing**: Content is processed in batches of 100 records
3. **Error Handling**: Failed records are logged but don't stop the migration
4. **Progress Reporting**: Status updates every 10 processed records
5. **Verification**: Each record is checked to avoid duplicate encryption

### Example Migration Output

```
🔐 Starting Content Encryption Migration
Mode: LIVE MIGRATION
Creating backup tables...
✅ Backup tables created with suffix: 2024_01_15

📝 Migrating notes...
  Progress: 100 processed, 85 encrypted, 15 skipped
  Progress: 200 processed, 175 encrypted, 25 skipped

📖 Migrating journal entries...
  Progress: 50 processed, 45 encrypted, 5 skipped

🎯 Migrating habit completion notes...
  Progress: 30 processed, 20 encrypted, 10 skipped

🎉 Migration completed!

📊 Summary:
Notes: 250 processed, 200 encrypted, 50 skipped, 0 errors
Journal Entries: 75 processed, 70 encrypted, 5 skipped, 0 errors
Habit Completions: 40 processed, 25 encrypted, 15 skipped, 0 errors

Total: 365 processed, 295 encrypted, 0 errors

✅ Migration completed successfully!
Backup tables have been created for rollback if needed.
```

## Rollback Instructions

If you need to rollback the encryption:

### 1. Stop the Application

```bash
# Stop your application to prevent new encrypted content
```

### 2. Restore from Backups

```sql
-- Example SQL to restore notes table
DROP TABLE notes;
ALTER TABLE notes_backup_2024_01_15 RENAME TO notes;
```

### 3. Remove Environment Variable

```bash
# Remove or comment out CONTENT_ENCRYPTION_KEY
```

### 4. Restart Application

The application will continue to work with unencrypted content.

## Security Considerations

### Key Management
- **Backup your encryption key** in a secure location
- Consider using a key management service for production
- Rotate keys periodically (requires data re-encryption)

### Database Security
- Ensure your database connection is encrypted (SSL/TLS)
- Restrict database access to necessary users only
- Monitor database access logs

### Application Security
- Use HTTPS in production
- Implement proper authentication and authorization
- Regular security audits and updates

## API Changes

The encryption is transparent to API consumers. All endpoints continue to work the same way:

- Content is automatically encrypted when stored
- Content is automatically decrypted when retrieved
- No changes needed in frontend code
- API responses remain identical

## Troubleshooting

### Common Issues

**Error: "CONTENT_ENCRYPTION_KEY environment variable is required"**
- Solution: Set the environment variable with a secure key

**Error: "Content encryption failed"**
- The system falls back to storing unencrypted content
- Check your encryption key is valid
- Check server logs for detailed error information

**Content appears garbled**
- This may indicate the wrong decryption key is being used
- Verify your environment variable matches the key used for encryption

**Migration fails with database errors**
- Check database permissions
- Ensure sufficient disk space
- Review database connection settings

### Performance Impact

- Encryption/decryption adds minimal latency (~1-2ms per operation)
- Migration time depends on data volume (typically 100-1000 records/second)
- Database size may increase slightly due to encryption overhead

## Technical Implementation

### Encryption Specifications
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV**: Randomly generated per record
- **Authentication**: Built-in authentication tag prevents tampering

### Data Format
Encrypted content is stored as JSON:
```json
{
  "data": "encrypted_hex_data",
  "iv": "initialization_vector_hex",
  "tag": "authentication_tag_hex",
  "isEncrypted": true
}
```

### Backward Compatibility
- Unencrypted content: Returned as-is
- Mixed content: Each record handled appropriately
- Gradual migration: Old and new content coexist

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify environment configuration
4. Test with a small dataset first

Remember: **Keep your encryption key secure and backed up!**