import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
const d = (x) => new Date(x).toLocaleDateString();
const Badge = ({ s }) => <span className={`badge ${s}`}>{s}</span>;

// ---------- Login / Register ----------
function Auth({ onLogin }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    managerEmail: "",
  });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(
        reg ? "/auth/register" : "/auth/login",
        f,
      );
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (x) {
      setErr(x.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>{reg ? "Create account" : "Log in"}</h2>
      {err && <p className="err">{err}</p>}
      {reg && (
        <>
          <label>
            Name
            <input required value={f.name} onChange={set("name")} />
          </label>
          <label>
            Role
            <select value={f.role} onChange={set("role")}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          {f.role === "employee" && (
            <label>
              Your manager's email
              <input
                type="email"
                value={f.managerEmail}
                onChange={set("managerEmail")}
              />
            </label>
          )}
        </>
      )}
      <label>
        Email
        <input type="email" required value={f.email} onChange={set("email")} />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          minLength={6}
          value={f.password}
          onChange={set("password")}
        />
      </label>
      <div className="row">
        <button>{reg ? "Create account" : "Log in"}</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setReg(!reg);
            setErr("");
          }}
        >
          {reg ? "I have an account" : "I need an account"}
        </button>
      </div>
    </form>
  );
}

// ---------- Apply form ----------
function Apply({ done }) {
  const [f, setF] = useState({ startDate: "", endDate: "", reason: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leave", f);
      done();
    } catch (x) {
      setErr(x.response?.data?.message || "Failed");
    }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Apply for leave</h2>
      {err && <p className="err">{err}</p>}
      <label>
        From
        <input
          type="date"
          required
          value={f.startDate}
          onChange={set("startDate")}
        />
      </label>
      <label>
        To
        <input
          type="date"
          required
          value={f.endDate}
          onChange={set("endDate")}
        />
      </label>
      <label>
        Reason
        <textarea required value={f.reason} onChange={set("reason")} />
      </label>
      <button>Send request</button>
    </form>
  );
}

// ---------- Details ----------
function Details({ id }) {
  const [l, setL] = useState(null);
  useEffect(() => {
    api.get(`/leave/${id}`).then((r) => setL(r.data));
  }, [id]);
  if (!l) return <p>Loading…</p>;
  return (
    <div className="card">
      <h2>Leave details</h2>
      <p>
        <b>Employee:</b> {l.employee.name} ({l.employee.email})
      </p>
      <p>
        <b>Dates:</b> {d(l.startDate)} to {d(l.endDate)}
      </p>
      <p>
        <b>Reason:</b> {l.reason}
      </p>
      <p>
        <b>Status:</b> <Badge s={l.status} />
      </p>
      <p>
        <b>Applied:</b> {d(l.createdAt)}
      </p>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ user, open }) {
  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const load = () => {
    api.get("/leave/my-requests").then((r) => setMine(r.data));
    if (user.role === "manager")
      api.get("/leave/pending").then((r) => setPending(r.data));
  };
  useEffect(load, []);
  const decide = async (id, status) => {
    await api.patch(`/leave/${id}/status`, { status });
    load();
  };

  const count = (s) => mine.filter((l) => l.status === s).length;
  return (
    <>
      <h2>
        Hello, {user.name}
        <span className="tag">{user.role}</span>
      </h2>
      <div className="stats">
        <div className="stat p">
          <b>{count("pending")}</b>Pending
        </div>
        <div className="stat">
          <b>{count("approved")}</b>Approved
        </div>
        <div className="stat r">
          <b>{count("rejected")}</b>Rejected
        </div>
      </div>
      {user.role === "manager" && (
        <>
          <h2>Team requests waiting</h2>
          {pending.length === 0 && <p>No pending requests.</p>}
          {pending.map((l) => (
            <div className="card row" key={l._id}>
              <span>
                <b>{l.employee.name}</b>
                <br />
                <span className="sub">
                  {d(l.startDate)} to {d(l.endDate)} | {l.reason}
                </span>
              </span>
              <span>
                <button
                  className="ghost"
                  onClick={() => open("details", l._id)}
                >
                  View
                </button>{" "}
                <button onClick={() => decide(l._id, "approved")}>
                  Approve
                </button>{" "}
                <button
                  className="red"
                  onClick={() => decide(l._id, "rejected")}
                >
                  Reject
                </button>
              </span>
            </div>
          ))}
        </>
      )}
      <h2>My requests</h2>
      {mine.length === 0 && <p>You have not applied for leave yet.</p>}
      {mine.map((l) => (
        <div className="card row" key={l._id}>
          <span>
            <b>
              {d(l.startDate)} to {d(l.endDate)}
            </b>
            <br />
            <span className="sub">{l.reason}</span>
          </span>
          <span>
            <Badge s={l.status} />{" "}
            <button className="ghost" onClick={() => open("details", l._id)}>
              Details
            </button>
          </span>
        </div>
      ))}
    </>
  );
}

// ---------- App ----------
export default function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [page, setPage] = useState({ name: "dashboard", id: null });
  const go = (name, id = null) => setPage({ name, id });
  const logout = () => {
    localStorage.clear();
    setUser(null);
    go("dashboard");
  };

  return (
    <>
      <header>
        <div className="in">
          <span className="logo">Leave Manager</span>
          {user && (
            <>
              <button onClick={() => go("dashboard")}>Dashboard</button>
              <button onClick={() => go("apply")}>Apply for leave</button>
              <button onClick={logout}>Log out ({user.name})</button>
            </>
          )}
        </div>
      </header>
      <div className="wrap">
        {!user ? (
          <Auth onLogin={setUser} />
        ) : page.name === "apply" ? (
          <Apply done={() => go("dashboard")} />
        ) : page.name === "details" ? (
          <Details id={page.id} />
        ) : (
          <Dashboard user={user} open={go} key={page.name} />
        )}
      </div>
    </>
  );
}
