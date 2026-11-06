import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PhoneCall,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/app/AppStore";
import { Button, Card, Progress } from "@/components/ui";
import { displayTime } from "@/lib/utils";
import { PageHeader, PriorityBadge, Stat, StatusBadge, icons } from "./shared";

const chart = [
  { day: "Mon", completed: 58 },
  { day: "Tue", completed: 64 },
  { day: "Wed", completed: 60 },
  { day: "Thu", completed: 72 },
  { day: "Fri", completed: 79 },
  { day: "Sat", completed: 84 },
  { day: "Today", completed: 76 },
];
export function SupervisorDashboard() {
  const { tasks, calls, users, notifications } = useApp();
  const completed = tasks.filter((t) => ["self-reported", "verified"].includes(t.status)).length;
  const pending = tasks.filter((t) => ["pending", "acknowledged"].includes(t.status)).length;
  const overdue = tasks.filter((t) => t.status === "overdue").length;
  const pct = Math.round((completed / tasks.length) * 100);
  const staff = users.filter((u) => u.role !== "supervisor");
  return (
    <>
      <PageHeader
        eyebrow="Clinical command center"
        title="Good morning, Maya"
        description="Here’s what is happening across care tasks and AI voice operations today."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total tasks assigned"
          value={tasks.length}
          detail="Across 2 active shifts"
          icon={<ClipboardList size={18} />}
        />
        <Stat
          label="Tasks completed"
          value={completed}
          detail={`${pct}% completion rate`}
          icon={<CheckCircle2 size={18} />}
          tone="teal"
        />
        <Stat
          label="Pending tasks"
          value={pending}
          detail="Next due in 24 min"
          icon={<Clock3 size={18} />}
          tone="amber"
        />
        <Stat
          label="Requires attention"
          value={overdue + tasks.filter((t) => t.status === "issue").length}
          detail={`${overdue} overdue`}
          icon={<AlertTriangle size={18} />}
          tone="red"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat
          label="AI calls today"
          value={calls.length + 14}
          detail="92% connection rate"
          icon={<PhoneCall size={18} />}
        />
        <Stat
          label="Successful AI calls"
          value={calls.filter((c) => c.outcome === "successful").length + 12}
          detail="4 verification responses"
          icon={<Bot size={18} />}
          tone="teal"
        />
        <Stat
          label="Active voice sessions"
          value="2"
          detail="3 more scheduled"
          icon={<TrendingUp size={18} />}
          tone="blue"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Task completion trend</h2>
              <p className="text-xs text-slate-500">Completed care tasks over the last 7 days</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600">+12.4% this week</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#area)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Completion progress</h2>
              <p className="text-xs text-slate-500">All assigned tasks today</p>
            </div>
            <div className="grid size-16 place-items-center rounded-full border-[6px] border-teal-100 text-lg font-bold text-teal-700">
              {pct}%
            </div>
          </div>
          <div className="mt-5">
            <Progress value={pct} />
          </div>
          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div>
              <b className="block text-xl">{completed}</b>
              <span className="text-[11px] text-slate-500">Complete</span>
            </div>
            <div>
              <b className="block text-xl">{pending}</b>
              <span className="text-[11px] text-slate-500">Pending</span>
            </div>
            <div>
              <b className="block text-xl text-red-600">{overdue}</b>
              <span className="text-[11px] text-slate-500">Overdue</span>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <b>AI insight:</b> Verification response rates are highest between 10 AM and noon.
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold">Staff performance</h2>
            <p className="text-xs text-slate-500">Live task completion by care team member</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff member</th>
                  <th>Assigned</th>
                  <th>Complete</th>
                  <th>Pending</th>
                  <th className="pr-5">Progress</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => {
                  const assigned = tasks.filter((t) => t.assigneeId === u.id);
                  const done = assigned.filter((t) =>
                    ["verified", "self-reported"].includes(t.status),
                  ).length;
                  const p = assigned.length ? Math.round((done / assigned.length) * 100) : 0;
                  return (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.department}</div>
                      </td>
                      <td>{assigned.length}</td>
                      <td className="text-emerald-600">{done}</td>
                      <td>{assigned.length - done}</td>
                      <td className="pr-5">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={p} />
                          </div>
                          <b>{p}%</b>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Live activity</h2>
              <p className="text-xs text-slate-500">Voice and task events</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <i className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
          <div className="mt-4 space-y-1">
            {notifications.slice(0, 5).map((n, i) => (
              <div key={n.id} className="flex gap-3 py-2.5">
                <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-slate-50 text-blue-600">
                  {i % 2 ? <UserRoundCheck size={13} /> : <Bot size={13} />}
                </div>
                <div>
                  <p className="text-xs font-medium leading-5 text-slate-700">{n.message}</p>
                  <p className="text-[10px] text-slate-400">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export function StaffDashboard({ role }: { role: "doctor" | "nurse" }) {
  const { currentUser, tasks, patients, updateTask } = useApp();
  const mine = tasks.filter((t) => t.assigneeId === currentUser.id);
  const completed = mine.filter((t) => ["self-reported", "verified"].includes(t.status)).length;
  const pct = mine.length ? Math.round((completed / mine.length) * 100) : 0;
  return (
    <>
      <PageHeader
        eyebrow={`${role} workspace`}
        title={`${role === "doctor" ? "Dr." : ""} ${currentUser.name.replace("Dr. ", "").replace("Nurse ", "")}’s care tasks`}
        description={`${currentUser.department} · Morning shift, 8:00 AM–4:00 PM · AI reminders active`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Assigned today" value={mine.length} icon={<ClipboardList size={18} />} />
        <Stat label="Completed" value={completed} icon={icons.check} tone="teal" />
        <Stat
          label="Pending"
          value={mine.filter((t) => ["pending", "acknowledged"].includes(t.status)).length}
          icon={icons.clock}
          tone="amber"
        />
        <Stat
          label="Overdue"
          value={mine.filter((t) => t.status === "overdue").length}
          icon={icons.alert}
          tone="red"
        />
        <Stat label="Completion" value={`${pct}%`} icon={<TrendingUp size={18} />} />
      </div>
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Today’s progress</h2>
            <p className="text-xs text-slate-500">
              {completed}/{mine.length} tasks completed
            </p>
          </div>
          <b className="text-lg text-teal-600">{pct}%</b>
        </div>
        <div className="mt-3">
          <Progress value={pct} />
        </div>
      </Card>
      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold">Today’s task schedule</h2>
            <p className="text-xs text-slate-500">
              Reminder and verification calls are automatically queued
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
            AI calling enabled
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {mine.map((t) => {
            const patient = patients.find((p) => p.id === t.patientId);
            return (
              <div key={t.id} className="p-4 md:p-5">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 font-bold text-slate-500">
                      {displayTime(t.dueTime).split(":")[0]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{t.description}</h3>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {patient?.id} · Room {patient?.room} · Assigned to {currentUser.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          Due <b className="text-slate-700">{displayTime(t.dueTime)}</b>
                        </span>
                        <span>
                          Reminder <b className="text-slate-700">{displayTime(t.reminderTime)}</b>
                        </span>
                        <span>
                          Verification{" "}
                          <b className="text-slate-700">{displayTime(t.verificationTime)}</b>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={t.status !== "pending"}
                      onClick={() => updateTask(t.id, "acknowledged")}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      disabled={["self-reported", "verified"].includes(t.status)}
                      onClick={() => updateTask(t.id, "self-reported")}
                    >
                      Mark self-reported complete
                    </Button>
                    <Button variant="ghost" onClick={() => updateTask(t.id, "issue")}>
                      Report issue
                    </Button>
                  </div>
                </div>
                {t.status === "self-reported" && (
                  <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-2.5 text-xs text-violet-800">
                    <b>Self-reported complete.</b> This verbal/manual response is recorded but is
                    not an independent clinical verification.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
