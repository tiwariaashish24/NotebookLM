"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Check,
  CircleHelp,
  Compass,
  FileText,
  FolderKanban,
  Grid2X2,
  Layers3,
  List,
  LoaderCircle,
  LogIn,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { ApiError, apiRequest, beginGoogleSignIn } from "@/lib/api";

type Notebook = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: string;
  createdAt: string;
  updatedAt: string;
};

type Session = { user?: { name?: string | null; email?: string | null; image?: string | null } };
type Screen = "all" | "discover" | "collections";

const featured = [
  {
    title: "A quieter kind of productivity",
    author: "Studio notes",
    sources: 12,
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85",
    icon: FileText,
    description: "A thoughtful collection on focus, routines, and creative work.",
  },
  {
    title: "The living city",
    author: "Field research",
    sources: 8,
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    icon: Compass,
    description: "Urban ecology, public space, and the future of where we live.",
  },
  {
    title: "Small worlds, close up",
    author: "Open study group",
    sources: 16,
    image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=900&q=85",
    icon: Layers3,
    description: "A visual introduction to fungi, forests, and hidden networks.",
  },
  {
    title: "Signals from the deep",
    author: "Research desk",
    sources: 6,
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=85",
    icon: Sparkles,
    description: "A guided reading list on space, observation, and discovery.",
  },
  {
    title: "The shape of a story",
    author: "Reading room",
    sources: 11,
    image: "https://images.unsplash.com/photo-1455390582262-044cdea277a8?auto=format&fit=crop&w=900&q=85",
    icon: BookOpenText,
    description: "Narrative craft, character, and the notes behind good writing.",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function HomeDashboard() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("all");
  const [query, setQuery] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "signed-out" | "offline">("loading");
  const [loadError, setLoadError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, startCreating] = useTransition();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const currentSession = await apiRequest<Session | null>("/api/auth/get-session");
        if (cancelled) return;
        if (!currentSession?.user) {
          setLoadState("signed-out");
          return;
        }
        setSession(currentSession);
        const items = await apiRequest<Notebook[]>("/api/workspaces");
        if (!cancelled) {
          setNotebooks(items);
          setLoadState("ready");
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setLoadState("signed-out");
        } else {
          setLoadError(error instanceof Error ? error.message : "Could not reach the notebook server.");
          setLoadState("offline");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const matchesQuery = (value: string) => value.toLowerCase().includes(query.trim().toLowerCase());
  const visibleNotebooks = notebooks.filter((notebook) => matchesQuery(`${notebook.title} ${notebook.description ?? ""}`));
  const visibleFeatured = featured.filter((item) => matchesQuery(`${item.title} ${item.author} ${item.description}`));

  function createNotebook(title: string, description = "") {
    startCreating(async () => {
      try {
        const notebook = await apiRequest<Notebook>("/api/workspaces", {
          method: "POST",
          body: JSON.stringify({ title, description, icon: "BOOK", defaultModel: "gpt-4o-mini" }),
        });
        router.push(`/notebooks/${notebook.id}`);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not create this notebook.");
        setShowCreate(false);
      }
    });
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setAuthError("");
    try {
      await beginGoogleSignIn();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign-in failed.");
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await apiRequest<void>("/api/auth/sign-out", { method: "POST" });
      setSession(null);
      setLoadState("signed-out");
      setShowAccountMenu(false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  if (loadState === "loading") {
    return <div className="app-loading"><LoaderCircle className="spin" size={22} /><span>Opening your library</span></div>;
  }

  if (loadState === "signed-out") {
    return (
      <main className="auth-screen">
        <div className="auth-panel">
          <div className="brand-lockup"><span className="brand-mark"><BookOpenText size={19} /></span><span>notebook</span></div>
          <div className="auth-copy">
            <span className="eyebrow"><Sparkles size={14} /> YOUR RESEARCH, IN ONE PLACE</span>
            <h1>Make sense of what you&apos;re learning.</h1>
            <p>Bring your sources together, ask better questions, and turn reading into understanding.</p>
            <button className="google-button" onClick={handleGoogleSignIn} disabled={signingIn}>
              {signingIn ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
              Continue with Google
              <ArrowRight size={16} />
            </button>
            {authError && <p className="inline-error">{authError}</p>}
          </div>
          <span className="auth-footnote">A quieter place for curious minds.</span>
        </div>
        <div className="auth-art" aria-label="A sunlit desk with an open notebook" />
      </main>
    );
  }

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="home-screen">
      <header className="topbar">
        <Link href="/" className="brand-lockup" aria-label="Notebook home">
          <span className="brand-mark"><BookOpenText size={19} strokeWidth={2.2} /></span>
          <span>notebook</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={screen === "all" ? "nav-tab active" : "nav-tab"} onClick={() => setScreen("all")}><Grid2X2 size={15} /> All</button>
          <button className={screen === "discover" ? "nav-tab active" : "nav-tab"} onClick={() => setScreen("discover")}><Compass size={15} /> Discover</button>
          <button className={screen === "collections" ? "nav-tab active" : "nav-tab"} onClick={() => setScreen("collections")}><FolderKanban size={15} /> Collections</button>
        </nav>
        <div className="topbar-actions">
          <label className="search-box">
            <Search size={16} />
            <input aria-label="Search notebooks" placeholder="Search notebooks" value={query} onChange={(event) => setQuery(event.target.value)} />
            {query && <button className="icon-button clear-search" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <button className={view === "grid" ? "icon-button selected" : "icon-button"} aria-label="Grid view" title="Grid view" onClick={() => setView("grid")}><Grid2X2 size={17} /></button>
          <button className={view === "list" ? "icon-button selected" : "icon-button"} aria-label="List view" title="List view" onClick={() => setView("list")}><List size={18} /></button>
          <button className="icon-button settings-button" aria-label="Library settings" title="Library settings" aria-expanded={showAccountMenu} onClick={() => setShowAccountMenu((open) => !open)}><Settings2 size={18} /></button>
          <button className="avatar-button" aria-label="Account menu" title={session?.user?.email ?? "Your account"} aria-expanded={showAccountMenu} onClick={() => setShowAccountMenu((open) => !open)}>{name.slice(0, 1).toUpperCase()}</button>
          {showAccountMenu && <div className="account-menu"><span className="account-name">{session?.user?.name ?? "Your account"}</span><span className="account-email">{session?.user?.email ?? "Signed in with Google"}</span><div className="account-menu-divider" /><button onClick={() => { setView("grid"); setShowAccountMenu(false); }}><Grid2X2 size={15} /> Grid view {view === "grid" && <Check size={14} />}</button><button onClick={() => { setView("list"); setShowAccountMenu(false); }}><List size={15} /> List view {view === "list" && <Check size={14} />}</button><div className="account-menu-divider" /><button onClick={() => void handleSignOut()}><LogIn size={15} /> Sign out</button></div>}
        </div>
      </header>

      <div className="home-scroll">
        {loadState === "offline" && <div className="status-banner"><CircleHelp size={17} /><span>{loadError || "The notebook server is unavailable."} Check that the API is running on port 8081.</span><button onClick={() => window.location.reload()}>Retry</button></div>}
        {loadError && loadState === "ready" && <div className="status-banner error-banner"><CircleHelp size={17} /><span>{loadError}</span><button onClick={() => setLoadError("")}>Dismiss</button></div>}

        {screen !== "collections" && (
          <section className="home-section featured-section">
            <div className="section-heading">
              <div><span className="eyebrow">A PLACE TO BEGIN</span><h1>Featured notebooks</h1></div>
              <button className="text-action" onClick={() => setScreen("discover")}>Explore all <ArrowRight size={15} /></button>
            </div>
            <div className="featured-row">
              {visibleFeatured.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button className={`featured-card featured-card-${index + 1}`} key={item.title} style={{ backgroundImage: `linear-gradient(180deg, rgba(12, 14, 15, .08) 5%, rgba(12, 14, 15, .12) 34%, rgba(12, 14, 15, .88) 100%), url("${item.image}")` }} onClick={() => createNotebook(item.title, item.description)} disabled={creating}>
                    <div className="featured-meta"><span className="featured-author"><span className="author-avatar"><Icon size={14} /></span>{item.author}</span><MoreHorizontal size={19} /></div>
                    <div className="featured-card-copy"><span className="source-count">{item.sources} sources <span>·</span> Notebook</span><span className="featured-title">{item.title}</span><span className="featured-open"><ArrowRight size={15} /></span></div>
                  </button>
                );
              })}
              {!visibleFeatured.length && <p className="empty-inline">No featured notebooks match that search.</p>}
            </div>
          </section>
        )}

        {screen === "collections" ? (
          <section className="home-section collection-section">
            <div className="section-heading">
              <div><span className="eyebrow">YOUR LIBRARY</span><h1>Collections</h1></div>
              <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New notebook</button>
            </div>
            <div className="collection-list">
              <div className="collection-row"><span className="collection-icon collection-blue"><BookOpen size={19} /></span><div><h2>All notebooks</h2><p>Everything you&apos;ve saved in one place</p></div><span className="collection-count">{visibleNotebooks.length}</span><ArrowRight size={16} /></div>
              <div className="collection-row"><span className="collection-icon collection-coral"><Sparkles size={19} /></span><div><h2>Recently opened</h2><p>Your latest research, ready to pick up</p></div><span className="collection-count">{visibleNotebooks.slice(0, 5).length}</span><ArrowRight size={16} /></div>
            </div>
            <NotebookGrid notebooks={visibleNotebooks.slice(0, 6)} view={view} onCreate={() => setShowCreate(true)} />
          </section>
        ) : (
          <section className="home-section recent-section">
            <div className="section-heading recent-heading">
              <div><span className="eyebrow">YOUR LIBRARY</span><h2>{screen === "discover" ? "Your discoveries" : "Recent notebooks"}</h2></div>
              <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New notebook</button>
            </div>
            {screen === "discover" && <p className="section-intro">Start with a question, a reading list, or a collection of sources you already trust.</p>}
            {visibleNotebooks.length ? <NotebookGrid notebooks={visibleNotebooks} view={view} onCreate={() => setShowCreate(true)} /> : (
              <button className="empty-library" onClick={() => setShowCreate(true)}>
                <span className="empty-icon"><BookOpenText size={24} /></span><span className="empty-title">Your next idea starts here</span><span className="empty-copy">Create a notebook to gather sources and explore a subject.</span><span className="empty-cta"><Plus size={15} /> Create notebook</span>
              </button>
            )}
          </section>
        )}
        <footer className="home-footer"><span>Notebook</span><span>Think with your sources.</span><button><CircleHelp size={15} /> Help</button></footer>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <form className="create-modal" onSubmit={(event) => { event.preventDefault(); if (newTitle.trim()) createNotebook(newTitle.trim(), newDescription.trim()); }}>
            <div className="modal-head"><span className="modal-icon"><BookOpenText size={19} /></span><button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button></div>
            <span className="eyebrow">START A NEW STUDY</span><h2>Create a notebook</h2><p>Give your research a home. You can add sources whenever you&apos;re ready.</p>
            <label className="field-label" htmlFor="notebook-title">Notebook name</label>
            <input id="notebook-title" className="text-field" autoFocus maxLength={120} placeholder="e.g. The science of sleep" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required />
            <label className="field-label" htmlFor="notebook-description">What are you exploring? <span>Optional</span></label>
            <textarea id="notebook-description" className="text-field description-field" maxLength={500} placeholder="Add a little context for this notebook" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
            <button className="primary-button modal-submit" type="submit" disabled={creating || !newTitle.trim()}>{creating ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Create notebook</button>
          </form>
        </div>
      )}
    </main>
  );
}

function NotebookGrid({ notebooks, view, onCreate }: { notebooks: Notebook[]; view: "grid" | "list"; onCreate: () => void }) {
  if (!notebooks.length) {
    return <div className="no-results"><Search size={20} /><span>No notebooks found</span><small>Try another title or clear your search.</small></div>;
  }
  return (
    <div className={view === "grid" ? "notebook-grid" : "notebook-grid list-view"}>
      {notebooks.map((notebook, index) => (
        <Link className="notebook-card" href={`/notebooks/${notebook.id}`} key={notebook.id}>
          <span className={`notebook-cover cover-${index % 5}`}><BookOpenText size={22} strokeWidth={1.7} /><span className="cover-spark"><Sparkles size={15} /></span></span>
          <span className="notebook-card-menu"><MoreHorizontal size={19} /></span>
          <span className="notebook-card-title">{notebook.title}</span>
          {notebook.description && <span className="notebook-card-description">{notebook.description}</span>}
          <span className="notebook-card-date">Updated {formatDate(notebook.updatedAt)}</span>
          <span className="notebook-card-open"><ArrowRight size={15} /></span>
        </Link>
      ))}
      <button className="create-tile" onClick={onCreate}><span><Plus size={21} /></span><strong>New notebook</strong><small>Begin a new line of thought</small></button>
    </div>
  );
}
