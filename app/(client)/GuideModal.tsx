"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  GUIDE_LESSONS,
  GUIDE_REWARD_SC,
  guideStorageKey,
  restoreGuideProgress,
  type GuideBlock,
  type GuideLesson,
} from "../../lib/newbieGuide";
import { openExternal } from "../../lib/openExternal";

interface GuideModalProps {
  userId: string;
  completed?: boolean; // гид уже пройден (SC начислены) — открываем с первого урока, чтобы перечитать
  onClose: () => void;
  onCompleted: () => void; // ответы приняты сервером — кабинет перечитает баланс и отметит гид
  onOpenCatalog: () => void; // «Подобрать курс» на финальном экране
}

type Finish = { state: "idle" } | { state: "sending" } | { state: "done"; credited: boolean } | { state: "error" };

const LAST = GUIDE_LESSONS.length - 1;

// localStorage может быть недоступен (приватный режим, запрет сайта) — тогда гид идёт с начала
function readProgress(userId: string): number[] {
  try {
    return restoreGuideProgress(window.localStorage.getItem(guideStorageKey(userId)));
  } catch {
    return [];
  }
}

function saveProgress(userId: string, answers: number[]) {
  try {
    window.localStorage.setItem(guideStorageKey(userId), JSON.stringify(answers));
  } catch {
    // прогресс не сохранится — пройти гид всё равно можно
  }
}

const text: CSSProperties = { fontSize: "clamp(14px, 3.8vw, 16px)", color: "#e5e5e5", lineHeight: 1.55, margin: "0 0 12px" };
const primary: CSSProperties = {
  width: "100%",
  background: "linear-gradient(45deg, #ff00cc, #3333ff)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "13px 16px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};
const secondary: CSSProperties = { ...primary, background: "rgba(255,255,255,0.14)" };

function Block({ block }: { block: GuideBlock }) {
  if (block.kind === "p") {
    return (
      <p style={text}>
        {block.lead && <b style={{ color: "#fff" }}>{block.lead} </b>}
        {block.text}
      </p>
    );
  }
  const List = block.ordered ? "ol" : "ul";
  return (
    <>
      {block.lead && <p style={{ ...text, margin: "0 0 6px", color: "#fff", fontWeight: 700 }}>{block.lead}</p>}
      <List style={{ ...text, paddingLeft: 22, display: "grid", gap: 4 }}>
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </List>
    </>
  );
}

// YouTube в России работает медленно — ссылка под роликом открывает его снаружи. Если в уроке есть
// src (mp4 на нашем сервере), показываем свой плеер.
function Video({ lesson }: { lesson: GuideLesson }) {
  const video = lesson.video;
  if (!video) return null;
  if (video.src) {
    return <video controls playsInline src={video.src} style={{ width: "100%", borderRadius: 12, margin: "0 0 14px", background: "#000" }} />;
  }
  if (!video.youtubeId) return null;
  return (
    <div style={{ margin: "0 0 14px" }}>
      <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
        <iframe
          title={`Видео: ${lesson.title}`}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
      <button
        type="button"
        onClick={() => openExternal(`https://youtu.be/${video.youtubeId}`)}
        style={{ background: "none", border: "none", color: "#9ecbff", fontSize: 13, padding: "8px 0 0", cursor: "pointer", textDecoration: "underline" }}
      >
        Не грузится? Открыть на YouTube
      </button>
    </div>
  );
}

