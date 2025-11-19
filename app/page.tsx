import { Star, Check, ArrowRight, BookOpen, Moon, Users, Shield, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import AuthAwareCTA from '@/components/AuthAwareCTA'

export default function HomePage() {
  return (
    <>
      {/* Hero Section - Mobile-optimized */}
      <section className="relative overflow-hidden bg-white py-12 md:py-16 lg:py-20 pt-8 md:pt-16">
        <div className="container-narrow section-padding relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="animate-fade-in-up text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight tracking-tight text-gray-900">
                Bedtime Stories Where<br />
                <span className="gradient-text">
                  YOUR Child
                </span>{' '}
                is the Hero
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Personalized AI adventures featuring your child by name, making bedtime magical.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <AuthAwareCTA />
              </div>

              <p className="text-sm md:text-base text-gray-500 mb-8 flex items-center justify-center lg:justify-start gap-2">
                <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <span>No credit card required</span>
              </p>

              {/* Mobile Hero Image */}
              <div className="relative lg:hidden w-full h-[400px] sm:h-[500px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading bedtime stories together"
                  fill
                  sizes="(max-width: 768px) 90vw, (max-width: 1024px) 85vw, 50vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Desktop Hero Image */}
            <div className="relative lg:block hidden">
              <div className="relative w-full h-[600px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading bedtime stories together"
                  fill
                  sizes="50vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Magic Behind Every Story Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Meet the Magic Behind Every Story
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              At Tuck and Tale, every adventure begins with the people (and pets!) your child loves most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Card 1 - Children */}
            <div className="card-interactive p-6 group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/Characters/children.jpg"
                  alt="Children characters in personalized stories"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Your Child, Their Way</h3>
              <p className="text-gray-600 leading-relaxed">
                Stories shaped around your little one — their look, age, and personality.
              </p>
            </div>

            {/* Card 2 - Magical Characters */}
            <div className="card-interactive p-6 group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/Characters/characters.jpg"
                  alt="Magical characters including dragons, mermaids, and elves"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">A World Full of Wonder</h3>
              <p className="text-gray-600 leading-relaxed">
                Magical friends who spark imagination and bring each tale to life.
              </p>
            </div>

            {/* Card 3 - Pets */}
            <div className="card-interactive p-6 group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/Characters/pets.jpg"
                  alt="Beloved pets including dogs and cats joining the story"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Furry Friends Welcome</h3>
              <p className="text-gray-600 leading-relaxed">
                Corgis, pugs, goldens, cats — their favorite buddies can join the fun too.
              </p>
            </div>
          </div>

          <div className="text-center animate-fade-in">
            <p className="text-xl md:text-2xl font-semibold text-gray-800">
              Personalized. Magical. Made just for your family.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-16 bg-gradient-bg-primary">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A magical story made just for your child — in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 - Tell Us About Your Little One */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/How it works/avatar.png"
                  alt="Create a character profile for your child"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">1</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Tell Us About Your Little One</h3>
              <p className="text-gray-600 leading-relaxed">
                Share their name, age, and interests so we can shape a story that feels just like them.
              </p>
            </div>

            {/* Step 2 - Pick an Adventure */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/How it works/create.png"
                  alt="Choose from various story adventures"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">2</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Pick an Adventure</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose from bedtime stories, magical quests, or sweet everyday moments.
              </p>
            </div>

            {/* Step 3 - Watch Their Story Come to Life */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/How it works/read.jpg"
                  alt="Read personalized illustrated stories"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">3</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Watch Their Story Come to Life</h3>
              <p className="text-gray-600 leading-relaxed">
                In seconds, a beautifully illustrated tale appears — starring your child and their friends.
              </p>
            </div>
          </div>

          <div className="text-center animate-fade-in">
            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
              Every bedtime becomes a moment they&apos;ll remember.
            </p>
            <p className="text-lg md:text-xl text-gray-600">
              Personalized, magical, and made for the way your child sees the world.
            </p>
          </div>
        </div>
      </section>

      {/* Early Parent Reactions Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Early Parent Reactions
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-bg-primary">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "My child lit up the moment they saw themselves in the story."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-bg-primary">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "It looks like a Pixar book starring my kid."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-bg-primary">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "Bedtime became fun again."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Mobile-optimized */}
      <section className="py-12 md:py-14 bg-white">
        <div className="container-narrow section-padding">
          {/* Holiday Promotional Banner */}
          <div className="mb-8 md:mb-10">
            <div className="bg-gradient-primary rounded-2xl px-6 py-4 md:px-8 md:py-5 text-center shadow-lg">
              <p className="text-lg md:text-2xl font-bold text-white">
                🎁 Limited-Time Holiday Offer — Save 50% on Starlight & Supernova
              </p>
            </div>
          </div>

          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Give Your Family a Magical Holiday Season
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">
              Enjoy our best pricing of the year — cozy stories, heartfelt moments, and endless imagination.
            </p>

            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white mt-6 px-5 py-2.5 rounded-full text-sm md:text-base font-semibold shadow-md">
              <span>Save even more with annual plans — Limited Holiday Rates</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Link href="/pricing" className="card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all cursor-pointer">
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Moonlight</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">Perfect for trying out bedtime stories</p>
              <div className="mb-6 md:mb-8">
                <span className="text-4xl md:text-5xl font-bold text-gray-900">Free</span>
                <span className="text-gray-600 text-base md:text-lg block mt-1">Forever</span>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">3 illustrated stories to treasure forever</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">5 new text-only stories every month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Create 1 child profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Add 1 storybook character</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Include your family pet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Access to fun, imaginative tales</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Standard support</span>
                </li>
              </ul>
              <button className="btn-secondary btn-md w-full">
                Start Free
              </button>
            </Link>

            {/* Starlight Plan */}
            <Link href="/pricing" className="card p-6 md:p-8 relative border-2 border-primary-400 shadow-blue-glow md:scale-105 active:scale-[0.98] md:hover:shadow-xl transition-all cursor-pointer">
              <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-primary text-white px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-button">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Starlight</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">Ideal for regular bedtime storytelling</p>
              <div className="mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <span className="text-2xl md:text-3xl font-semibold text-gray-400 line-through">$19.95</span>
                  <span className="text-4xl md:text-5xl font-bold gradient-text">$9.95</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600 text-base md:text-lg">/month</span>
                  <span className="block text-xs md:text-sm text-orange-600 font-semibold mt-1">Holiday Pricing</span>
                </div>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">20 illustrated stories every month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">50 text-only stories monthly</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Up to 3 child profiles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">5 storybook characters to bring to life</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Multiple pets & magical creatures</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Growth stories for emotional learning</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Explore genres & writing styles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Save favorites in your story library</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Advanced customization options</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>
              <button className="btn-primary btn-md w-full">
                Get Started
              </button>
            </Link>

            {/* Supernova Plan */}
            <Link href="/pricing" className="card p-6 md:p-8 hover:shadow-card-hover hover:-translate-y-1 transition-all cursor-pointer">
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Supernova</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">For families who love daily story time</p>
              <div className="mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <span className="text-2xl md:text-3xl font-semibold text-gray-400 line-through">$29.95</span>
                  <span className="text-4xl md:text-5xl font-bold text-gray-900">$14.95</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600 text-base md:text-lg">/month</span>
                  <span className="block text-xs md:text-sm text-orange-600 font-semibold mt-1">Holiday Pricing</span>
                </div>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">40 illustrated stories each month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">100 text-only stories monthly</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Up to 10 child profiles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">20 unique storybook characters</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Unlimited pets & magical creatures</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Growth stories with emotional lessons</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">All genres & custom writing styles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Your complete story library & favorites</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Advanced customization & themes</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Early access to new features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Premium support</span>
                </li>
              </ul>
              <button className="btn-secondary btn-md w-full">
                Get Started
              </button>
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500 mt-10">
            Manage billing & subscription
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-bg-primary relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-primary opacity-30"></div>
        <div className="container-narrow section-padding text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-gray-900">
            Ready to create your first story?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Craft captivating stories today — no credit card required.
          </p>
          <AuthAwareCTA>
            <>
              Get started now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          </AuthAwareCTA>
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
    </>
  )
}