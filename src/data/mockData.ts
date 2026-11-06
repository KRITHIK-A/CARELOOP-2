import type { CallLog, Notification, Patient, Shift, Task, User } from "@/types";

export const users: User[] = [
  {
    id: "sup-1",
    name: "Maya Rao",
    email: "maya@careloop.demo",
    role: "supervisor",
    department: "Clinical Operations",
    phone: "+91 98••• 2401",
  },
  {
    id: "doc-a",
    name: "Dr. Aisha Mehta",
    email: "aisha@careloop.demo",
    role: "doctor",
    department: "Internal Medicine",
    phone: "+91 98••• 4210",
  },
  {
    id: "doc-b",
    name: "Dr. Rohan Kapoor",
    email: "rohan@careloop.demo",
    role: "doctor",
    department: "Cardiology",
    phone: "+91 97••• 1832",
  },
  {
    id: "nurse-a",
    name: "Nurse Priya Singh",
    email: "priya@careloop.demo",
    role: "nurse",
    department: "Ward 4A",
    phone: "+91 99••• 5518",
  },
  {
    id: "nurse-b",
    name: "Nurse Neha Shah",
    email: "neha@careloop.demo",
    role: "nurse",
    department: "ICU",
    phone: "+91 96••• 7712",
  },
];

export const patients: Patient[] = [
  {
    id: "PT-1042",
    name: "Arjun Verma",
    doctorId: "doc-a",
    department: "Internal Medicine",
    room: "4A-12",
    status: "monitoring",
  },
  {
    id: "PT-1087",
    name: "Leela Nair",
    doctorId: "doc-a",
    department: "Internal Medicine",
    room: "4A-08",
    status: "stable",
  },
  {
    id: "PT-1121",
    name: "Kabir Joshi",
    doctorId: "doc-b",
    department: "Cardiology",
    room: "3C-06",
    status: "critical",
  },
  {
    id: "PT-1164",
    name: "Meera Iyer",
    doctorId: "doc-b",
    department: "Cardiology",
    room: "3C-11",
    status: "discharge-ready",
  },
];

const today = new Date().toISOString().slice(0, 10);
export const initialTasks: Task[] = [
  ["t1", "Administer antibiotic", "PT-1042", "10:00", "09:30", "10:15", "critical"],
  ["t2", "Check patient blood pressure", "PT-1087", "11:00", "10:30", "11:15", "high"],
  ["t3", "Review blood report", "PT-1042", "12:00", "11:30", "12:15", "medium"],
  ["t4", "Administer prescribed medication", "PT-1087", "13:00", "12:30", "13:15", "high"],
  ["t5", "Update patient records", "PT-1042", "14:00", "13:30", "14:15", "low"],
].map(([id, description, patientId, dueTime, reminderTime, verificationTime, priority]) => ({
  id,
  description,
  patientId,
  assigneeId: "doc-a",
  date: today,
  dueTime,
  reminderTime,
  verificationTime,
  priority: priority as Task["priority"],
  status: "pending",
  updatedAt: new Date().toISOString(),
}));

initialTasks.push(
  {
    id: "t6",
    description: "Review ECG results",
    patientId: "PT-1121",
    assigneeId: "doc-b",
    date: today,
    dueTime: "11:30",
    reminderTime: "11:00",
    verificationTime: "11:45",
    priority: "critical",
    status: "acknowledged",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t7",
    description: "Post-operative observation",
    patientId: "PT-1164",
    assigneeId: "nurse-a",
    date: today,
    dueTime: "12:30",
    reminderTime: "12:00",
    verificationTime: "12:45",
    priority: "high",
    status: "verified",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t8",
    description: "Update fluid balance chart",
    patientId: "PT-1121",
    assigneeId: "nurse-b",
    date: today,
    dueTime: "09:00",
    reminderTime: "08:30",
    verificationTime: "09:15",
    priority: "high",
    status: "overdue",
    updatedAt: new Date().toISOString(),
  },
);

export const initialCalls: CallLog[] = [
  {
    id: "c1",
    taskId: "t7",
    staffId: "nurse-a",
    type: "verification",
    time: "08:45",
    duration: "00:42",
    outcome: "successful",
    response: "Task completed",
    verification: "self-reported",
    transcript: [
      { speaker: "AI", message: "Has the scheduled observation been completed?" },
      { speaker: "Staff", message: "Yes, completed and documented." },
    ],
  },
  {
    id: "c2",
    taskId: "t6",
    staffId: "doc-b",
    type: "reminder",
    time: "09:10",
    duration: "00:31",
    outcome: "successful",
    response: "Acknowledged",
    verification: "not-applicable",
    transcript: [
      { speaker: "AI", message: "This is a reminder for your ECG review task." },
      { speaker: "Staff", message: "Acknowledged." },
    ],
  },
  {
    id: "c3",
    taskId: "t8",
    staffId: "nurse-b",
    type: "verification",
    time: "09:15",
    duration: "—",
    outcome: "no-answer",
    response: "No response",
    verification: "pending",
    transcript: [],
  },
];

export const initialNotifications: Notification[] = [
  {
    id: "n1",
    message: "Verification call to Nurse Neha was unanswered",
    time: "4 min ago",
    read: false,
    kind: "alert",
  },
  {
    id: "n2",
    message: "Dr. Rohan acknowledged the ECG reminder",
    time: "18 min ago",
    read: false,
    kind: "call",
  },
  {
    id: "n3",
    message: "Observation task marked complete",
    time: "34 min ago",
    read: true,
    kind: "task",
  },
];

export const initialShift: Shift = {
  id: "s1",
  outgoingId: "nurse-a",
  incomingId: "nurse-b",
  start: "08:00",
  end: "20:00",
  notes:
    "Monitor PT-1121 closely. Fluid balance chart is overdue and requires immediate follow-up.",
  acknowledged: false,
};
