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
              <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing or using Tuck and Tale ("Tuck and Tale," "we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). Tuck and Tale is a registered Doing Business As (DBA) brand of NovaPoint AI, LLC, a U.S.-based company and the legal entity that operates and provides this Service. If you do not agree to these Terms, please do not use the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms apply to all users, including parents and guardians who create accounts to generate stories for their children.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Tuck and Tale is a personalized storytelling platform that uses artificial intelligence to create custom stories and illustrations. The Service includes free and paid subscription options with varying features, limits, and access levels.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update or modify the Service over time to improve functionality, security, or content.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To access certain features, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide accurate and up-to-date registration information</li>
                <li>Maintain the confidentiality of your password</li>
                <li>Accept full responsibility for all activity under your account</li>
                <li>Notify us immediately of any unauthorized access, security breach, or suspicious activity</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Tuck and Tale is intended for parents and guardians. Children under 13 may not create accounts or submit personal information.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">4. Subscription and Payment</h2>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Free Trial</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                New users receive a 7-day free trial with access to up to 30 stories. A valid credit card is required to start the trial. If you cancel before the trial ends, you will not be charged. If you do not cancel, your subscription will automatically begin at the end of the trial period.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Subscription Plans</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We offer multiple subscription tiers with different benefits and usage limits.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Billing</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Fees are billed in advance on a monthly or annual basis.</li>
                <li>You authorize us to charge your selected payment method for all applicable fees.</li>
                <li>All payments are processed securely via Stripe.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Cancellation</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may cancel at any time. Your subscription will remain active until the end of your current billing period. We do not offer refunds for partial billing periods.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Price Changes</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update pricing with at least 30 days' notice via email or within the platform. Continued use after the change constitutes acceptance.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Satisfaction Guarantee</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Paid subscribers may request a full refund within 30 days of their first paid charge if they have created 3 or fewer stories total (including during the trial period). To request a refund, contact us through our contact form. Refunds are processed within 5-7 business days to your original payment method. After 30 days, or once a 4th story has been created, refunds are no longer available. You may cancel anytime, and your subscription will remain active until the end of your current billing period.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Break any laws or regulations</li>
                <li>Upload harmful, inappropriate, or abusive content</li>
                <li>Impersonate another person or misrepresent your identity</li>
                <li>Violate copyrights, trademarks, or intellectual property rights</li>
                <li>Interfere with or disrupt servers, networks, or security systems</li>
                <li>Attempt to reverse-engineer the Service or its models</li>
                <li>Share account access, resell features, or misuse generated content</li>
                <li>Use the Service to create harmful, unsafe, or adult content</li>
                <li>Use generated content to train, develop, or improve any artificial intelligence or machine learning system</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to remove content or suspend accounts that violate these rules.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Our Content</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service—including software, models, illustrations, design, and branding—is owned by Tuck and Tale and protected by copyright, trademark, and other laws.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Your Content</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of the information you provide (e.g., names, descriptions, preferences).
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using the Service, you grant us a license to use this data to operate, personalize, improve, and promote the Service, including the use of anonymized or aggregated content for marketing purposes.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Generated Stories & Illustrations</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You receive a personal, non-exclusive, non-transferable license to use the stories and illustrations generated for personal, non-commercial purposes (e.g., sharing with family, printing at home).
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not sell, publish commercially, or redistribute generated content in a way that competes with our Service.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">7. AI-Generated Content</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our platform uses artificial intelligence. While we strive for high quality, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>AI outputs may occasionally be imperfect, repetitive, biased, or unexpected</li>
                <li>You are responsible for reviewing content before sharing it with your child</li>
                <li>We are not liable for specific content generated by the AI</li>
                <li>We regularly train and refine our systems to improve quality and safety</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service is provided "as is" and "as available."
                We make no warranties—express or implied—regarding:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>uninterrupted operation</li>
                <li>error-free content</li>
                <li>guaranteed accuracy or reliability</li>
                <li>suitability for a particular purpose</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You use the Service at your own discretion and risk.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Tuck and Tale is not liable for any indirect, incidental, consequential, or special damages.</li>
                <li>Our total liability for any claim shall not exceed the amount paid by you in the last 12 months (or $0 if you use the free tier).</li>
                <li>This includes—but is not limited to—loss of data, loss of profits, service interruptions, or content issues.</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">10. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree to indemnify, defend, and hold harmless Tuck and Tale, NovaPoint AI LLC, and their officers, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney's fees) arising from your use of the Service, your violation of these Terms, or your infringement of any third-party rights.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">11. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may suspend or terminate your account—without refund—if:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>You violate these Terms</li>
                <li>Your behavior poses risk to others or to the platform</li>
                <li>We suspect fraudulent or abusive activity</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may also delete your account at any time.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">12. Changes to These Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update these Terms periodically. When we do:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>The "Last Updated" date will change</li>
                <li>Material updates will be communicated through in-app notifications or email</li>
                <li>By continuing to use the Service after changes take effect, you agree to the updated Terms.</li>
              </ul>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">13. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved in the state or federal courts located in Virginia, and you consent to the personal jurisdiction of such courts.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">14. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms, please use our contact form to get in touch.
              </p>
              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                  Contact Us
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
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
                Join families creating personalized stories that inspire and delight.
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                Start Your Free Trial
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
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> in the USA for little dreamers everywhere
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
