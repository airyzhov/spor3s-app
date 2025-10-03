import { NextRequest, NextResponse } from "next/server";
import { getUserProfileServer } from "../../supabaseServerHelpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  try {
    const userProfile = await getUserProfileServer(user_id);
    
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: userProfile
    });
  } catch (error) {
    console.error('Ошибка получения профиля пользователя:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 