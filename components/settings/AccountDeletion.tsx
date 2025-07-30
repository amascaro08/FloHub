import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/router";
import { 
  ExclamationTriangleIcon,
  TrashIcon,
  ShieldExclamationIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface AccountDeletionProps {
  onCancel?: () => void;
}

const AccountDeletion: React.FC<AccountDeletionProps> = ({ onCancel }) => {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<'initial' | 'confirm' | 'password' | 'final'>('initial');
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const REQUIRED_CONFIRMATION_TEXT = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async () => {
    if (!user?.primaryEmail) {
      setError('User not authenticated');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.primaryEmail,
          password: password,
          confirmation: confirmationText
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete account');
      }

      // Account successfully deleted - redirect to login
      router.push('/login?message=account-deleted');
    } catch (error) {
      console.error('Account deletion error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900/30">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                What will be deleted:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                <li>• Your user account and profile information</li>
                <li>• All calendar events and settings</li>
                <li>• Journal entries, notes, and tasks</li>
                <li>• Habit tracking data and completions</li>
                <li>• All conversations and AI chat history</li>
                <li>• Analytics and activity data</li>
                <li>• OAuth connections and tokens</li>
                <li>• All personal preferences and customizations</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start space-x-3">
                <ShieldExclamationIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Before you proceed:</p>
                  <ul className="space-y-1">
                    <li>• Make sure you've backed up any important data</li>
                    <li>• Consider exporting your calendar events if needed</li>
                    <li>• This action will immediately log you out</li>
                    <li>• You won't be able to recover this data later</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                I understand, continue
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep('initial')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Confirm Account Deletion
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Step 1 of 2: Type confirmation text
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300 mb-4">
                To confirm you want to delete your account, please type the following text exactly:
              </p>
              <div className="bg-white dark:bg-gray-800 border rounded px-3 py-2 font-mono text-sm">
                {REQUIRED_CONFIRMATION_TEXT}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type confirmation text:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={REQUIRED_CONFIRMATION_TEXT}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('password')}
                disabled={confirmationText !== REQUIRED_CONFIRMATION_TEXT}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => setStep('initial')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep('confirm')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Verify Your Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Step 2 of 2: Enter your password to confirm
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300">
                As a final security measure, please enter your current password to confirm this action.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('final')}
                disabled={!password.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Continue to Final Step
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep('password')}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Final Confirmation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last chance to cancel
                </p>
              </div>
            </div>

            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-6 dark:bg-red-900/30 dark:border-red-700">
              <div className="flex items-center space-x-3 mb-4">
                <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <h4 className="text-lg font-bold text-red-800 dark:text-red-300">
                    You are about to permanently delete your account
                  </h4>
                  <p className="text-red-700 dark:text-red-400">
                    Account: {user?.primaryEmail}
                  </p>
                </div>
              </div>
              <p className="text-red-800 dark:text-red-300 font-medium">
                This action is irreversible. All your data will be permanently deleted from our servers.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-5 h-5 mr-2" />
                    Delete My Account Forever
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('password')}
                disabled={isDeleting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {renderStep()}
      </div>
    </div>
  );
};

export default AccountDeletion;