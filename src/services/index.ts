import type { CallLog, Patient, Task, User } from "@/types";

// Service boundaries intentionally mirror the future Supabase repositories.
export const authService = { signIn: async (user: User) => user, signOut: async () => undefined };
export const taskService = {
  list: async (tasks: Task[]) => tasks,
  create: async (task: Task) => task,
};
export const patientService = { list: async (patients: Patient[]) => patients };
export const callService = {
  simulate: async (call: CallLog) => call,
  // Future Sarvam Voice Agent invocation belongs in a Supabase Edge Function, never here.
};
export const analyticsService = {
  completionRate: (tasks: Task[]) =>
    tasks.length
      ? Math.round(
          (tasks.filter((t) => ["self-reported", "verified"].includes(t.status)).length /
            tasks.length) *
            100,
        )
      : 0,
};
