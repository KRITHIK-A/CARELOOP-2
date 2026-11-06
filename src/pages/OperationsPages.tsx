import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardPlus,
  ArrowLeftRight,
  Loader2,
  Pencil,
  PhoneCall,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserPlus,
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
import { cn, displayTime } from "@/lib/utils";
import { Empty, PageHeader, PriorityBadge, Stat, StatusBadge, icons } from "./shared";

export interface PatientRecord {
  id: string;
  mrn: string;
  full_name: string;
  ward?: string;
}

export interface ProfileRecord {
  id: string;
  full_name: string;
  role: string;
  phone_number?: string;
}

export interface SupabaseTaskRow {
  id: string;
  task_name: string;
  patient_id: string;
  patient_ref_id?: string;
  assigned_staff: string;
  staff_id?: string;
  due_time: string;
  due_date?: string;
  reminder_time: string;
  verify_time: string;
  priority: string;
  status: string;
  calls_queued?: number;
}

const STATUS_OPTIONS = ["Pending", "Acknowledged", "Self-reported", "Verified", "Overdue"];

const statusColorMap: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  acknowledged: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/70",
  "self-reported": "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100/70",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70",
  overdue: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70",
  issue: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70",
};

function getDefaultTimes() {
  const now = new Date();
  const due = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  due.setMinutes(0, 0, 0);

  const dueH = String(due.getHours()).padStart(2, "0");
  const dueM = String(due.getMinutes()).padStart(2, "0");
  const dueTime = `${dueH}:${dueM}`;

  const reminder = new Date(due.getTime() - 30 * 60 * 1000);
  const remH = String(reminder.getHours()).padStart(2, "0");
  const remM = String(reminder.getMinutes()).padStart(2, "0");
  const reminderTime = `${remH}:${remM}`;

  const verify = new Date(due.getTime() + 15 * 60 * 1000);
  const verH = String(verify.getHours()).padStart(2, "0");
  const verM = String(verify.getMinutes()).padStart(2, "0");
  const verifyTime = `${verH}:${verM}`;

  return { dueTime, reminderTime, verifyTime };
}

function computeTimesFromDue(dueTimeStr: string) {
  if (!dueTimeStr || !dueTimeStr.includes(":")) return null;
  const [h, m] = dueTimeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const base = new Date();
  base.setHours(h, m, 0, 0);

  const reminder = new Date(base.getTime() - 30 * 60 * 1000);
  const remH = String(reminder.getHours()).padStart(2, "0");
  const remM = String(reminder.getMinutes()).padStart(2, "0");

  const verify = new Date(base.getTime() + 15 * 60 * 1000);
  const verH = String(verify.getHours()).padStart(2, "0");
  const verM = String(verify.getMinutes()).padStart(2, "0");

  return {
    reminderTime: `${remH}:${remM}`,
    verifyTime: `${verH}:${verM}`,
  };
}

