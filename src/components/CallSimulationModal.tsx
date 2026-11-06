/**
 * CallSimulationModal — interactive audio demo call
 *
 * Flow:
 *  1. Ringing (2.2 s) → Connecting (1.4 s) → Active
 *  2. AI opening line rendered + spoken via SpeechSynthesis
 *  3. After AI finishes: SpeechRecognition auto-starts
 *  4. User speaks → interim text shown live → final text mapped to outcome
 *  5. Staff reply added to transcript, AI ack spoken → modal auto-closes
 *
 * Manual quick-response buttons remain as backup (always visible in active phase).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Mic,
  MicOff,
  PhoneOff,
  UserRound,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { DEMO_RESPONSES, getAIOpeningLine, type DemoOutcome } from "@/services/callManager";
import type { Task, User } from "@/types";

/* ─────────────────────────── types ─────────────────────────── */

export interface CallSimulationModalProps {
  task: Task;
  staff: User;
  callType: "reminder" | "verification";
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

/** Map spoken words to a demo outcome. Errs towards "pending" for safety. */
function speechToOutcome(spoken: string): DemoOutcome {
  const l = spoken.toLowerCase();
  if (/\b(yes|done|complet|finish|administer|gave|given|already|just did)\b/.test(l)) return "completed";
  if (/\b(help|assist|escalat|urgent|emergency|problem|issue|not safe)\b/.test(l)) return "assistance";
  if (/\b(no answer|missed|no response)\b/.test(l)) return "no-answer";
  return "pending"; // "not yet", "sleeping", "busy", etc.
}

/* ──────────────────── Typewriter hook ──────────────────── */

function useTypewriter(text: string, speed = 24): string {
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

/* ──────────────────────── Waveform ──────────────────────── */

function Waveform({ mode }: { mode: "ai" | "user" | "idle" }) {
  const bars = [3, 5, 8, 6, 4, 9, 5, 7, 6, 4, 8, 5, 7, 6, 3];
  const color =
    mode === "ai" ? "bg-cyan-400" : mode === "user" ? "bg-emerald-400" : "bg-slate-300";
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full origin-bottom transition-all duration-300", color)}
          style={{
            height: mode !== "idle" ? `${h * (mode === "user" ? 3.5 : 3)}px` : "4px",
            animationDelay: `${i * 55}ms`,
            opacity: mode !== "idle" ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────── Transcript bubble ───────────────────── */

function Bubble({ line, animate }: { line: TranscriptLine; animate?: boolean }) {
  const isAI = line.speaker === "AI";
  const text = useTypewriter(animate ? line.text : "", 20);
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
          {isAI ? "CareLoop AI" : "Staff"}
        </span>
        {animate ? text : line.text}
      </div>
    </div>
  );
}

/* ═════════════════════ Main Component ═══════════════════════ */

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
  const [latestIdx, setLatestIdx] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [micError, setMicError] = useState(false);
  const [ttsSupported] = useState(() => "speechSynthesis" in window);

  const transcriptRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);
  // Ref lets async callbacks read current phase without stale closures
  const phaseRef = useRef<CallPhase>("ringing");
  phaseRef.current = phase;

  const aiOpening = getAIOpeningLine(callType, task.description);

  /* ─── Auto-scroll transcript ─── */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, interimText]);

