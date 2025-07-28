import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteUserAccounts } from '@/scripts/delete-user-accounts';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

/**
 * Admin API endpoint to delete user accounts and related authentication data
 * This endpoint requires admin authentication
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the user making the request
    const requestingUser = await getUserById(decoded.userId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // For now, allow any authenticated user to clean their own accounts
    // In production, you might want to add admin role checking here
    const {
      userEmail,
      deleteAllAccounts = false,
      clearUserSettings = false,
      clearSessions = false,
    } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Security check: users can only delete their own accounts unless they're admin
    // For now, we'll allow self-deletion only
    if (requestingUser.email !== userEmail) {
      // In production, add admin role check here
      return res.status(403).json({ 
        error: 'You can only delete your own accounts. Admin access required for other users.' 
      });
    }

    console.log(`🔧 Admin API: Deleting accounts for user: ${userEmail}`);
    console.log(`🔧 Requested by: ${requestingUser.email}`);
    console.log(`🔧 Options:`, { deleteAllAccounts, clearUserSettings, clearSessions });

    // Execute the deletion
    const result = await deleteUserAccounts({
      userEmail,
      deleteAllAccounts,
      clearUserSettings,
      clearSessions,
    });

    if (result.success) {
      console.log(`✅ Successfully deleted accounts for: ${userEmail}`);
      return res.status(200).json({
        success: true,
        message: result.message,
        deletedAccountsCount: result.deletedAccountsCount,
      });
    } else {
      console.error(`❌ Failed to delete accounts for: ${userEmail}`, result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('❌ Admin API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}