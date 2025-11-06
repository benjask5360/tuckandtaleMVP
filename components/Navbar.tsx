import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="container-narrow section-padding">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] relative flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt="Tuck and Tale Logo"
                width={75}
                height={75}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-start gap-0.5">
              <span className="gradient-text whitespace-nowrap" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}>
                Tuck and Tale
              </span>
              <span className="gradient-text" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.5vw, 1.875rem)' }}>™</span>
            </div>
          </Link>

          {/* Login Button */}
          <Link href="/auth/login">
            <button className="btn-primary px-4 py-1.5 sm:px-6 sm:py-2 text-sm sm:text-base">
              Login
            </button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
