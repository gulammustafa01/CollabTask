import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={submit} className="w-full max-w-sm bg-panel border border-border rounded-xl p-8 space-y-4">
        <h1 className="text-2xl font-display font-semibold text-text">Create account</h1>
        <p className="text-sm text-muted">Start collaborating in real-time</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input
          placeholder="Full name"
          required
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
          placeholder="Password (min 6 chars)"
          required
          minLength={6}
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          disabled={busy}
          className="w-full bg-accent hover:bg-accent2 text-white transition rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="text-sm text-muted text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
