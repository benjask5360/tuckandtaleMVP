import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Star, Gift, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Founder Parents | Tuck and Tale',
  description: 'Join our exclusive Founder Parents program and help shape the future of Tuck and Tale.',
};

export default function FounderParentsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Founder Parents
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Join our exclusive community and help shape the future of personalized storytelling.
            </p>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="section-padding py-16 bg-gray-50">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 mb-12">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-6 text-center">
                What is Founder Parents?
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Founder Parents is our exclusive early supporter program for families who believe in the mission of Tuck and Tale. As a Founder Parent, you're not just a subscriber—you're a valued partner helping us build the best storytelling platform for families.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Your feedback, ideas, and support directly influence our product roadmap. Together, we're creating something truly special for children and families everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding py-16 bg-white">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Founder Parents Benefits
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Exclusive perks and benefits for our early supporters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Benefit 1 */}
            <div className="bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900">
                  Founder Parent Discount
                </h3>
              </div>
              <p className="text-gray-600">
                Lock in special founder pricing—never pay full price!
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900">
                  Early Access
                </h3>
              </div>
              <p className="text-gray-600">
                Be the first to try new features before anyone else.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900">
                  Exclusive Perks
                </h3>
              </div>
              <p className="text-gray-600">
                Special gifts, bonus stories, and surprise rewards throughout the year.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900">
                  Direct Impact
                </h3>
              </div>
              <p className="text-gray-600">
                Your feedback shapes our roadmap—help build features families love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Join Section */}
      <section className="section-padding py-16 bg-gray-50">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-6 text-center">
                How to Become a Founder Parent
              </h2>
              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Founder Parents program is invite-only for early subscribers. Interested? Reach out below and we'll let you know if you qualify.
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                  Check Eligibility
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
