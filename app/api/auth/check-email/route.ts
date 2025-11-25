import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if user exists with this email
    const { data, error } = await supabase.auth.admin.listUsers({
      filter: {
        email: email.toLowerCase().trim(),
      },
    })

    if (error) {
      console.error('Error checking email:', error)
      return NextResponse.json({ error: 'Failed to check email' }, { status: 500 })
    }

    const exists = data.users.length > 0

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Error in check-email route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
