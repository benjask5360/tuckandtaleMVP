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
      answer: 'Tuck and Tale is a personalized AI-powered storytelling platform that creates magical, illustrated stories featuring your child as the main character. Each story is tailored to your child\'s interests, age, and developmental stage.'
    },
    {
      question: 'How does it work?',
      answer: 'Simply create a profile for your child with their name, age, interests, and appearance. Then choose story themes, length, and whether you want illustrations. Our AI creates a unique, personalized story just for them!'
    },
    {
      question: 'What age range is Tuck and Tale designed for?',
      answer: 'Tuck and Tale is perfect for children ages 2-12. Our stories adapt to your child\'s age and reading level, ensuring they\'re both engaging and age-appropriate.'
    },
    {
      question: 'How many stories can I create?',
      answer: 'It depends on your subscription tier! Free accounts get a limited number of stories per month, while premium tiers offer more stories and additional features like unlimited illustrated stories.'
    },
    {
      question: 'Can I include multiple children in a story?',
      answer: 'Yes! With our premium tiers, you can create stories featuring siblings, friends, and even pets. This makes storytelling even more personal and fun for your family.'
    },
    {
      question: 'Are the illustrations safe for children?',
      answer: 'Absolutely! All our AI-generated illustrations are carefully designed to be child-friendly, age-appropriate, and wholesome. We take child safety very seriously.'
    },
    {
      question: 'Can I save and share stories?',
      answer: 'Yes! All your created stories are saved in your library. You can revisit them anytime, and we\'re working on features to help you share favorite stories with family and friends.'
    },
    {
      question: 'What makes Tuck and Tale different from other story apps?',
      answer: 'Tuck and Tale combines personalization, beautiful AI-generated illustrations, and educational value. Every story is unique and created just for your child, featuring them as the hero of their own adventure.'
    },
    {
      question: 'Do you offer a free trial?',
      answer: 'Yes! Our free tier lets you try Tuck and Tale with a limited number of stories each month. You can upgrade anytime to unlock more features and unlimited stories.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time from your account settings. You\'ll continue to have access to your current plan until the end of your billing period.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards through our secure payment processor, Stripe. Your payment information is never stored on our servers.'
    },
    {
      question: 'How do I contact support?',
      answer: 'You can reach our support team at support@tuckandtale.com. We typically respond within 24 hours on business days.'
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
