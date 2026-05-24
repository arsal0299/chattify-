import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1'

    const supabase = await createClient()

    // Register the IP address
    const { error } = await supabase
      .from('ip_registrations')
      .insert({
        ip_address: ip,
        user_id: userId,
      })

    if (error) {
      // IP might already be registered (race condition), that's okay
      console.error('IP registration error:', error)
    }

    return NextResponse.json({
      message: 'IP registered successfully',
    })
  } catch (error) {
    console.error('Register IP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
