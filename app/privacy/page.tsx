import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tuck and Tale',
  description: 'Our commitment to protecting your family\'s privacy and data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
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
      <section className="section-padding py-16 bg-gray-50">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Tuck and Tale ("we," "our," or "us"). Tuck and Tale is a registered Doing Business As (DBA) brand of NovaPoint AI, LLC, a U.S.-based company and the legal entity that operates and provides this Service. Your family's trust means everything to us, and we are committed to protecting your privacy and your child's privacy.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This Privacy Policy explains what information we collect, how we use it to create personalized stories, and the choices you have. We designed this policy to be clear, parent-friendly, and protective of your rights.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using Tuck and Tale, you agree to the practices described below.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect only the information needed to provide and improve your storytelling experience.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Information you provide</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Account details: name, email address, and password</li>
                <li>Child profile details: name, age, interests, and optional physical characteristics (used only to personalize stories)</li>
                <li>Stories and content: the stories you create, save, or share</li>
                <li>Payment details: handled securely through Stripe (we never see or store your full payment information)</li>
                <li>Support messages: when you contact us for help</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Information collected automatically</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may collect limited technical information (like device type, browser, and usage patterns) to keep Tuck and Tale running smoothly and securely.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Create personalized stories for your child</li>
                <li>Operate, maintain, and improve our service</li>
                <li>Manage your subscription and process payments</li>
                <li>Send service updates, product announcements, and optional marketing (only with your consent)</li>
                <li>Provide customer support</li>
                <li>Monitor for misuse or technical issues</li>
                <li>Improve our storytelling models and platform features</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                We do not use your child's information for advertising, profiling, or sharing with data brokers. Ever.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">4. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                Tuck and Tale is for parents and guardians, not children.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not knowingly allow children under 13 to create accounts or submit personal information.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Child profile information entered by a parent/guardian is used only to personalize stories and is never shared with advertisers or sold.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you believe a child has provided information to us directly, please contact us and we will delete it.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">5. How We Share Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                We do not sell, rent, or trade your personal information.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share limited information only in the following cases:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><span className="font-semibold">Service Providers:</span> Trusted partners who help operate Tuck and Tale (e.g., Stripe for payments, hosting providers, email services). They only use the data to perform services for us.</li>
                <li><span className="font-semibold">Legal Requirements:</span> If required to comply with laws, court orders, or government requests.</li>
                <li><span className="font-semibold">Protection & Safety:</span> To protect the rights, property, or safety of Tuck and Tale, our users, or the public.</li>
                <li><span className="font-semibold">Business Transitions:</span> In the event of a merger, acquisition, or sale, your information may be transferred to the new entity—but your privacy protections will remain.</li>
                <li><span className="font-semibold">AI Service Providers:</span> To generate personalized stories, we share profile information (such as your child's name, age, and interests) with trusted AI providers. We select providers with policies that prohibit using customer data for model training, and we configure our accounts to opt out of data retention where available.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not allow third parties to use your data for their own marketing purposes.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use industry-standard security measures—including encryption, access controls, and secure data storage—to protect your information.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                However, no online service is completely immune to risks. We work continuously to keep your data safe and will notify you promptly if a significant issue arises.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                You have full control over your information and can:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Access and update your account anytime</li>
                <li>Request deletion of your account and associated personal data</li>
                <li>Request a copy of the data we hold about you</li>
                <li>Opt out of marketing emails</li>
                <li>Manage cookie preferences through your browser</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-2 font-semibold">Data Deletion & Retention</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you request account deletion, we will delete or anonymize most of your personal information. However, we may retain certain data when necessary for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Legal, tax, or accounting obligations (e.g., transaction records)</li>
                <li>Fraud prevention, security, and abuse monitoring</li>
                <li>Maintaining system integrity, including data stored in automated backups that are securely retained for a limited time</li>
                <li>Meeting our contractual obligations</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Any retained information is limited to what is strictly necessary and will not be used for personalization, marketing, or story generation.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">8. Cookies & Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tools to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Keep you logged in</li>
                <li>Personalize your experience</li>
                <li>Understand how families use our service</li>
                <li>Improve performance and reliability</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can manage or disable cookies in your browser settings, though parts of the app may not work as expected without them.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this policy occasionally to reflect new features or legal requirements. If changes are significant, we'll notify you clearly in the app or by email.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The "Last Updated" date reflects the latest version.
              </p>

              <h2 className="font-display font-bold text-2xl text-gray-900 mt-8 mb-4">10. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please use our contact form to get in touch.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This Privacy Policy is governed by the laws of the Commonwealth of Virginia.
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
      <section className="section-padding py-16 bg-white">
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
