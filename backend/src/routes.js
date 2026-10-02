const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Employee, LeaveRequest } = require("./models");
const { protect, managerOnly } = require("./auth");

const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

// ---------- AUTH ----------
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, managerEmail } = req.body;
    if (await Employee.findOne({ email }))
      return res.status(400).json({ message: "Email already used" });
    let manager;
    if (role !== "manager" && managerEmail) {
      const m = await Employee.findOne({
        email: managerEmail,
        role: "manager",
      });
      if (!m)
        return res.status(400).json({ message: "Manager email not found" });
      manager = m._id;
    }
    const user = await Employee.create({
      name,
      email,
      role,
      manager,
      password: await bcrypt.hash(password, 10),
    });
    res
      .status(201)
      .json({ token: sign(user), user: { name: user.name, role: user.role } });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post("/auth/login", async (req, res) => {
  const user = await Employee.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(401).json({ message: "Wrong email or password" });
  res.json({ token: sign(user), user: { name: user.name, role: user.role } });
});

// ---------- LEAVE ----------
// Apply for leave (with overlap check)
router.post("/leave", protect, async (req, res) => {
  try {
    const { startDate, endDate, reason, leaveType } = req.body;
    const start = new Date(startDate),
      end = new Date(endDate);
    if (end < start)
      return res.status(400).json({ message: "End date is before start date" });

    // Overlap: existing.start <= new.end AND existing.end >= new.start (rejected leaves don't count)
    const clash = await LeaveRequest.findOne({
      employee: req.user.id,
      status: { $ne: "rejected" },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (clash)
      return res
        .status(409)
        .json({ message: "You already have leave in these dates" });

    const leave = await LeaveRequest.create({
      employee: req.user.id,
      startDate: start,
      endDate: end,
      reason,
      leaveType,
    });
    res.status(201).json(leave);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// My history
router.get("/leave/my-requests", protect, async (req, res) =>
  res.json(
    await LeaveRequest.find({ employee: req.user.id })
      .populate("reviewedBy", "name")
      .sort("-createdAt"),
  ),
);

// Manager: ALL requests of my team (any status) - used for dashboard numbers and All Requests
router.get("/leave/team", protect, managerOnly, async (req, res) => {
  const team = await Employee.find({ manager: req.user.id }).distinct("_id");
  res.json(
    await LeaveRequest.find({ employee: { $in: team } })
      .populate("employee", "name email")
      .populate("reviewedBy", "name")
      .sort("-createdAt"),
  );
});

// Manager: pending requests of MY team only
router.get("/leave/pending", protect, managerOnly, async (req, res) => {
  const team = await Employee.find({ manager: req.user.id }).distinct("_id");
  res.json(
    await LeaveRequest.find({ employee: { $in: team }, status: "pending" })
      .populate("employee", "name email")
      .sort("createdAt"),
  );
});

// Single request (owner or the owner's manager)
router.get("/leave/:id", protect, async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id).populate(
    "employee",
    "name email manager",
  );
  if (!leave) return res.status(404).json({ message: "Not found" });
  const isOwner = String(leave.employee._id) === req.user.id;
  const isTeamManager = String(leave.employee.manager) === req.user.id;
  if (!isOwner && !isTeamManager)
    return res.status(403).json({ message: "Not allowed" });
  res.json(leave);
});

// Manager: approve / reject
router.patch("/leave/:id/status", protect, managerOnly, async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status))
    return res
      .status(400)
      .json({ message: "Status must be approved or rejected" });
  const leave = await LeaveRequest.findById(req.params.id).populate(
    "employee",
    "manager",
  );
  if (!leave) return res.status(404).json({ message: "Not found" });
  if (String(leave.employee.manager) !== req.user.id)
    return res.status(403).json({ message: "Not in your team" });
  leave.status = status;
  leave.reviewedBy = req.user.id;
  leave.reviewedAt = new Date();
  await leave.save();
  res.json({ _id: leave._id, status: leave.status });
});

module.exports = router;
