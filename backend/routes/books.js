const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");

const router = express.Router();
const editableFields = ["title", "author", "category", "isbn", "publishedYear", "description"];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const { search = "", status = "all", category } = req.query;
  const filter = {};

  if (typeof search === "string" && search.trim()) {
    const expression = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: expression }, { author: expression }, { category: expression }, { isbn: expression }];
  }

  if (status === "available") filter.isAvailable = true;
  if (status === "issued") filter.isAvailable = false;
  if (typeof category === "string" && category !== "all") filter.category = category;

  const books = await Book.find(filter).sort({ createdAt: -1, title: 1 });
  res.json(books);
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const book = await Book.create({
    title: body.title,
    author: body.author,
    category: body.category,
    isbn: body.isbn,
    publishedYear: body.publishedYear ?? null,
    description: body.description,
  });

  res.status(201).json(book);
});

router.put("/:id", async (req, res) => {
  const updates = {};
  const body = req.body || {};
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  const book = await Book.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
});

router.put("/:id/issue", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ message: "Borrower name is required" });

  const book = await Book.findOneAndUpdate(
    { _id: req.params.id, isAvailable: true },
    { isAvailable: false, issuedTo: name },
    { new: true, runValidators: true }
  );

  if (book) return res.json(book);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid book ID" });

  const exists = await Book.exists({ _id: req.params.id });
  if (!exists) return res.status(404).json({ message: "Book not found" });
  return res.status(409).json({ message: "This book is already issued" });
});

router.put("/:id/return", async (req, res) => {
  const book = await Book.findOneAndUpdate(
    { _id: req.params.id, isAvailable: false },
    { isAvailable: true, issuedTo: "" },
    { new: true }
  );

  if (book) return res.json(book);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid book ID" });

  const exists = await Book.exists({ _id: req.params.id });
  if (!exists) return res.status(404).json({ message: "Book not found" });
  return res.status(409).json({ message: "This book has already been returned" });
});

router.delete("/:id", async (req, res) => {
  const book = await Book.findOneAndDelete({ _id: req.params.id, isAvailable: true });
  if (book) return res.json({ message: "Book deleted" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid book ID" });

  const exists = await Book.exists({ _id: req.params.id });
  if (!exists) return res.status(404).json({ message: "Book not found" });
  return res.status(409).json({ message: "Return this book before deleting it" });
});

module.exports = router;
