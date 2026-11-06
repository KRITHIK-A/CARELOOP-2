import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  initialCalls,
  initialNotifications,
  initialShift,
  initialTasks,
  patients,
  users,
} from "@/data/mockData";
import type { CallLog, Notification, Shift, Task, TaskStatus, User, UserRole } from "@/types";

interface Store {
  currentUser: User;
  setRole: (role: UserRole) => void;
  tasks: Task[];
  calls: CallLog[];
  notifications: Notification[];
  shift: Shift;
  users: User[];
  patients: typeof patients;
  updateTask: (id: string, status: TaskStatus) => void;
  addTask: (task: Task) => void;
  simulateCall: (
    taskId: string,
    outcome: "reminder" | "completed" | "pending" | "no-answer" | "assistance",
  ) => void;
  acknowledgeShift: () => void;
  markNotificationsRead: () => void;
}
const Context = createContext<Store | null>(null);
export function AppStore({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(users[0]);
  const [tasks, setTasks] = useState(initialTasks);
  const [calls, setCalls] = useState(initialCalls);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [shift, setShift] = useState(initialShift);
  const updateTask = (id: string, status: TaskStatus) =>
    setTasks((v) =>
      v.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)),
    );
  const addTask = (task: Task) => {
    setTasks((v) => [task, ...v]);
    setNotifications((v) => [
      {
        id: crypto.randomUUID(),
        message: `New task assigned: ${task.description}`,
        time: "Just now",
        read: false,
        kind: "task",
      },
      ...v,
    ]);
  };
  const simulateCall: Store["simulateCall"] = (taskId, outcome) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const staff = users.find((u) => u.id === task.assigneeId)!;
    const isVerification = outcome !== "reminder";
    const result =
      outcome === "completed"
        ? "successful"
        : outcome === "no-answer"
          ? "no-answer"
          : outcome === "assistance"
            ? "assistance"
            : "successful";
    const response =
      outcome === "completed"
        ? "Yes, completed"
        : outcome === "pending"
          ? "Not completed yet"
          : outcome === "no-answer"
            ? "No response"
            : outcome === "assistance"
              ? "Assistance requested"
              : "Acknowledged";
    const aiMessage = isVerification
      ? `We are following up on ${task.description}. Has this task been completed?`
      : `You have ${task.description} scheduled for ${task.dueTime}. Please acknowledge this reminder.`;
    const call: CallLog = {
      id: crypto.randomUUID(),
      taskId,
      staffId: task.assigneeId,
      type: isVerification ? "verification" : "reminder",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      duration: outcome === "no-answer" ? "00:28" : "00:46",
      outcome: result,
      response,
      verification:
        outcome === "completed" ? "self-reported" : isVerification ? "pending" : "not-applicable",
      transcript:
        outcome === "no-answer"
          ? []
          : [
              { speaker: "AI", message: aiMessage },
              { speaker: "Staff", message: response },
              {
                speaker: "AI",
                message:
                  outcome === "completed"
                    ? "Thank you. Your response has been recorded for supervisor review."
                    : "Thank you. Your response has been recorded.",
              },
            ],
    };
    setCalls((v) => [call, ...v]);
    if (outcome === "completed") updateTask(taskId, "self-reported");
    if (outcome === "reminder") updateTask(taskId, "acknowledged");
    if (outcome === "pending" || outcome === "no-answer") updateTask(taskId, "overdue");
    if (outcome === "assistance") updateTask(taskId, "issue");
    setNotifications((v) => [
      {
        id: crypto.randomUUID(),
        message: `${staff.name}: ${response} — ${task.description}`,
        time: "Just now",
        read: false,
        kind: outcome === "assistance" || outcome === "no-answer" ? "alert" : "call",
      },
      ...v,
    ]);
  };
  const value = useMemo(
    () => ({
      currentUser,
      setRole: (role: UserRole) => setCurrentUser(users.find((u) => u.role === role) ?? users[0]),
      tasks,
      calls,
      notifications,
      shift,
      users,
      patients,
      updateTask,
      addTask,
      simulateCall,
      acknowledgeShift: () => setShift((s) => ({ ...s, acknowledged: true })),
      markNotificationsRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    }),
    [currentUser, tasks, calls, notifications, shift],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("useApp must be used inside AppStore");
  return value;
}
