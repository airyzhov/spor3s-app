import { NextRequest, NextResponse } from "next/server";
import { claimReferral, ReferralClaimError } from "../../../lib/referral";

// Поле «Код друга» в кабинете (InviterCodeForm): привязать пригласившего по @username или
// Telegram ID и сразу начислить приветственные SC. Правила — lib/referral.ts claimReferral.
export async function POST(req: NextRequest) {
  try {
    const { user_id, code } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Нужен user_id" }, { status: 400 });
    const invitedBy = await claimReferral(String(user_id), code);
    return NextResponse.json({ success: true, invitedBy });
  } catch (e) {
    if (e instanceof ReferralClaimError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[referral] код друга:", e);
    return NextResponse.json({ error: "Не получилось, попробуйте ещё раз" }, { status: 500 });
  }
}
