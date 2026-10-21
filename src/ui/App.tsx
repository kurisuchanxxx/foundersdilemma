import { useEffect, useState } from "react";
import { Icon } from "./components/Icon";
import { INTRO_REVEAL_MS, IntroCurtain, shouldPlayIntro } from "./components/Intro";
import { GameLayout } from "./screens/GameLayout";
import { Home } from "./screens/Home";
import { JoinClassroom } from "./screens/JoinClassroom";
import { Setup } from "./screens/Setup";
import { useStore } from "./store";

export default function App() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const [intro, setIntro] = useState(() => shouldPlayIntro());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      {screen === "home" && <Home entranceDelay={intro ? INTRO_REVEAL_MS - 200 : 0} />}
      {intro && screen === "home" && <IntroCurtain onDone={() => setIntro(false)} />}
      {screen === "setup" && <Setup />}
      {screen === "join" && <JoinClassroom />}
      {screen === "game" && <GameLayout />}
      <div style={{ position: "fixed", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 100 }}>
        {toasts.map((t) => (
          <div key={t.id} className={`callout ${t.kind === "bad" ? "bad" : t.kind === "good" ? "good" : "info"}`} style={{ boxShadow: "var(--shadow)", background: "var(--surface)", border: "1px solid var(--border-strong)", minWidth: 260 }}>
            <Icon name={t.kind === "bad" ? "AlertTriangle" : t.kind === "good" ? "Check" : "Info"} size={16} />
            <div className="grow">{t.text}</div>
            <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Close">
              <Icon name="X" size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
