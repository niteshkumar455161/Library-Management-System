const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const app = require("../server");
const Book = require("../models/Book");

const server = app.listen(0);
const baseUrl = new Promise((resolve) => {
  server.once("listening", () => {
    resolve(`http://127.0.0.1:${server.address().port}`);
  });
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test("health endpoint reports API status without exposing configuration", async () => {
  const response = await fetch(`${await baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "disconnected" });
});

test("unknown routes return a clear JSON 404", async () => {
  const response = await fetch(`${await baseUrl}/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Route not found" });
});

test("malformed JSON receives a client error", async () => {
  const response = await fetch(`${await baseUrl}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Request body must be valid JSON" });
});

test("non-object JSON request bodies are rejected", async () => {
  const response = await fetch(`${await baseUrl}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Request body must be a JSON object" });
});

test("checkout requires a borrower name before accessing the database", async () => {
  const response = await fetch(`${await baseUrl}/api/books/not-an-id/issue`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: " " }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Borrower name is required" });
});

test("book records require a title and author and normalize their text", async () => {
  const missingFields = new Book({});
  await assert.rejects(missingFields.validate(), { name: "ValidationError" });

  const book = new Book({ title: "  Dune  ", author: "  Frank Herbert  " });
  await book.validate();
  assert.equal(book.title, "Dune");
  assert.equal(book.author, "Frank Herbert");
  assert.equal(book.category, "General");
  assert.equal(book.isAvailable, true);
});
