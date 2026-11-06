import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  initialCalls,
  initialNotifications,
  initialShift,
  initialTasks,
  patients as mockPatients,
  users as mockUsers,
} from "@/data/mockData";
import type {
  CallLog,
  Notification,
  Patient,
  Priority,
  Shift,
  Task,
  TaskStatus,
  User,
  UserRole,
} from "@/types";

export interface AppStoreContextType {
  currentUser: User;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  tasks: Task[];
  patients: Patient[];
  staff: User[];
  users: User[];
  calls: CallLog[];
  notifications: Notification[];
  shift: Shift;
  createTask: (newTaskData: Partial<Task>) => Promise<Task>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus | string) => Promise<void>;
  createPatient: (patientData: Partial<Patient>) => Promise<Patient>;
  updatePatient: (patientId: string, updateData: Partial<Patient>) => Promise<void>;
  executeHandover: (
    handoverData: {
      outgoing_staff?: string;
      incoming_staff: string;
      outgoing_staff_id?: string;
      incoming_staff_id: string;
      shift_name?: string;
      shift_type?: string;
      notes?: string;
    },
    reassignTaskIds: string[],
  ) => Promise<void>;
  addTask: (task: Task) => void;
  updateTask: (id: string, status: TaskStatus) => void;
  simulateCall: (
    taskId: string,
    outcome: "reminder" | "completed" | "pending" | "no-answer" | "assistance",
  ) => void;
  acknowledgeShift: () => void;
  markNotificationsRead: () => void;
}

function normalizeTask(raw: any): Task {
  const taskName = raw.task_name || raw.description || "Care task";
  const patientId = raw.patient_id || raw.patientId || "PT-1042";
  const assignedStaff = raw.assigned_staff || raw.assignee_name || "Dr. Aisha Mehta";
  const staffId = raw.staff_id || raw.assigneeId || "doc-a";
  const dueTime = raw.due_time || raw.dueTime || "14:00";
  const dueDate = raw.due_date || raw.date || new Date().toISOString().slice(0, 10);
  const reminderTime = raw.reminder_time || raw.reminderTime || "13:30";
  const verifyTime = raw.verify_time || raw.verificationTime || "14:15";
  const priority = raw.priority || "medium";
  const status = raw.status || "pending";
  const callsQueued =
    raw.calls_queued ??
    (["pending", "acknowledged"].includes(String(status).toLowerCase()) ? 2 : 0);

  return {
    id: raw.id || crypto.randomUUID(),
    task_name: taskName,
    description: taskName,
    patient_id: patientId,
    patientId: patientId,
    patient_ref_id: raw.patient_ref_id,
    assigned_staff: assignedStaff,
    staff_id: staffId,
    assigneeId: staffId,
    due_date: dueDate,
    date: dueDate,
    due_time: dueTime,
    dueTime: dueTime,
    reminder_time: reminderTime,
    reminderTime: reminderTime,
    verify_time: verifyTime,
    verificationTime: verifyTime,
    priority: priority,
    status: status,
    calls_queued: callsQueued,
    instructions: raw.instructions,
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
  };
}

function normalizePatient(raw: any): Patient {
  const fullName = raw.full_name || raw.name || "Patient";
  const mrn = raw.mrn || raw.id || "PT-1042";
  const ward = raw.ward || raw.room || raw.department || "General Ward";
  const room = raw.room || raw.ward || "101";
  const department = raw.department || raw.ward || "General";
  const status = raw.status || "stable";
  const doctorId = raw.assigned_doctor || raw.doctorId || "doc-a";
  const contactPhone = raw.contact_phone || raw.phone || "+91 98765 43210";

  return {
    id: raw.id || mrn,
    mrn: mrn,
    name: fullName,
    full_name: fullName,
    doctorId: doctorId,
    assigned_doctor: doctorId,
    department: department,
    room: room,
    ward: ward,
    status: status,
    contact_phone: contactPhone,
    phone: contactPhone,
  };
}

