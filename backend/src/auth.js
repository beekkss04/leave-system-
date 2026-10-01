const jwt = require("jsonwebtoken");

// 1) Is the user logged in? (valid JWT)
exports.protect = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ message: "Not logged in" });
  }
};

// 2) Is the user a manager?
exports.managerOnly = (req, res, next) =>
  req.user.role === "manager"
    ? next()
    : res.status(403).json({ message: "Managers only" });
