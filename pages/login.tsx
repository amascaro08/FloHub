import AuthLayout from '@/components/ui/AuthLayout';

export default function LoginPage() {
  return (
    <AuthLayout title="Login">
      <h2 className="mb-6 text-center text-2xl font-semibold text-[var(--fg)]">
        Login to your account
      </h2>
      <div className="mt-6">
        <a
          href="/api/auth/google"
          className="flex w-full justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          {/* Google SVG Icon */}
          <svg
            className="mr-2 h-5 w-5"
            aria-hidden="true"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
          </svg>
          Sign in with Google
        </a>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        By signing in, you agree to our <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}
