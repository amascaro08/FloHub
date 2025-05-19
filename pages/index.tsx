import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Index() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-neutral-900 p-4">
      <Head>
        <title>FloHub - Streamline Your Day</title>
        <meta name="description" content="FloHub is your personal productivity assistant. Organize tasks, take notes, and manage your time effectively." />
      </Head>

      <main className="flex flex-col items-center justify-center w-full max-w-5xl px-4">
        <div className="flex flex-col md:flex-row items-center justify-between w-full mb-16">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <img
              src="/FloHub_Logo_Transparent.png"
              alt="FlowHub Logo"
              className="w-48 mb-6 animate-pulse-subtle"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-primary-700 dark:text-primary-400 mb-4">
              Streamline Your Day
            </h1>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
              FloHub combines tasks, notes, and calendar in one seamless interface.
              Your personal productivity assistant is here.
            </p>
            <button
              onClick={handleLogin}
              className="px-8 py-3 text-lg font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Login to FloHub
            </button>
          </div>
          <div className="md:w-1/2">
            <img
              src="/flohub_flocat.png"
              alt="FloHub Interface"
              className="rounded-lg shadow-2xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-3">Tasks & Habits</h3>
            <p className="text-gray-700 dark:text-gray-300">Track daily tasks, build habits, and organize your workflow with intelligent prioritization.</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-3">Smart Calendar</h3>
            <p className="text-gray-700 dark:text-gray-300">View your schedule, plan events, and get reminders for important meetings and deadlines.</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-3">Notes & Journal</h3>
            <p className="text-gray-700 dark:text-gray-300">Capture ideas, create notes, and maintain a personal journal with rich text formatting.</p>
          </div>
        </div>
      </main>
      
      {/* Footer with links */}
      <footer className="w-full py-6 px-4 mt-12 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} FloHub. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <a
              href="https://flohub.replit.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Homepage
            </a>
            <a
              href="https://flohub.replit.app/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://flohub.replit.app/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  
  // If user is already authenticated, redirect to the dashboard
  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}
