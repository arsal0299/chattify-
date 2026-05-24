import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json();

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';

    const supabase = await createClient();

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken. Please choose another.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered. Please login instead.' },
        { status: 400 }
      );
    }

    // Check if IP already has an account
    const { data: existingIp } = await supabase
      .from('ip_registrations')
      .select('ip_address')
      .eq('ip_address', ip)
      .single();

    if (existingIp) {
      return NextResponse.json(
        { error: 'An account already exists from this IP address. Only one account per IP is allowed.' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('email', email);

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        email,
        otp_code: otpCode,
        ip_address: ip,
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      console.error('OTP storage error:', otpError);
      return NextResponse.json(
        { error: 'Failed to generate OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Send OTP via Resend email
    const { error: emailError } = await resend.emails.send({
      from: 'Chattify <onboarding@resend.dev>',
      to: email,
      subject: 'Your Chattify Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to Chattify!</h2>
          <p style="color: #666; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otpCode}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'OTP sent successfully via email',
      ip,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
