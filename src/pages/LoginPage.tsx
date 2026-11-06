import { useState, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppStore";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  supervisor: { email: "maya@careloop.demo", password: "careloopdemo" },
  doctor: { email: "aisha@careloop.demo", password: "careloopdemo" },
  nurse: { email: "priya@careloop.demo", password: "careloopdemo" },
};

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [role, setRole] = useState<UserRole>("doctor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { setRole: login } = useApp();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  const navigateForRole = (r: UserRole | string) => {
    if (r === "supervisor") {
      navigate("/tasks");
    } else if (r === "doctor") {
      navigate("/doctor");
    } else if (r === "nurse") {
      navigate("/handover");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email address and password.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (authError) {
          const msg = authError.message.toLowerCase();
          if (
            msg.includes("invalid login credentials") ||
            msg.includes("user not found") ||
            msg.includes("invalid") ||
            authError.status === 400
          ) {
            setError(
              "No account found with this email. Please switch to the Sign Up tab to create one.",
            );
          } else if (
            msg.includes("failed to fetch") ||
            msg.includes("networkerror") ||
            msg.includes("fetch")
          ) {
            setError(
              "Network or connection error. Please verify your connection and Supabase environment settings.",
            );
          } else {
            setError(authError.message);
          }
          setLoading(false);
          return;
        }

        if (!data.user) {
          setError("Unable to retrieve user credentials.");
          setLoading(false);
          return;
        }

        const userId = data.user.id;

        // Fetch the locked, official role from public.profiles:
        let profileRole: string | undefined;
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();

          if (profile?.role) {
            profileRole = profile.role;
          }
        } catch (profileErr) {
          console.warn("Could not query profiles table for role:", profileErr);
        }

        // Fallback to user metadata role only if profile fetch has an issue:
        const rawRole = (profileRole || data.user.user_metadata?.role || "doctor").toLowerCase();

        const userRole: UserRole =
          rawRole === "supervisor" ? "supervisor" : rawRole === "nurse" ? "nurse" : "doctor";

        // Update AppStore with the authentic user profile and role:
        login(userRole);

        // Route strictly based on their permanent role:
        navigateForRole(userRole);
      } else {
        // Sign Up mode
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              role: role,
              full_name: fullName.trim() || trimmedEmail.split("@")[0],
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (!data.user) {
          setError("Unable to create account. Please try again.");
          setLoading(false);
          return;
        }

        // Save/upsert locked role and profile in public.profiles:
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName.trim() || trimmedEmail.split("@")[0],
            role: role,
            email: trimmedEmail,
          });
        } catch (profileErr) {
          console.warn("Could not upsert profile:", profileErr);
        }

        if (data.session) {
          login(role);
          navigateForRole(role);
        } else {
          // Attempt automatic sign-in if email confirmation isn't strictly blocking
          try {
            const { data: signInData, error: autoSignInError } =
              await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password,
              });

            if (!autoSignInError && signInData.session) {
              login(role);
              navigateForRole(role);
              return;
            }
          } catch {
            // fallback to message below
          }

          setSuccessMessage(
            "Account created successfully! Please check your email to verify your account or proceed to sign in.",
          );
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";

      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("fetch")
      ) {
        setError(
          "Network or connection error. Please verify your connection and Supabase environment settings.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#071a33] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 top-24 size-[430px] rounded-full border border-cyan-300/10" />
        <div className="absolute -right-24 top-40 size-[280px] rounded-full border border-cyan-300/10" />
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-blue-600">
            <Activity />
          </div>
          <div className="text-xl font-bold">
            CareLoop <span className="text-cyan-300">AI</span>
          </div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            <Bot size={14} />
            AI-powered clinical follow-through
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight">
            Every task remembered.
            <br />
            <span className="text-cyan-300">Every responsibility accounted for.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Voice agents call clinical staff before care tasks, follow up after scheduled times,
            understand responses, and keep supervisors informed.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              "Automated reminder calls",
              "Verbal task verification",
              "Live supervisor oversight",
              "Escalation workflows",
            ].map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-cyan-300" />
                {x}
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} />
          Synthetic data demo · Built for secure healthcare workflows
        </p>
      </section>
      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Activity className="text-blue-600" />
              CareLoop AI
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">
            {mode === "signin" ? "Welcome back" : "Get started"}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Sign in to your workspace" : "Create your workspace account"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "signin"
              ? "Sign in with your registered credentials. Role is assigned automatically."
              : "Register your account and select your permanent clinical role."}
          </p>

          {/* Mode Toggle (Tabs) */}
          <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-200/80 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={cn(
                "rounded-md py-2 text-xs font-semibold transition text-center",
                mode === "signin"
                  ? "border border-slate-200/60 bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={cn(
                "rounded-md py-2 text-xs font-semibold transition text-center",
                mode === "signup"
                  ? "border border-slate-200/60 bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Full name <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <Input
                  type="text"
                  placeholder={
                    role === "doctor"
                      ? "Dr. Aisha Mehta"
                      : role === "nurse"
                        ? "Nurse Priya Singh"
                        : "Maya Rao"
                  }
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email address
              </span>
              <Input
                type="email"
                placeholder="name@hospital.org"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  className="pl-9"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  required
                />
              </div>
            </label>

            {/* Role selector is ONLY active & visible in Sign Up mode */}
            {mode === "signup" && (
              <div>
                <span className="mb-2 block text-xs font-semibold text-slate-700">
                  Clinical role{" "}
                  <span className="font-normal text-slate-400">
                    (locked permanently to your account)
                  </span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["supervisor", "doctor", "nurse"] as UserRole[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => handleRoleSelect(x)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition",
                        role === x
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  {role === "supervisor" &&
                    "Supervisor: administrative oversight, task triage, and calling center control."}
                  {role === "doctor" &&
                    "Doctor: patient rounding, clinical verification, and treatment reviews."}
                  {role === "nurse" &&
                    "Nurse: bedside care, medication execution, and shift handover workflows."}
                </p>
              </div>
            )}

            {/* In Sign In mode: Show quick demo credentials helper without role toggle override */}
            {mode === "signin" && (
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Demo test accounts</span>
                  <span className="text-[10px] text-slate-400">Pre-assigned roles</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["supervisor", "doctor", "nurse"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        const creds = DEMO_CREDENTIALS[r];
                        if (creds) {
                          setEmail(creds.email);
                          setPassword(creds.password);
                          setError(null);
                        }
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium capitalize text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800"
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span className="flex-1 leading-relaxed">{successMessage}</span>
              </div>
            )}

            <Button className="mt-2 h-11 w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "signin" ? (
                <>
                  Sign In to CareLoop AI <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Create CareLoop Account <UserPlus size={16} />
                </>
              )}
            </Button>

            {/* Quick link below the button */}
            <p className="mt-4 text-center text-xs text-slate-500">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-blue-600 underline underline-offset-2 transition hover:text-blue-700"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-semibold text-blue-600 underline underline-offset-2 transition hover:text-blue-700"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">
            Demo only. No real patient data or calls are used.
          </p>
        </div>
      </section>
    </div>
  );
}
