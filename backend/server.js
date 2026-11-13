require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const booksRouter = require("./routes/books");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: "20kb", strict: false }));
app.use((req, res, next) => {
  if (req.body !== undefined && (req.body === null || typeof req.body !== "object" || Array.isArray(req.body))) {
    return res.status(400).json({ message: "Request body must be a JSON object" });
  }
  return next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api/books", booksRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid book ID" });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }

  console.error(error);
  return res.status(500).json({ message: "An unexpected server error occurred" });
});

async function startServer() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/library_management";
  const port = process.env.PORT || 5000;

  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`Library API is running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Could not start the library API:", error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
