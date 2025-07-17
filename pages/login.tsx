import dynamic from 'next/dynamic';
import AuthLayout from '@/components/ui/AuthLayout';
import LoginForm from '@/components/ui/LoginForm';

// Lazy load OAuthButtonGroup to avoid SSR crash

function LoginPage() {
  return (
    <AuthLayout title="Login">
      <h2 className="mb-6 text-center text-2xl font-semibold text-[var(--fg)]">
        Login to your account
      </h2>
      <div className="mt-6 px-4">
        <LoginForm />
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        By signing in, you agree to our{' '}
        <a href="/terms" className="underline">Terms of Service</a> and{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}

LoginPage.auth = false;
export default LoginPage;
