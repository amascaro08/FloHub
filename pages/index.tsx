import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

// Example feature icons (swap with lucide-react/shadcn or your own SVGs for full effect)
const features = [
  {
    title: "Unified Dashboard",
    description: "See your tasks, calendar, notes, and habits at a glance. Everything you need, one beautiful screen.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /></svg>
    )
  },
  {
    title: "AI Assistant: FloCat",
    description: "Let FloCat organize, suggest, and keep you on track. Your personal AI, always one step ahead.",
    icon: (
      <Image src="/flocat_flohub.png" alt="FloCat" width={32} height={32} className="rounded-full bg-white/60 p-1" />
    )
  },
  {
    title: "Smart Task Management",
    description: "Quick-add, tag, and prioritize. Deadlines, reminders, repeating tasks, and a *done* button that feels so good.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
    )
  },
  {
    title: "Calendar Sync",
    description: "Instantly sync Google and Outlook calendars. See work and life in perfect harmony.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    )
  },
  {
    title: "Journaling & Notes",
    description: "Beautiful, searchable notes and daily journals. Markdown and rich text — for ideas big and small.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l7 7v9a2 2 0 0 1-2 2z"/><path d="M17 21V13H7v8"/></svg>
    )
  },
  {
    title: "Habit Tracking",
    description: "Track, streak, repeat. Stay motivated with habit chains and gentle nudges from FloCat.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    )
  },
  {
    title: "Customizable Widgets",
    description: "Drag, resize, hide, and show what matters. Your workflow, your way.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
    )
  },
  {
    title: "Mobile Ready",
    description: "On desktop or on-the-go, FloHub is fast and beautiful everywhere.",
    icon: (
      <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>
    )
  }
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>FloHub — Work, Life, Together</title>
        <meta name="description" content="FloHub is the AI-powered productivity platform with tasks, calendar, notes, journaling, habits, and FloCat. Work and life, all-in-one." />
        <meta property="og:title" content="FloHub — Your all-in-one purrfect LifeOS" />
        <meta property="og:description" content="The AI-powered dashboard that combines task tracking, calendar, notes, journaling, and habits in one sleek workspace." />
        <meta property="og:image" content="/flohub-og-image.png" />
        <meta name="theme-color" content="#4f46e5" />
        {/* Add your other favicon and OG tags here */}
      </Head>

      <main className="bg-gradient-to-br from-primary-50 via-white to-slate-100 dark:from-[#202241] dark:via-[#181928] dark:to-[#10111a] min-h-screen">
        {/* Hero */}
        <div className="relative flex flex-col-reverse md:flex-row items-center max-w-6xl mx-auto px-6 py-20">
          {/* Hero Left */}
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left z-10">
            <Image
              src="/FloHub_Logo_Transparent.png"
              alt="FloHub Logo"
              width={84}
              height={84}
              className="mb-6 drop-shadow-xl"
              priority
            />
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-primary-700 via-primary-500 to-teal-500 bg-clip-text text-transparent">
              FloHub<br />
              <span className="text-primary-400 dark:text-primary-300">Work, Life, Together.</span>
            </h1>
            <p className="mb-8 text-xl md:text-2xl text-neutral-700 dark:text-neutral-200">
              The all-in-one, AI-powered productivity platform.<br />
              <span className="text-primary-500 font-medium">Organise everything.</span>  <span className="italic">Finally, for real.</span>
            </p>
            <Link href="/login" passHref>
              <button className="px-8 py-4 rounded-2xl text-lg font-bold bg-primary-600 hover:bg-primary-700 shadow-xl text-white transition-colors duration-150 mb-6 w-full md:w-auto">
                Login to FloHub
              </button>
            </Link>
          
          </div>
          {/* Hero Right - FloCat illustration */}
          <div className="w-full md:w-1/2 flex justify-center mb-12 md:mb-0">
            <Image
              src="/flocat-sidepeek.png"
              alt="FloCat Mascot"
              width={300}
              height={300}
              priority
            />
          </div>
        </div>

        {/* Features Section */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-700 dark:text-primary-300 text-center mb-2">
            All Your Productivity. One Hub.
          </h2>
          <p className="text-center text-lg text-neutral-600 dark:text-neutral-300 mb-12">
            FloHub brings everything together — tasks, notes, calendar, AI, and more. Built for humans, not robots.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={feature.title} className="bg-white dark:bg-[#181928] rounded-2xl p-8 flex flex-col items-center text-center shadow-lg hover:shadow-2xl transition-all border border-neutral-100 dark:border-neutral-800">
                <div className="mb-5">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-primary-600 dark:text-primary-400">{feature.title}</h3>
                <p className="text-neutral-600 dark:text-neutral-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-primary-700 dark:text-primary-200">
            Ready to upgrade your day?
          </h3>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-8">
            Join FloHub and get more done — with less stress. The future of work-life productivity starts now.
          </p>
          <Link href="/login" passHref>
            <button className="px-8 py-4 rounded-2xl text-lg font-bold bg-primary-600 hover:bg-primary-700 shadow-xl text-white transition-colors duration-150">
              Login to FloHub
            </button>
          </Link>
        </section>

        <footer className="py-10 border-t border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-[#10111a]/80">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/FloHub_Logo_Transparent.png" alt="FloHub Logo" width={32} height={32} className="rounded-md" />
              <span className="text-neutral-600 dark:text-neutral-400 text-sm">© {new Date().getFullYear()} FloHub. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-neutral-600 dark:text-neutral-400 text-sm">
              <Link href="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary-600 dark:hover:text-primary-400">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
