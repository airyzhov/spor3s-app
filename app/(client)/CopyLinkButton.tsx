"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { copyText } from "../../lib/copyText";

interface CopyLinkButtonProps {
  link: string;
  label: string;
  style?: CSSProperties;
  // Растянуть на всю ширину родителя (кнопка тогда тоже передаёт width: 100%)
  fullWidth?: boolean;
}

// Кнопка «Пригласить»: копирует реферальную ссылку и пару секунд подтверждает это на себе.
// Если буфер обмена недоступен — показывает ссылку, чтобы её скопировали вручную.
export default function CopyLinkButton({ link, label, style, fullWidth }: CopyLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const t = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => setState((await copyText(link)) ? "copied" : "failed");

  return (
    <span style={{
      display: fullWidth ? "flex" : "inline-flex",
      flexDirection: "column",
      gap: 6,
      width: fullWidth ? "100%" : undefined,
      maxWidth: "100%"
    }}>
      <button type="button" onClick={copy} style={style}>
        {state === "copied" ? "✅ Ссылка скопирована" : label}
      </button>
      {state === "failed" && (
        <span style={{
          fontSize: 12,
          color: "#ff7ae0",
          fontFamily: "monospace",
          wordBreak: "break-all",
          userSelect: "all",
          WebkitUserSelect: "all"
        }}>
          {link}
        </span>
      )}
    </span>
  );
}
