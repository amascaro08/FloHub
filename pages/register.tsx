import AuthLayout from '@/components/ui/AuthLayout'
import RegisterForm from '@/components/ui/RegisterForm'

export default function RegisterPage() {
  return (
    <AuthLayout title="Register">
      <h2 className="mb-6 text-center text-2xl font-semibold text-[var(--fg)]">
        Create your account
      </h2>
      <div className="mt-6 px-4">
        <RegisterForm />
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        By signing up, you agree to our{' '}
        <a href="/terms" className="underline">Terms of Service</a> and{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </AuthLayout>
  )
}
