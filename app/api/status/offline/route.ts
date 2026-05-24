import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    const supabase = await createClient()

    await supabase
      .from('profiles')
      .update({ 
        status: 'offline',
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
