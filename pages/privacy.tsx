import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - FloHub',
  description: 'Privacy Policy for FloHub - Learn how we collect, use, and protect your data.',
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-[var(--fg)]">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to FloHub's Privacy Policy. This policy explains how we collect, use, and protect your personal information when you use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information (email, name)</li>
            <li>Usage data and interactions with our services</li>
            <li>Journal entries and personal notes</li>
            <li>Task and habit tracking data</li>
            <li>Meeting notes and calendar information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and improve our services</li>
            <li>To personalize your experience</li>
            <li>To send important updates and notifications</li>
            <li>To analyze usage patterns and optimize performance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement robust security measures to protect your data, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and updates</li>
            <li>Strict access controls and authentication</li>
            <li>Secure data backups</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
          <p className="mb-4">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Service providers who assist in operating our platform</li>
            <li>When required by law or to protect our rights</li>
            <li>With your explicit consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
          <p className="mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your personal data</li>
            <li>Request corrections to your data</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
            <li>Opt-out of non-essential communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
          <p className="mb-4">
            If you have questions about this Privacy Policy or your data, please contact us at:
            <br />
            Email: flohubofficial@gmail.com
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Updates to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy periodically. We will notify you of any material changes through our platform or via email.
          </p>
          <p className="text-sm text-neutral-500">
            Last updated: July 11, 2025
          </p>
        </section>
      </div>
    </div>
  );
}
