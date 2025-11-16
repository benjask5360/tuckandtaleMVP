import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tuck and Tale',
  description: 'Our commitment to protecting your family\'s privacy and data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Privacy Policy
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Your family's privacy and security are our top priorities.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-sm text-gray-500 mb-8">Last Updated: January 2025</p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Tuck and Tale ("we," "our," or "us"). We are committed to protecting your privacy and the privacy of your children. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Account information (name, email address, password)</li>
                <li>Child profile information (name, age, interests, physical characteristics for story personalization)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Stories you create and save</li>
                <li>Communications with our support team</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Create personalized stories for your children</li>
                <li>Process your payments and manage your subscription</li>
                <li>Send you updates, newsletters, and marketing communications (with your consent)</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues or fraudulent activity</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">4. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We take children's privacy seriously. Our service is designed for parents and guardians to create stories for their children. We do not knowingly collect personal information directly from children under 13 without parental consent. The child profile information you provide is used solely to personalize stories and is never shared with third parties for marketing purposes.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">5. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>With service providers who help us operate our business (e.g., payment processing, hosting)</li>
                <li>To comply with legal obligations or respond to lawful requests</li>
                <li>To protect our rights, privacy, safety, or property, and that of our users</li>
                <li>In connection with a merger, sale, or acquisition of our business</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Access, update, or delete your account information</li>
                <li>Request a copy of the data we hold about you</li>
                <li>Opt-out of marketing communications</li>
                <li>Delete your account and associated data</li>
                <li>Object to certain processing of your information</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to improve your experience, analyze usage, and deliver personalized content. You can control cookies through your browser settings.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">10. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Email: <a href="mailto:privacy@tuckandtale.com" className="text-primary-600 hover:text-primary-700 font-semibold">privacy@tuckandtale.com</a>
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
              <p className="text-center md:text-left text-gray-500">© 2024 Tuck and Tale™. All rights reserved.</p>
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