export function formatNameFromEmail(email: string): string {
  if (!email) return "CareLoop Staff";
  const userPart = email.split("@")[0] || "";
  const parts = userPart.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return "CareLoop Staff";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

export function computeInitials(name: string): string {
  if (!name) return "CS";
  const clean = name.replace(/^(dr\.?|nurse)\s+/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CS";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export async function resolveSupabaseUser(user: any): Promise<User | null> {
  if (!user) return null;

  let profileName: string | undefined;
  let profileRole: string | undefined;
  let profileDept: string | undefined;
  let profilePhone: string | undefined;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      profileName = profile.full_name || profile.name;
      profileRole = profile.role;
      profileDept = profile.department;
      profilePhone = profile.phone || profile.phone_number;
    }
  } catch (err) {
    console.warn("Could not query profiles for session user:", err);
  }

  // Display Name Priority:
  // 1. user.user_metadata?.full_name
  // 2. Profile name from profiles table matching user.id
  // 3. Capitalized username parsed from email
  // 4. Default fallback: "CareLoop Staff"
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
  const email = user.email || "";
  const emailParsedName = formatNameFromEmail(email);

  const displayName =
    metaName?.trim() || profileName?.trim() || (email ? emailParsedName : "") || "CareLoop Staff";

  const rawRole = (profileRole || user.user_metadata?.role || "supervisor").toLowerCase();

  const role: UserRole =
    rawRole === "doctor" ? "doctor" : rawRole === "nurse" ? "nurse" : "supervisor";

  const cleanName = displayName.replace(/^(dr\.?|nurse)\s+/i, "").trim();
  const firstName = cleanName.split(/\s+/)[0] || cleanName;
  const initials = computeInitials(displayName);

  const department =
    profileDept ||
    (role === "doctor"
      ? "Internal Medicine"
      : role === "nurse"
        ? "Ward 4A"
        : "Clinical Operations");

  return {
    id: user.id,
    name: displayName,
    full_name: displayName,
    firstName: firstName,
    initials: initials,
    email: email,
    role: role,
    department: department,
    phone: profilePhone || "+91 98000 00000",
    phone_number: profilePhone || "+91 98000 00000",
  };
}

function normalizeProfile(raw: any): User {
  const name = raw.full_name || raw.name || "Staff Member";
  const role = (raw.role || "nurse") as UserRole;
  const phone = raw.phone_number || raw.phone || "+91 98000 00000";
  const cleanName = name.replace(/^(dr\.?|nurse)\s+/i, "").trim();
  const firstName = cleanName.split(/\s+/)[0] || cleanName;
  const initials = computeInitials(name);

  return {
    id: raw.id || crypto.randomUUID(),
    name: name,
    full_name: name,
    firstName: firstName,
    initials: initials,
    email: raw.email || `${name.toLowerCase().replace(/[^a-z]/g, "")}@careloop.demo`,
    role: role,
    department: raw.department || (role === "doctor" ? "Internal Medicine" : "Ward 4A"),
    phone: phone,
    phone_number: phone,
  };
}

const Context = createContext<AppStoreContextType | null>(null);

