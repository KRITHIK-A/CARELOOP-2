import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPlus,
  ArrowLeftRight,
  PhoneCall,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { useApp } from "@/app/AppStore";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { CallOutcome, Priority, Task } from "@/types";
import { displayTime } from "@/lib/utils";
import { Empty, PageHeader, PriorityBadge, Stat, StatusBadge, icons } from "./shared";

export function TaskManagementPage() {
  const { tasks, users, patients, addTask } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    assigneeId: "doc-a",
    patientId: "PT-1042",
    description: "",
    priority: "medium",
    date: new Date().toISOString().slice(0, 10),
    dueTime: "",
    reminderTime: "",
    verificationTime: "",
    instructions: "",
  });
  const filtered = tasks.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.patientId.toLowerCase().includes(search.toLowerCase())),
  );
  const submit = () => {
    if (!form.description.trim() || !form.dueTime || !form.reminderTime || !form.verificationTime) {
      setError("Complete the task description and all call schedule fields.");
      return;
    }
    const task: Task = {
      ...form,
      id: crypto.randomUUID(),
      priority: form.priority as Priority,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };
    addTask(task);
    setOpen(false);
    setError("");
    setForm((v) => ({
      ...v,
      description: "",
      dueTime: "",
      reminderTime: "",
      verificationTime: "",
      instructions: "",
    }));
  };
  return (
    <>
      <PageHeader
        eyebrow="Supervisor workspace"
        title="Task management"
        description="Assign care responsibilities and automatically schedule voice reminders and verification calls."
        actions={
          <Button onClick={() => setOpen(true)}>
            <ClipboardPlus size={16} />
            Assign new task
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="All tasks" value={tasks.length} icon={icons.clock} />
        <Stat
          label="Completed"
          value={tasks.filter((t) => ["verified", "self-reported"].includes(t.status)).length}
          icon={icons.check}
          tone="teal"
        />
        <Stat
          label="Overdue"
          value={tasks.filter((t) => t.status === "overdue").length}
          icon={icons.alert}
          tone="red"
        />
        <Stat
          label="AI calls queued"
          value={tasks.filter((t) => ["pending", "acknowledged"].includes(t.status)).length * 2}
          icon={icons.phone}
        />
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={15} />
            <Input
              className="pl-9"
              placeholder="Search task or patient ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="self-reported">Self-reported</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Task / Patient",
                  "Assigned staff",
                  "Due",
                  "AI call schedule",
                  "Priority",
                  "Status",
                ].map((x) => (
                  <th key={x} className="px-5 py-3 font-semibold">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <b className="block text-slate-800">{t.description}</b>
                    <span className="text-[10px] text-slate-400">{t.patientId}</span>
                  </td>
                  <td className="px-5">{users.find((u) => u.id === t.assigneeId)?.name}</td>
                  <td className="px-5">
                    <b>{displayTime(t.dueTime)}</b>
                    <br />
                    <span className="text-[10px] text-slate-400">{t.date}</span>
                  </td>
                  <td className="px-5">
                    <span>Reminder {displayTime(t.reminderTime)}</span>
                    <br />
                    <span>Verify {displayTime(t.verificationTime)}</span>
                  </td>
                  <td className="px-5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-5">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <Empty text="No tasks match the selected filters." />}
      </Card>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end bg-slate-950/40">
          <button aria-label="Close" className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  New care responsibility
                </p>
                <h2 className="mt-1 text-xl font-bold">Assign task & schedule calls</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Both AI call windows will be added to the calling queue.
                </p>
              </div>
              <button onClick={() => setOpen(false)}>
                <X className="text-slate-400" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Label text="Assign to">
                <Select
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                >
                  {users
                    .filter((u) => u.role !== "supervisor")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </Select>
              </Label>
              <Label text="Demo patient">
                <Select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <div className="sm:col-span-2">
                <Label text="Task description">
                  <Input
                    placeholder="e.g. Review morning blood report"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Label>
              </div>
              <Label text="Priority">
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option>low</option>
                  <option>medium</option>
                  <option>high</option>
                  <option>critical</option>
                </Select>
              </Label>
              <Label text="Task date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Label>
              <Label text="Due time">
                <Input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                />
              </Label>
              <div />
              <Label text="Reminder call time">
                <Input
                  type="time"
                  value={form.reminderTime}
                  onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                />
              </Label>
              <Label text="Verification call time">
                <Input
                  type="time"
                  value={form.verificationTime}
                  onChange={(e) => setForm({ ...form, verificationTime: e.target.value })}
                />
              </Label>
              <div className="sm:col-span-2">
                <Label text="Additional instructions">
                  <Textarea
                    placeholder="Optional clinical context (avoid sensitive details in call content)"
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  />
                </Label>
              </div>
            </div>
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              <b>Call privacy:</b> The voice agent references only the task and patient identifier,
              never the patient’s name or sensitive clinical history.
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit}>Assign & schedule AI calls</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{text}</span>
      {children}
    </label>
  );
}

