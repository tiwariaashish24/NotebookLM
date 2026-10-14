"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpenText,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  File,
  FileText,
  Globe2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Quote,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_URL, ApiError, apiRequest, beginGoogleSignIn } from "@/lib/api";

type Notebook = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: string;
};
type Source = {
  id: string;
  title: string;
  type: "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  url: string | null;
  content: string | null;
  createdAt: string;
};
type Artifact = {
  id: string;
  type: string;
  title: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  content: unknown;
  createdAt: string;
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ sourceId?: string; sourceTitle?: string; excerpt?: string }>;
};
type Conversation = { id: string; title: string | null; updatedAt: string };
type ModalMode = "WEBSITE" | "YOUTUBE" | "TEXT" | "PDF";

const artifactOptions = [
  { type: "SUMMARY", title: "Briefing doc", detail: "A clear overview of your sources", icon: FileText },
  { type: "TAKEAWAYS", title: "Study guide", detail: "Key ideas to remember", icon: ClipboardList },
  { type: "FLASHCARDS", title: "Flashcards", detail: "Practice active recall", icon: StickyNote },
  { type: "QUIZ", title: "Quiz", detail: "Check what you understand", icon: Check },
  { type: "MINDMAP", title: "Mind map", detail: "See how the main ideas connect", icon: Sparkles },
  { type: "REPORT", title: "Research report", detail: "Build a structured overview", icon: FileText },
];

function sourceIcon(type: Source["type"]) {
  if (type === "WEBSITE") return Globe2;
  if (type === "YOUTUBE") return Video;
  if (type === "PDF") return File;
  return StickyNote;
}

