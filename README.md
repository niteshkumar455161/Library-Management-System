# Folio — Library Management System

A MERN app for keeping a small library organized. Add and edit books, search and filter the collection, check books out to readers, and record returns.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection URI

## Run locally

### Easiest way on Windows

1. Install MongoDB Community Server if it is not already installed. Leave the default option to run it as a Windows service enabled.
2. Double-click `Start-Library.bat` in the project folder. It opens the API, website, and browser for you. Keep the two terminal windows open while using the app.

The backend `.env` file is already configured for a local MongoDB installation. If it is missing, copy `backend/.env.example` to `backend/.env`.

### Start manually

1. Start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. In a second terminal, start the React app:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The API listens on port `5000` by default. Set `VITE_API_URL` in `frontend/.env` to override the default API base URL (`http://localhost:5000/api`).

## Features

- Collection overview with total, available, checked-out, and category counts
- Search by title, author, genre, or ISBN; filter by availability and genre
- Add, edit, and remove books
- Check out available books to a named reader and record returns
- Responsive layout for desktop and smaller screens

## API

- `GET /api/health` — API and database status
- `GET /api/books` — list books; optional `search`, `status`, and `category` query parameters
- `POST /api/books` — add a book
- `PUT /api/books/:id` — edit book details
- `PUT /api/books/:id/issue` — check out a book (`{ "name": "Reader name" }`)
- `PUT /api/books/:id/return` — return a checked-out book
- `DELETE /api/books/:id` — remove an available book

Run backend checks with `cd backend; npm test`.
## Screenshots

### Dashboard
![Library Management Dashboard](screenshots/dashboard.png)