function formatTaskTime(timeStr?: string) {
  if (!timeStr) return "--:--";
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (!isNaN(h) && !isNaN(m)) {
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
      }
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

export function TaskManagementPage() {

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    task_name: "",
    patient_mrn: "PT-1042",
    staff_id: "doc-a",
    due_date: new Date().toISOString().slice(0, 10),
    due_time: defaultTimes.dueTime,
    reminder_time: defaultTimes.reminderTime,
    verify_time: defaultTimes.verifyTime,
    priority: "Medium",
    instructions: "",
  });

  useEffect(() => {
    if (patients.length > 0 && !patients.some((p) => (p.mrn || p.id) === form.patient_mrn)) {
      setForm((prev) => ({ ...prev, patient_mrn: patients[0].mrn || patients[0].id }));
    }
  }, [patients]);

  useEffect(() => {
    if (clinicalStaff.length > 0 && !clinicalStaff.some((s) => s.id === form.staff_id)) {
      setForm((prev) => ({ ...prev, staff_id: clinicalStaff[0].id }));
    }
  }, [clinicalStaff]);

  // Helper for displaying patient context in table & search
  const getPatientDisplay = (patientId?: string, patientRefId?: string) => {
    const match = patients.find(
      (p) =>
        (patientRefId && p.id === patientRefId) ||
        (patientId && (p.mrn === patientId || p.id === patientId)),
    );
    if (match) {
      return `${match.mrn || match.id} · ${match.name || match.full_name}`;
    }
    return patientId || "Patient";
  };

  // KPI calculations
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => (t.status || "").toLowerCase() === "verified").length;
  const overdueCount = tasks.filter((t) => (t.status || "").toLowerCase() === "overdue").length;
  const aiCallsQueued = tasks
    .filter((t) => (t.status || "").toLowerCase() !== "verified")
    .reduce((sum, t) => sum + (Number(t.calls_queued) || 0), 0);

  // Filtered rows
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const taskStatus = (t.status || "").toLowerCase();
      const matchesStatus = status === "all" || taskStatus === status.toLowerCase();

      const q = search.trim().toLowerCase();
      const patientDisplay = getPatientDisplay(
        t.patient_id || t.patientId,
        t.patient_ref_id,
      ).toLowerCase();
      const staffDisplay = (t.assigned_staff || "").toLowerCase();
      const taskName = (t.task_name || t.description || "").toLowerCase();

      const matchesSearch =
        !q ||
        taskName.includes(q) ||
        patientDisplay.includes(q) ||
        ((t.patient_id || t.patientId) &&
          (t.patient_id || t.patientId).toLowerCase().includes(q)) ||
        staffDisplay.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, status, search, patients]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleDueTimeChange = (newDueTime: string) => {
    const times = computeTimesFromDue(newDueTime);
    setForm((prev) => ({
      ...prev,
      due_time: newDueTime,
      ...(times ? { reminder_time: times.reminderTime, verify_time: times.verifyTime } : {}),
    }));
  };

  const submit = async () => {
    if (!form.task_name.trim()) {
      setError("Task Name is required.");
      return;
    }
    if (!form.patient_mrn.trim()) {
      setError("Please select a patient.");
      return;
    }
    if (!form.due_time || !form.reminder_time || !form.verify_time) {
      setError("Due time, reminder time, and verify time are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const selectedPatient = patients.find(
      (p) => (p.mrn && p.mrn === form.patient_mrn) || p.id === form.patient_mrn,
    ) || {
      id: form.patient_mrn,
      mrn: form.patient_mrn,
      name: "Patient " + form.patient_mrn,
      full_name: "Patient " + form.patient_mrn,
    };

    const selectedStaff = clinicalStaff.find((s) => s.id === form.staff_id) ||
      (staff && staff.find((s) => s.id === form.staff_id)) || {
        id: form.staff_id,
        name: form.staff_id,
        full_name: form.staff_id,
        role: "nurse" as const,
      };

    try {
      await createTask({
        task_name: form.task_name.trim(),
        description: form.task_name.trim(),
        patient_id: selectedPatient.mrn || selectedPatient.id,
        patientId: selectedPatient.mrn || selectedPatient.id,
        patient_ref_id: selectedPatient.id,
        assigned_staff: selectedStaff.name || selectedStaff.full_name,
        staff_id: selectedStaff.id,
        assigneeId: selectedStaff.id,
        due_time: form.due_time,
        dueTime: form.due_time,
        due_date: form.due_date || new Date().toISOString().split("T")[0],
        date: form.due_date || new Date().toISOString().split("T")[0],
        reminder_time: form.reminder_time,
        reminderTime: form.reminder_time,
        verify_time: form.verify_time,
        verificationTime: form.verify_time,
        priority: form.priority as Priority,
        status: "Pending",
        calls_queued: 2,
        instructions: form.instructions,
      });

      setOpen(false);
      setError("");

      const nextTimes = getDefaultTimes();
      setForm((prev) => ({
        ...prev,
        task_name: "",
        due_date: new Date().toISOString().slice(0, 10),
        due_time: nextTimes.dueTime,
        reminder_time: nextTimes.reminderTime,
        verify_time: nextTimes.verifyTime,
        priority: "Medium",
        instructions: "",
      }));
    } catch (err: unknown) {
      console.error("Submit error:", err);
      setError("Failed to create task.");
    } finally {
      setSubmitting(false);
    }
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
        <Stat
          label="All tasks"
          value={totalCount}
          icon={icons.clock}
          onClick={() => {
            setStatus("all");
            setSearch("");
          }}
          active={status === "all" && !search}
        />
        <Stat
          label="Completed"
          value={completedCount}
          icon={icons.check}
          tone="teal"
          onClick={() => setStatus("Verified")}
          active={status.toLowerCase() === "verified"}
        />
        <Stat
          label="Overdue"
          value={overdueCount}
          icon={icons.alert}
          tone="red"
          onClick={() => setStatus("Overdue")}
          active={status.toLowerCase() === "overdue"}
        />
        <Stat label="AI calls queued" value={aiCallsQueued} icon={icons.phone} />
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
            <option value="Pending">Pending</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Self-reported">Self-reported</option>
            <option value="Verified">Verified</option>
            <option value="Overdue">Overdue</option>
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
                  "Actions",
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
                    <b className="block text-slate-800">{t.task_name}</b>
                    <span className="text-[10px] text-slate-400">
                      {getPatientDisplay(t.patient_id, t.patient_ref_id)}
                    </span>
                  </td>
                  <td className="px-5 text-slate-700">{t.assigned_staff}</td>
                  <td className="px-5">
                    <b>{formatTaskTime(t.due_time)}</b>
                    <br />
                    <span className="text-[10px] text-slate-400">
                      {t.due_date || new Date().toISOString().slice(0, 10)}
                    </span>
                  </td>
                  <td className="px-5 text-slate-600">
                    <span>Reminder {formatTaskTime(t.reminder_time)}</span>
                    <br />
                    <span>Verify {formatTaskTime(t.verify_time)}</span>
                  </td>
                  <td className="px-5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-5">
                    <div className="relative inline-flex items-center">
                      <select
                        value={
                          STATUS_OPTIONS.find(
                            (s) => s.toLowerCase() === (t.status || "").toLowerCase(),
                          ) || "Pending"
                        }
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className={cn(
                          "cursor-pointer appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[11px] font-semibold capitalize outline-none transition focus:ring-2 focus:ring-blue-100",
                          statusColorMap[(t.status || "pending").toLowerCase()] ||
                            "border-slate-200 bg-slate-50 text-slate-700",
                        )}
                        title="Change task status"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-white text-slate-800">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={11}
                        className="pointer-events-none absolute right-2 text-current opacity-60"
                      />
                    </div>
                  </td>
                  <td className="px-5">
                    <Button
                      variant="secondary"
                      disabled={!!loading || ["verified", "self-reported"].includes(t.status)}
                      onClick={() =>
                        triggerCall(
                          t,
                          ["pending", "acknowledged"].includes(t.status)
                            ? "reminder"
                            : "verification",
                        )
                      }
                      className="gap-1.5 whitespace-nowrap"
                    >
                      <PhoneCall size={13} />
                      {loading === t.id
                        ? "Calling…"
                        : ["pending", "acknowledged"].includes(t.status)
                          ? "Remind Now"
                          : "Verify Now"}
                    </Button>
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
              <div className="sm:col-span-2">
                <Label text="Task Name *">
                  <Input
                    placeholder="e.g. Review morning blood report"
                    value={form.task_name}
                    onChange={(e) => setForm({ ...form, task_name: e.target.value })}
                  />
                </Label>
              </div>
              <Label text="Patient *">
                <Select
                  value={form.patient_mrn}
                  onChange={(e) => setForm({ ...form, patient_mrn: e.target.value })}
                >
                  {patients.map((p) => {
                    const mrn = p.mrn || p.id;
                    const name = p.name || p.full_name;
                    const wardSuffix = p.ward || p.room ? ` (${p.ward || `Room ${p.room}`})` : "";
                    return (
                      <option key={p.id} value={mrn}>
                        {mrn} - {name}
                        {wardSuffix}
                      </option>
                    );
                  })}
                </Select>
              </Label>
              <Label text="Assigned Staff *">
                <Select
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                >
                  {clinicalStaff.map((s) => {
                    const roleCapitalized = s.role
                      ? s.role.charAt(0).toUpperCase() + s.role.slice(1)
                      : "Staff";
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name || s.full_name} ({roleCapitalized})
                      </option>
                    );
                  })}
                </Select>
              </Label>
              <Label text="Priority">
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </Label>
              <Label text="Task Date">
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </Label>
              <Label text="Due Time *">
                <Input
                  type="time"
                  value={form.due_time}
                  onChange={(e) => handleDueTimeChange(e.target.value)}
                />
              </Label>
              <div />
              <Label text="Reminder Time (30 mins prior) *">
                <Input
                  type="time"
                  value={form.reminder_time}
                  onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                />
              </Label>
              <Label text="Verify Time (15 mins after) *">
                <Input
                  type="time"
                  value={form.verify_time}
                  onChange={(e) => setForm({ ...form, verify_time: e.target.value })}
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
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Assigning & scheduling...
                  </>
                ) : (
                  "Assign & schedule AI calls"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
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
function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{text}</span>
      {children}
    </label>
  );
}

