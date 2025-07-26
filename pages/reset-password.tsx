import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (router.query.token) {
      setToken(router.query.token as string);
    }
  }, [router.query.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const { message } = await res.json();

      if (res.ok) {
        setSuccess(message);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(message);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--fg)]">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              The password reset link is invalid or has expired.
            </p>
          </div>
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-primary-600 hover:text-primary-500"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Reset Password - FloHub</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--fg)]">
              Reset Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Enter your new password below
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}
            <div className="space-y-4">
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                label="New Password"
                placeholder="Enter your new password"
                autoComplete="new-password"
                required
              />
              
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                label="Confirm New Password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary-600 hover:text-primary-500 text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}