export function PatientPage() {
  const { patients, users, tasks } = useApp();
  const [q, setQ] = useState("");
  const filtered = patients.filter((p) =>
    `${p.id} ${p.name}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Synthetic demo data"
        title="Patient management"
        description="A privacy-conscious operational view. AI call previews use patient identifiers only."
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 text-slate-400" size={15} />
            <Input
              className="pl-9"
              placeholder="Search patient ID or name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Patient",
                  "Assigned doctor",
                  "Department / Room",
                  "Assigned tasks",
                  "Current status",
                ].map((x) => (
                  <th className="px-5 py-3" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <b className="block">{p.name}</b>
                    <span className="text-[10px] text-slate-400">{p.id}</span>
                  </td>
                  <td className="px-5">{users.find((u) => u.id === p.doctorId)?.name}</td>
                  <td className="px-5">
                    {p.department}
                    <br />
                    <span className="text-slate-400">Room {p.room}</span>
                  </td>
                  <td className="px-5 font-semibold">
                    {tasks.filter((t) => t.patientId === p.id).length}
                  </td>
                  <td className="px-5">
                    <Badge
                      className={
                        p.status === "critical"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {p.status.replace("-", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function HandoverPage() {
  const { shift, users, tasks, acknowledgeShift } = useApp();
  const outgoing = users.find((u) => u.id === shift.outgoingId);
  const incoming = users.find((u) => u.id === shift.incomingId);
  const pending = tasks.filter((t) => !["verified", "self-reported"].includes(t.status));
  const items = [
    ["I", "Illness severity", "One critical patient; two require active monitoring."],
    [
      "P",
      "Patient summary",
      "PT-1121: Cardiology, ECG review acknowledged. PT-1042: antibiotic schedule active.",
    ],
    [
      "A",
      "Action list",
      `${pending.length} tasks pending across the current care team. Fluid balance chart requires immediate follow-up.`,
    ],
    [
      "S",
      "Situation awareness",
      "Escalate if PT-1121 fluid balance is not updated in 30 minutes. AI verification retry scheduled.",
    ],
    [
      "S",
      "Synthesis by receiver",
      "Incoming staff should confirm overdue items and acknowledge this handover.",
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow="I-PASS clinical continuity"
        title="Shift handover"
        description="Structured transfer of task ownership, unresolved alerts, and follow-up responsibilities."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <ArrowLeftRight />
              </div>
              <div>
                <h2 className="font-semibold">Day to evening shift</h2>
                <p className="text-xs text-slate-500">
                  {shift.start}–{shift.end} · Ward 4A / ICU
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Avatar name={outgoing?.name ?? ""} />
              <div>
                <p className="text-[10px] text-slate-400">OUTGOING</p>
                <b className="text-sm">{outgoing?.name}</b>
              </div>
              <ArrowRight className="mx-auto text-slate-300" />
              <Avatar name={incoming?.name ?? ""} />
              <div>
                <p className="text-[10px] text-slate-400">INCOMING</p>
                <b className="text-sm">{incoming?.name}</b>
              </div>
            </div>
            <Button
              className="mt-5 w-full"
              disabled={shift.acknowledged}
              onClick={acknowledgeShift}
            >
              {shift.acknowledged ? (
                <>
                  <CheckCircle2 size={16} />
                  Handover acknowledged
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  Acknowledge handover
                </>
              )}
            </Button>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Task continuity</h3>
            <div className="mt-4 grid grid-cols-3 text-center">
              <div>
                <b className="text-xl">{pending.length}</b>
                <p className="text-[10px] text-slate-500">Pending</p>
              </div>
              <div>
                <b className="text-xl text-emerald-600">
                  {tasks.filter((t) => ["verified", "self-reported"].includes(t.status)).length}
                </b>
                <p className="text-[10px] text-slate-500">Complete</p>
              </div>
              <div>
                <b className="text-xl text-red-600">
                  {tasks.filter((t) => t.status === "overdue").length}
                </b>
                <p className="text-[10px] text-slate-500">Follow-up</p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Structured handover summary</h2>
            <p className="text-xs text-slate-500">
              I-PASS format · Generated from live task status
            </p>
          </div>
          <div className="space-y-3">
            {items.map(([letter, title, text], i) => (
              <div key={title} className="flex gap-3 rounded-xl border border-slate-100 p-4">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-lg font-bold ${i === 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
                >
                  {letter}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
function Avatar({ name }: { name: string }) {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(-2)
        .join("")}
    </div>
  );
}

export function CallHistoryPage() {
  const { calls, tasks, users } = useApp();
  const [type, setType] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = calls.filter(
    (c) => (type === "all" || c.type === type) && (outcome === "all" || c.outcome === outcome),
  );
  const detail = calls.find((c) => c.id === selected);
  return (
    <>
      <PageHeader
        eyebrow="AI voice audit trail"
        title="Call history"
        description="Review reminder and verification outcomes, interpreted responses, and full demo transcripts."
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <Input className="w-40" type="date" />
          <Select className="w-44" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All call types</option>
            <option value="reminder">Reminder calls</option>
            <option value="verification">Verification calls</option>
          </Select>
          <Select className="w-44" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="all">All outcomes</option>
            <option value="successful">Successful</option>
            <option value="no-answer">No answer</option>
            <option value="assistance">Assistance</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Staff / Task",
                  "Call type",
                  "Time",
                  "Duration",
                  "Outcome",
                  "AI response",
                  "Verification",
                  "",
                ].map((x) => (
                  <th key={x} className="px-5 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const t = tasks.find((x) => x.id === c.taskId);
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <b className="block">{users.find((u) => u.id === c.staffId)?.name}</b>
                      <span className="text-[10px] text-slate-400">{t?.description}</span>
                    </td>
                    <td className="px-5 capitalize">{c.type}</td>
                    <td className="px-5">{c.time}</td>
                    <td className="px-5">{c.duration}</td>
                    <td className="px-5">
                      <Badge
                        className={
                          c.outcome === "successful"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : c.outcome === "no-answer"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {c.outcome}
                      </Badge>
                    </td>
                    <td className="px-5">{c.response}</td>
                    <td className="px-5 capitalize text-violet-700">
                      {c.verification.replace("-", " ")}
                    </td>
                    <td className="px-5">
                      <Button variant="ghost" onClick={() => setSelected(c.id)}>
                        View transcript
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {detail && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40">
          <button className="absolute inset-0" onClick={() => setSelected(null)} />
          <div className="relative h-full w-full max-w-lg overflow-y-auto bg-white p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Call details
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {detail.type === "reminder" ? "Reminder call" : "Verification follow-up"}
                </h2>
              </div>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["Staff", users.find((u) => u.id === detail.staffId)?.name],
                ["Task", tasks.find((t) => t.id === detail.taskId)?.description],
                ["Outcome", detail.outcome],
                ["Duration", detail.duration],
              ].map(([a, b]) => (
                <div key={a} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-400">{a}</p>
                  <p className="mt-1 text-xs font-semibold capitalize">{b}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-6 text-sm font-semibold">Transcript</h3>
            <div className="mt-3 space-y-3">
              {detail.transcript.length ? (
                detail.transcript.map((x, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-xs leading-5 ${x.speaker === "AI" ? "mr-8 bg-blue-50 text-blue-900" : "ml-8 bg-slate-100 text-slate-700"}`}
                  >
                    <b className="block text-[9px] uppercase opacity-50">{x.speaker}</b>
                    {x.message}
                  </div>
                ))
              ) : (
                <Empty text="No transcript — call was unanswered." />
              )}
            </div>
            <div className="mt-6 rounded-lg bg-violet-50 p-3 text-xs leading-5 text-violet-800">
              <b>Verification note:</b> A spoken confirmation is classified as self-reported and
              should not be represented as independent clinical verification.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const weekly = [
  { day: "Mon", completed: 18, overdue: 3 },
  { day: "Tue", completed: 21, overdue: 2 },
  { day: "Wed", completed: 19, overdue: 4 },
  { day: "Thu", completed: 25, overdue: 2 },
  { day: "Fri", completed: 28, overdue: 1 },
  { day: "Sat", completed: 23, overdue: 2 },
  { day: "Sun", completed: 26, overdue: 1 },
];
const performance = [
  { name: "Dr. Aisha", rate: 84 },
  { name: "Dr. Rohan", rate: 92 },
  { name: "N. Priya", rate: 88 },
  { name: "N. Neha", rate: 76 },
];
export function ReportsPage() {
  const { tasks, calls } = useApp();
  const pie = [
    { name: "Successful", value: 82, color: "#14b8a6" },
    { name: "Unanswered", value: 12, color: "#f59e0b" },
    { name: "Failed", value: 6, color: "#ef4444" },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Operational intelligence"
        title="Reports & analytics"
        description="Monitor task reliability, staff follow-through, and AI calling effectiveness."
        actions={
          <Select className="w-40">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </Select>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Weekly completion"
          value="86%"
          detail="+8% vs last week"
          icon={icons.check}
          tone="teal"
        />
        <Stat
          label="AI call success"
          value="82%"
          detail={`${calls.length + 14} calls placed`}
          icon={icons.phone}
        />
        <Stat
          label="Pending verification"
          value={tasks.filter((t) => t.status === "self-reported").length}
          icon={icons.shield}
          tone="amber"
        />
        <Stat
          label="Escalated tasks"
          value={tasks.filter((t) => ["overdue", "issue"].includes(t.status)).length}
          icon={icons.alert}
          tone="red"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Daily task completion" subtitle="Completed and overdue tasks">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="AI call outcomes" subtitle="Connection and response quality">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
              >
                {pie.map((x) => (
                  <Cell key={x.name} fill={x.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Staff performance" subtitle="Task completion rate by staff">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="rate" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly completion trend" subtitle="Clinical reliability over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Line dataKey="completed" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4 h-64">{children}</div>
    </Card>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState({
    reminder: "30",
    verification: "15",
    retry: true,
    escalate: true,
    sms: false,
    push: true,
    email: true,
    language: "English + Hindi",
  });
  const toggle = (key: keyof typeof settings) => setSettings((s) => ({ ...s, [key]: !s[key] }));
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Configure hospital identity, voice-agent behavior, escalation rules, and notifications."
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <SettingsCard title="Hospital profile" icon={<ShieldCheck size={18} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Hospital name">
                <Input defaultValue="CareLoop Demo Hospital" />
              </Label>
              <Label text="Facility ID">
                <Input defaultValue="CLH-001" />
              </Label>
              <Label text="Timezone">
                <Select>
                  <option>Asia/Kolkata (IST)</option>
                </Select>
              </Label>
              <Label text="Clinical operations lead">
                <Input defaultValue="Maya Rao" />
              </Label>
            </div>
          </SettingsCard>
          <SettingsCard title="AI calling preferences" icon={<PhoneCall size={18} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Reminder interval (minutes before)">
                <Input
                  type="number"
                  value={settings.reminder}
                  onChange={(e) => setSettings({ ...settings, reminder: e.target.value })}
                />
              </Label>
              <Label text="Verification interval (minutes after)">
                <Input
                  type="number"
                  value={settings.verification}
                  onChange={(e) => setSettings({ ...settings, verification: e.target.value })}
                />
              </Label>
              <Label text="Agent languages">
                <Select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option>English + Hindi</option>
                  <option>English</option>
                  <option>Hindi</option>
                </Select>
              </Label>
              <div>
                <span className="mb-1.5 block text-xs font-semibold">No-answer retry</span>
                <Toggle
                  active={settings.retry as boolean}
                  onClick={() => toggle("retry")}
                  label="Retry once after 5 min"
                />
              </div>
            </div>
          </SettingsCard>
          <SettingsCard title="Escalation rules" icon={<AlertTriangle size={18} />}>
            <Toggle
              active={settings.escalate as boolean}
              onClick={() => toggle("escalate")}
              label="Escalate unanswered verification calls to supervisor"
            />
            <div className="mt-3">
              <Toggle active={true} label="Flag self-reported completion for review" />
            </div>
          </SettingsCard>
        </div>
        <div className="space-y-5">
          <SettingsCard title="Staff & roles" icon={<UsersRound size={18} />}>
            <div className="space-y-3">
              {[
                ["Supervisors", "2", "Full access"],
                ["Doctors", "18", "Clinical tasks"],
                ["Nurses", "42", "Ward tasks"],
              ].map((x) => (
                <div
                  key={x[0]}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                >
                  <div>
                    <b className="text-sm">{x[0]}</b>
                    <p className="text-[10px] text-slate-400">{x[2]}</p>
                  </div>
                  <Badge className="border-slate-200 bg-white">{x[1]}</Badge>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-4 w-full">
              Manage staff & permissions
            </Button>
          </SettingsCard>
          <SettingsCard title="Notifications" icon={<SlidersHorizontal size={18} />}>
            <div className="space-y-4">
              <Toggle
                active={settings.push as boolean}
                onClick={() => toggle("push")}
                label="In-app notifications"
              />
              <Toggle
                active={settings.email as boolean}
                onClick={() => toggle("email")}
                label="Email escalation summaries"
              />
              <Toggle
                active={settings.sms as boolean}
                onClick={() => toggle("sms")}
                label="SMS alerts"
              />
            </div>
          </SettingsCard>
          <Button className="w-full" onClick={() => alert("Settings saved locally for this demo.")}>
            Save settings
          </Button>
        </div>
      </div>
    </>
  );
}
function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-2 text-blue-600">
        {icon}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </Card>
  );
}
function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${active ? "bg-blue-600" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white transition ${active ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}
