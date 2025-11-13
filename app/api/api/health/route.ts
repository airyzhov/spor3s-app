import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'spor3s-app',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ngrok_url: process.env.NEXT_PUBLIC_BASE_URL,
    database: 'connected',
    ai_api: 'ready'
  });
}
