import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateToken(password: string): string {
  return crypto.createHash('sha256').update(`webwatcher:${password}`).digest('hex').slice(0, 32);
}

// POST - Login
export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 400 });
  }

  try {
    const { password } = await request.json();

    if (password !== adminPassword) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const token = generateToken(adminPassword);
    const response = NextResponse.json({ success: true });

    response.cookies.set('ww_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('ww_token');
  return response;
}
