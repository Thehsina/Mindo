import { useState } from "react";
import { registerUser, loginUser } from "../auth";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await loginUser(email, password);
      } else {
        userCredential = await registerUser(email, password);
      }
      setUser(userCredential.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      <form onSubmit={handleSubmit} className="glass-card p-8 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent text-center">
          {isLogin ? "Welcome Back" : "Get Started"}
        </h2>

        {error && <p className="text-pink-300 text-sm bg-pink-500/20 border border-pink-500/30 p-2 rounded-lg">{error}</p>}

        <input
          type="email"
          placeholder="📧 Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input w-full"
          required
        />
        <input
          type="password"
          placeholder="🔐 Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input w-full"
          required
        />

        <button type="submit" className="glass-button w-full mt-2">
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <p className="text-center text-sm text-cyan-300/70">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            className="text-cyan-400 cursor-pointer hover:text-cyan-300 transition"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </form>
    </div>
  );
}