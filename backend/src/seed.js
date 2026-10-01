// Fills the database with demo users + leaves. Run: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Employee, LeaveRequest } = require("./models");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Employee.deleteMany({});
  await LeaveRequest.deleteMany({});
  const password = await bcrypt.hash("123456", 10);

  const mona = await Employee.create({
    name: "Mona Manager",
    email: "mona@corp.com",
    password,
    role: "manager",
  });
  const eric = await Employee.create({
    name: "Eric Employee",
    email: "eric@corp.com",
    password,
    manager: mona._id,
  });
  const priya = await Employee.create({
    name: "Priya Sharma",
    email: "priya@corp.com",
    password,
    manager: mona._id,
  });

  await LeaveRequest.create([
    {
      employee: eric._id,
      startDate: "2026-10-05",
      endDate: "2026-10-07",
      reason: "Family function",
      status: "approved",
    },
    {
      employee: eric._id,
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      reason: "Short trip",
    },
    {
      employee: priya._id,
      startDate: "2026-11-03",
      endDate: "2026-11-04",
      reason: "Medical checkup",
    },
  ]);
  console.log(
    "Seeded. Logins (password 123456): mona@corp.com (manager), eric@corp.com, priya@corp.com",
  );
  process.exit();
})();
