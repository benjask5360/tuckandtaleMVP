'use client'

import { useState } from 'react'
import { ArrowRight, Heart } from 'lucide-react'
import Image from 'next/image'
import WaitlistModal from '@/components/WaitlistModal'

export default function WaitlistPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      {/* Hero Section - Mobile-optimized */}
      <section className="relative overflow-hidden bg-white py-12 md:py-16 lg:py-20 pt-8 md:pt-16">
        <div className="container-narrow section-padding relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="animate-fade-in-up text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight tracking-tight text-gray-900">
                <span className="gradient-text">
                  Stories That Actually Work
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Personalized stories based on techniques child therapists use — for tantrums, bedtime battles, big emotions, and more.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary btn-xl group"
                >
                  Join the Waitlist
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <p className="text-sm md:text-base text-gray-500 mb-8 flex items-center justify-center lg:justify-start gap-2">
                <span>Coming soon. Be first to get early access.</span>
              </p>

              {/* Mobile Hero Image */}
              <div className="relative lg:hidden w-full h-[400px] sm:h-[500px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading stories together"
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
                  alt="Family reading stories together"
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

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> in the USA for little dreamers everywhere
            </p>
            <p className="text-center text-gray-500">© 2025 Tuck and Tale™. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