function readableType(type: string) {
  return type.replaceAll("_", " ").toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

export default function NotebookWorkspace({ workspaceId }: { workspaceId: string }) {
  const [workspace, setWorkspace] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceMode, setSourceMode] = useState<ModalMode>("WEBSITE");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [addingSource, setAddingSource] = useState(false);
  const [creatingArtifact, setCreatingArtifact] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"sources" | "studio" | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  async function refreshSources() {
    const list = await apiRequest<Source[]>(`/api/workspaces/${workspaceId}/sources`);
    setSources(list);
  }

  async function refreshArtifacts() {
    const list = await apiRequest<Artifact[]>(`/api/workspaces/${workspaceId}/artifacts`);
    setArtifacts(list);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [notebook, sourceList, artifactList, conversationList] = await Promise.all([
          apiRequest<Notebook>(`/api/workspaces/${workspaceId}`),
          apiRequest<Source[]>(`/api/workspaces/${workspaceId}/sources`),
          apiRequest<Artifact[]>(`/api/workspaces/${workspaceId}/artifacts`),
          apiRequest<Conversation[]>(`/api/workspaces/${workspaceId}/conversations`),
        ]);
        if (cancelled) return;
        setWorkspace(notebook);
        setSources(sourceList);
        setArtifacts(artifactList);
        setConversations(conversationList);
        setModel(notebook.defaultModel || "gpt-4o-mini");
        if (conversationList[0]) {
          setConversationId(conversationList[0].id);
          const history = await apiRequest<Array<{ id: string; role: string; content: string; citations?: ChatMessage["citations"] }>>(
            `/api/workspaces/${workspaceId}/conversations/${conversationList[0].id}/messages`,
          );
          if (!cancelled) {
            setMessages(history.map((message) => ({
              id: message.id,
              role: message.role.toLowerCase() === "user" ? "user" : "assistant",
              content: message.content,
              citations: message.citations,
            })));
          }
        }
        if (!cancelled) setLoadState("ready");
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof ApiError && loadError.status === 401) setLoadState("signed-out");
        else {
          setError(loadError instanceof Error ? loadError.message : "Could not load this notebook.");
          setLoadState("error");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    if (!artifacts.some((artifact) => artifact.status === "PENDING" || artifact.status === "PROCESSING")) return;
    const timer = window.setInterval(() => {
      void apiRequest<Artifact[]>(`/api/workspaces/${workspaceId}/artifacts`).then(setArtifacts).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [artifacts, workspaceId]);

  useEffect(() => {
    if (!sources.some((source) => source.status === "PENDING" || source.status === "PROCESSING")) return;
    const timer = window.setInterval(() => {
      void apiRequest<Source[]>(`/api/workspaces/${workspaceId}/sources`).then(setSources).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [sources, workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function beginNewChat() {
    setConversationId(undefined);
    setMessages([]);
    setActiveSource(null);
    setMobilePanel(null);
  }

  async function openConversation(id: string) {
    setConversationId(id);
    setActiveSource(null);
    setError("");
    try {
      const history = await apiRequest<Array<{ id: string; role: string; content: string; citations?: ChatMessage["citations"] }>>(
        `/api/workspaces/${workspaceId}/conversations/${id}/messages`,
      );
      setMessages(history.map((message) => ({
        id: message.id,
        role: message.role.toLowerCase() === "user" ? "user" : "assistant",
        content: message.content,
        citations: message.citations,
      })));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Could not load this conversation.");
    }
  }

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;
    setPrompt("");
    setSending(true);
    setError("");
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantMessage]);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          model,
          webSearch,
          messages: nextMessages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text", text: message.content }],
          })),
        }),
      });
      if (!response.ok) {
        let reason = `Chat request failed (${response.status})`;
        try {
          const body = (await response.json()) as { message?: string; error?: string };
          reason = body.message ?? body.error ?? reason;
        } catch { /* Use the HTTP status when the body is not JSON. */ }
        throw new Error(reason);
      }
      const resolvedConversation = response.headers.get("X-Conversation-Id") ?? conversationId;
      if (resolvedConversation) setConversationId(resolvedConversation);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The chat response did not include a readable stream.");
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const data = block.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data || data === "[DONE]") continue;
          try {
            const part = JSON.parse(data) as { type?: string; delta?: string; text?: string; errorText?: string };
            if (part.type === "text-delta") {
              answer += part.delta ?? part.text ?? "";
              setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: answer } : message));
            } else if (part.type === "error") {
              throw new Error(part.errorText ?? "The model could not complete this response.");
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input" && !parseError.message.includes("JSON")) throw parseError;
          }
        }
      }
      if (resolvedConversation) {
        setConversationId(resolvedConversation);
        const [history, updatedConversations] = await Promise.all([
          apiRequest<Array<{ id: string; role: string; content: string; citations?: ChatMessage["citations"] }>>(
            `/api/workspaces/${workspaceId}/conversations/${resolvedConversation}/messages`,
          ),
          apiRequest<Conversation[]>(`/api/workspaces/${workspaceId}/conversations`),
        ]);
        setMessages(history.map((message) => ({
          id: message.id,
          role: message.role.toLowerCase() === "user" ? "user" : "assistant",
          content: message.content,
          citations: message.citations,
        })));
        setConversations(updatedConversations);
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Your message could not be sent.");
      setMessages((current) => current.filter((message) => message.id !== assistantMessage.id));
      setPrompt(text);
    } finally {
      setSending(false);
      promptRef.current?.focus();
    }
  }

  async function addSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddingSource(true);
    setError("");
    try {
      const base = `/api/workspaces/${workspaceId}/sources`;
      if (sourceMode === "PDF") {
        if (!sourceFile) throw new Error("Choose a PDF to upload.");
        const form = new FormData();
        form.set("file", sourceFile);
        if (sourceTitle.trim()) form.set("title", sourceTitle.trim());
        await apiRequest<Source>(`${base}/upload`, { method: "POST", body: form });
      } else if (sourceMode === "TEXT") {
        await apiRequest<Source>(base, {
          method: "POST",
          body: JSON.stringify({ type: "TEXT", title: sourceTitle.trim(), content: sourceContent.trim() }),
        });
      } else {
        await apiRequest<Source>(`${base}/import/${sourceMode === "YOUTUBE" ? "youtube" : "website"}`, {
          method: "POST",
          body: JSON.stringify({ url: sourceUrl.trim(), title: sourceTitle.trim() || undefined }),
        });
      }
      await refreshSources();
      setShowSourceModal(false);
      setSourceTitle("");
      setSourceUrl("");
      setSourceContent("");
      setSourceFile(null);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add this source.");
    } finally {
      setAddingSource(false);
    }
  }

  async function deleteSource(source: Source) {
    if (!window.confirm(`Remove “${source.title}” from this notebook?`)) return;
    try {
      await apiRequest<void>(`/api/workspaces/${workspaceId}/sources/${source.id}`, { method: "DELETE" });
      setSources((current) => current.filter((item) => item.id !== source.id));
      if (activeSource?.id === source.id) setActiveSource(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove source.");
    }
  }

  async function createArtifact(type: string) {
    setCreatingArtifact(type);
    setError("");
    try {
      const artifact = await apiRequest<Artifact>(`/api/workspaces/${workspaceId}/artifacts`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      setArtifacts((current) => [artifact, ...current]);
      void refreshArtifacts().catch(() => undefined);
    } catch (artifactError) {
      setError(artifactError instanceof Error ? artifactError.message : "Could not create this study tool.");
    } finally {
      setCreatingArtifact(null);
    }
  }

  async function deleteArtifact(artifact: Artifact) {
    try {
      await apiRequest<void>(`/api/workspaces/${workspaceId}/artifacts/${artifact.id}`, { method: "DELETE" });
      setArtifacts((current) => current.filter((item) => item.id !== artifact.id));
      setActiveArtifact(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove this artifact.");
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    try { await beginGoogleSignIn(); }
    catch (signInError) { setError(signInError instanceof Error ? signInError.message : "Sign-in failed."); setSigningIn(false); }
  }

  if (loadState === "loading") return <div className="app-loading"><LoaderCircle className="spin" size={22} /><span>Opening your notebook</span></div>;
  if (loadState === "signed-out") {
    return <main className="workspace-gate"><span className="brand-mark"><BookOpenText size={19} /></span><h1>Sign in to open this notebook</h1><p>Your notebooks are private and only visible to you.</p><button className="primary-button" onClick={handleSignIn}>{signingIn ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />} Continue with Google</button>{error && <p className="inline-error">{error}</p>}</main>;
  }
  if (loadState === "error" || !workspace) {
    return <main className="workspace-gate"><span className="brand-mark"><BookOpenText size={19} /></span><h1>Notebook unavailable</h1><p>{error || "This notebook could not be opened."}</p><Link className="text-action" href="/">Back to your library <ArrowRight size={15} /></Link></main>;
  }

  const readyCount = sources.filter((source) => source.status === "READY").length;
  const hasReadySources = readyCount > 0;

  return (
    <main className="workspace-screen">
      <header className="workspace-topbar">
        <div className="workspace-brand-area"><Link href="/" className="brand-lockup" aria-label="Back to home"><span className="brand-mark"><BookOpenText size={18} /></span><span className="brand-word">notebook</span></Link><span className="topbar-divider" /><Link href="/" className="back-library"><ArrowLeft size={15} /> Library</Link></div>
        <div className="workspace-title-area"><span className="workspace-glyph"><BookOpenText size={16} /></span><div><h1>{workspace.title}</h1><span>{sources.length} {sources.length === 1 ? "source" : "sources"} <span className="status-dot" /> Saved</span></div><button className="icon-button workspace-more" aria-label="Notebook options" title="Notebook options"><MoreHorizontal size={18} /></button></div>
        <div className="workspace-top-actions"><button className="mobile-panel-button" onClick={() => setMobilePanel(mobilePanel === "sources" ? null : "sources")}><FileText size={16} /> Sources</button><button className="mobile-panel-button" onClick={() => setMobilePanel(mobilePanel === "studio" ? null : "studio")}><Sparkles size={16} /> Studio</button><button className="top-help" title="Help" aria-label="Help"><CircleHelp size={18} /></button></div>
      </header>

      <div className="workspace-layout">
        <aside className={`sources-panel ${mobilePanel === "sources" ? "mobile-open" : ""}`}>
          <div className="panel-heading"><div><span className="eyebrow">YOUR MATERIAL</span><h2>Sources <span>{sources.length}</span></h2></div><button className="icon-button" onClick={() => setShowSourceModal(true)} aria-label="Add source" title="Add source"><Plus size={18} /></button></div>
          <button className="add-source-button" onClick={() => setShowSourceModal(true)}><Plus size={16} /> Add sources</button>
          <div className="source-list">
            {sources.map((source) => {
              const Icon = sourceIcon(source.type);
              return <div className={activeSource?.id === source.id ? "source-item active" : "source-item"} key={source.id}>
                <button className="source-main" onClick={() => setActiveSource(activeSource?.id === source.id ? null : source)}><span className={`source-file-icon source-${source.type.toLowerCase()}`}><Icon size={16} /></span><span className="source-copy"><strong>{source.title}</strong><span>{readableType(source.type)} <i className={`source-state state-${source.status.toLowerCase()}`} /> {readableType(source.status)}</span></span></button>
                <button className="source-delete" onClick={() => void deleteSource(source)} aria-label={`Remove ${source.title}`} title="Remove source"><Trash2 size={14} /></button>
              </div>;
            })}
            {!sources.length && <div className="sources-empty"><span className="sources-empty-icon"><FileText size={21} /></span><strong>No sources yet</strong><span>Add a PDF, web page, video, or your own notes.</span><button onClick={() => setShowSourceModal(true)}>Add your first source <ArrowRight size={14} /></button></div>}
          </div>
          <div className="source-footnote"><span className="status-dot" /> {readyCount} sources ready for chat</div>
        </aside>

        <section className="chat-panel">
          <div className="chat-toolbar"><div className="chat-toolbar-left"><span className="eyebrow">NOTEBOOK GUIDE</span><span className="chat-context">{hasReadySources ? `Grounded in ${readyCount} ready ${readyCount === 1 ? "source" : "sources"}` : "Add sources to begin a grounded conversation"}</span></div><div className="chat-toolbar-actions">{conversations.length > 0 && <label className="conversation-picker"><span className="sr-only">Conversation history</span><select value={conversationId ?? ""} onChange={(event) => { if (event.target.value) void openConversation(event.target.value); }} aria-label="Conversation history"><option value="" disabled>History · {conversations.length}</option>{conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title || "New conversation"}</option>)}</select><ChevronDown size={13} /></label>}<button className="new-chat-button" onClick={beginNewChat}><Plus size={15} /> New chat</button></div></div>
          {activeSource ? (
            <div className="source-preview"><div className="source-preview-head"><span className="source-file-icon source-preview-icon"><FileText size={17} /></span><div><span className="eyebrow">SOURCE PREVIEW</span><h2>{activeSource.title}</h2></div><button className="icon-button" onClick={() => setActiveSource(null)} aria-label="Close source preview"><X size={17} /></button></div><div className="source-preview-body">{activeSource.url && <a href={activeSource.url} target="_blank" rel="noreferrer">{activeSource.url} <ArrowRight size={14} /></a>}{activeSource.content ? <p>{activeSource.content}</p> : <p>This source is {activeSource.status.toLowerCase()}. Its extracted text will appear here when processing is complete.</p>}</div></div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome"><div className="welcome-orbit"><span className="welcome-orbit-inner"><Sparkles size={24} /></span><span className="orbit-dot orbit-dot-one" /><span className="orbit-dot orbit-dot-two" /><span className="orbit-dot orbit-dot-three" /></div><span className="eyebrow">A STUDY PARTNER THAT KNOWS YOUR SOURCES</span><h2>{hasReadySources ? "What would you like to understand?" : "Start with the material."}</h2><p>{hasReadySources ? "Ask a question, find a connection, or get a clear explanation grounded in your sources." : "Add a few sources on the left. Your notebook guide will use them as the foundation for every answer."}</p><div className="suggestion-row">{(hasReadySources ? ["Summarize the main ideas", "What should I pay attention to?", "Find connections across sources"] : ["Add a research paper", "Import a web page", "Paste in your notes"]).map((suggestion) => <button key={suggestion} onClick={() => { if (hasReadySources) { setPrompt(suggestion); promptRef.current?.focus(); } else { setShowSourceModal(true); } }}>{suggestion}<ArrowRight size={14} /></button>)}</div></div>
          ) : (
            <div className="message-list">
              {messages.map((message) => <article className={`chat-message message-${message.role}`} key={message.id}><span className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : "user-avatar"}`}>{message.role === "assistant" ? <Sparkles size={15} /> : "Y"}</span><div className="message-body"><span className="message-label">{message.role === "assistant" ? "NOTEBOOK GUIDE" : "YOU"}</span><p>{message.content || (sending && message.role === "assistant" ? <span className="typing-indicator"><i /><i /><i /></span> : "")}</p>{message.citations?.length ? <div className="citation-row"><span><Quote size={13} /> Sources</span>{message.citations.map((citation, index) => <button key={`${citation.sourceId}-${index}`} onClick={() => { const cited = sources.find((source) => source.id === citation.sourceId); if (cited) setActiveSource(cited); }}>[{index + 1}] {citation.sourceTitle ?? "Source"}</button>)}</div> : null}</div></article>)}
              <div ref={bottomRef} />
            </div>
          )}
          {error && <div className="chat-error"><CircleHelp size={15} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
          <form className="composer-wrap" onSubmit={sendMessage}>
            <div className="composer-box"><textarea ref={promptRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={hasReadySources ? "Ask a question about your sources" : "Add a source before asking your guide"} disabled={!hasReadySources || sending} rows={1} aria-label="Ask your notebook guide" /><div className="composer-controls"><div className="composer-options"><label className="model-select"><span className="sr-only">Model</span><select value={model} onChange={(event) => setModel(event.target.value)} aria-label="AI model"><option value="gpt-4o-mini">Fast</option><option value="gpt-4o">Deep</option><option value="gpt-5">Advanced</option></select><ChevronDown size={13} /></label><label className={webSearch ? "web-toggle enabled" : "web-toggle"}><input type="checkbox" checked={webSearch} onChange={(event) => setWebSearch(event.target.checked)} /><Globe2 size={14} /><span>Web search</span></label></div><button className="send-button" type="submit" disabled={!prompt.trim() || sending || !hasReadySources} aria-label="Send message">{sending ? <LoaderCircle className="spin" size={17} /> : <Send size={16} />}</button></div></div>
            <span className="composer-caption">Notebook Guide can make mistakes. Check important details against your sources.</span>
          </form>
        </section>

        <aside className={`studio-panel ${mobilePanel === "studio" ? "mobile-open" : ""}`}>
          <div className="studio-heading"><div><span className="eyebrow">TURN READING INTO LEARNING</span><h2>Studio <Sparkles size={15} /></h2></div><button className="icon-button studio-menu" aria-label="Studio options"><MoreHorizontal size={18} /></button></div>
          <div className="studio-tools">
            <h3>Make something</h3>
            {artifactOptions.map((option) => {
              const Icon = option.icon;
              return <button className="studio-tool" key={option.type} onClick={() => void createArtifact(option.type)} disabled={!hasReadySources || creatingArtifact !== null}>
                <span className={`studio-tool-icon tool-${option.type.toLowerCase()}`}><Icon size={17} /></span><span><strong>{option.title}</strong><small>{option.detail}</small></span>{creatingArtifact === option.type ? <LoaderCircle className="spin tool-trailing" size={15} /> : <ArrowRight className="tool-trailing" size={15} />}
              </button>;
            })}
            {!hasReadySources && <span className="studio-hint">Ready sources will unlock your study tools.</span>}
          </div>
          <div className="studio-divider" />
          <div className="artifact-library"><div className="artifact-library-head"><h3>Recent studio</h3><span>{artifacts.length}</span></div>
            {artifacts.length ? artifacts.map((artifact) => <button className="artifact-item" key={artifact.id} onClick={() => setActiveArtifact(artifact)}><span className={`artifact-symbol artifact-${artifact.status.toLowerCase()}`}>{artifact.status === "READY" ? <Check size={14} /> : artifact.status === "FAILED" ? <X size={14} /> : <LoaderCircle className="spin" size={14} />}</span><span><strong>{artifact.title}</strong><small>{readableType(artifact.type)} · {readableType(artifact.status)}</small></span><ArrowRight size={14} /></button>) : <div className="artifact-empty"><AudioLines size={18} /><span>Your guides, summaries, and study tools will show up here.</span></div>}
          </div>
          <div className="studio-bottom-note"><span className="studio-note-icon"><Sparkles size={14} /></span><span>Made from your sources, for your study.</span></div>
        </aside>
      </div>

      {showSourceModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSourceModal(false); }}><form className="source-modal" onSubmit={addSource}>
        <div className="modal-head"><span className="modal-icon"><Plus size={19} /></span><button type="button" className="icon-button" onClick={() => setShowSourceModal(false)} aria-label="Close"><X size={18} /></button></div><span className="eyebrow">BUILD YOUR REFERENCE LIBRARY</span><h2>Add sources</h2><p>Notebook Guide uses these materials to answer your questions.</p>
        <div className="source-mode-tabs" role="tablist" aria-label="Source type">{([{ key: "WEBSITE", label: "Website", icon: Globe2 }, { key: "YOUTUBE", label: "YouTube", icon: Video }, { key: "PDF", label: "PDF", icon: Upload }, { key: "TEXT", label: "Text", icon: StickyNote }] as const).map(({ key, label, icon: Icon }) => <button type="button" role="tab" aria-selected={sourceMode === key} className={sourceMode === key ? "source-mode active" : "source-mode"} key={key} onClick={() => setSourceMode(key)}><Icon size={15} />{label}</button>)}</div>
        {sourceMode === "PDF" ? <label className="upload-drop"><Upload size={21} /><strong>{sourceFile?.name ?? "Choose a PDF to upload"}</strong><span>PDF files up to 10 MB</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)} required /></label> : sourceMode === "TEXT" ? <><label className="field-label" htmlFor="source-title">Title</label><input id="source-title" className="text-field" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} maxLength={200} placeholder="Notes from today's reading" required /><label className="field-label" htmlFor="source-content">Your text</label><textarea id="source-content" className="text-field source-content-field" value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} placeholder="Paste notes, an excerpt, or your own research..." required /></> : <><label className="field-label" htmlFor="source-url">{sourceMode === "YOUTUBE" ? "YouTube link" : "Web address"}</label><input id="source-url" className="text-field" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={sourceMode === "YOUTUBE" ? "https://youtube.com/watch?v=..." : "https://example.com/article"} required /><label className="field-label" htmlFor="source-title">Display name <span>Optional</span></label><input id="source-title" className="text-field" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} maxLength={200} placeholder="Use page title" /></>}
        <button className="primary-button modal-submit" type="submit" disabled={addingSource || (sourceMode === "PDF" && !sourceFile)}>{addingSource ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Add source</button>
      </form></div>}

      {activeArtifact && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveArtifact(null); }}><div className="artifact-modal"><div className="modal-head"><span className="modal-icon"><Sparkles size={19} /></span><button className="icon-button" onClick={() => setActiveArtifact(null)} aria-label="Close"><X size={18} /></button></div><span className="eyebrow">{readableType(activeArtifact.type)} · {readableType(activeArtifact.status)}</span><h2>{activeArtifact.title}</h2>{activeArtifact.status === "READY" ? <pre className="artifact-content">{typeof activeArtifact.content === "string" ? activeArtifact.content : JSON.stringify(activeArtifact.content, null, 2)}</pre> : <div className="artifact-pending"><LoaderCircle className="spin" size={19} /><span>{activeArtifact.status === "FAILED" ? "This study tool could not be generated." : "Your study tool is being prepared."}</span></div>}<button className="danger-action" onClick={() => void deleteArtifact(activeArtifact)}><Trash2 size={15} /> Remove study tool</button></div></div>}
    </main>
  );
}