  /* ─── Timer ─── */
  useEffect(() => {
    if (phase !== "active" && phase !== "responding") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ─────────────────── SpeechSynthesis ───────────────────── */

  const speakAI = useCallback(
    (text: string, onDone?: () => void) => {
      if (!ttsSupported) {
        onDone?.();
        return;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.9;
      utter.pitch = 1.05;
      utter.volume = 1;
      // Prefer a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        undefined;
      if (preferred) utter.voice = preferred;

      utter.onend = () => {
        setIsSpeaking(false);
        onDone?.();
      };
      utter.onerror = () => {
        setIsSpeaking(false);
        onDone?.();
      };
      window.speechSynthesis.speak(utter);
    },
    [ttsSupported],
  );

  /* ─────────────────── SpeechRecognition ─────────────────── */

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setMicError(true);
      return;
    }

    try {
      const r = new SR();
      r.lang = "en-IN";
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;

      r.onstart = () => {
        setIsListening(true);
        setMicError(false);
      };
      r.onend = () => {
        setIsListening(false);
        setInterimText("");
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onerror = (e: any) => {
        setIsListening(false);
        setInterimText("");
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicError(true);
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onresult = (e: any) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        if (interim) setInterimText(interim);
        if (final && phaseRef.current === "active") {
          setInterimText("");
          handleSpeechFinal(final);
        }
      };

      recogRef.current = r;
      r.start();
    } catch {
      setMicError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // handleSpeechFinal added via ref below

  /* ─────────────── Core response dispatcher ─────────────── */

  // Keep in a ref so startListening/speakAI callbacks can call latest version
  const doResponseRef = useRef<((outcome: DemoOutcome, staffReply: string) => void) | null>(null);

  doResponseRef.current = (outcome: DemoOutcome, staffReply: string) => {
    if (phaseRef.current !== "active") return;

    // Stop mic
    recogRef.current?.stop();
    setIsListening(false);
    setInterimText("");

    // Update phase ref immediately (before state batch)
    phaseRef.current = "responding";
    setPhase("responding");

    if (outcome === "no-answer") {
      speakAI("No response received. This call will be marked as unanswered.", () => {
        phaseRef.current = "ending";
        setPhase("ending");
        setTimeout(() => onComplete(outcome, ""), 800);
      });
      return;
    }

    // Add staff reply bubble
    if (staffReply) {
      setTranscript((v) => {
        const next = [...v, { speaker: "Staff" as const, text: staffReply, id: crypto.randomUUID() }];
        setLatestIdx(next.length - 1);
        return next;
      });
    }

    const ack =
      outcome === "completed"
        ? "Thank you. Your response has been recorded and will be reviewed by your supervisor."
        : outcome === "assistance"
          ? "Understood. I am escalating this to your supervisor immediately. Please stay available."
          : "Understood. I have noted your status. A verification follow-up will be scheduled.";

    // Brief pause, then AI ack bubble + speak
    setTimeout(() => {
      setTranscript((v) => {
        const next = [...v, { speaker: "AI" as const, text: ack, id: crypto.randomUUID() }];
        setLatestIdx(next.length - 1);
        return next;
      });
      speakAI(ack, () => {
        phaseRef.current = "ending";
        setPhase("ending");
        setTimeout(() => onComplete(outcome, staffReply), 800);
      });
    }, staffReply ? 900 : 200);
  };

  /* Keep handleSpeechFinal stable via ref */
  const handleSpeechFinal = useCallback((spoken: string) => {
    doResponseRef.current?.(speechToOutcome(spoken), spoken);
  }, []);

  // Patch handleSpeechFinal reference into startListening after first render
  useEffect(() => {
    // We capture it via doResponseRef inside startListening's onresult already — no patch needed.
    // This effect is intentionally empty; keeping for clarity.
  }, [handleSpeechFinal]);

  /* ─────────────── Phase progression + initial TTS ────────── */

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("connecting"), 2200);
    const t2 = setTimeout(() => {
      phaseRef.current = "active";
      setPhase("active");

      // Push AI line after a brief beat, then speak + auto-listen
      setTimeout(() => {
        setTranscript([{ speaker: "AI", text: aiOpening, id: crypto.randomUUID() }]);
        setLatestIdx(0);

        speakAI(aiOpening, () => {
          // Auto-start recognition after AI finishes speaking
          if (phaseRef.current === "active") startListening();
        });
      }, 600);
    }, 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.speechSynthesis?.cancel();
      recogRef.current?.stop();
    };
  }, [aiOpening, speakAI, startListening]);

  /* ─────────────────────── UI state ─────────────────────── */

  const isLive = phase === "active" || phase === "responding";
  const waveMode: "ai" | "user" | "idle" = isSpeaking ? "ai" : isListening ? "user" : "idle";

  const statusLabel = isSpeaking
    ? "AI speaking…"
    : isListening
      ? "Listening for your response…"
      : phase === "active"
        ? "Speak or choose a response below"
        : phase === "ringing"
          ? "Ringing…"
          : phase === "connecting"
            ? "Connecting…"
            : phase === "responding"
              ? "Recording response…"
              : "Call ending…";

  /* ─────────────────── Stop TTS manually ─────────────────── */

  const skipSpeech = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    if (phaseRef.current === "active") startListening();
  };

  /* ──────────────────────── Render ───────────────────────── */

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-2xl shadow-2xl shadow-blue-950/50 border border-white/10 flex flex-col max-h-[95vh]">

