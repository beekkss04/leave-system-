require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("Leave API running"));
app.use("/api", require("./routes"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server + DB connected"),
    ),
  )
  .catch((e) => console.error("DB error:", e.message));
