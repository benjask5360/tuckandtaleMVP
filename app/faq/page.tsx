import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ | Tuck and Tale',
  description: 'Frequently asked questions about Tuck and Tale personalized storytelling.',
};

export default function FAQPage() {
  const faqs = [
    {
      question: 'What is Tuck and Tale?',
      answer: 'Tuck and Tale is a personalized, AI-powered storytelling platform that brings your child into the heart of their own magical adventures. Each story is crafted around your child\'s name, interests, age, and personality—making every tale feel like it was written just for them.'
    },
    {
      question: 'How does it work?',
      answer: 'Create a quick profile for your child, choose the type of story you want, and our AI builds a fully customized tale—complete with optional illustrations. Every story is unique, heartfelt, and designed to spark imagination.'
    },
    {
      question: 'What ages is Tuck and Tale for?',
      answer: 'Our stories are designed for kids ages 2–12. Story tone, vocabulary, and themes automatically adapt to your child\'s age and reading level.'
    },
    {
      question: 'How many stories can I create?',
      answer: 'It depends on your subscription tier! The Free plan includes a small number of stories each month. Premium plans unlock more stories, more illustrations, and richer personalization options.'
    },
    {
      question: 'Can I include more than one child in a story?',
      answer: 'Absolutely. Premium tiers let you create stories featuring siblings, friends, and pets—perfect for bedtime, birthdays, or special family moments.'
    },
    {
      question: 'Are the illustrations safe and appropriate?',
      answer: 'Yes! All illustrations are generated with strict child-friendly guidelines in place. We ensure art stays wholesome, gentle, and age-appropriate.'
    },
    {
      question: 'Can I save or share stories?',
      answer: 'Yes. Every story you create stays in your personal library. You can reread them anytime, and we\'re working on simple ways to share special stories with loved ones.'
    },
    {
      question: 'What makes Tuck and Tale different from other story apps?',
      answer: 'We combine deeply personalized storytelling, beautiful AI-generated illustrations, and emotional learning. Your child becomes the hero—not just a character in a generic template. No two stories are ever the same.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Our Free plan gives you a taste of personalized storytelling with a limited number of stories each month. You can upgrade anytime to unlock more features and unlimited magical adventures.'
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'Of course. You can cancel anytime from your account settings, and you\'ll keep access to your plan until the end of your billing cycle.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We securely accept all major credit and debit cards through Stripe. Your payment information is never stored on our servers.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Everything you need to know about Tuck and Tale.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details key={index} className="group bg-white rounded-2xl shadow-sm overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                    <h3 className="font-semibold text-lg text-gray-900 pr-4">{faq.question}</h3>
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>

            {/* Still Have Questions */}
            <div className="mt-12 text-center bg-white rounded-2xl shadow-sm p-8">
              <h2 className="font-display font-bold text-2xl text-gray-900 mb-3">
                Still have questions?
              </h2>
              <p className="text-gray-600 mb-6">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
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
