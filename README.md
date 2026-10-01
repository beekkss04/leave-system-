# Employee Leave Management System (Case 103)

Node.js + Express + MongoDB (Mongoose) + JWT backend, React (Vite) frontend.

```
leave-system/
├── backend/   src/server.js  models.js  auth.js  routes.js   .env
├── frontend/  src/App.jsx  index.css  .env
└── Leave-API.postman_collection.json
```

## 1. Run on your PC

**Needs:** Node.js 18+ (nodejs.org) and a free MongoDB Atlas account.

### a) MongoDB Atlas (once)
1. mongodb.com/atlas -> sign up -> create a free **M0** cluster.
2. **Database Access** -> add a user (username + password).
3. **Network Access** -> Add IP -> **Allow access from anywhere** (0.0.0.0/0).
4. **Connect -> Drivers** -> copy the string, e.g. `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/leaveDB`
   (put the password in and add `/leaveDB` before the `?`).

### b) Backend
```bash
cd backend
npm install
```
Open `backend/.env` and fill it in:
```
PORT=5000
MONGO_URI=<your Atlas string>
JWT_SECRET=any_long_random_text
```
```bash
npm run dev
```
You should see `Server + DB connected`. Open http://localhost:5000 -> "Leave API running".

### c) Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. (`frontend/.env` already points to `http://localhost:5000/api`.)

### d) Try it
1. Register a **Manager** (e.g. mona@corp.com).
2. Log out, register an **Employee** and type the manager's email in "Your manager's email".
3. Employee: Apply -> send a request. Apply again with overlapping dates -> blocked.
4. Log in as the manager -> Approve / Reject on the dashboard.

### e) Postman / Thunder Client
Import `Leave-API.postman_collection.json`. Run requests top to bottom; login requests save the token automatically. Replace `REQUEST_ID` with an `_id` from "My requests".

## 2. API

| Method | URL | Who | What |
|---|---|---|---|
| POST | /api/auth/register | anyone | create account, returns JWT |
| POST | /api/auth/login | anyone | login, returns JWT |
| POST | /api/leave | logged in | apply (overlap check) |
| GET | /api/leave/my-requests | logged in | my history |
| GET | /api/leave/pending | manager | pending requests of my team |
| GET | /api/leave/:id | owner / team manager | details |
| PATCH | /api/leave/:id/status | manager of that team | `{ "status": "approved" \| "rejected" }` |

## 3. How it works

- **Schemas (models.js):** `Employee` has `role` (employee/manager) and `manager` (a reference to another Employee = the team). `LeaveRequest` references the Employee and has `status` (pending/approved/rejected, default pending).
- **Authentication:** passwords are hashed with bcrypt. Login returns a JWT holding `{id, role}`. The frontend sends it as `Authorization: Bearer <token>`.
- **`protect` middleware:** verifies the JWT, else 401.
- **`managerOnly` middleware:** checks `role === 'manager'`, else 403. The status route also checks the leave belongs to *that manager's team*.
- **Overlap rule:** two ranges overlap when `existing.start <= new.end` **and** `existing.end >= new.start`. We search for such a leave of the same employee (ignoring rejected ones). Found -> 409 error, nothing saved.
- **Frontend:** only calls the API. All rules live in the backend. Pages: Login/Register, Dashboard (list + approval panel), Apply form, Details.

## 4. Deploy

### Backend on Render
1. Push the project to GitHub (`backend/.env` and `frontend/.env` are git-ignored).
2. render.com -> **New -> Web Service** -> pick the repo.
3. Root Directory: `backend` | Build: `npm install` | Start: `npm start`.
4. Environment variables: `MONGO_URI`, `JWT_SECRET` (Render sets `PORT` itself).
5. Deploy. Test `https://your-api.onrender.com/` . Your API base is `https://your-api.onrender.com/api`.
   (Railway works the same way.)

### Frontend on Vercel
1. vercel.com -> **Add New -> Project** -> same repo.
2. Root Directory: `frontend` (Vite is detected automatically).
3. Environment variable: `VITE_API_URL` = `https://your-api.onrender.com/api`
4. Deploy. Done: your React app now talks to the live backend.

Note: Render's free tier sleeps when idle, so the first request can take ~30 seconds.

## 5. Common problems
- **`DB error: bad auth`** -> wrong Atlas password in `MONGO_URI` (special characters must be URL-encoded).
- **`DB error ... timed out`** -> Atlas Network Access does not allow your IP.
- **Network Error in browser** -> backend not running or `VITE_API_URL` wrong. Restart `npm run dev` after editing `.env`.