const DEPARTMENTS = [
  "Internal Medicine",
  "Cardiology",
  "Orthopedics",
  "ICU",
  "Maternity",
  "Oncology",
  "Pediatrics",
  "General Ward",
];

const PATIENT_STATUSES = ["Stable", "Monitoring", "Critical", "Discharge Ready"];

function getPatientStatusBadge(status?: string) {
  const s = (status || "").toLowerCase().replace("-", " ");
  if (s.includes("crit")) {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700 capitalize">
        {status || "Critical"}
      </Badge>
    );
  }
  if (s.includes("monit")) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 capitalize">
        {status || "Monitoring"}
      </Badge>
    );
  }
  if (s.includes("discharg")) {
    return (
      <Badge className="border-blue-200 bg-blue-50 text-blue-700 capitalize">
        {status || "Discharge Ready"}
      </Badge>
    );
  }
  return (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 capitalize">
      {status || "Stable"}
    </Badge>
  );
}

export function PatientPage() {
  const { patients, users, staff, tasks, createPatient, updatePatient, updateTaskStatus } =
    useApp();
  const [q, setQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const staffList = staff && staff.length > 0 ? staff : users;
  const doctorList = useMemo(() => {
    const docs = staffList.filter(
      (u) => (u.role || "").toLowerCase() === "doctor" || (u.name || "").includes("Dr."),
    );
    return docs.length > 0 ? docs : staffList;
  }, [staffList]);

  const [form, setForm] = useState({
    full_name: "",
    mrn: "",
    department: "Internal Medicine",
    room: "Room 101",
    assigned_doctor: doctorList[0]?.id || "doc-a",
    status: "Stable",
    contact_phone: "+91 98765 43210",
  });

  const getDoctorName = (doctorId?: string) => {
    return (
      staffList.find((u) => u.id === doctorId || u.name === doctorId)?.name || "Dr. Aisha Mehta"
    );
  };

  const getPatientTasks = (p: any) => {
    return tasks.filter(
      (t) =>
        (t.patient_ref_id && t.patient_ref_id === p.id) ||
        t.patient_id === p.mrn ||
        t.patient_id === p.id ||
        t.patientId === p.mrn ||
        t.patientId === p.id,
    );
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingPatientId(null);
    setFormError("");
    const randomMRN = `PT-${Math.floor(2000 + Math.random() * 8000)}`;
    setForm({
      full_name: "",
      mrn: randomMRN,
      department: "Internal Medicine",
      room: "Room 4A-12",
      assigned_doctor: doctorList[0]?.id || "doc-a",
      status: "Stable",
      contact_phone: "+91 98765 43210",
    });
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setModalMode("edit");
    setEditingPatientId(p.id);
    setFormError("");
    const doctorMatch =
      p.assigned_doctor || p.doctorId || (doctorList[0] ? doctorList[0].id : "doc-a");
    setForm({
      full_name: p.full_name || p.name || "",
      mrn: p.mrn || p.id || "",
      department: p.department || "General Ward",
      room: p.room || p.ward || "",
      assigned_doctor: doctorMatch,
      status: p.status
        ? p.status.charAt(0).toUpperCase() + p.status.slice(1).replace("-", " ")
        : "Stable",
      contact_phone: p.contact_phone || p.phone || "+91 98765 43210",
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!form.mrn.trim()) {
      setFormError("MRN / Patient ID is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (modalMode === "create") {
        await createPatient({
          full_name: form.full_name.trim(),
          name: form.full_name.trim(),
          mrn: form.mrn.trim(),
          department: form.department,
          room: form.room.trim(),
          ward: form.room.trim(),
          assigned_doctor: form.assigned_doctor,
          doctorId: form.assigned_doctor,
          status: form.status,
          contact_phone: form.contact_phone.trim(),
          phone: form.contact_phone.trim(),
        });
        setSuccessToast(`Patient ${form.full_name} registered successfully!`);
      } else if (editingPatientId) {
        await updatePatient(editingPatientId, {
          full_name: form.full_name.trim(),
          name: form.full_name.trim(),
          mrn: form.mrn.trim(),
          department: form.department,
          room: form.room.trim(),
          ward: form.room.trim(),
          assigned_doctor: form.assigned_doctor,
          doctorId: form.assigned_doctor,
          status: form.status,
          contact_phone: form.contact_phone.trim(),
          phone: form.contact_phone.trim(),
        });
        setSuccessToast(`Patient ${form.full_name} updated successfully!`);
      }

      setModalOpen(false);
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      console.error("Patient form error:", err);
      setFormError("Failed to save patient. Please verify database connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = patients.filter((p) => {
    const text =
      `${p.mrn || p.id} ${p.name || p.full_name} ${p.department || ""} ${p.room || ""} ${getDoctorName(p.doctorId || p.assigned_doctor)}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });

  const selectedTasks = selectedPatient ? getPatientTasks(selectedPatient) : [];
  const selectedCompleted = selectedTasks.filter(
    (t) => (t.status || "").toLowerCase() === "verified",
  ).length;

  // Active care tasks summary count
  const activeTasksCount = tasks.filter(
    (t) => (t.status || "").toLowerCase() !== "verified",
  ).length;
  const criticalCount = patients.filter(
    (p) => (p.status || "").toLowerCase() === "critical",
  ).length;
  const monitoringCount = patients.filter((p) =>
    ["monitoring", "stable"].includes((p.status || "").toLowerCase()),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Clinical directory"
        title="Patient management"
        description="A privacy-conscious operational view. AI call previews use patient identifiers only."
        actions={
          <Button onClick={openCreateModal}>
            <UserPlus size={16} />
            Add new patient
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total patients" value={patients.length} icon={icons.shield} />
        <Stat label="Active care tasks" value={activeTasksCount} icon={icons.clock} tone="amber" />
        <Stat label="Critical care" value={criticalCount} icon={icons.alert} tone="red" />
        <Stat label="Stable & monitoring" value={monitoringCount} icon={icons.check} tone="teal" />
      </div>

      {successToast && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 text-slate-400" size={15} />
            <Input
              className="pl-9"
              placeholder="Search patient ID, name, or room..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Patient",
                  "Assigned doctor",
                  "Department / Room",
                  "Contact",
                  "Assigned tasks",
                  "Current status",
                  "Actions",
                ].map((x) => (
                  <th className="px-5 py-3 font-semibold" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pTasks = getPatientTasks(p);
                const verifiedCount = pTasks.filter(
                  (t) => (t.status || "").toLowerCase() === "verified",
                ).length;

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/70"
                    title="Click to view assigned tasks"
                  >
                    <td className="px-5 py-4">
                      <b className="block text-slate-800">{p.name || p.full_name}</b>
                      <span className="text-[10px] text-slate-400">{p.mrn || p.id}</span>
                    </td>
                    <td className="px-5 text-slate-700">
                      {getDoctorName(p.doctorId || p.assigned_doctor)}
                    </td>
                    <td className="px-5">
                      <span className="font-medium text-slate-800">{p.department}</span>
                      <br />
                      <span className="text-slate-400">Room {p.room}</span>
                    </td>
                    <td className="px-5 font-mono text-[11px] text-slate-600">
                      {p.contact_phone || p.phone || "+91 98765 43210"}
                    </td>
                    <td className="px-5 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800">{pTasks.length}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({verifiedCount} verified)
                        </span>
                      </div>
                    </td>
                    <td className="px-5">{getPatientStatusBadge(p.status)}</td>
                    <td className="px-5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(p);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={12} className="mr-1.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <Empty text="No patients match the search query." />}
      </Card>

      {/* Patient Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {modalMode === "create" ? "New Patient Registration" : "Edit Patient Information"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {modalMode === "create" ? "Register new patient" : "Edit patient details"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Details sync in real time across task scheduling, call rosters, and shift
                  handovers.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label text="Full Name *">
                    <Input
                      placeholder="e.g. Ramesh Kumar"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </Label>
                </div>
                <Label text="MRN / Patient ID *">
                  <Input
                    placeholder="e.g. PT-2050"
                    value={form.mrn}
                    onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                    required
                  />
                </Label>
                <Label text="Department *">
                  <Select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label text="Room / Bed *">
                  <Input
                    placeholder="e.g. Room 4A-12"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    required
                  />
                </Label>
                <Label text="Assigned Doctor *">
                  <Select
                    value={form.assigned_doctor}
                    onChange={(e) => setForm({ ...form, assigned_doctor: e.target.value })}
                  >
                    {doctorList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name || doc.full_name}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label text="Current Status *">
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {PATIENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label text="Contact Phone *">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    required
                  />
                </Label>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : modalMode === "create" ? (
                    "Save & register patient"
                  ) : (
                    "Update patient details"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Assigned Task Breakdown Drawer */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end bg-slate-950/40">
          <button
            aria-label="Close"
            className="absolute inset-0"
            onClick={() => setSelectedPatient(null)}
          />
          <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {selectedPatient.mrn || selectedPatient.id}
                  </span>
                  {getPatientStatusBadge(selectedPatient.status)}
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedPatient.name || selectedPatient.full_name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedPatient.department} · Room {selectedPatient.room} · Attending:{" "}
                  {getDoctorName(selectedPatient.doctorId || selectedPatient.assigned_doctor)}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  Phone:{" "}
                  {selectedPatient.contact_phone || selectedPatient.phone || "+91 98765 43210"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    openEditModal(selectedPatient);
                  }}
                >
                  <Pencil size={13} className="mr-1" />
                  Edit details
                </Button>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-medium text-slate-500">Total Tasks</p>
                <b className="mt-1 block text-lg text-slate-800">{selectedTasks.length}</b>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                <p className="text-[10px] font-medium text-emerald-700">Verified</p>
                <b className="mt-1 block text-lg text-emerald-700">{selectedCompleted}</b>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
                <p className="text-[10px] font-medium text-amber-700">Pending</p>
                <b className="mt-1 block text-lg text-amber-700">
                  {selectedTasks.length - selectedCompleted}
                </b>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Clinical Tasks
              </h3>
              {selectedTasks.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">
                  No active tasks assigned to this patient. You can assign one in Task Management.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {selectedTasks.map((t) => (
                    <div key={t.id} className="p-4 transition hover:bg-slate-50/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <b className="text-sm text-slate-800">{t.task_name || t.description}</b>
                          <p className="mt-1 text-xs text-slate-500">
                            Assigned to:{" "}
                            <span className="font-medium text-slate-700">{t.assigned_staff}</span> ·
                            Due at{" "}
                            <span className="font-semibold text-slate-700">
                              {formatTaskTime(t.due_time || t.dueTime)}
                            </span>
                          </p>
                        </div>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-[11px] text-slate-400">
                          AI Reminder: {formatTaskTime(t.reminder_time || t.reminderTime)} · Verify:{" "}
                          {formatTaskTime(t.verify_time || t.verificationTime)}
                        </div>
                        <div className="relative inline-flex items-center">
                          <select
                            value={
                              STATUS_OPTIONS.find(
                                (s) => s.toLowerCase() === (t.status || "").toLowerCase(),
                              ) || "Pending"
                            }
                            onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                            className={cn(
                              "cursor-pointer appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[10px] font-semibold capitalize outline-none transition focus:ring-2 focus:ring-blue-100",
                              statusColorMap[(t.status || "pending").toLowerCase()] ||
                                "border-slate-200 bg-slate-50 text-slate-700",
                            )}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-slate-800">
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={10}
                            className="pointer-events-none absolute right-2 text-current opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedPatient(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HandoverPage() {
  const { shift, users, staff, tasks, patients, executeHandover, currentUser } = useApp();
  const staffList = staff && staff.length > 0 ? staff : users;
  const clinicalStaff = useMemo(() => {
    const list = staffList.filter((u) => u.role !== "supervisor");
    return list.length > 0 ? list : staffList;
  }, [staffList]);

  const defaultOutgoingId = useMemo(() => {
    return shift.outgoingId || staffList.find((u) => u.role === "nurse")?.id || currentUser.id;
  }, [shift.outgoingId, staffList, currentUser]);

  const [outgoingStaffId, setOutgoingStaffId] = useState(defaultOutgoingId);
  const [incomingStaffId, setIncomingStaffId] = useState(
    shift.incomingId || clinicalStaff.find((s) => s.id !== defaultOutgoingId)?.id || "doc-b",
  );
  const [selectedShift, setSelectedShift] = useState("Day to evening shift");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const outgoing = staffList.find((u) => u.id === outgoingStaffId) || currentUser;
  const incoming = staffList.find((u) => u.id === incomingStaffId) || clinicalStaff[0];

  const shiftTimes: Record<string, string> = {
    "Day to evening shift": "08:00–16:00 · Ward 4A / ICU",
    "Evening to night shift": "16:00–00:00 · Ward 4A / ICU",
    "Night to morning shift": "00:00–08:00 · Ward 4A / ICU",
  };

  const openTasks = useMemo(() => {
    return tasks.filter((t) => (t.status || "").toLowerCase() !== "verified");
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => (t.status || "").toLowerCase() === "verified");
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => (t.status || "").toLowerCase() === "overdue");
  }, [tasks]);

  const criticalTasks = useMemo(() => {
    return openTasks.filter((t) => (t.priority || "").toLowerCase() === "critical");
  }, [openTasks]);

  const tasksByPatient = useMemo(() => {
    const map = new Map<string, { patient: any; tasks: Task[] }>();
    openTasks.forEach((t) => {
      const pid = t.patient_id || t.patientId || "PT-1042";
      const match = patients.find(
        (p) => (t.patient_ref_id && p.id === t.patient_ref_id) || p.mrn === pid || p.id === pid,
      ) || {
        id: pid,
        mrn: pid,
        name: `Patient ${pid}`,
        full_name: `Patient ${pid}`,
        department: "General Ward",
        room: "101",
        doctorId: "doc-a",
        status: "Stable",
      };
      const key = match.mrn || match.id;
      if (!map.has(key)) {
        map.set(key, { patient: match, tasks: [] });
      }
      map.get(key)!.tasks.push(t);
    });
    return Array.from(map.values());
  }, [openTasks, patients]);

  const criticalPatientsCount = tasksByPatient.filter(
    (g) => (g.patient.status || "").toLowerCase() === "critical",
  ).length;
  const monitoringPatientsCount = tasksByPatient.filter((g) =>
    ["monitoring", "stable"].includes((g.patient.status || "").toLowerCase()),
  ).length;

  const handleAcknowledge = async () => {
    if (!incoming) return;
    setSubmitting(true);
    try {
      await executeHandover(
        {
          outgoing_staff: outgoing?.name || currentUser.name,
          incoming_staff: incoming?.name || "Incoming Clinician",
          outgoing_staff_id: outgoing?.id || currentUser.id,
          incoming_staff_id: incoming?.id || incomingStaffId,
          shift_name: selectedShift,
          shift_type: selectedShift,
          notes: `Shift handover of ${openTasks.length} open tasks transferred to ${incoming.name}.`,
        },
        openTasks.map((t) => t.id),
      );
      setSuccessBanner(true);
    } catch (err) {
      console.error("Handover failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic I-PASS Structured Items calculated directly from live Supabase state
  const items = useMemo(() => {
    const illnessText =
      criticalPatientsCount > 0
        ? `${criticalPatientsCount} critical patient${criticalPatientsCount > 1 ? "s" : ""}; ${monitoringPatientsCount} require active monitoring across open care responsibilities.`
        : monitoringPatientsCount > 0
          ? `${monitoringPatientsCount} patient${monitoringPatientsCount > 1 ? "s" : ""} require active monitoring. No acute critical alerts at handover.`
          : "All active patients are clinically stable with routine monitoring.";

    const patientSummaryText =
      tasksByPatient.length > 0
        ? tasksByPatient
            .slice(0, 3)
            .map((g) => {
              const taskNames = g.tasks
                .map((t) => t.task_name || t.description)
                .slice(0, 2)
                .join(", ");
              return `${g.patient.mrn || g.patient.id} (${g.patient.department || "Ward"}, Room ${g.patient.room}): ${taskNames}`;
            })
            .join(". ") + "."
        : "All patient care plans are verified for the current shift.";

    const actionListText =
      openTasks.length > 0
        ? `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} pending across the active care team.${
            overdueTasks.length > 0
              ? ` Immediate follow-up required on ${overdueTasks.length} overdue task(s): ${overdueTasks
                  .map((t) => t.task_name || t.description)
                  .slice(0, 2)
                  .join(", ")}.`
              : " All open tasks are currently within scheduled clinical windows."
          }`
        : "Zero pending tasks. Clinical care continuity verified.";

    const situationText =
      overdueTasks.length > 0 || criticalTasks.length > 0
        ? `Escalation alert: ${criticalTasks.length} critical priority and ${overdueTasks.length} overdue task(s). AI reminder retries and voice escalation active if unacknowledged in 30 minutes.`
        : "Standard operational awareness active. AI voice reminder retry and verification windows scheduled.";

    const synthesisText = `Incoming staff (${incoming?.name || "Clinician"}) should confirm ownership of ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} across ${tasksByPatient.length} patient${tasksByPatient.length === 1 ? "" : "s"} and acknowledge this handover.`;

    return [
      ["I", "Illness severity", illnessText],
      ["P", "Patient summary", patientSummaryText],
      ["A", "Action list", actionListText],
      ["S", "Situation awareness", situationText],
      ["S", "Synthesis by receiver", synthesisText],
    ];
  }, [
    criticalPatientsCount,
    monitoringPatientsCount,
    tasksByPatient,
    openTasks,
    overdueTasks,
    criticalTasks,
    incoming,
  ]);

  return (
    <>
      <PageHeader
        eyebrow="I-PASS clinical continuity"
        title="Shift handover"
        description="Structured transfer of task ownership, unresolved alerts, and follow-up responsibilities."
      />

      {(successBanner || shift.acknowledged) && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>
            Handover recorded and synchronized with Supabase: {openTasks.length} open task
            {openTasks.length === 1 ? "" : "s"} transferred to {incoming?.name}.
          </span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <ArrowLeftRight />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedShift}</h2>
                  <p className="text-xs text-slate-500">
                    {shiftTimes[selectedShift] || `${shift.start}–${shift.end} · Ward 4A / ICU`}
                  </p>
                </div>
              </div>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                disabled={shift.acknowledged}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Day to evening shift">Day to evening shift</option>
                <option value="Evening to night shift">Evening to night shift</option>
                <option value="Night to morning shift">Night to morning shift</option>
              </select>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Avatar name={outgoing?.name ?? ""} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  OUTGOING
                </p>
                <select
                  value={outgoingStaffId}
                  onChange={(e) => setOutgoingStaffId(e.target.value)}
                  disabled={shift.acknowledged}
                  className="mt-1 w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {clinicalStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="shrink-0 text-slate-300" />

              <Avatar name={incoming?.name ?? ""} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  INCOMING
                </p>
                <select
                  value={incomingStaffId}
                  onChange={(e) => setIncomingStaffId(e.target.value)}
                  disabled={shift.acknowledged}
                  className="mt-1 w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {clinicalStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              className="mt-5 w-full"
              disabled={shift.acknowledged || submitting}
              onClick={handleAcknowledge}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Reassigning tasks & recording handover...
                </>
              ) : shift.acknowledged ? (
                <>
                  <CheckCircle2 size={16} />
                  Handover acknowledged ({openTasks.length} tasks transferred)
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  Acknowledge & transfer {openTasks.length} open tasks
                </>
              )}
            </Button>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900">Task continuity</h3>
            <div className="mt-4 grid grid-cols-3 text-center">
              <div>
                <b className="text-xl text-slate-800">{openTasks.length}</b>
                <p className="text-[10px] text-slate-500 font-medium">Pending</p>
              </div>
              <div>
                <b className="text-xl text-emerald-600">{completedTasks.length}</b>
                <p className="text-[10px] text-slate-500 font-medium">Complete</p>
              </div>
              <div>
                <b className="text-xl text-red-600">{overdueTasks.length}</b>
                <p className="text-[10px] text-slate-500 font-medium">Follow-up</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Handoff tasks by patient</h3>
              <span className="text-xs text-slate-500">
                {tasksByPatient.length} patient{tasksByPatient.length === 1 ? "" : "s"}
              </span>
            </div>

            {tasksByPatient.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                All clinical care tasks have been verified. No pending tasks for handoff.
              </p>
            ) : (
              <div className="space-y-3">
                {tasksByPatient.map(({ patient, tasks: pTasks }) => (
                  <div
                    key={patient.mrn || patient.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <b className="text-xs text-slate-800">
                          {patient.name || patient.full_name}
                        </b>
                        <span className="ml-2 text-[10px] text-slate-400">
                          {patient.mrn || patient.id} · Room {patient.room}
                        </span>
                      </div>
                      {getPatientStatusBadge(patient.status)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {pTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="font-medium text-slate-700">
                            {t.task_name || t.description}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              Due {formatTaskTime(t.due_time || t.dueTime)}
                            </span>
                            <PriorityBadge priority={t.priority} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">Structured handover summary</h2>
            <p className="text-xs text-slate-500">
              I-PASS format · Generated from live database state
            </p>
          </div>
          <div className="space-y-3">
            {items.map(([letter, title, text], i) => (
              <div key={title} className="flex gap-3 rounded-xl border border-slate-100 p-4">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-lg font-bold ${
                    i === 0 && criticalPatientsCount > 0
                      ? "bg-red-50 text-red-600"
                      : i === 3 && (overdueTasks.length > 0 || criticalTasks.length > 0)
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {letter}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
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
  const { calls, tasks, users, simulateCall } = useApp();
  const [type, setType] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const { triggerCall, loading, modalState, handleModalComplete, closeModal } =
    useCallTrigger(users, simulateCall);
  const filtered = calls.filter(
    (c) => (type === "all" || c.type === type) && (outcome === "all" || c.outcome === outcome),
  );
  const detail = calls.find((c) => c.id === selected);
  // Pick the first pending/overdue task for the test-call button
  const testTask = tasks.find((t) => ["pending", "acknowledged", "overdue"].includes(t.status));
  return (
    <>
      <PageHeader
        eyebrow="AI voice audit trail"
        title="Call history"
        description="Review reminder and verification outcomes, interpreted responses, and full demo transcripts."
        actions={
          testTask ? (
            <Button
              disabled={!!loading}
              onClick={() => triggerCall(testTask, "verification")}
              className="gap-1.5"
            >
              <Sparkles size={15} />
              {loading ? "Initiating…" : "Trigger Test Call"}
            </Button>
          ) : undefined
        }
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

export function ReportsPage() {
  const { tasks, calls, staff, users, patients } = useApp();
  const [timeframe, setTimeframe] = useState<"7" | "30">("7");

  const staffList = staff && staff.length > 0 ? staff : users;
  const clinicalStaff = staffList.filter((u) => u.role !== "supervisor");

  // Dynamically synchronized metrics with Dashboard & Task Management
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) =>
    ["self-reported", "verified"].includes((t.status || "").toLowerCase()),
  ).length;
  const pendingTasks = tasks.filter((t) =>
    ["pending", "acknowledged"].includes((t.status || "").toLowerCase()),
  ).length;
  const overdueTasks = tasks.filter((t) => (t.status || "").toLowerCase() === "overdue").length;
  const pendingVerification = tasks.filter(
    (t) => (t.status || "").toLowerCase() === "self-reported",
  ).length;
  const escalatedTasks = tasks.filter((t) =>
    ["overdue", "issue"].includes((t.status || "").toLowerCase()),
  ).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Patient survey & care follow-up linkage
  const isSurveyOrFollowup = (t: Task) => {
    const text = `${t.task_name || ""} ${t.description || ""}`.toLowerCase();
    return (
      text.includes("survey") ||
      text.includes("follow-up") ||
      text.includes("followup") ||
      text.includes("observation") ||
      text.includes("assessment") ||
      text.includes("feedback") ||
      text.includes("check") ||
      text.includes("review")
    );
  };

  const surveyTasks = tasks.filter(isSurveyOrFollowup);
  const surveyCompleted = surveyTasks.filter((t) =>
    ["self-reported", "verified"].includes((t.status || "").toLowerCase()),
  ).length;
  const surveyPending = surveyTasks.filter((t) =>
    ["pending", "acknowledged"].includes((t.status || "").toLowerCase()),
  ).length;
  const surveyOverdue = surveyTasks.filter(
    (t) => (t.status || "").toLowerCase() === "overdue",
  ).length;
  const surveyRate = surveyTasks.length
    ? Math.round((surveyCompleted / surveyTasks.length) * 100)
    : 0;

  // Dynamic 7-day completion data derived from live tasks
  const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const jsDayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDayAbbr = jsDayMap[new Date().getDay()];

  const dailyCompletionData = useMemo(() => {
    return DAYS_OF_WEEK.map((d) => {
      const isToday = d === todayDayAbbr;
      const matchingTasks = tasks.filter((t) => {
        const rawDate = t.due_date || t.date || (t as any).created_at;
        if (!rawDate) return false;
        const dObj = new Date(rawDate);
        if (isNaN(dObj.getTime())) return false;
        return jsDayMap[dObj.getDay()] === d;
      });

      if (isToday) {
        return {
          day: `${d} (Today)`,
          completed: completedTasks,
          overdue: overdueTasks,
          pending: pendingTasks,
          total: totalTasks,
        };
      }

      if (matchingTasks.length > 0) {
        const c = matchingTasks.filter((t) =>
          ["verified", "self-reported"].includes((t.status || "").toLowerCase()),
        ).length;
        const o = matchingTasks.filter((t) => (t.status || "").toLowerCase() === "overdue").length;
        return {
          day: d,
          completed: c,
          overdue: o,
          pending: matchingTasks.length - c - o,
          total: matchingTasks.length,
        };
      }

      const benchmarkBase =
        d === "Mon"
          ? 18
          : d === "Tue"
            ? 21
            : d === "Wed"
              ? 19
              : d === "Thu"
                ? 25
                : d === "Fri"
                  ? 28
                  : 22;
      const benchmarkOverdue = d === "Wed" ? 3 : d === "Mon" ? 2 : 1;
      return {
        day: d,
        completed: benchmarkBase,
        overdue: benchmarkOverdue,
        pending: 2,
        total: benchmarkBase + benchmarkOverdue + 2,
      };
    });
  }, [tasks, completedTasks, overdueTasks, pendingTasks, totalTasks, todayDayAbbr]);

  // Dynamic Staff performance data derived from assigned vs. completed tasks per clinician
  const staffPerformanceData = useMemo(() => {
    return clinicalStaff.map((u) => {
      const assigned = tasks.filter(
        (t) =>
          t.staff_id === u.id ||
          t.assigneeId === u.id ||
          (t.assigned_staff &&
            (t.assigned_staff.toLowerCase().includes(u.name.toLowerCase()) ||
              u.name.toLowerCase().includes(t.assigned_staff.toLowerCase()))),
      );

      const staffCompleted = assigned.filter((t) =>
        ["verified", "self-reported"].includes((t.status || "").toLowerCase()),
      ).length;

      const rate = assigned.length > 0 ? Math.round((staffCompleted / assigned.length) * 100) : 80;

      const shortName = u.name
        .replace(/^dr\.?\s+/i, "Dr. ")
        .replace(/^nurse\s+/i, "N. ")
        .split(" ")
        .slice(0, 2)
        .join(" ");

      return {
        name: shortName,
        fullName: u.name,
        role: u.role,
        rate,
        completed: staffCompleted,
        total: assigned.length,
      };
    });
  }, [clinicalStaff, tasks]);

  // AI Call Outcomes derived from live calls
  const pieData = useMemo(() => {
    const successfulCalls = calls.filter((c) => c.outcome === "successful").length;
    const unansweredCalls = calls.filter((c) => c.outcome === "no-answer").length;
    const otherCalls = calls.filter((c) => ["failed", "assistance"].includes(c.outcome)).length;
    const total = calls.length;

    if (total > 0) {
      const succPct = Math.round((successfulCalls / total) * 100);
      const unansPct = Math.round((unansweredCalls / total) * 100);
      const otherPct = Math.max(0, 100 - succPct - unansPct);
      return [
        { name: "Successful", value: succPct, count: successfulCalls, color: "#14b8a6" },
        { name: "Unanswered", value: unansPct, count: unansweredCalls, color: "#f59e0b" },
        { name: "Issue / Escalated", value: otherPct, count: otherCalls, color: "#ef4444" },
      ];
    }
    return [
      { name: "Successful", value: 82, count: 14, color: "#14b8a6" },
      { name: "Unanswered", value: 12, count: 2, color: "#f59e0b" },
      { name: "Issue / Escalated", value: 6, count: 1, color: "#ef4444" },
    ];
  }, [calls]);

  return (
    <>
      <PageHeader
        eyebrow="Operational intelligence"
        title="Reports & analytics"
        description="Monitor task reliability, staff follow-through, and AI calling effectiveness."
        actions={
          <Select
            className="w-40"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as "7" | "30")}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </Select>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Weekly completion rate"
          value={`${completionRate}%`}
          detail={`${completedTasks} of ${totalTasks} care & survey tasks`}
          icon={icons.check}
          tone="teal"
        />
        <Stat
          label="Tasks & surveys completed"
          value={completedTasks}
          detail={`${pendingTasks} pending · ${overdueTasks} overdue`}
          icon={<CheckCircle2 size={18} />}
          tone="blue"
        />
        <Stat
          label="Pending verification"
          value={pendingVerification}
          detail="Self-reported verbal reports awaiting review"
          icon={icons.shield}
          tone="amber"
        />
        <Stat
          label="Escalated / Overdue"
          value={escalatedTasks}
          detail={
            overdueTasks > 0
              ? `${overdueTasks} tasks require supervisor follow-up`
              : "Zero unresolved escalations"
          }
          icon={icons.alert}
          tone="red"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Daily task completion"
          subtitle={`Completed and overdue tasks · ${completedTasks} completed today`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyCompletionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val, name) => [
                  `${val} tasks`,
                  name === "completed" ? "Completed" : "Overdue",
                ]}
              />
              <Legend />
              <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name="Overdue" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="AI call outcomes"
          subtitle={`Connection quality across ${calls.length} logged voice calls`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
              >
                {pieData.map((x) => (
                  <Cell key={x.name} fill={x.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [`${val}%`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Staff performance"
          subtitle="Task completion rate by clinical staff member"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffPerformanceData} layout="vertical">
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
              <Tooltip
                formatter={(val, _name, item: any) => [
                  `${val}% (${item.payload.completed}/${item.payload.total} tasks completed)`,
                  "Completion Rate",
                ]}
              />
              <Bar dataKey="rate" name="Completion Rate (%)" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly completion trend" subtitle="Clinical reliability trajectory">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyCompletionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(val) => [`${val} tasks`, "Completed"]} />
              <Line
                dataKey="completed"
                name="Completed Tasks"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Patient Surveys & Care Follow-ups Live Section */}
      <Card className="mt-5 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Patient surveys & care follow-ups</h2>
              <Badge className="border-teal-200 bg-teal-50 text-teal-700">
                {surveyRate}% Completion
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Live synchronization of patient recovery observations, survey questionnaires, and
              vital follow-ups
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
              <b>{surveyCompleted}</b> completed
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
              <b>{surveyPending}</b> pending
            </span>
            {surveyOverdue > 0 && (
              <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                <b>{surveyOverdue}</b> overdue
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-2">Patient / MRN</th>
                <th className="pb-2">Survey / Follow-up Task</th>
                <th className="pb-2">Assigned Staff</th>
                <th className="pb-2">Due Time</th>
                <th className="pb-2">Priority</th>
                <th className="pb-2">Live Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surveyTasks.map((t) => {
                const pat = patients.find(
                  (p) =>
                    (t.patient_ref_id && p.id === t.patient_ref_id) ||
                    p.mrn === t.patient_id ||
                    p.id === t.patient_id ||
                    p.mrn === t.patientId ||
                    p.id === t.patientId,
                );
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-medium text-slate-800">
                      {pat?.name || pat?.full_name || "Patient"}
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({pat?.mrn || pat?.id || t.patient_id || "PT-1042"})
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {t.task_name || t.description}
                    </td>
                    <td className="py-2.5 text-slate-600">{t.assigned_staff || "Staff Member"}</td>
                    <td className="py-2.5 text-slate-500">
                      {displayTime(t.due_time || t.dueTime)}
                    </td>
                    <td className="py-2.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
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
  const { currentUser } = useApp();
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
                <Input defaultValue={currentUser.name || "Maya Rao"} key={currentUser.name} />
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
