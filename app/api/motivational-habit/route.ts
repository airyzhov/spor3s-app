import { NextRequest, NextResponse } from "next/server";
import { getHabitView, startHabit, submitHabitReport, HabitError } from "../../../lib/habitServer";

// Мотивационная привычка (награда уровня 🌿 Собиратель): правила — lib/habit.ts, база — lib/habitServer.ts.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(e: unknown) {
  if (e instanceof HabitError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[habit]", e);
  return NextResponse.json({ error: "Не получилось, попробуй ещё раз" }, { status: 500 });
}

// GET ?user_id= — доступ, идущая привычка с неделями, готовые привычки на выбор
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("user_id") || "";
  if (!UUID_RE.test(userId)) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, ...(await getHabitView(userId)) });
  } catch (e) {
    return fail(e);
  }
}

// POST { user_id, action: 'start', name } — начать привычку на 4 недели
// POST { user_id, action: 'report', is_completed, note? } — отчёт за идущую неделю (+25 SC за «получилось»)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }
  const userId = String(body?.user_id || "");
  if (!UUID_RE.test(userId)) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  try {
    if (body.action === "start") {
      return NextResponse.json({ success: true, ...(await startHabit(userId, body.name)) });
    }
    if (body.action === "report") {
      if (typeof body.is_completed !== "boolean") {
        return NextResponse.json({ error: "is_completed required" }, { status: 400 });
      }
      const { view, scEarned, week } = await submitHabitReport(userId, body.is_completed, body.note);
      return NextResponse.json({ success: true, ...view, scEarned, reportedWeek: week });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
