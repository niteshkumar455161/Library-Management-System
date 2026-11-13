const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, default: "General", maxlength: 60 },
    isbn: { type: String, trim: true, default: "", maxlength: 30 },
    publishedYear: { type: Number, min: 0, max: 9999, default: null },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    isAvailable: { type: Boolean, default: true },
    issuedTo: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
