// Environment variables configuration
// Centralized access to all environment variables

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
} as const

// Validation function to ensure required env vars are set
export function validateEnv() {
  if (!env.supabase.url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in environment variables')
  }
  if (!env.supabase.anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables')
  }
}
