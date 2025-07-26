import React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Terms of Service - FloHub',
  description: 'Terms of Service for FloHub - Understand our terms and conditions of use.',
};

function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Understanding our terms helps you use FloHub with confidence. Let's make productivity simple together.
          </p>
        </div>
        
        {/* Content */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              1. Agreement to Terms
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              By accessing or using FloHub, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              If you do not agree with any part of these terms, you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              2. User Accounts
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You must provide accurate and complete information when creating an account</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You are responsible for maintaining the security of your account credentials</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You must notify us immediately of any unauthorized access or use of your account</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>We reserve the right to terminate or suspend accounts for violations of these terms</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              3. Service Usage
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>You agree not to:</p>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></div>
                  <span>Use the service for any illegal purposes</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></div>
                  <span>Upload or share malicious content</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></div>
                  <span>Attempt to gain unauthorized access to our systems</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></div>
                  <span>Interfere with or disrupt our services</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></div>
                  <span>Share your account credentials with others</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              4. Intellectual Property
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              FloHub and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              5. User Content
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You retain ownership of your content</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You grant us a license to use and display your content for service operation</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>You are responsible for your content and its legality</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>We may remove content that violates these terms</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              6. Service Modifications
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              We reserve the right to:
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-6">
              <ul className="space-y-3 text-neutral-700 dark:text-neutral-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Modify or discontinue any part of our service</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Update these terms at any time</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                  <span>Change our pricing structure with notice</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              7. Limitation of Liability
            </h2>
            <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl p-6">
              <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                FloHub is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of our service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              8. Governing Law
            </h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              These terms are governed by and construed in accordance with the laws of the jurisdiction in which we operate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 dark:text-neutral-100" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--primary)' }}>
              9. Contact
            </h2>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6">
              <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                For any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4">
                <p className="font-medium text-neutral-800 dark:text-neutral-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Email: <a href="mailto:flohubofficial@gmail.com" className="text-primary hover:text-primary/80 transition-colors">flohubofficial@gmail.com</a>
                </p>
              </div>
            </div>
          </section>

          <section>
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
TermsOfService.auth = false;

export default TermsOfService;
