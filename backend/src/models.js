const mongoose = require("mongoose");

const Employee = mongoose.model(
  "Employee",
  new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["employee", "manager"], default: "employee" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }, // the employee's manager (team)
  }),
);

const LeaveRequest = mongoose.model(
  "LeaveRequest",
  new mongoose.Schema(
    {
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      leaveType: {
        type: String,
        enum: ["Casual", "Sick", "Annual"],
        default: "Casual",
      },
      reason: { type: String, required: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
      reviewedAt: Date,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
    },
    { timestamps: true },
  ),
);

module.exports = { Employee, LeaveRequest };