// Гид новичка: урок → вопрос с тремя вариантами → верный ответ открывает следующий урок. После 7-го
// ответы уходят на /api/guide (+100 SC один раз). Окно на весь экран, рендерится в body.
export default function GuideModal({ userId, completed = false, onClose, onCompleted, onOpenCatalog }: GuideModalProps) {
  // Пройденные уроки = верные ответы по порядку. Не больше 6: последний вопрос отправляет ответы.
  const [answers, setAnswers] = useState<number[]>(() => (completed ? [] : readProgress(userId).slice(0, LAST)));
  const [picked, setPicked] = useState<number | null>(null);
  const [finish, setFinish] = useState<Finish>({ state: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Ответ выбран — подсказка или «Дальше» ниже вариантов: подводим к ним, чтобы не искать прокруткой
  useEffect(() => {
    if (picked !== null) feedbackRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [picked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const index = answers.length;
  const lesson = GUIDE_LESSONS[index];
  const { question } = lesson;
  const right = picked !== null && picked === question.correct;
  const done = finish.state === "done";

  const next = () => {
    const passed = [...answers, question.correct];
    saveProgress(userId, passed);
    setAnswers(passed);
    setPicked(null);
    panelRef.current?.scrollTo?.({ top: 0 });
  };

  const submit = async () => {
    const all = [...answers, question.correct];
    setFinish({ state: "sending" });
    try {
      const resp = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, answers: all }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error || "guide");
      saveProgress(userId, all);
      setFinish({ state: "done", credited: !!json.credited });
      onCompleted();
    } catch {
      setFinish({ state: "error" });
    }
  };

  const optionStyle = (i: number): CSSProperties => {
    const chosen = picked === i;
    const color = chosen ? (right ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.18)";
    return {
      width: "100%",
      textAlign: "left",
      background: chosen ? `${color}33` : "rgba(255,255,255,0.06)",
      border: `2px solid ${color}`,
      borderRadius: 12,
      color: "#fff",
      padding: "12px 14px",
      fontSize: "clamp(14px, 3.8vw, 16px)",
      cursor: picked === null ? "pointer" : "default",
    };
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        // Сверху, а не по центру: окно растёт вниз, когда появляется подсказка, и не прыгает
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "clamp(0px, 3vw, 16px)",
        zIndex: 100000,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "100%",
          overflowY: "auto",
          background: "linear-gradient(135deg, #1a1a40, #2d0b3a)",
          border: "2px solid rgba(255,255,255,0.15)",
          borderRadius: 18,
          padding: "16px 16px 20px",
          boxSizing: "border-box",
          color: "#fff",
        }}
      >
        {/* Номер урока и ✕ остаются на виду, пока листаешь длинный урок */}
        <div style={{ position: "sticky", top: -16, zIndex: 1, margin: "-16px -16px 16px", padding: "16px 16px 10px", background: "#21143f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffc107", display: "flex", gap: 6 }}>
              <span aria-hidden="true">🎓</span>
              <span>{done ? "Гид новичка" : `Урок ${index + 1} из ${GUIDE_LESSONS.length}`}</span>
            </span>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 10, width: 34, height: 34, fontSize: 16, cursor: "pointer", flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${((done ? GUIDE_LESSONS.length : index) / GUIDE_LESSONS.length) * 100}%`,
                background: "linear-gradient(90deg, #ff00cc, #3333ff)",
              }}
            />
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <h2 id="guide-title" style={{ margin: "0 0 10px", fontSize: "clamp(20px, 5.5vw, 24px)" }}>🎉 Гид пройден!</h2>
            <p style={{ ...text, fontSize: 17, color: "#fff" }}>
              {finish.credited
                ? `+${GUIDE_REWARD_SC} SC - это ${GUIDE_REWARD_SC} ₽ скидки на заказ`
                : `${GUIDE_REWARD_SC} SC уже начислены раньше`}
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={onOpenCatalog} style={primary}>Подобрать курс</button>
              <button type="button" onClick={onClose} style={secondary}>Закрыть</button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="guide-title" style={{ margin: "0 0 12px", fontSize: "clamp(19px, 5vw, 22px)" }}>{lesson.title}</h2>
            <Video lesson={lesson} />
            {lesson.blocks.map((block, i) => <Block key={i} block={block} />)}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", marginTop: 6, paddingTop: 14 }}>
              <p style={{ ...text, color: "#fff", fontWeight: 700 }}>
                <span aria-hidden="true">❓ </span>
                <span>{question.text}</span>
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {question.options.map((label, i) => (
                  <button key={label} type="button" disabled={picked !== null} onClick={() => setPicked(i)} style={optionStyle(i)}>
                    {label}
                  </button>
                ))}
              </div>

              {picked !== null && !right && (
                <div ref={feedbackRef} style={{ marginTop: 12 }}>
                  <p style={{ ...text, color: "#fca5a5" }}>{question.hint}</p>
                  <button type="button" onClick={() => setPicked(null)} style={secondary}>Еще раз</button>
                </div>
              )}

              {right && (
                <div ref={feedbackRef} style={{ marginTop: 12 }}>
                  <p style={{ ...text, color: "#6ee7b7", fontWeight: 700 }}>✅ Верно!</p>
                  {index < LAST ? (
                    <button type="button" onClick={next} style={primary}>Дальше →</button>
                  ) : finish.state === "error" ? (
                    <>
                      <p style={{ ...text, color: "#fca5a5" }}>Не получилось начислить SC. Попробуйте еще раз.</p>
                      <button type="button" onClick={submit} style={primary}>Попробовать еще раз</button>
                    </>
                  ) : (
                    <button type="button" onClick={submit} disabled={finish.state === "sending"} style={primary}>
                      {finish.state === "sending" ? "⏳" : `Получить ${GUIDE_REWARD_SC} SC`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: "#9ca3af", margin: "16px 0 0", lineHeight: 1.4 }}>{lesson.note}</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
