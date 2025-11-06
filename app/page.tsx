import { Star, Check, ArrowRight, BookOpen, Moon, Users, Shield, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16">
        <div className="absolute inset-0 gradient-mesh opacity-30"></div>
        <div className="container-narrow section-padding relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <h1
                className="text-4xl md:text-5xl lg:text-[56px] mb-4 sm:mb-6 leading-[1.1]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#1A1A1A'
                }}
              >
                Bedtime Stories Where<br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700
                  }}
                >
                  YOUR Child
                </span>{' '}
                is the Hero
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-neutral-500 mb-6 sm:mb-8 max-w-lg">
                Personalized AI adventures featuring your child by name, making bedtime magical.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/auth/signup">
                  <button className="btn-primary btn-lg group">
                    Start Creating Stories
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </div>

              <p className="text-sm text-neutral-500 mb-8">
                No credit card required • Start with 3 free stories
              </p>

              {/* Mobile Hero Image */}
              <div className="relative lg:hidden w-full h-[400px] sm:h-[500px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading bedtime stories together"
                  fill
                  sizes="100vw"
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
      <section className="py-16 bg-blue-50">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Stories Kids Actually Want to Hear
            </h2>
            <p className="text-xl text-neutral-500">
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
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Max and the Friendly Dragon",
                description: "Max wasn't scared when he met the dragon. In fact, they became best friends!",
                age: "Ages 5-8",
                time: "15 minutes",
                color: "from-purple-500 to-pink-500"
              },
              {
                title: "Emma's Underwater Kingdom",
                description: "Emma discovered she could breathe underwater and talk to the colorful fish.",
                age: "Ages 6-9",
                time: "12 minutes",
                color: "from-teal-500 to-emerald-500"
              }
            ].map((story, index) => (
              <div key={index} className="card-interactive p-6 group">
                <div className={`h-48 bg-gradient-to-br ${story.color} rounded-xl mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Moon className="w-16 h-16 text-white/80" />
                </div>
                <h3 className="text-xl font-bold mb-2">{story.title}</h3>
                <p className="text-neutral-500 mb-4">{story.description}</p>
                <div className="flex justify-between text-sm text-neutral-500">
                  <span>{story.age}</span>
                  <span>{story.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parents Love It Section */}
      <section className="py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
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
              <div key={index} className="card p-6 hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {review.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-sm text-neutral-500">{review.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent-yellow star-rating" />
                  ))}
                </div>
                <p className="text-neutral-700 italic">"{review.review}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-blue-50">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need for Magical Bedtime
            </h2>
            <p className="text-xl text-neutral-500">
              Create personalized stories your kids will love, night after night
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Personalized Stories & Illustrations</h3>
              <p className="text-neutral-500">
                Beautiful AI-generated stories and artwork featuring your child as the main hero, with their name, age, and favorite things
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Endless Adventures with Best Friends Characters</h3>
              <p className="text-neutral-500">
                Never run out of story ideas! Include pets, siblings, and friends to make the story even more special
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Perfect for Bedtime</h3>
              <p className="text-neutral-500">
                Calming stories designed to help kids settle down peacefully. Story library & favorites available anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-neutral-500">
              Select the perfect plan for your family's storytelling adventures
            </p>

            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-600 px-4 py-2 rounded-full mt-4 text-sm font-medium">
              <span>Save 30%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card p-8 relative">
              <h3 className="text-xl font-bold mb-2">Moonlight</h3>
              <p className="text-neutral-500 mb-6">Perfect for trying out bedtime stories</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">3 stories per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">1 child profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Basic story customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Save one album</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Standard illustrations</span>
                </li>
              </ul>
              <button className="btn-secondary btn-lg w-full">
                Start Free
              </button>
            </div>

            {/* Starlight Plan */}
            <div className="card p-8 relative border-2 border-primary-500 scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Starlight</h3>
              <p className="text-neutral-500 mb-6">Ideal for regular bedtime storytelling</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-primary-500">$9.99</span>
                <span className="text-neutral-500">/per month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">30 stories per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Up to 3 child profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Advanced customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Include pets & characters</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Multiple story lengths</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Story library & favorites</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Priority support</span>
                </li>
              </ul>
              <button className="btn-primary btn-lg w-full">
                Get Started
              </button>
            </div>

            {/* Supernova Plan */}
            <div className="card p-8 relative">
              <h3 className="text-xl font-bold mb-2">Supernova</h3>
              <p className="text-neutral-500 mb-6">For families who love daily story time</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$24.99</span>
                <span className="text-neutral-500">/per month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Unlimited stories</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Unlimited child profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Advanced customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Include pets & characters</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Custom themes and story arcs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Story library & favorites</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Premium support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-600">Early access to new features</span>
                </li>
              </ul>
              <button className="btn-secondary btn-lg w-full">
                Get Started
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-neutral-500 mt-8">
            Manage billing & subscription
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-50">
        <div className="container-narrow section-padding text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to create your first story?
          </h2>
          <p className="text-xl text-neutral-500 mb-8">
            Craft captivating stories today — no credit card required.
          </p>
          <Link href="/auth/signup">
            <button className="btn-primary btn-lg group">
              Get started now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-neutral-200">
        <div className="container-narrow section-padding">
          <div className="flex flex-col items-center gap-4 text-sm text-neutral-600">
            <p className="flex items-center gap-1 text-primary-500">
              Made with <Heart className="w-4 h-4 fill-red-500 text-red-500" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
              <p className="text-center md:text-left">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-6 gap-y-3 text-center md:text-left">
                <a href="#" className="hover:text-primary-500 transition-colors">About</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-500 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}