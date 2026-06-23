import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    message: 'AI API test route works!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      status: 'OK', 
      message: 'AI API test POST works!',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

