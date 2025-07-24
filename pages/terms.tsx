import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - FloHub',
  description: 'Terms of Service for FloHub - Understand our terms and conditions of use.',
};

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-[var(--fg)]">Terms of Service</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
          <p className="mb-4">
            By accessing or using FloHub, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            If you do not agree with any part of these terms, you may not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. User Accounts</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must notify us immediately of any unauthorized access or use of your account</li>
            <li>We reserve the right to terminate or suspend accounts for violations of these terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Service Usage</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the service for any illegal purposes</li>
            <li>Upload or share malicious content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt our services</li>
            <li>Share your account credentials with others</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
          <p className="mb-4">
            FloHub and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You retain ownership of your content</li>
            <li>You grant us a license to use and display your content for service operation</li>
            <li>You are responsible for your content and its legality</li>
            <li>We may remove content that violates these terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Service Modifications</h2>
          <p className="mb-4">
            We reserve the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Modify or discontinue any part of our service</li>
            <li>Update these terms at any time</li>
            <li>Change our pricing structure with notice</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
          <p className="mb-4">
            FloHub is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
          <p className="mb-4">
            These terms are governed by and construed in accordance with the laws of the jurisdiction in which we operate.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
          <p className="mb-4">
            For any questions about these Terms of Service, please contact us at:
            <br />
            Email: flohubofficial@gmail.com
          </p>
        </section>

        <section>
          <p className="text-sm text-neutral-500">
            Last updated: July 11, 2025
          </p>
        </section>
      </div>
    </div>
  );
}
