import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleOff,
  Clock3,
  Headphones,
  Mic2,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useApp } from "@/app/AppStore";
import { Badge, Button, Card } from "@/components/ui";
import { CallSimulationModal } from "@/components/CallSimulationModal";
import { useCallTrigger } from "@/hooks/useCallTrigger";
import { displayTime } from "@/lib/utils";
import { PageHeader, Stat, StatusBadge } from "./shared";

export function CallingCenterPage() {
  const { tasks, calls, users, simulateCall } = useApp();
  const [selected, setSelected] = useState(tasks[0]?.id);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { triggerCall, loading, modalState, handleModalComplete, closeModal } =
    useCallTrigger(users, simulateCall);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  const task = tasks.find((t) => t.id === selected) ?? tasks[0];
  const staff = users.find((u) => u.id === task?.assigneeId);
  const latest = calls.find((c) => c.taskId === task?.id);
  const transcript = latest?.transcript ?? [];

  const run = (result: Parameters<typeof simulateCall>[1]) => {
    setActive(true);
    setSeconds(0);
    setTimeout(() => {
      simulateCall(task.id, result);
      setActive(false);
    }, 900);
  };

  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const scheduled = useMemo(() => tasks.slice(0, 7), [tasks]);

  return (
    <>
      <PageHeader
        eyebrow="Core automation module"
        title="AI Calling Center"
        description="Schedule, simulate, and monitor voice-agent reminders and verbal task follow-ups. All calls on this screen are simulated."
        actions={
          <Badge className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
            DEMO · NO REAL CALLS
          </Badge>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat
          label="Agent status"
          value="Online"
          detail="Demo voice agent"
          icon={<Radio size={18} />}
          tone="teal"
        />
        <Stat label="Calls today" value={calls.length + 14} icon={<PhoneCall size={18} />} />
        <Stat
          label="Active calls"
          value={active || !!modalState ? 1 : 0}
          icon={<PhoneIncoming size={18} />}
          tone="teal"
        />
        <Stat label="Scheduled" value={scheduled.length} icon={<CalendarClock size={18} />} />
        <Stat
          label="Successful"
          value={calls.filter((c) => c.outcome === "successful").length + 12}
          icon={<CheckCircle2 size={18} />}
          tone="teal"
        />
        <Stat
          label="Missed / failed"
          value={calls.filter((c) => ["no-answer", "failed"].includes(c.outcome)).length}
          icon={<CircleOff size={18} />}
          tone="red"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.95fr_1.55fr]">
        {/* ── Calling Queue ── */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Scheduled calling queue</h2>
                <p className="text-xs text-slate-500">Reminder and verification windows</p>
              </div>
              <span className="text-xs font-semibold text-blue-600">{scheduled.length} queued</span>
            </div>
          </div>
          <div className="max-h-[590px] divide-y divide-slate-100 overflow-y-auto">
            {scheduled.map((t) => {
              const u = users.find((x) => x.id === t.assigneeId);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected === t.id ? "bg-blue-50/70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{u?.name}</p>
                      <p className="mt-0.5 max-w-[250px] truncate text-xs text-slate-500">
                        {t.description}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
                    <span>
                      <Clock3 size={11} className="mr-1 inline" />
                      Reminder {displayTime(t.reminderTime)}
                    </span>
                    <span>Verify {displayTime(t.verificationTime)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Voice Agent Panel ── */}
        <Card className="overflow-hidden border-blue-200 shadow-[0_12px_40px_rgba(37,99,235,.08)]">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#081c36] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative grid size-10 place-items-center rounded-full bg-cyan-400/15 text-cyan-300">
                <Bot size={20} />
                {(active || !!modalState) && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-cyan-300/40" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">CareLoop Voice Agent</p>
                <p className="flex items-center gap-1 text-[10px] text-cyan-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  ONLINE · ENGLISH / HINDI
                </p>
              </div>
            </div>
            <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-200">
              SIMULATED DEMO
            </Badge>
          </div>

          {/* Staff avatar */}
          <div className="bg-gradient-to-b from-blue-50/70 to-white p-6 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full border-4 border-white bg-blue-600 text-xl font-bold text-white shadow-xl shadow-blue-200">
              {staff?.name
                .split(" ")
                .map((x) => x[0])
                .slice(-2)
                .join("")}
            </div>
            <h2 className="mt-3 text-lg font-bold">{staff?.name}</h2>
            <p className="text-xs text-slate-500">
              {staff?.phone} · {staff?.department}
            </p>
            <div className="mt-4 flex justify-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Call status</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-700">
                  {active ? (
                    <>
                      <span className="size-1.5 animate-pulse rounded-full bg-blue-600" />
                      Calling now
                    </>
                  ) : (
                    (latest?.outcome ?? "Ready")
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Duration</p>
                <p className="mt-1 text-xs font-semibold">
                  {active ? duration : (latest?.duration ?? "00:00")}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Task</p>
                <p className="mt-1 max-w-44 truncate text-xs font-semibold">{task?.description}</p>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="border-y border-slate-100 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Headphones size={16} className="text-blue-600" />
                Conversation transcript
              </h3>
              {latest?.verification === "self-reported" && (
                <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                  SELF-REPORTED COMPLETE
                </Badge>
              )}
            </div>
            <div className="h-44 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">
              {active ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-blue-600">
                  <span className="size-2 animate-bounce rounded-full bg-blue-600" />
                  <span className="size-2 animate-bounce rounded-full bg-blue-600 [animation-delay:120ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-blue-600 [animation-delay:240ms]" />{" "}
                  Connecting voice agent
                </div>
              ) : transcript.length ? (
                transcript.map((line, i) => (
                  <div key={i} className={`flex gap-2 ${line.speaker === "Staff" ? "justify-end" : ""}`}>
                    {line.speaker === "AI" && (
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
                        <Bot size={12} />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-5 ${line.speaker === "AI" ? "bg-white text-slate-700 shadow-sm" : "bg-blue-600 text-white"}`}
                    >
                      <b className="mb-0.5 block text-[9px] opacity-60">{line.speaker}</b>
                      {line.message}
                    </div>
                    {line.speaker === "Staff" && (
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-200">
                        <UserRound size={12} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="grid h-full place-items-center text-xs text-slate-400">
                  Select a simulation to generate a call transcript
                </div>
              )}
            </div>
          </div>

          {/* Simulation controls */}
          <div className="p-5">
            {/* ── New: Interactive Demo Modal ── */}
            <div className="mb-5 rounded-xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-blue-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-600" />
                <span className="text-xs font-semibold text-cyan-800">Interactive Demo Call Modal</span>
                <Badge className="ml-auto border-cyan-200 bg-cyan-100 text-cyan-700">RECOMMENDED</Badge>
              </div>
              <p className="mb-3 text-[11px] leading-4 text-slate-500">
                Full-screen AI call UI with live typewriter transcript, response buttons, and mic input. Perfect for a live judge demo.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={active || !!loading}
                  onClick={() => task && triggerCall(task, "reminder")}
                  className="gap-1.5"
                >
                  <PhoneCall size={14} />
                  {loading === task?.id ? "Initiating…" : "Launch Reminder Modal"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={active || !!loading}
                  onClick={() => task && triggerCall(task, "verification")}
                  className="gap-1.5"
                >
                  <Sparkles size={14} />
                  {loading === task?.id ? "Initiating…" : "Launch Verification Modal"}
                </Button>
              </div>
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
              Quick inline simulation
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={active} onClick={() => run("reminder")}>
                <PhoneCall size={15} />
                Successful reminder
              </Button>
              <Button disabled={active} variant="secondary" onClick={() => run("completed")}>
                <Mic2 size={15} />
                Completed response
              </Button>
              <Button disabled={active} variant="secondary" onClick={() => run("pending")}>
                Pending response
              </Button>
              <Button disabled={active} variant="secondary" onClick={() => run("no-answer")}>
                <PhoneOff size={15} />
                No answer
              </Button>
              <Button disabled={active} variant="danger" onClick={() => run("assistance")}>
                Request assistance
              </Button>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              Simulation updates task status, dashboard progress, notifications, and call history across the prototype.
            </p>
          </div>
        </Card>
      </div>

      {/* ── Call Simulation Modal ── */}
      {modalState && (
        <CallSimulationModal
          task={modalState.task}
          staff={modalState.staff}
          callType={modalState.callType}
          fallbackReason={modalState.fallbackReason}
          onComplete={handleModalComplete}
          onClose={closeModal}
        />
      )}
    </>
  );
}
