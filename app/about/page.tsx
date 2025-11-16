import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Heart, BookOpen, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Tuck and Tale',
  description: 'Learn about Tuck and Tale - personalized AI-powered storytelling for children.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              About Tuck and Tale
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Creating magical, personalized stories that help children grow, learn, and dream.
            </p>
          </div>
        </div>
      </section>

      {/* Founder's Message Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-8 text-center">
                Founder's Message
              </h2>

              {/* Founder Image */}
              <div className="flex justify-center mb-8">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg">
                  <Image
                    src="/images/founder.png"
                    alt="Ben, Founder of Tuck and Tale"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-4">
                  I'm a dad of three, and like most parents, I'm always searching for ways to make our time together feel a little more meaningful — especially at bedtime. My kids love pictures, especially ones of themselves, and I wanted to build something they would truly enjoy. So we made Tuck & Tale fun, magical, and full of moments that feel personal to them.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  But beyond the smiles, there was something deeper we wanted to create. With all the noise and distractions in today's world, I wanted a way to craft stories that could actually help them grow — stories that gently teach, encourage curiosity, and remind them just how special they are.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Tuck & Tale is the result of those bedtime moments: a place where imagination and learning meet, wrapped in artwork kids love and stories they'll remember.
                </p>
                <p className="text-gray-700 leading-relaxed italic">
                  Thank you for letting us be part of your family's story.
                </p>
                <p className="text-gray-900 font-semibold mt-2">
                  — Ben, Founder & Dad
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Highlights Section */}
      <section className="section-padding py-16 bg-white">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              {/* TODO: Add your stats section title */}
              Making an Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {/* TODO: Add your stats description */}
              Join thousands of families creating magical moments together.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Stat 1 */}
            <div className="text-center p-8 bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                2K+
              </div>
              <div className="text-gray-700 font-semibold">
                Happy Families
              </div>
            </div>

            {/* Stat 2 */}
            <div className="text-center p-8 bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                250K+
              </div>
              <div className="text-gray-700 font-semibold">
                Stories Created
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values/Features Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              {/* TODO: Add your values section title */}
              What We Believe
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {/* TODO: Add your values description */}
              Our core values guide everything we create.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Value 1 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                {/* TODO: Replace with your value title */}
                Imagination
              </h3>
              <p className="text-gray-600">
                {/* TODO: Replace with your value description */}
                We believe every child deserves stories that spark their imagination and creativity.
              </p>
            </div>

            {/* Value 2 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                {/* TODO: Replace with your value title */}
                Personalization
              </h3>
              <p className="text-gray-600">
                {/* TODO: Replace with your value description */}
                Every child is unique, and their stories should reflect their individual personality.
              </p>
            </div>

            {/* Value 3 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                {/* TODO: Replace with your value title */}
                Education
              </h3>
              <p className="text-gray-600">
                {/* TODO: Replace with your value description */}
                Stories that entertain while teaching valuable life lessons and skills.
              </p>
            </div>

            {/* Value 4 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                {/* TODO: Replace with your value title */}
                Connection
              </h3>
              <p className="text-gray-600">
                {/* TODO: Replace with your value description */}
                Building stronger bonds between parents and children through shared stories.
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
