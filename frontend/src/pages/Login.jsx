import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={submit} className="w-full max-w-sm bg-panel border border-border rounded-xl p-8 space-y-4">
        <h1 className="text-2xl font-display font-semibold text-text">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to CollabTask</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          required
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          required
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          disabled={busy}
          className="w-full bg-accent hover:bg-accent2 text-white transition rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-muted text-center">
          No account?{" "}
          <Link to="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
