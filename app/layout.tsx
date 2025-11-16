import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import ScrollToTop from '@/components/ScrollToTop'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: 'Tuck and Tale - AI-Powered Bedtime Stories',
  description: 'Create personalized illustrated bedtime stories featuring your child as the hero',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable}`}>
        <SubscriptionProvider>
          <ScrollToTop />
          <Navbar />
          <main className="pt-16 md:pt-20">{children}</main>
        </SubscriptionProvider>
      </body>
    </html>
  )
}