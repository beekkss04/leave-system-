import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
const fmt = (x) =>
  new Date(x).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1;
const msg = (e) => e.response?.data?.message || "Something went wrong";
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
      setErr(msg(x));
    }
  };
  return (
    <div className="authpage">
      <form className="authcard" onSubmit={submit}>
        <div className="brand big">LeaveMS</div>
        <p className="sub center">Employee Leave Management System</p>
        <h3>{reg ? "Create your account" : "Login to your account"}</h3>
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
          <input
            type="email"
            required
            value={f.email}
            onChange={set("email")}
          />
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
        <button className="primary full">{reg ? "Register" : "Login"}</button>
        <p className="sub center">
          {reg ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setReg(!reg);
              setErr("");
            }}
          >
            {reg ? "Login" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}

// ---------- Small pieces ----------
function Stats({ list }) {
  const c = (s) => list.filter((l) => l.status === s).length;
  return (
    <div className="stats">
      <div className="stat t">
        <b>{list.length}</b>Total Requests
      </div>
      <div className="stat p">
        <b>{c("pending")}</b>Pending
      </div>
      <div className="stat a">
        <b>{c("approved")}</b>Approved
      </div>
      <div className="stat r">
        <b>{c("rejected")}</b>Rejected
      </div>
    </div>
  );
}

function Table({ rows, showEmp, onView, onDecide }) {
  if (!rows.length) return <p className="empty">No requests to show.</p>;
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>#</th>
            {showEmp && <th>Employee</th>}
            <th>From</th>
            <th>To</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l._id}>
              <td>{i + 1}</td>
              {showEmp && <td>{l.employee?.name}</td>}
              <td>{fmt(l.startDate)}</td>
              <td>{fmt(l.endDate)}</td>
              <td>{l.leaveType || "Casual"}</td>
              <td>{l.reason}</td>
              <td>
                <Badge s={l.status} />
              </td>
              <td className="acts">
                <button className="link" onClick={() => onView(l)}>
                  View
                </button>
                {onDecide && l.status === "pending" && (
                  <>
                    <button
                      className="ok"
                      onClick={() => onDecide(l._id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="no"
                      onClick={() => onDecide(l._id, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ l, user, close }) {
  const rows = [
    ["Employee", l.employee?.name || user.name],
    ["Leave Type", l.leaveType || "Casual"],
    ["From Date", fmt(l.startDate)],
    ["To Date", fmt(l.endDate)],
    ["Total Days", days(l.startDate, l.endDate)],
    ["Reason", l.reason],
    ["Status", <Badge s={l.status} />],
    ["Applied On", fmt(l.createdAt)],
    ["Reviewed By", l.reviewedBy?.name || "-"],
    ["Reviewed On", l.reviewedAt ? fmt(l.reviewedAt) : "-"],
  ];
  return (
    <div className="overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h3>Leave Request Details</h3>
          <button className="x" onClick={close}>
            ×
          </button>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="right">
          <button className="ghost" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Apply ----------
function Apply({ done, cancel }) {
  const [f, setF] = useState({
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leave", f);
      done();
    } catch (x) {
      setErr(msg(x));
    }
  };
  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Apply for Leave</h2>
      {err && <p className="err">{err}</p>}
      <label>
        Leave Type *
        <select value={f.leaveType} onChange={set("leaveType")}>
          <option>Casual</option>
          <option>Sick</option>
          <option>Annual</option>
        </select>
      </label>
      <label>
        From Date *
        <input
          type="date"
          required
          value={f.startDate}
          onChange={set("startDate")}
        />
      </label>
      <label>
        To Date *
        <input
          type="date"
          required
          value={f.endDate}
          onChange={set("endDate")}
        />
      </label>
      <label>
        Reason *<textarea required value={f.reason} onChange={set("reason")} />
      </label>
      <div className="acts">
        <button className="primary">Submit</button>
        <button type="button" className="ghost" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- App ----------
export default function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [page, setPage] = useState("dashboard");
  const [mine, setMine] = useState([]);
  const [team, setTeam] = useState([]);
  const [view, setView] = useState(null);
  const isMgr = user?.role === "manager";

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setPage("dashboard");
  };
  const refresh = async () => {
    try {
      setMine((await api.get("/leave/my-requests")).data);
      if (isMgr) setTeam((await api.get("/leave/team")).data);
    } catch (x) {
      if (x.response?.status === 401) logout();
    }
  };
  useEffect(() => {
    if (user) refresh();
  }, [user, page]); // reload data on every page change = always in sync
  const decide = async (id, status) => {
    try {
      await api.patch(`/leave/${id}/status`, { status });
      await refresh();
    } catch (x) {
      alert(msg(x));
    }
  };

  if (!user) return <Auth onLogin={setUser} />;

  const nav = isMgr
    ? [
        ["dashboard", "Dashboard"],
        ["pending", "Pending Requests"],
        ["all", "All Requests"],
        ["apply", "Apply Leave"],
        ["mine", "My Requests"],
      ]
    : [
        ["dashboard", "Dashboard"],
        ["apply", "Apply Leave"],
        ["mine", "My Requests"],
      ];
  const source = isMgr ? team : mine;
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const card = (title, rows, extra = {}) => (
    <>
      <h2>{title}</h2>
      <div className="card">
        <Table rows={rows} onView={setView} {...extra} />
      </div>
    </>
  );

  let body;
  if (page === "apply")
    body = (
      <Apply done={() => setPage("mine")} cancel={() => setPage("dashboard")} />
    );
  else if (page === "mine") body = card("My Leave Requests", mine);
  else if (page === "pending" && isMgr)
    body = card(
      "Pending Leave Requests",
      team.filter((l) => l.status === "pending"),
      { showEmp: true, onDecide: decide },
    );
  else if (page === "all" && isMgr)
    body = card("All Team Requests", team, { showEmp: true });
  else
    body = (
      <>
        <div className="welcome">
          <div className="avatar big">{initials}</div>
          <div>
            <h2>Welcome, {user.name}</h2>
            <span className="sub">
              {isMgr ? "Manager (showing your team's requests)" : "Employee"}
            </span>
          </div>
        </div>
        <Stats list={source} />
        <div className="card">
          <div className="row">
            <h3>Recent Leave Requests</h3>
            <button
              className="link"
              onClick={() => setPage(isMgr ? "all" : "mine")}
            >
              View All
            </button>
          </div>
          <Table
            rows={source.slice(0, 5)}
            showEmp={isMgr}
            onView={setView}
            onDecide={isMgr ? decide : null}
          />
        </div>
      </>
    );

  return (
    <div className="app">
      <aside>
        <div className="brand">LeaveMS</div>
        <nav>
          {nav.map(([k, label]) => (
            <button
              key={k}
              className={page === k ? "on" : ""}
              onClick={() => setPage(k)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="out" onClick={logout}>
          Logout
        </button>
      </aside>
      <main>
        <div className="top">
          <span className="chip">
            <span className="avatar">{initials}</span>
            {user.name} ({user.role})
          </span>
        </div>
        {body}
      </main>
      {view && <Modal l={view} user={user} close={() => setView(null)} />}
    </div>
  );
}
