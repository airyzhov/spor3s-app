import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("[TEST API] Request received");
  
  try {
    const body = await req.json();
    console.log("[TEST API] Body:", body);
    
    return NextResponse.json({ 
      response: "Тест API работает! Сообщение получено.",
      received: body
    });
    
  } catch (error) {
    console.error("[TEST API] Error:", error);
    return NextResponse.json({ 
      response: "Ошибка тест API",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Test API is working" });
}
