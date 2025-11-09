import { Star, Check, ArrowRight, BookOpen, Moon, Users, Shield, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import AuthAwareCTA from '@/components/AuthAwareCTA'

export default function HomePage() {
  return (
    <>
      {/* Hero Section - Mobile-optimized */}
      <section className="relative overflow-hidden bg-gradient-bg-warm py-12 md:py-16 lg:py-20 pt-16">
        <div className="absolute inset-0 gradient-mesh opacity-40"></div>
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
                <span>No credit card required • Start with 3 free stories</span>
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

      {/* Stories Kids Actually Want Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Stories Kids Actually Want to Hear
            </h2>
            <p className="text-xl text-gray-600">
              Every story is unique and personalized
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Luna's Space Adventure",
                description: "Luna put on her sparkly space helmet and zoomed past twinkling stars.",
                age: "Ages 4-6",
                time: "10 minutes",
                color: "from-sky-400 to-primary-500"
              },
              {
                title: "Max and the Friendly Dragon",
                description: "Max wasn't scared when he met the dragon. In fact, they became best friends!",
                age: "Ages 5-8",
                time: "15 minutes",
                color: "from-purple-400 to-purple-600"
              },
              {
                title: "Emma's Underwater Kingdom",
                description: "Emma discovered she could breathe underwater and talk to the colorful fish.",
                age: "Ages 6-9",
                time: "12 minutes",
                color: "from-teal-400 to-teal-600"
              }
            ].map((story, index) => (
              <div key={index} className="card-interactive p-6 group">
                <div className={`h-48 bg-gradient-to-br ${story.color} rounded-2xl mb-5 flex items-center justify-center group-hover:scale-105 transition-transform shadow-soft`}>
                  <Moon className="w-16 h-16 text-white/90 group-hover:rotate-12 transition-transform" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{story.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{story.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="badge-gray">{story.age}</span>
                  <span className="text-gray-500">{story.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parents Love It Section */}
      <section className="py-12 md:py-16 bg-gradient-bg-primary">
        <div className="container-narrow section-padding">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Parents Love It
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah M.",
                role: "Mom of 2",
                review: "My daughter asks for her 'Tuck and Tale' story EVERY night now. She loves hearing her name!",
                rating: 5
              },
              {
                name: "James P.",
                role: "Dad of 3",
                review: "Finally found something that actually gets my son excited for bedtime. The personalization is amazing.",
                rating: 5
              },
              {
                name: "Maria L.",
                role: "Mom of Twins",
                review: "The stories are educational AND entertaining. My kids have learned so much!",
                rating: 5
              }
            ].map((review, index) => (
              <div key={index} className="card p-8 hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-blue-glow">
                    <span className="text-white font-bold text-xl">
                      {review.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.name}</p>
                    <p className="text-sm text-gray-500">{review.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed">"{review.review}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Everything You Need for Magical Bedtime
            </h2>
            <p className="text-xl text-gray-600">
              Create personalized stories your kids will love, night after night
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="card-feature group">
              <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-blue-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Personalized Stories & Illustrations</h3>
              <p className="text-gray-600 leading-relaxed">
                Beautiful AI-generated stories and artwork featuring your child as the main hero, with their name, age, and favorite things
              </p>
            </div>

            <div className="card-feature group">
              <div className="w-20 h-20 bg-gradient-purple rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-purple-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Endless Adventures with Best Friends Characters</h3>
              <p className="text-gray-600 leading-relaxed">
                Never run out of story ideas! Include pets, siblings, and friends to make the story even more special
              </p>
            </div>

            <div className="card-feature group">
              <div className="w-20 h-20 bg-gradient-teal rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-teal-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Perfect for Bedtime</h3>
              <p className="text-gray-600 leading-relaxed">
                Calming stories designed to help kids settle down peacefully. Story library & favorites available anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Mobile-optimized */}
      <section className="py-12 md:py-14 bg-gradient-bg-warm">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              Choose Your Plan
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">
              Select the perfect plan for your family's storytelling adventures
            </p>

            <div className="inline-flex items-center gap-2 badge-primary mt-6 px-5 py-2.5 text-sm md:text-base">
              <span>Save 30%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all">
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Moonlight</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">Perfect for trying out bedtime stories</p>
              <div className="mb-6 md:mb-8">
                <span className="text-4xl md:text-5xl font-bold text-gray-900">Free</span>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">3 stories per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">1 child profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Basic story customization</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Save one album</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Standard illustrations</span>
                </li>
              </ul>
              <button className="btn-secondary btn-md w-full">
                Start Free
              </button>
            </div>

            {/* Starlight Plan */}
            <div className="card p-6 md:p-8 relative border-2 border-primary-400 shadow-blue-glow md:scale-105 active:scale-[0.98] md:hover:shadow-xl transition-all">
              <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-primary text-white px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-button">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Starlight</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">Ideal for regular bedtime storytelling</p>
              <div className="mb-6 md:mb-8">
                <span className="text-4xl md:text-5xl font-bold gradient-text">$9.99</span>
                <span className="text-gray-600 text-base md:text-lg">/month</span>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">30 stories per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Up to 3 child profiles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Advanced customization</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Include pets & characters</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Multiple story lengths</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Story library & favorites</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>
              <button className="btn-primary btn-md w-full">
                Get Started
              </button>
            </div>

            {/* Supernova Plan */}
            <div className="card p-8 hover:shadow-card-hover hover:-translate-y-1 transition-all">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Supernova</h3>
              <p className="text-gray-600 mb-6">For families who love daily story time</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">$24.99</span>
                <span className="text-gray-600 text-lg">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited stories</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited child profiles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Advanced customization</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Include pets & characters</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Custom themes and story arcs</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Story library & favorites</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Premium support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Early access to new features</span>
                </li>
              </ul>
              <button className="btn-secondary btn-md w-full">
                Get Started
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-10">
            Manage billing & subscription
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-purple opacity-30"></div>
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
            <p className="flex items-center gap-2 text-lg text-gray-700">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="#" className="hover:text-primary-600 transition-colors">About</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}