export function AppStore({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const defaultUser = mockUsers[0];
    return {
      ...defaultUser,
      firstName: "Maya",
      initials: "MR",
    };
  });
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks.map(normalizeTask));
  const [patients, setPatients] = useState<Patient[]>(() => mockPatients.map(normalizePatient));
  const [staff, setStaff] = useState<User[]>(() => mockUsers.map(normalizeProfile));
  const [calls, setCalls] = useState(initialCalls);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [shift, setShift] = useState(initialShift);

  // 0. Active Supabase Session Synchronization
  useEffect(() => {
    let isMounted = true;

    const syncUserSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const resolved = await resolveSupabaseUser(session.user);
          if (resolved && isMounted) {
            setCurrentUser(resolved);
          }
        }
      } catch (err) {
        console.warn("Error checking auth session:", err);
      }
    };

    syncUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const resolved = await resolveSupabaseUser(session.user);
        if (resolved && isMounted) {
          setCurrentUser(resolved);
        }
      } else if (_event === "SIGNED_OUT") {
        setCurrentUser({
          ...mockUsers[0],
          firstName: "Maya",
          initials: "MR",
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. Initial Data Fetching from Supabase
  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch tasks
      try {
        const { data: tasksData, error: tasksErr } = await supabase
          .from("tasks")
          .select("*")
          .order("due_time", { ascending: true });

        if (!tasksErr && tasksData && tasksData.length > 0) {
          setTasks(tasksData.map(normalizeTask));
        }
      } catch (err) {
        console.warn("Initial tasks fetch:", err);
      }

      // Fetch patients
      try {
        const { data: patientsData, error: patientsErr } = await supabase
          .from("patients")
          .select("*");

        if (!patientsErr && patientsData && patientsData.length > 0) {
          setPatients(patientsData.map(normalizePatient));
        }
      } catch (err) {
        console.warn("Initial patients fetch:", err);
      }

      // Fetch profiles / staff
      try {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("*");

        if (!profilesErr && profilesData && profilesData.length > 0) {
          setStaff(profilesData.map(normalizeProfile));
        }
      } catch (err) {
        console.warn("Initial profiles fetch:", err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Active PostgreSQL Realtime listeners on tasks, patients, handovers
  useEffect(() => {
    const tasksSub = supabase
      .channel("central:tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const task = normalizeTask(payload.new);
          setTasks((prev) => {
            if (prev.some((t) => t.id === task.id)) return prev;
            return [task, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          const task = normalizeTask(payload.new);
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)));
        } else if (payload.eventType === "DELETE") {
          const oldId = (payload.old as any)?.id;
          if (oldId) {
            setTasks((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      })
      .subscribe();

    const patientsSub = supabase
      .channel("central:patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const patient = normalizePatient(payload.new);
          setPatients((prev) => {
            if (prev.some((p) => p.id === patient.id || (patient.mrn && p.mrn === patient.mrn))) {
              return prev.map((p) =>
                p.id === patient.id || (patient.mrn && p.mrn === patient.mrn)
                  ? { ...p, ...patient }
                  : p,
              );
            }
            return [patient, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          const patient = normalizePatient(payload.new);
          setPatients((prev) =>
            prev.map((p) =>
              p.id === patient.id || (patient.mrn && p.mrn === patient.mrn)
                ? { ...p, ...patient }
                : p,
            ),
          );
        } else if (payload.eventType === "DELETE") {
          const oldId = (payload.old as any)?.id;
          if (oldId) {
            setPatients((prev) => prev.filter((p) => p.id !== oldId && p.mrn !== oldId));
          }
        }
      })
      .subscribe();

    const handoversSub = supabase
      .channel("central:handovers")
      .on("postgres_changes", { event: "*", schema: "public", table: "handovers" }, () => {
        setShift((s) => ({ ...s, acknowledged: true }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksSub);
      supabase.removeChannel(patientsSub);
      supabase.removeChannel(handoversSub);
    };
  }, []);

  // 3. User session management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const metaRole = session.user.user_metadata?.role as UserRole | undefined;
        if (
          metaRole &&
          (metaRole === "supervisor" || metaRole === "doctor" || metaRole === "nurse")
        ) {
          const matched =
            staff.find((u) => u.role === metaRole) || mockUsers.find((u) => u.role === metaRole);
          if (matched) setCurrentUser(matched);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const metaRole = session.user.user_metadata?.role as UserRole | undefined;
        if (
          metaRole &&
          (metaRole === "supervisor" || metaRole === "doctor" || metaRole === "nurse")
        ) {
          const matched =
            staff.find((u) => u.role === metaRole) || mockUsers.find((u) => u.role === metaRole);
          if (matched) setCurrentUser(matched);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [staff]);

  // Global Action: createTask
  const createTask = async (newTaskData: Partial<Task>): Promise<Task> => {
    const task = normalizeTask(newTaskData);

    setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
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

    try {
      const payload = {
        task_name: task.task_name,
        patient_id: task.patient_id,
        patient_ref_id: task.patient_ref_id,
        assigned_staff: task.assigned_staff,
        staff_id: task.staff_id,
        due_time: task.due_time,
        due_date: task.due_date,
        reminder_time: task.reminder_time,
        verify_time: task.verify_time,
        priority: task.priority,
        status: task.status || "Pending",
        calls_queued: task.calls_queued ?? 2,
      };

      const { data, error } = await supabase.from("tasks").insert([payload]).select();
      if (!error && data && data[0]) {
        const synced = normalizeTask(data[0]);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? synced : t)));
        return synced;
      }
    } catch (err) {
      console.warn("createTask Supabase error:", err);
    }

    return task;
  };

  // Global Action: updateTaskStatus
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus | string) => {
    const isDone = ["verified", "completed"].includes(String(newStatus).toLowerCase());
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              calls_queued: isDone ? 0 : t.calls_queued,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );

    try {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) {
        console.warn("updateTaskStatus error:", error.message);
      }
    } catch (err) {
      console.warn("updateTaskStatus exception:", err);
    }
  };

  // Global Action: createPatient
  const createPatient = async (patientData: Partial<Patient>): Promise<Patient> => {
    const newId = patientData.id || crypto.randomUUID();
    const mrn = patientData.mrn || `PT-${Math.floor(1000 + Math.random() * 9000)}`;
    const patient = normalizePatient({
      id: newId,
      mrn: mrn,
      full_name: patientData.full_name || patientData.name || "New Patient",
      name: patientData.full_name || patientData.name || "New Patient",
      department: patientData.department || "General Ward",
      room: patientData.room || "Room 101",
      ward: patientData.ward || patientData.room || "General Ward",
      assigned_doctor: patientData.assigned_doctor || patientData.doctorId || "doc-a",
      doctorId: patientData.assigned_doctor || patientData.doctorId || "doc-a",
      status: patientData.status || "Stable",
      contact_phone: patientData.contact_phone || patientData.phone || "+91 98765 43210",
    });

    setPatients((prev) => [
      patient,
      ...prev.filter((p) => p.id !== patient.id && p.mrn !== patient.mrn),
    ]);

    setNotifications((v) => [
      {
        id: crypto.randomUUID(),
        message: `New patient registered: ${patient.name} (${patient.mrn})`,
        time: "Just now",
        read: false,
        kind: "patient",
      },
      ...v,
    ]);

    try {
      const payload = {
        full_name: patient.name,
        mrn: patient.mrn,
        department: patient.department,
        room: patient.room,
        assigned_doctor: patient.doctorId,
        status: patient.status,
        contact_phone: patient.contact_phone,
      };

      const { data, error } = await supabase.from("patients").insert([payload]).select();
      if (!error && data && data[0]) {
        const synced = normalizePatient(data[0]);
        setPatients((prev) =>
          prev.map((p) => (p.id === patient.id || p.mrn === patient.mrn ? synced : p)),
        );
        return synced;
      }
    } catch (err) {
      console.warn("createPatient Supabase error:", err);
    }

    return patient;
  };

  // Global Action: updatePatient
  const updatePatient = async (patientId: string, updateData: Partial<Patient>): Promise<void> => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId || p.mrn === patientId) {
          return normalizePatient({ ...p, ...updateData });
        }
        return p;
      }),
    );

    setNotifications((v) => [
      {
        id: crypto.randomUUID(),
        message: `Patient details updated: ${updateData.full_name || updateData.name || "Patient"}`,
        time: "Just now",
        read: false,
        kind: "patient",
      },
      ...v,
    ]);

    try {
      const payload: Record<string, any> = {};
      if (updateData.full_name || updateData.name) {
        payload.full_name = updateData.full_name || updateData.name;
      }
      if (updateData.department) payload.department = updateData.department;
      if (updateData.room) payload.room = updateData.room;
      if (updateData.ward) payload.ward = updateData.ward;
      if (updateData.assigned_doctor || updateData.doctorId) {
        payload.assigned_doctor = updateData.assigned_doctor || updateData.doctorId;
      }
      if (updateData.status) payload.status = updateData.status;
      if (updateData.contact_phone || updateData.phone) {
        payload.contact_phone = updateData.contact_phone || updateData.phone;
      }

      const { error } = await supabase
        .from("patients")
        .update(payload)
        .or(`id.eq.${patientId},mrn.eq.${patientId}`);

      if (error) {
        await supabase.from("patients").update(payload).eq("id", patientId);
      }
    } catch (err) {
      console.warn("updatePatient Supabase exception:", err);
    }
  };

  // Global Action: executeHandover
  const executeHandover = async (
    handoverData: {
      outgoing_staff?: string;
      incoming_staff: string;
      outgoing_staff_id?: string;
      incoming_staff_id: string;
      shift_name?: string;
      shift_type?: string;
      notes?: string;
    },
    reassignTaskIds: string[],
  ) => {
    setShift((prev) => ({
      ...prev,
      acknowledged: true,
      outgoingId: handoverData.outgoing_staff_id || prev.outgoingId,
      incomingId: handoverData.incoming_staff_id,
    }));

    if (reassignTaskIds.length > 0) {
      setTasks((prev) =>
        prev.map((t) => {
          if (reassignTaskIds.includes(t.id)) {
            return {
              ...t,
              assigned_staff: handoverData.incoming_staff,
              staff_id: handoverData.incoming_staff_id,
              assigneeId: handoverData.incoming_staff_id,
            };
          }
          return t;
        }),
      );
    }

    setNotifications((prev) => [
      {
        id: crypto.randomUUID(),
        message: `Shift handover completed to ${handoverData.incoming_staff} (${reassignTaskIds.length} tasks transferred)`,
        time: "Just now",
        read: false,
        kind: "alert",
      },
      ...prev,
    ]);

    try {
      const shiftName =
        handoverData.shift_name || handoverData.shift_type || "Day to Evening shift";
      await supabase.from("handovers").insert([
        {
          outgoing_staff: handoverData.outgoing_staff,
          incoming_staff: handoverData.incoming_staff,
          outgoing_staff_id: handoverData.outgoing_staff_id,
          incoming_staff_id: handoverData.incoming_staff_id,
          shift_name: shiftName,
          shift_type: shiftName,
          notes: handoverData.notes || "",
          tasks_reassigned_count: reassignTaskIds.length,
          created_at: new Date().toISOString(),
        },
      ]);

      if (reassignTaskIds.length > 0) {
        await supabase
          .from("tasks")
          .update({
            assigned_staff: handoverData.incoming_staff,
            staff_id: handoverData.incoming_staff_id,
          })
          .in("id", reassignTaskIds);
      }
    } catch (err) {
      console.warn("executeHandover Supabase exception:", err);
    }
  };

  const simulateCall: AppStoreContextType["simulateCall"] = (taskId, outcome) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const staffMember =
      staff.find((u) => u.id === task.assigneeId || u.name === task.assigned_staff) || staff[0];
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
    if (outcome === "completed") updateTaskStatus(taskId, "self-reported");
    if (outcome === "reminder") updateTaskStatus(taskId, "acknowledged");
    if (outcome === "pending" || outcome === "no-answer") updateTaskStatus(taskId, "overdue");
    if (outcome === "assistance") updateTaskStatus(taskId, "issue");
    setNotifications((v) => [
      {
        id: crypto.randomUUID(),
        message: `${staffMember.name}: ${response} — ${task.description}`,
        time: "Just now",
        read: false,
        kind: outcome === "assistance" || outcome === "no-answer" ? "alert" : "call",
      },
      ...v,
    ]);
  };

  const handleSetRole = (role: UserRole) => {
    setCurrentUser((prev) => {
      // If the current user has a real session (non-demo email), preserve their name, initials, and ID
      if (prev && prev.email && !prev.email.endsWith("@careloop.demo")) {
        return {
          ...prev,
          role: role,
          department:
            role === "doctor"
              ? "Internal Medicine"
              : role === "nurse"
                ? "Ward 4A"
                : "Clinical Operations",
        };
      }
      const matched = staff.find((u) => u.role === role) ?? staff[0];
      return {
        ...matched,
        initials: computeInitials(matched.name),
        firstName: matched.name
          .replace(/^(dr\.?|nurse)\s+/i, "")
          .trim()
          .split(/\s+/)[0],
      };
    });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    setCurrentUser({
      ...mockUsers[0],
      firstName: "Maya",
      initials: "MR",
    });
  };

  const value = useMemo(
    () => ({
      currentUser,
      setRole: handleSetRole,
      signOut: handleSignOut,
      tasks,
      patients,
      staff,
      users: staff,
      calls,
      notifications,
      shift,
      createTask,
      updateTaskStatus,
      createPatient,
      updatePatient,
      executeHandover,
      updateTask: (id: string, s: TaskStatus) => updateTaskStatus(id, s),
      addTask: (t: Task) => {
        createTask(t);
      },
      simulateCall,
      acknowledgeShift: () => setShift((s) => ({ ...s, acknowledged: true })),
      markNotificationsRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    }),
    [currentUser, tasks, patients, staff, calls, notifications, shift],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("useApp must be used inside AppStore");
  return value;
}

export function useAuth() {
  const { currentUser, setRole, signOut } = useApp();
  return {
    user: currentUser,
    currentUser,
    setRole,
    signOut,
    isAuthenticated: !currentUser.email.endsWith("@careloop.demo") || currentUser.id !== "sup-1",
  };
}

export const useAppContext = useApp;
