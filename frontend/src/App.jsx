import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  bookmark: <><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2H18v20l-6-4-6 4Z" /><path d="M6 4.5V18" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
  edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
  chevrons: <><path d="m8 10 4-4 4 4M8 14l4 4 4-4" /></>,
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Something went wrong. Please try again.");
  return payload;
}

function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request("/books");
      setBooks(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(
    () => [...new Set(books.map((book) => book.category).filter(Boolean))].sort(),
    [books],
  );
  const stats = useMemo(() => ({
    total: books.length,
    available: books.filter((book) => book.isAvailable).length,
    issued: books.filter((book) => !book.isAvailable).length,
    categories: categories.length,
  }), [books, categories.length]);

  const visibleBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return books.filter((book) => {
      const matchesSearch = !query || [book.title, book.author, book.category, book.isbn]
        .some((value) => value?.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "available" && book.isAvailable)
        || (statusFilter === "issued" && !book.isAvailable);
      const matchesCategory = categoryFilter === "all" || book.category === categoryFilter;
      const matchesSection = section !== "issued" || !book.isAvailable;
      return matchesSearch && matchesStatus && matchesCategory && matchesSection;
    });
  }, [books, search, statusFilter, categoryFilter, section]);

  async function saveBook(values) {
    const editing = modal?.type === "edit";
    await request(editing ? `/books/${modal.book._id}` : "/books", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(values),
    });
    setModal(null);
    setNotice(editing ? "Book details updated" : "Book added to your collection");
    await loadBooks();
  }

  async function issueBook(book, name) {
    await request(`/books/${book._id}/issue`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    setModal(null);
    setNotice(`“${book.title}” checked out to ${name}`);
    await loadBooks();
  }

  async function returnBook(book) {
    setBusyId(book._id);
    setError("");
    try {
      await request(`/books/${book._id}/return`, { method: "PUT" });
      setNotice(`“${book.title}” has been returned`);
      await loadBooks();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId("");
    }
  }

  async function deleteBook(book) {
    if (!window.confirm(`Delete “${book.title}” from the library?`)) return;
    setBusyId(book._id);
    setError("");
    try {
      await request(`/books/${book._id}`, { method: "DELETE" });
      setNotice("Book removed from the library");
      await loadBooks();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId("");
    }
  }

  const title = section === "issued" ? "Issued books" : section === "books" ? "All books" : "Your library";
  const subtitle = section === "issued"
    ? "Keep track of books currently out with readers."
    : section === "books" ? "Every story on your shelves, all in one place." : "A little order for a big love of reading.";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("overview"); }}>
          <span className="brand-mark"><Icon name="book" size={21} /></span>
          <span className="brand-name">folio<span>.</span></span>
        </a>

        <div className="sidebar-label">LIBRARY</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${section === "overview" ? "active" : ""}`} onClick={() => setSection("overview")}>
            <Icon name="grid" /><span>Overview</span>
          </button>
          <button className={`nav-item ${section === "books" ? "active" : ""}`} onClick={() => setSection("books")}>
            <Icon name="book" /><span>All books</span><span className="nav-count">{stats.total}</span>
          </button>
          <button className={`nav-item ${section === "issued" ? "active" : ""}`} onClick={() => { setSection("issued"); setStatusFilter("all"); }}>
            <Icon name="bookmark" /><span>On loan</span><span className="nav-count">{stats.issued}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon"><Icon name="spark" size={18} /></div>
            <p>Your next favorite is already on the shelf.</p>
            <button onClick={() => { setSection("books"); setStatusFilter("available"); }}>
              Find a book <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="profile">
            <div className="avatar">L</div>
            <div className="profile-copy"><strong>Library desk</strong><span>Personal collection</span></div>
            <Icon name="more" size={19} className="profile-more" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Library</span><Icon name="chevron" size={14} /><strong>{title}</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <button className="primary-button top-add" onClick={() => setModal({ type: "add" })}>
              <Icon name="plus" size={17} /> Add a book
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR READING ROOM</div>
              <h1>{title}<span className="heading-period">.</span></h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
            <div className="welcome-decoration" aria-hidden="true">
              <span className="deco-sun" /><span className="deco-leaf leaf-one" /><span className="deco-leaf leaf-two" /><span className="deco-leaf leaf-three" />
            </div>
          </section>

          {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={17} /></button></div>}
          {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={14} /></span>{notice}</div>}

          <section className="stats-grid" aria-label="Library statistics">
            <StatCard label="Total collection" value={stats.total} detail="books on your shelves" icon="book" tone="sage" />
            <StatCard label="Available now" value={stats.available} detail="ready for a new reader" icon="check" tone="cream" />
            <StatCard label="Currently on loan" value={stats.issued} detail="making someone's day" icon="bookmark" tone="lavender" />
            <StatCard label="Genres & topics" value={stats.categories} detail="ways to spend an afternoon" icon="spark" tone="peach" />
          </section>

          <section className="collection-section">
            <div className="section-heading">
              <div>
                <h2>{section === "issued" ? "Out in the world" : "The collection"}</h2>
                <p>{loading ? "Gathering your books…" : `${visibleBooks.length} ${visibleBooks.length === 1 ? "book" : "books"} ${search || statusFilter !== "all" || categoryFilter !== "all" ? "found" : "in your collection"}`}</p>
              </div>
              <button className="secondary-button" onClick={() => setModal({ type: "add" })}><Icon name="plus" size={16} /> Add book</button>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Icon name="search" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author, genre…" aria-label="Search books" />
                {search && <button className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><Icon name="close" size={15} /></button>}
              </label>
              <label className="select-wrap">
                <Icon name="filter" size={16} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by availability">
                  <option value="all">All availability</option>
                  <option value="available">Available</option>
                  <option value="issued">On loan</option>
                </select>
                <Icon name="chevrons" size={14} />
              </label>
              <label className="select-wrap category-select">
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by genre">
                  <option value="all">All genres</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <Icon name="chevrons" size={14} />
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>BOOK</th><th>GENRE</th><th>STATUS</th><th>READER</th><th className="action-heading">ACTIONS</th></tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan="5"><div className="table-message"><span className="spinner" /> Loading your collection…</div></td></tr>}
                  {!loading && visibleBooks.map((book, index) => (
                    <BookRow
                      key={book._id}
                      book={book}
                      index={index}
                      busy={busyId === book._id}
                      onIssue={() => setModal({ type: "issue", book })}
                      onReturn={() => returnBook(book)}
                      onEdit={() => setModal({ type: "edit", book })}
                      onDelete={() => deleteBook(book)}
                    />
                  ))}
                  {!loading && visibleBooks.length === 0 && (
                    <tr><td colSpan="5"><div className="empty-state">
                      <div className="empty-icon"><Icon name={search ? "search" : "book"} size={22} /></div>
                      <h3>{search || statusFilter !== "all" || categoryFilter !== "all" || section === "issued" ? "No books found" : "A shelf full of possibility"}</h3>
                      <p>{search || statusFilter !== "all" || categoryFilter !== "all" || section === "issued" ? "Try changing your search or filters." : "Add your first book and start building your collection."}</p>
                      {!books.length && <button className="primary-button" onClick={() => setModal({ type: "add" })}><Icon name="plus" size={16} /> Add your first book</button>}
                    </div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{visibleBooks.length}</strong> of <strong>{books.length}</strong> books</span><span className="footer-dot" /> <span>Made for readers, with care</span></div>
          </section>
          <footer className="page-footer">A quiet place for every story. <span>✳</span></footer>
        </div>
      </main>

      {modal && (
        <BookModal
          key={`${modal.type}-${modal.book?._id || "new"}`}
          modal={modal}
          onClose={() => setModal(null)}
          onSave={saveBook}
          onIssue={issueBook}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={17} /></span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </article>
  );
}

const coverTones = ["cover-olive", "cover-rust", "cover-blue", "cover-plum", "cover-gold", "cover-teal"];

function BookRow({ book, index, busy, onIssue, onReturn, onEdit, onDelete }) {
  const initials = book.title.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <tr>
      <td>
        <div className="book-cell">
          <div className={`book-cover ${coverTones[index % coverTones.length]}`}><span>{initials}</span><i /></div>
          <div className="book-info">
            <strong title={book.title}>{book.title}</strong>
            <span>{book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ""}</span>
          </div>
        </div>
      </td>
      <td><span className="genre-pill">{book.category || "General"}</span></td>
      <td><span className={`status-pill ${book.isAvailable ? "available" : "issued"}`}><i />{book.isAvailable ? "Available" : "On loan"}</span></td>
      <td className={book.issuedTo ? "reader-name" : "reader-empty"}>{book.issuedTo || "—"}</td>
      <td>
        <div className="row-actions">
          {book.isAvailable
            ? <button className="row-action checkout-action" onClick={onIssue} disabled={busy}>Check out</button>
            : <button className="row-action return-action" onClick={onReturn} disabled={busy}>{busy ? "Returning…" : "Return"}</button>}
          <button className="icon-button" onClick={onEdit} aria-label={`Edit ${book.title}`} title="Edit book"><Icon name="edit" size={16} /></button>
          <button className="icon-button delete-action" onClick={onDelete} aria-label={`Delete ${book.title}`} title="Delete book" disabled={busy}><Icon name="trash" size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

function BookModal({ modal, onClose, onSave, onIssue }) {
  const isIssue = modal.type === "issue";
  const isEdit = modal.type === "edit";
  const [values, setValues] = useState(isEdit ? {
    title: modal.book.title || "",
    author: modal.book.author || "",
    category: modal.book.category || "",
    isbn: modal.book.isbn || "",
    publishedYear: modal.book.publishedYear || "",
    description: modal.book.description || "",
  } : { title: "", author: "", category: "", isbn: "", publishedYear: "", description: "" });
  const [borrower, setBorrower] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isIssue) await onIssue(modal.book, borrower.trim());
      else await onSave({ ...values, publishedYear: values.publishedYear ? Number(values.publishedYear) : null });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div className="modal-icon"><Icon name={isIssue ? "bookmark" : isEdit ? "edit" : "book"} size={20} /></div>
          <div><h2 id="modal-title">{isIssue ? "Check out a book" : isEdit ? "Edit book details" : "Add to your shelves"}</h2><p>{isIssue ? "Who is taking this story home?" : isEdit ? "A few details about this title." : "Every great collection starts somewhere."}</p></div>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog"><Icon name="close" size={19} /></button>
        </div>
        <form onSubmit={submit} autoComplete="off">
          {isIssue ? (
            <div className="issue-book-note"><span className="tiny-cover"><Icon name="book" size={16} /></span><span><strong>{modal.book.title}</strong><small>by {modal.book.author}</small></span></div>
          ) : (
            <div className="form-grid">
              <label className="form-field full"><span>Book title <i>*</i></span><input autoFocus required maxLength="160" value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. The Midnight Library" /></label>
              <label className="form-field full"><span>Author <i>*</i></span><input required maxLength="120" value={values.author} onChange={(event) => update("author", event.target.value)} placeholder="e.g. Matt Haig" /></label>
              <label className="form-field"><span>Genre</span><input maxLength="60" value={values.category} onChange={(event) => update("category", event.target.value)} placeholder="Fiction" /></label>
              <label className="form-field"><span>Year published</span><input type="number" min="0" max="9999" value={values.publishedYear} onChange={(event) => update("publishedYear", event.target.value)} placeholder="2024" /></label>
              <label className="form-field full"><span>ISBN <small>Optional</small></span><input maxLength="30" value={values.isbn} onChange={(event) => update("isbn", event.target.value)} placeholder="978-…" /></label>
              <label className="form-field full"><span>A note about this book <small>Optional</small></span><textarea rows="3" maxLength="1000" value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="A little note for your records…" /></label>
            </div>
          )}
          {isIssue && <label className="form-field borrower-field"><span>Reader's name <i>*</i></span><input autoFocus required maxLength="120" value={borrower} onChange={(event) => setBorrower(event.target.value)} placeholder="Who is borrowing this book?" /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : isIssue ? "Confirm check out" : isEdit ? "Save changes" : "Add to collection"} {!saving && <Icon name="arrow" size={15} />}</button></div>
        </form>
      </section>
    </div>
  );
}

export default App;
