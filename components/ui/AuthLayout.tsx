import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

const AuthLayout = ({ children, title }: AuthLayoutProps) => {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';
  const isRegisterPage = router.pathname === '/register';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <Head>
        <title>{title} - FlowHub</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link href="/">
              <img
                src="/FloHub_Logo_Transparent.png"
                alt="FlowHub"
                className="h-16 w-auto animate-pulse-subtle"
              />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg bg-[var(--surface)] shadow-lg">
            <div className="flex border-b border-neutral-200 dark:border-neutral-800">
              <Link
                href="/login"
                className={`flex-1 px-4 py-3 text-center font-medium ${
                  isLoginPage
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`flex-1 px-4 py-3 text-center font-medium ${
                  isRegisterPage
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                }`}
              >
                Register
              </Link>
            </div>

            <div className="p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;