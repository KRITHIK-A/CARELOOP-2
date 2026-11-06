import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, PhoneOff, UserRound, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { DEMO_RESPONSES, getAIOpeningLine, type DemoOutcome } from "@/services/callManager";
import type { Task, User } from "@/types";

/* ─────────────────────────── types ─────────────────────────── */

export interface CallSimulationModalProps {
  task: Task;
  staff: User;
  callType: "reminder" | "verification";
  /** Fallback reason from callManager (shown as a subtle note) */
  fallbackReason?: string;
  onComplete: (outcome: DemoOutcome, staffReply: string) => void;
  onClose: () => void;
}

type CallPhase = "ringing" | "connecting" | "active" | "responding" | "ending";

interface TranscriptLine {
  speaker: "AI" | "Staff";
  text: string;
  id: string;
}

/* ─────────────────────────── helpers ────────────────────────── */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDuration(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Typewriter hook — appends one character at a time */
function useTypewriter(text: string, speed = 28): string {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

/* ──────────────────────── Waveform bars ─────────────────────── */

function Waveform({ active }: { active: boolean }) {
  const bars = [3, 5, 8, 6, 4, 7, 5, 9, 6, 4, 7, 5, 8, 6, 3];
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-cyan-400 origin-bottom transition-all",
            active ? "animate-pulse" : "opacity-30",
          )}
          style={{
            height: active ? `${h * 3}px` : "4px",
            animationDelay: `${i * 60}ms`,
            animationDuration: `${700 + (i % 3) * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────── Transcript bubble ───────────────────── */

function Bubble({ line, animate }: { line: TranscriptLine; animate?: boolean }) {
  const isAI = line.speaker === "AI";
  const text = useTypewriter(animate ? line.text : "", 22);
  return (
    <div className={cn("flex gap-2.5", isAI ? "" : "flex-row-reverse")}>
      <div
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-white mt-0.5",
          isAI ? "bg-blue-600" : "bg-slate-500",
        )}
      >
        {isAI ? <Bot size={13} /> : <UserRound size={13} />}
      </div>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 shadow-sm",
          isAI
            ? "rounded-tl-sm bg-white text-slate-800 border border-slate-100"
            : "rounded-tr-sm bg-blue-600 text-white",
        )}
      >
        <span className="mb-0.5 block text-[9px] font-bold uppercase opacity-50 tracking-wider">
          {line.speaker === "AI" ? "CareLoop AI" : "Staff"}
        </span>
        {animate ? text : line.text}
      </div>
    </div>
  );
}

/* ──────────────────────── Mic button ───────────────────────── */

function MicButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  // SpeechRecognition is not in older TS DOM types — use dynamic access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  const toggle = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SR) {
      alert("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const transcript: string = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };
    recogRef.current = r;
    r.start();
  };

  return (
    <button
      onClick={toggle}
      title={listening ? "Stop mic" : "Speak your response (Chrome/Edge)"}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition",
        listening
          ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
      {listening ? "Listening… (click to stop)" : "🎙 Speak via Mic"}
    </button>
  );
}

/* ═══════════════════ Main Modal Component ════════════════════ */

export function CallSimulationModal({
  task,
  staff,
  callType,
  fallbackReason,
  onComplete,
  onClose,
}: CallSimulationModalProps) {
  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [latestIdx, setLatestIdx] = useState(-1); // which line is currently animating
  const transcriptRef = useRef<HTMLDivElement>(null);

  const aiOpening = getAIOpeningLine(callType, task.description);

  /* ── Phase progression ── */
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("connecting"), 2200);
    const t2 = setTimeout(() => {
      setPhase("active");
      // Push AI opening line after a beat
      setTimeout(() => {
        setTranscript([{ speaker: "AI", text: aiOpening, id: crypto.randomUUID() }]);
        setLatestIdx(0);
      }, 600);
    }, 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [aiOpening]);

  /* ── Call timer ── */
  useEffect(() => {
    if (phase !== "active" && phase !== "responding") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  /* ── Handle a demo response choice ── */
  const handleResponse = (outcome: DemoOutcome, staffReply: string) => {
    if (phase !== "active") return;
    setPhase("responding");

    if (outcome === "no-answer") {
      // Skip transcript — straight to ending
      setTimeout(() => {
        setPhase("ending");
        setTimeout(() => onComplete(outcome, ""), 900);
      }, 800);
      return;
    }

    // Show staff reply
    const staffLine: TranscriptLine = { speaker: "Staff", text: staffReply, id: crypto.randomUUID() };
    setTranscript((v) => {
      const next = [...v, staffLine];
      setLatestIdx(next.length - 1);
      return next;
    });

    // Show AI acknowledgement
    const ack =
      outcome === "completed"
        ? "Thank you. Your response has been recorded and will be reviewed by your supervisor."
        : outcome === "assistance"
          ? "Understood. I am escalating this to your supervisor immediately. Please stay available."
          : "Understood. I have noted your status. A follow-up will be scheduled.";

    setTimeout(() => {
      const aiLine: TranscriptLine = { speaker: "AI", text: ack, id: crypto.randomUUID() };
      setTranscript((v) => {
        const next = [...v, aiLine];
        setLatestIdx(next.length - 1);
        return next;
      });

      // Wind down
      setTimeout(() => {
        setPhase("ending");
        setTimeout(() => onComplete(outcome, staffReply), 1000);
      }, 2200);
    }, 1400);
  };

  /* ── Handle mic speech input ── */
  const handleSpeech = (text: string) => {
    if (phase !== "active") return;
    // Heuristic mapping of spoken text to outcomes
    const lower = text.toLowerCase();
    const outcome: DemoOutcome =
      lower.includes("complet") || lower.includes("done") || lower.includes("yes")
        ? "completed"
        : lower.includes("help") || lower.includes("assist") || lower.includes("escalat")
          ? "assistance"
          : lower.includes("no") || lower.includes("not yet") || lower.includes("sleep")
            ? "pending"
            : "pending";
    handleResponse(outcome, text);
  };

  /* ── Phase label & colour ── */
  const phaseLabel = {
    ringing: "Ringing…",
    connecting: "Connecting…",
    active: "Call active",
    responding: "Recording response…",
    ending: "Call ending…",
  }[phase];

  const isLive = phase === "active" || phase === "responding";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      {/* Modal card */}
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl shadow-2xl shadow-blue-950/40 border border-white/10">
        {/* ── Header strip ── */}
        <div className="bg-[#061629] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Animated ring */}
              <div className="relative grid size-11 place-items-center rounded-full bg-cyan-400/15 text-cyan-300 shrink-0">
                <Bot size={22} />
                {isLive && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/30" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">CareLoop AI Voice Agent</p>
                <p className="text-[10px] text-cyan-300 flex items-center gap-1 mt-0.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500",
                    )}
                  />
                  {phaseLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLive && (
                <span className="font-mono text-sm font-bold text-white tabular-nums">
                  {formatDuration(seconds)}
                </span>
              )}
              <button
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-white/10 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Waveform */}
          <div className="mt-4">
            <Waveform active={isLive} />
          </div>

          {/* Fallback note */}
          {fallbackReason && (
            <p className="mt-3 text-[9px] text-slate-500 text-center">
              <Zap size={9} className="inline mr-1" />
              Demo mode · Sarvam fallback: {fallbackReason}
            </p>
          )}
        </div>

        {/* ── Staff card ── */}
        <div className="bg-gradient-to-b from-blue-50/60 to-white px-6 py-4 flex items-center gap-4 border-b border-slate-100">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200">
            {staff.name
              .split(" ")
              .map((w) => w[0])
              .slice(-2)
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{staff.name}</p>
            <p className="text-xs text-slate-500 truncate">{staff.phone} · {staff.department}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Task</p>
            <p className="text-xs font-semibold text-slate-700 max-w-[150px] truncate">
              {task.description}
            </p>
          </div>
        </div>

        {/* ── Transcript ── */}
        <div className="bg-slate-50/80 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Live transcript
          </p>
          <div
            ref={transcriptRef}
            className="h-40 overflow-y-auto space-y-3 pr-1 scroll-smooth"
          >
            {phase === "ringing" && (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-2 rounded-full bg-blue-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Calling {staff.name}…</p>
                </div>
              </div>
            )}
            {phase === "connecting" && (
              <div className="grid h-full place-items-center text-xs text-blue-500 font-medium">
                Establishing secure voice connection…
              </div>
            )}
            {(phase === "active" || phase === "responding" || phase === "ending") &&
              transcript.map((line, i) => (
                <Bubble key={line.id} line={line} animate={i === latestIdx} />
              ))}
            {phase === "ending" && (
              <div className="text-center pt-2 text-xs text-slate-400">Call ended</div>
            )}
          </div>
        </div>

        {/* ── Response buttons ── */}
        {phase === "active" && (
          <div className="bg-white px-5 py-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Simulate staff response
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_RESPONSES.map((r) => (
                <button
                  key={r.outcome}
                  onClick={() => handleResponse(r.outcome, r.staffReply)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-3 text-left transition hover:scale-[1.01] active:scale-[0.99]",
                    r.tone === "primary" &&
                      "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900",
                    r.tone === "secondary" &&
                      "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                    r.tone === "danger" &&
                      "border-red-200 bg-red-50 hover:bg-red-100 text-red-900",
                    r.tone === "ghost" &&
                      "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500",
                  )}
                >
                  <span className="text-xs font-semibold leading-5">{r.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{r.sublabel}</span>
                </button>
              ))}
            </div>

            {/* Mic option */}
            <div className="mt-3 flex justify-center">
              <MicButton onResult={handleSpeech} />
            </div>
          </div>
        )}

        {/* ── Footer / end-call ── */}
        <div className="bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {callType === "reminder" ? "📋 Reminder call" : "✅ Verification call"} · Demo environment
          </p>
          <Button
            variant="danger"
            onClick={onClose}
            className="gap-1.5 h-8 px-3 text-xs"
          >
            <PhoneOff size={13} />
            End call
          </Button>
        </div>
      </div>
    </div>
  );
}
