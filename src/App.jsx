import { useState, useEffect, useCallback } from "react";

const API = "https://taskflow-api-guhd.onrender.com/api/v1";

// ── API HELPERS ───────────────────────────────────────────────────────────────
const api = {
  async req(method, path, body, token) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(API + path, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  },
  register: (b) => api.req("POST", "/auth/register", b),
  login: (b) => api.req("POST", "/auth/login", b),
  me: (t) => api.req("GET", "/auth/me", null, t),
  logout: (t) => api.req("POST", "/auth/logout", {}, t),
  getTasks: (t, params = "") => api.req("GET", `/tasks${params}`, null, t),
  createTask: (t, b) => api.req("POST", "/tasks", b, t),
  updateTask: (t, id, b) => api.req("PUT", `/tasks/${id}`, b, t),
  deleteTask: (t, id) => api.req("DELETE", `/tasks/${id}`, null, t),
  getUsers: (t) => api.req("GET", "/users", null, t),
  deleteUser: (t, id) => api.req("DELETE", `/users/${id}`, null, t),
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  app: { background: "#060608", color: "#e2e2ee", fontFamily: "'DM Mono','Fira Code',monospace", minHeight: "100vh" },
  card: { background: "#0d0d15", border: "1px solid #1a1a2e", borderRadius: 6, padding: "1.5rem" },
  input: { width: "100%", background: "#0a0a12", border: "1px solid #1a1a2e", borderRadius: 3, padding: "0.7rem 0.9rem", fontFamily: "'DM Mono',monospace", fontSize: "0.8rem", color: "#e2e2ee", outline: "none", marginTop: 4 },
  label: { fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#666680", display: "block", marginTop: "1rem" },
  btn: (color = "#f97316", ghost = false) => ({
    background: ghost ? "transparent" : color,
    color: ghost ? color : color === "#f97316" ? "#000" : "#fff",
    border: `1px solid ${color}`,
    borderRadius: 3, padding: "0.65rem 1.2rem",
    fontFamily: "'DM Mono',monospace", fontSize: "0.72rem",
    letterSpacing: "0.1em", textTransform: "uppercase",
    cursor: "pointer", transition: "all 0.2s",
  }),
  tag: (color) => ({ fontSize: "0.62rem", padding: "0.18rem 0.55rem", borderRadius: 2, background: `${color}18`, border: `1px solid ${color}30`, color }),
};

const PRIORITY_COLORS = { high: "#ff4757", medium: "#f97316", low: "#34d399" };
const STATUS_COLORS = { todo: "#666680", in_progress: "#f97316", done: "#34d399" };

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Input({ label, ...props }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <input style={S.input} {...props}
        onFocus={e => e.target.style.borderColor = "#f97316"}
        onBlur={e => e.target.style.borderColor = "#1a1a2e"} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <select style={{ ...S.input, marginTop: 4 }} {...props}>{children}</select>
    </div>
  );
}

