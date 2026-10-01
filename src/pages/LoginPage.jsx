import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../supabase";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles, LogIn, UserPlus, ArrowRight } from "lucide-react";
import BrandWordmark from "../components/BrandWordmark";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateLoginForm = ({ isLogin, email, password, name }) => {
  const errors = {};

  if (!isLogin && !name.trim()) {
    errors.name = "Full name is required.";
  } else if (!isLogin && name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
};

const friendlyAuthError = (messageOrCode) => {
  const msg = (messageOrCode || "").toLowerCase();
  if (msg.includes("invalid-email") || msg.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credential") ||
    msg.includes("user-not-found") ||
    msg.includes("wrong-password")
  ) {
    return "Invalid email or password.";
  }
  if (
    msg.includes("email-already-in-use") ||
    msg.includes("already registered") ||
    msg.includes("user already exists")
  ) {
    return "An account with this email already exists.";
  }
  if (msg.includes("weak-password") || msg.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network error")) {
    return "Unable to reach Supabase. Check your network and Supabase URL.";
  }
  if (msg.includes("unauthorized") || msg.includes("invalid api key")) {
    return "Supabase credentials are invalid. Verify your anon key and URL.";
  }
  return messageOrCode || "Something went wrong. Please try again.";
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setAuthError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    const validationErrors = validateLoginForm({ isLogin, email, password, name });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!isSupabaseConfigured) {
      const displayName = name.trim() || email.trim().split("@")[0];
      const localUser = {
        id: "local-user",
        email: email.trim(),
        user_metadata: { display_name: displayName, full_name: displayName }
      };
      localStorage.setItem("tm.local_user", JSON.stringify(localUser));
      
      const localProfile = localStorage.getItem("tm.profile");
      if (!localProfile) {
        localStorage.setItem("tm.profile", JSON.stringify({
          full_name: displayName,
          email: email.trim()
        }));
      }
      
      navigate("/dashboard");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data?.session) {
          throw new Error("Unable to sign in. Please check your credentials and try again.");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
          },
        });
        if (error) throw error;
        if (!data?.session) {
          setAuthError(
            "Account created. Please check your email and confirm your account before signing in."
          );
          return;
        }
      }

      navigate("/dashboard");
    } catch (err) {
      setAuthError(friendlyAuthError(err.code || err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setAuthError("");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-2 animate-fade-in-up">
        {/* Left Side: Branding / Hero */}
        <div className="hidden h-full flex-col items-start justify-center p-8 text-left md:flex lg:p-12">
          <BrandWordmark className="w-4/5 max-w-xs" showTagline />
          <p className="mt-5 max-w-xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
            Clear your mind. Organize your life. A unified workspace to capture your tasks, routines, and everything in between.
          </p>
          <div className="mt-8 space-y-4">
            {[
              'Plan Your Days & Weeks',
              'Seamless Activity Tracking',
              'Frictionless Brain Dumps',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="bento-card mx-auto w-full max-w-md p-8 shadow-2xl shadow-gray-200/50 lg:p-12">
          <div className="mb-6 flex justify-center md:hidden">
            <BrandWordmark compact showTagline={false} className="w-4/5 max-w-xs" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
            {isLogin ? "Enter your details to access your dashboard." : "Start organizing your life today."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {!isSupabaseConfigured && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-300 p-3 rounded-xl text-sm font-medium">
              Supabase is not configured correctly. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the dev server.
            </div>
          )}
          {authError && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              {authError}
            </div>
          )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input
                  className={`w-full bg-slate-50 dark:bg-[#1a1a1e] border ${errors.name ? "border-rose-500 focus:ring-rose-500/50" : "border-slate-200 dark:border-slate-800/60 focus:ring-indigo-500/50"} rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow`}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                />
                {errors.name && <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input
                className={`w-full bg-slate-50 dark:bg-[#1a1a1e] border ${errors.email ? "border-rose-500 focus:ring-rose-500/50" : "border-slate-200 dark:border-slate-800/60 focus:ring-indigo-500/50"} rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow`}
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
              />
              {errors.email && <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                className={`w-full bg-slate-50 dark:bg-[#1a1a1e] border ${errors.password ? "border-rose-500 focus:ring-rose-500/50" : "border-slate-200 dark:border-slate-800/60 focus:ring-indigo-500/50"} rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
              />
              {errors.password && <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                "Please wait..."
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  {isLogin ? <ArrowRight size={18} /> : null}
                </>
              )}
            </button>

            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="px-3 text-sm text-gray-400">Or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              type="button"
              onClick={toggleMode}
              className="w-full bg-slate-50 dark:bg-[#1a1a1e] hover:bg-slate-100 dark:hover:bg-[#2a2a2e] text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-xl border border-slate-200 dark:border-slate-800/60 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
