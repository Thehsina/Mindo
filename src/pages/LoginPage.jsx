import { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

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

const friendlyAuthError = (code) => {
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
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

    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, { displayName: name.trim() });
      }
      navigate("/dashboard");
    } catch (err) {
      setAuthError(friendlyAuthError(err.code));
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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      <form onSubmit={handleSubmit} className="glass-card p-8 w-full max-w-md space-y-4" noValidate>
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Task Manager
        </h1>
        <p className="text-center text-white/60 text-sm">Organize your life with style</p>

        {authError && (
          <p className="text-pink-300 text-sm bg-pink-500/20 border border-pink-500/30 p-2 rounded-lg">
            {authError}
          </p>
        )}

        {!isLogin && (
          <div>
            <input
              className={`glass-input w-full ${errors.name ? "border-rose-400" : ""}`}
              placeholder="Full Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name}</p>}
          </div>
        )}

        <div>
          <input
            className={`glass-input w-full ${errors.email ? "border-rose-400" : ""}`}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email}</p>}
        </div>

        <div>
          <input
            type="password"
            className={`glass-input w-full ${errors.password ? "border-rose-400" : ""}`}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
          />
          {errors.password && <p className="mt-1 text-xs text-rose-300">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glass-button w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="glass-button-outline w-full"
        >
          {isLogin ? "New here? Sign Up" : "Already have account? Sign In"}
        </button>
      </form>
    </div>
  );
}
