import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Tuck and Tale',
  description: 'Terms and conditions for using Tuck and Tale.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Terms of Service
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Please read these terms carefully before using Tuck and Tale.
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-sm text-gray-500 mb-8">Last Updated: January 2025</p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing or using Tuck and Tale ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Tuck and Tale is a personalized storytelling platform that uses AI technology to create custom stories and illustrations featuring your children. The Service is provided on a subscription basis with different tier options.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To use certain features of our Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">4. Subscription and Payment</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Subscription Tiers:</strong> We offer multiple subscription tiers with varying features and limits. Subscription fees are billed in advance on a monthly or annual basis.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Payment:</strong> You authorize us to charge your payment method for all fees incurred. All payments are processed securely through Stripe.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Cancellation:</strong> You may cancel your subscription at any time. Cancellation will be effective at the end of your current billing period. No refunds will be provided for partial billing periods.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Price Changes:</strong> We reserve the right to modify subscription pricing with at least 30 days notice. Continued use of the Service after a price change constitutes acceptance of the new price.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Violate the intellectual property rights of others</li>
                <li>Upload or transmit viruses or malicious code</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to create inappropriate or harmful content</li>
                <li>Share your account credentials with others</li>
                <li>Resell or redistribute content created by the Service</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Our Content:</strong> The Service, including all content, features, and functionality, is owned by Tuck and Tale and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Your Content:</strong> You retain ownership of the information you provide to create stories. Stories and illustrations generated by our Service are licensed to you for personal, non-commercial use. You may not sell, redistribute, or commercially exploit the generated content.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">7. AI-Generated Content</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service uses artificial intelligence to generate stories and illustrations. While we strive for quality and appropriateness, AI-generated content may occasionally produce unexpected results. We are not responsible for the specific content generated, though we continuously work to improve our systems and filters.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TUCK AND TALE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">10. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your account and access to the Service at our discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page. Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about these Terms, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Email: <a href="mailto:legal@tuckandtale.com" className="text-primary-600 hover:text-primary-700 font-semibold">legal@tuckandtale.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <Link href="/auth/login" className="block">
            <div className="bg-gradient-primary rounded-3xl p-8 md:p-12 text-center text-white cursor-pointer hover:opacity-95 transition-opacity">
              <h2 className="font-display font-bold text-3xl md:text-4xl mb-4 text-white">
                Ready to Create Magic?
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Join thousands of families creating personalized stories that inspire and delight.
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2025 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="/about" className="hover:text-primary-600 transition-colors">About</a>
                <a href="/pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
                <a href="/contact" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="/faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="/founder-parents" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
