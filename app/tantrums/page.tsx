import type { Metadata } from 'next'
import { Star, Check, ArrowRight, BookOpen, Moon, Users, Shield, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import AuthAwareCTA from '@/components/AuthAwareCTA'

export const metadata: Metadata = {
  title: 'Fewer Tantrums Start at Bedtime | Tuck and Tale',
  description: 'Personalized bedtime stories that teach calm and emotional regulation. Your child as the hero. Ready in minutes. No credit card required.',
}

export default function TantrumsPage() {
  return (
    <>
      {/* Hero Section - Mobile-optimized */}
      <section className="relative overflow-hidden bg-white py-12 md:py-16 lg:py-20 pt-8 md:pt-16">
        <div className="container-narrow section-padding relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="animate-fade-in-up text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight tracking-tight text-gray-900">
                Fewer Tantrums<br />
                <span className="gradient-text">
                  Start at Bedtime
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Personalized bedtime stories that teach calm and emotional regulation.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <AuthAwareCTA>
                  <>
                    Create Your Free Story
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                </AuthAwareCTA>
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

      {/* How It Helps With Tantrums Section */}
      <section className="py-12 md:py-16 bg-gradient-bg-primary">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              How It Helps With Tantrums
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A calmer bedtime in three simple steps.
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

            {/* Step 2 - Pick a Growth Story */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src="/images/How it works/growth.png"
                  alt="Choose growth stories that teach emotional regulation"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">2</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Pick a Growth Story</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose stories that teach calm, emotional regulation, and big feelings.
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
                In seconds, a beautifully illustrated tale appears — with your child learning to manage tough moments.
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
                "Bedtime tantrums have practically disappeared since we started reading these stories."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-bg-primary">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "My child actually looks forward to calming down now. These stories work like magic."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-bg-primary">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "Finally, a tool that helps teach emotional regulation in a way my toddler actually enjoys."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-bg-primary relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-primary opacity-30"></div>
        <div className="container-narrow section-padding text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-gray-900">
            Turn Bedtime Battles Into Bonding Time
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Create calming personalized stories in minutes — no credit card required.
          </p>
          <AuthAwareCTA>
            <>
              Create Your Free Story
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
