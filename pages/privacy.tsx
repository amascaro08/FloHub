import React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - FloHub',
  description: 'Privacy Policy for FloHub - Learn how we collect, use, and protect your data.',
};

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header with Logo */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/FloHub_Logo_Transparent.png"
              alt="FloHub Logo"
              width={80}
              height={80}
              priority={true}
              quality={85}
              className="rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Privacy Policy
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Your privacy matters to us. Learn how FloHub collects, uses, and protects your personal information.
          </p>
        </div>

        {/* Back to Home Button */}
        <div className="flex justify-center mb-8">
          <Link 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg group"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <svg 
              className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2} 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        {/* Content */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              1. Introduction
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Welcome to FloHub's Privacy Policy. This policy explains how we collect, use, and protect your personal information when you use our services. At FloHub, we believe in transparency and your right to privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              2. Information We Collect
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Account information (email, name, and profile details)</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Usage data and interactions with our services</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Journal entries and personal notes you create</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Task and habit tracking data</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Meeting notes and calendar information</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              3. How We Use Your Information
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>To provide and improve our services</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>To personalize your FloHub experience</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>To send important updates and notifications</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>To analyze usage patterns and optimize performance</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              4. Data Security
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              We implement robust security measures to protect your data, including:
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Encryption of data in transit and at rest</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Regular security audits and updates</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Strict access controls and authentication</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Secure data backups and recovery procedures</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              5. Data Sharing
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              We do not sell your personal information. We may share data with:
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Service providers who assist in operating our platform</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>When required by law or to protect our rights</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>With your explicit consent</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              6. Your Rights
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              You have the right to:
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Access your personal data</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Request corrections to your data</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Delete your account and associated data</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Export your data in a portable format</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Opt-out of non-essential communications</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              7. Contact Us
            </h2>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6">
              <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                If you have questions about this Privacy Policy or your data, please contact us at:
              </p>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4">
                <p className="font-medium text-neutral-800 dark:text-neutral-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Email: <a href="mailto:flohubofficial@gmail.com" className="text-primary hover:text-primary/80 transition-colors">flohubofficial@gmail.com</a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              8. Updates to This Policy
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              We may update this Privacy Policy periodically. We will notify you of any material changes through our platform or via email.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-lg p-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              Last updated: July 11, 2025
            </p>
          </section>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-neutral-500 dark:text-neutral-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            <em>"Work smarter, flow better."</em> - FloHub
          </p>
        </div>
      </div>
    </div>
  );
}

// Mark this page as public (no authentication required)
PrivacyPolicy.auth = false;

export default PrivacyPolicy;
