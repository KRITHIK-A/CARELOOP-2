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
  email: string;
  role: UserRole;
  department: string;
  phone: string;
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
  name: string;
  doctorId: string;
  department: string;
  room: string;
  status: "stable" | "monitoring" | "critical" | "discharge-ready";
}
export interface Task {
  id: string;
  description: string;
  patientId: string;
  assigneeId: string;
  date: string;
  dueTime: string;
  reminderTime: string;
  verificationTime: string;
  priority: Priority;
  status: TaskStatus;
  instructions?: string;
  updatedAt: string;
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
  kind: "call" | "task" | "alert";
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
