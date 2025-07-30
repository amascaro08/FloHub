import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect URL from query parameters - check both 'redirect' and 'returnUrl'
  const redirectUrl = (router.query.redirect as string) || (router.query.returnUrl as string) || '/dashboard';

  // Handle account deletion confirmation message
  useEffect(() => {
    if (router.query.message === 'account-deleted') {
      setSuccess('Your account has been successfully deleted. Thank you for using FloHub.');
      // Clear the query parameter
      router.replace('/login', undefined, { shallow: true });
    }
  }, [router.query.message, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include', // Important for PWA cookie handling
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Login successful:', data.isPWA ? 'PWA mode' : 'Browser mode');
        
        // Force a small delay to ensure cookie is set properly in PWA
        if (data.isPWA) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Redirect to the redirect URL if provided, otherwise go to dashboard
        router.push(redirectUrl);
      } else {
        const errorData = await res.json();
        console.error('Login failed:', errorData);
        setError(errorData.message || 'Login failed');
        
        // Show additional debug info in development
        if (process.env.NODE_ENV === 'development' && errorData.details) {
          console.log('Debug info:', errorData.details);
        }
      }
    } catch (error) {
      console.error('Login request failed:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const { message } = await res.json();
    
    if (res.ok) {
      setSuccess(message);
      setShowResetForm(false);
    } else {
      setError(message);
    }
    setIsLoading(false);
  };

  if (showResetForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Reset Password
          </h2>
          <button
            onClick={() => setShowResetForm(false)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Back to Login
          </button>
        </div>
        
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}
          
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-modern"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">{success}</p>}
      
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input-modern"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input-modern"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300">
            Remember me for 30 days
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowResetForm(true)}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}