function Badge({ text, color }) {
  return <span style={S.tag(color)}>{text}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ ...S.card, width: "100%", maxWidth: 480, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "1rem" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666680", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AUTH PAGES ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      if (!res.ok) { setError(res.data?.message || res.data?.error || "Something went wrong"); setLoading(false); return; }
      if (mode === "register") { setMode("login"); setError("Registered! Please sign in."); setLoading(false); return; }
      // Try all possible response structures
      const d = res.data;
      const token = d?.data?.accessToken || d?.accessToken || d?.data?.token || d?.token || d?.access_token;
      const user = d?.data?.user || d?.user || { name: "User", role: "user", email: form.email };
      console.log("Login response:", JSON.stringify(d));
      if (token) onAuth(token, user);
      else { setError("Login failed — no token received. Check console for details."); setLoading(false); }
    } catch (e) { setError("Network error — is the API running?"); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "#060608" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');*{box-sizing:border-box;}select{appearance:auto;}`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque','Georgia',serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.04em" }}>
            <span style={{ color: "#e2e2ee" }}>Task</span><span style={{ color: "#f97316" }}>Flow</span>
          </h1>
          <p style={{ fontSize: "0.72rem", color: "#666680", marginTop: "0.4rem", letterSpacing: "0.1em" }}>TASK MANAGEMENT API — DEMO</p>
        </div>
        <div style={S.card}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ ...S.btn(m === mode ? "#f97316" : "#1a1a2e", m !== mode), flex: 1, padding: "0.6rem" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {mode === "register" && <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" required />}
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" required />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
            {error && <div style={{ fontSize: "0.72rem", color: "#ff4757", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 3, padding: "0.6rem 0.8rem", marginTop: "0.5rem" }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...S.btn("#f97316"), marginTop: "1.2rem", width: "100%", padding: "0.8rem", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>
          {mode === "login" && (
            <div style={{ marginTop: "1rem", padding: "0.8rem", background: "#0a0a12", borderRadius: 3, fontSize: "0.68rem", color: "#666680" }}>
              <div style={{ marginBottom: "0.3rem", color: "#f97316" }}>// Default admin credentials</div>
              <div>Email: admin@taskflow.dev</div>
              <div>Password: Admin@123</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TASK FORM ─────────────────────────────────────────────────────────────────
function TaskForm({ token, task, onSave, onClose }) {
  const [form, setForm] = useState({ title: task?.title || "", description: task?.description || "", status: task?.status || "todo", priority: task?.priority || "medium", due_date: task?.due_date?.split("T")[0] || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    const res = task ? await api.updateTask(token, task.id, form) : await api.createTask(token, form);
    if (res.ok) { onSave(); onClose(); }
    else { setError(res.data?.message || "Failed to save task"); }
    setLoading(false);
  };

  return (
    <Modal title={task ? "Edit Task" : "New Task"} onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
        <label style={S.label}>Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          style={{ ...S.input, resize: "vertical", minHeight: 80 }} placeholder="Optional description" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </Select>
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        {error && <div style={{ fontSize: "0.72rem", color: "#ff4757", marginTop: "0.5rem" }}>{error}</div>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.2rem" }}>
          <button type="button" onClick={onClose} style={{ ...S.btn("#666680", true), flex: 1 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ ...S.btn("#f97316"), flex: 2, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── TASK CARD ─────────────────────────────────────────────────────────────────
function TaskCard({ task, token, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const del = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    await api.deleteTask(token, task.id);
    onRefresh();
  };

  const toggleDone = async () => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await api.updateTask(token, task.id, { status: newStatus });
    onRefresh();
  };

  return (
    <>
      {editing && <TaskForm token={token} task={task} onSave={onRefresh} onClose={() => setEditing(false)} />}
      <div style={{ ...S.card, padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.7rem", opacity: task.status === "done" ? 0.65 : 1, transition: "opacity 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: task.status === "done" ? "line-through" : "none", flex: 1 }}>{task.title}</div>
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <button onClick={toggleDone} style={{ ...S.btn(task.status === "done" ? "#666680" : "#34d399", true), padding: "0.3rem 0.6rem", fontSize: "0.62rem" }}>
              {task.status === "done" ? "↩ Undo" : "✓ Done"}
            </button>
            <button onClick={() => setEditing(true)} style={{ ...S.btn("#f97316", true), padding: "0.3rem 0.6rem", fontSize: "0.62rem" }}>Edit</button>
            <button onClick={del} disabled={deleting} style={{ ...S.btn("#ff4757", true), padding: "0.3rem 0.6rem", fontSize: "0.62rem" }}>Del</button>
          </div>
        </div>
        {task.description && <p style={{ fontSize: "0.75rem", color: "#666680", lineHeight: 1.7 }}>{task.description}</p>}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <Badge text={task.status.replace("_", " ")} color={STATUS_COLORS[task.status] || "#666680"} />
          <Badge text={task.priority} color={PRIORITY_COLORS[task.priority] || "#666680"} />
          {task.due_date && <span style={{ fontSize: "0.62rem", color: "#555570" }}>📅 {task.due_date.split("T")[0]}</span>}
        </div>
      </div>
    </>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ token, user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState({ status: "", priority: "" });
  const [view, setView] = useState("tasks"); // tasks | admin

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.priority) params.set("priority", filter.priority);
    const res = await api.getTasks(token, params.toString() ? "?" + params : "");
    if (res.ok) {
      const raw = res.data?.data?.tasks || res.data?.tasks || res.data?.data || res.data || [];
      setTasks(Array.isArray(raw) ? raw : []);
    }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');*{box-sizing:border-box;}select{appearance:auto;background:#0a0a12;color:#e2e2ee;}`}</style>
      {creating && <TaskForm token={token} onSave={loadTasks} onClose={() => setCreating(false)} />}

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "1px solid #1a1a2e", background: "rgba(6,6,8,0.95)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1rem" }}>
            Task<span style={{ color: "#f97316" }}>Flow</span>
          </span>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {["tasks", ...(user?.role === "admin" ? ["admin"] : [])].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ ...S.btn(view === v ? "#f97316" : "#1a1a2e", view !== v), padding: "0.4rem 0.9rem", fontSize: "0.68rem" }}>
                {v === "tasks" ? "📋 Tasks" : "👑 Admin"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.68rem", color: "#666680" }}>
            {user?.name} <span style={{ color: user?.role === "admin" ? "#f97316" : "#34d399" }}>({user?.role})</span>
          </span>
          <button onClick={onLogout} style={{ ...S.btn("#666680", true), padding: "0.4rem 0.9rem", fontSize: "0.68rem" }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {view === "tasks" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.8rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total", value: stats.total, color: "#e2e2ee" },
                { label: "Todo", value: stats.todo, color: "#666680" },
                { label: "In Progress", value: stats.inProgress, color: "#f97316" },
                { label: "Done", value: stats.done, color: "#34d399" },
              ].map(s => (
                <div key={s.label} style={{ ...S.card, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1.8rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.65rem", color: "#666680", marginTop: "0.3rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters + Create */}
            <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
              <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                style={{ ...S.input, width: "auto", marginTop: 0 }}>
                <option value="">All Status</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
                style={{ ...S.input, width: "auto", marginTop: 0 }}>
                <option value="">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button onClick={() => setCreating(true)} style={{ ...S.btn("#f97316"), marginLeft: "auto" }}>
                + New Task
              </button>
            </div>

            {/* Tasks Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#666680", fontSize: "0.78rem" }}>Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "0.78rem", color: "#666680", marginBottom: "1rem" }}>No tasks found.</div>
                <button onClick={() => setCreating(true)} style={S.btn("#f97316")}>Create your first task</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.9rem" }}>
                {tasks.map(t => <TaskCard key={t.id} task={t} token={token} onRefresh={loadTasks} />)}
              </div>
            )}
          </>
        )}

        {view === "admin" && <AdminPanel token={token} />}
      </div>
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function AdminPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await api.getUsers(token);
    if (res.ok) setUsers(res.data?.data?.users || res.data?.users || res.data || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const delUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    await api.deleteUser(token, id);
    loadUsers();
  };

  return (
    <div>
      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", marginBottom: "1.2rem" }}>
        👑 Admin Panel
      </div>
      {loading ? (
        <div style={{ color: "#666680", fontSize: "0.78rem" }}>Loading users...</div>
      ) : (
        <div style={S.card}>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#666680", marginBottom: "1rem" }}>
            // All Users ({users.length})
          </div>
          {users.length === 0 ? (
            <div style={{ color: "#666680", fontSize: "0.78rem" }}>No users found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {users.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 1rem", background: "#0a0a12", borderRadius: 3, border: "1px solid #1a1a2e" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{u.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#666680", marginTop: "0.2rem" }}>{u.email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <Badge text={u.role} color={u.role === "admin" ? "#f97316" : "#34d399"} />
                    <span style={{ fontSize: "0.65rem", color: "#555570" }}>{new Date(u.created_at).toLocaleDateString()}</span>
                    {u.role !== "admin" && (
                      <button onClick={() => delUser(u.id)} style={{ ...S.btn("#ff4757", true), padding: "0.3rem 0.6rem", fontSize: "0.62rem" }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("tf_token"));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("tf_user")); } catch { return null; } });

  const handleAuth = (t, u) => {
    localStorage.setItem("tf_token", t);
    localStorage.setItem("tf_user", JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const handleLogout = async () => {
    if (token) await api.logout(token);
    localStorage.removeItem("tf_token");
    localStorage.removeItem("tf_user");
    setToken(null); setUser(null);
  };

  if (!token || !user) return <AuthPage onAuth={handleAuth} />;
  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}
