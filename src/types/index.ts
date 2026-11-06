export type UserRole = "supervisor" | "doctor" | "nurse";
export type TaskStatus =
  | "pending"
  | "acknowledged"
  | "self-reported"
  | "verified"
  | "overdue"
  | "issue";
export type Priority = "low" | "medium" | "high" | "critical";
export type CallOutcome = "scheduled" | "successful" | "no-answer" | "failed" | "assistance";

export interface User {
  id: string;
  name: string;
  full_name?: string;
  firstName?: string;
  initials?: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  phone_number?: string;
}
export interface Doctor extends User {
  role: "doctor";
  specialization: string;
}
export interface Nurse extends User {
  role: "nurse";
  ward: string;
}
export interface Supervisor extends User {
  role: "supervisor";
}
export interface Patient {
  id: string;
  mrn?: string;
  name: string;
  full_name?: string;
  doctorId: string;
  assigned_doctor?: string;
  department: string;
  room: string;
  ward?: string;
  status: "stable" | "monitoring" | "critical" | "discharge-ready" | string;
  contact_phone?: string;
  phone?: string;
}
export interface Task {
  id: string;
  task_name?: string;
  description: string;
  patient_id?: string;
  patientId: string;
  patient_ref_id?: string;
  assigned_staff?: string;
  staff_id?: string;
  assigneeId: string;
  due_date?: string;
  date: string;
  due_time?: string;
  dueTime: string;
  reminder_time?: string;
  reminderTime: string;
  verify_time?: string;
  verificationTime: string;
  priority: Priority | string;
  status: TaskStatus | string;
  calls_queued?: number;
  instructions?: string;
  updatedAt?: string;
}
export interface HandoverRecord {
  id: string;
  outgoing_staff?: string;
  incoming_staff: string;
  outgoing_staff_id?: string;
  incoming_staff_id: string;
  shift_name?: string;
  notes?: string;
  tasks_reassigned_count?: number;
  created_at?: string;
}
export interface CallLog {
  id: string;
  taskId: string;
  staffId: string;
  type: "reminder" | "verification";
  time: string;
  duration: string;
  outcome: CallOutcome;
  response: string;
  verification: "not-applicable" | "self-reported" | "pending" | "needs-review";
  transcript: { speaker: "AI" | "Staff"; message: string }[];
}
export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  kind: "task" | "call" | "alert" | "patient";
}
export interface Shift {
  id: string;
  outgoingId: string;
  incomingId: string;
  start: string;
  end: string;
  notes: string;
  acknowledged: boolean;
}
export interface TaskUpdate {
  taskId: string;
  status: TaskStatus;
  userId: string;
  timestamp: string;
  note?: string;
}