        {/* ── Header ── */}
        <div className="bg-[#061629] px-6 py-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative grid size-11 place-items-center rounded-full bg-cyan-400/15 text-cyan-300 shrink-0">
                <Bot size={22} />
                {isLive && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/30" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">CareLoop AI Voice Agent</p>
                <p className="flex items-center gap-1.5 text-[10px] text-cyan-300 mt-0.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isSpeaking
                        ? "bg-blue-400 animate-pulse"
                        : isListening
                          ? "bg-emerald-400 animate-pulse"
                          : isLive
                            ? "bg-emerald-400"
                            : "bg-slate-500",
                    )}
                  />
                  {statusLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLive && (
                <span className="font-mono text-sm font-bold tabular-nums">{formatDuration(seconds)}</span>
              )}
              <button
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-white/10 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Audio status bar */}
          <div className="mt-3 flex items-center gap-3">
            <Waveform mode={waveMode} />
            {isSpeaking && ttsSupported && (
              <button
                onClick={skipSpeech}
                title="Skip AI speech"
                className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                <VolumeX size={11} />
                Skip
              </button>
            )}
            {isListening && (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-300">
                <Mic size={11} />
                Mic active
              </span>
            )}
            {!isSpeaking && !isListening && isLive && !ttsSupported && (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                <Volume2 size={11} />
                TTS not available
              </span>
            )}
          </div>

          {/* Live interim speech text */}
          {interimText && (
            <div className="mt-2 rounded-lg bg-emerald-900/30 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 italic">
              🎙 "{interimText}…"
            </div>
          )}

          {/* Fallback / mic error notes */}
          {fallbackReason && (
            <p className="mt-2 text-[9px] text-slate-500 text-center">
              <Zap size={9} className="inline mr-1" />
              Demo mode · {fallbackReason}
            </p>
          )}
          {micError && (
            <p className="mt-2 rounded bg-amber-900/30 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-300 text-center">
              🎤 Mic permission denied — use the response buttons below
            </p>
          )}
        </div>

        {/* ── Staff card ── */}
        <div className="bg-gradient-to-b from-blue-50/60 to-white px-6 py-3 flex items-center gap-4 border-b border-slate-100 shrink-0">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200">
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
            <p className="text-xs font-semibold text-slate-700 max-w-[150px] truncate">{task.description}</p>
          </div>
        </div>

        {/* ── Transcript ── */}
        <div className="bg-slate-50/80 px-5 py-3 overflow-y-auto flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Live transcript
          </p>
          <div ref={transcriptRef} className="space-y-3 min-h-[100px]">
            {phase === "ringing" && (
              <div className="grid h-24 place-items-center">
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
              <div className="grid h-24 place-items-center text-xs text-blue-500 font-medium">
                Establishing secure voice connection…
              </div>
            )}
            {(phase === "active" || phase === "responding" || phase === "ending") &&
              transcript.map((line, i) => (
                <Bubble key={line.id} line={line} animate={i === latestIdx} />
              ))}
            {phase === "ending" && (
              <p className="pt-1 text-center text-xs text-slate-400">— Call ended —</p>
            )}
          </div>
        </div>

        {/* ── Response panel (active phase only) ── */}
        {phase === "active" && (
          <div className="bg-white px-5 py-4 border-t border-slate-100 shrink-0">

            {/* Listening indicator */}
            {isListening && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Mic size={14} className="text-emerald-600 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-800">
                    Listening — speak your response now
                  </span>
                </div>
                <button
                  onClick={() => { recogRef.current?.stop(); setIsListening(false); }}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  <MicOff size={12} />
                </button>
              </div>
            )}

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-blue-600 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-800">
                    AI is speaking — listening will start automatically
                  </span>
                </div>
                <button
                  onClick={skipSpeech}
                  className="text-[10px] font-medium text-blue-600 hover:text-blue-800"
                >
                  Skip
                </button>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              {isSpeaking ? "Or choose manually:" : isListening ? "Or select a preset:" : "Quick response:"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_RESPONSES.map((r) => (
                <button
                  key={r.outcome}
                  onClick={() => doResponseRef.current?.(r.outcome, r.staffReply)}
                  disabled={phase !== "active"}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-3 text-left transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40",
                    r.tone === "primary" && "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900",
                    r.tone === "secondary" && "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                    r.tone === "danger" && "border-red-200 bg-red-50 hover:bg-red-100 text-red-900",
                    r.tone === "ghost" && "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500",
                  )}
                >
                  <span className="text-xs font-semibold leading-5">{r.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{r.sublabel}</span>
                </button>
              ))}
            </div>

            {/* Manual mic restart */}
            {!isListening && !isSpeaking && !micError && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={startListening}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Mic size={13} />
                  Re-open microphone
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">
            {callType === "reminder" ? "📋 Reminder" : "✅ Verification"} ·
            {ttsSupported ? " Voice active" : " Text-only mode"}
          </p>
          <Button
            variant="danger"
            onClick={() => {
              window.speechSynthesis?.cancel();
              recogRef.current?.stop();
              onClose();
            }}
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
