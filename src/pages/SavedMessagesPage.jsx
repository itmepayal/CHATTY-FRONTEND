import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  Search,
  Plus,
  Folder,
  Tag,
  ArrowUpRight,
  Trash2,
  Pin,
  MessageSquare,
  Users,
  StickyNote,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  Menu,
} from "lucide-react";
import { useSavedMessagesStore } from "../store/useSavedMessagesStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import { useSlidingSidebarStore } from "../store/useSlidingSidebarStore.js";
import { formatDistanceToNow, formatMessageTime } from "../utils/timeUtils.js";

const CATEGORY_COLORS = {
  Important: "bg-red-500/10 text-red-500 border-red-500/20",
  Work: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Personal: "bg-green-500/10 text-green-500 border-green-500/20",
  Ideas: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Links: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Documents: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Reminders: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Custom: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const SavedMessagesPage = () => {
  const navigate = useNavigate();
  const {
    savedMessages,
    meta,
    loading,
    total,
    selectedCategory,
    selectedFolder,
    selectedTag,
    searchQuery,
    filterChatType,
    setFilter,
    fetchSavedMessages,
    fetchMeta,
    unsaveMessage,
    updateSavedMessage,
    createNote,
  } = useSavedMessagesStore();

  const { setSelectedUser } = useChatStore();
  const { selectGroup } = useGroupStore();

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("Personal");
  const [newNoteFolder, setNewNoteFolder] = useState("Notes");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchMeta();
    fetchSavedMessages();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilter("searchQuery", searchInput);
  };

  const handleOpenInChat = (item) => {
    if (item.chatType === "direct" && item.peerId) {
      setSelectedUser(item.peerId);
      navigate("/chat");
    } else if (item.chatType === "group" && item.groupId) {
      selectGroup(item.groupId);
      navigate("/chat");
    }
  };

  const handleCreateNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    try {
      await createNote({
        note: newNoteText.trim(),
        category: newNoteCategory,
        folder: newNoteFolder.trim() || "Notes",
      });
      setNewNoteText("");
      setShowNoteModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-base-100/90 backdrop-blur-md border-b border-base-300 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/chat")}
              className="btn btn-sm btn-ghost btn-circle"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => useSlidingSidebarStore.getState().openMobile()}
              className="btn btn-sm btn-ghost btn-circle"
              title="Open Navigation Menu (Cmd+B)"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Saved Messages</h1>
                <p className="text-xs text-base-content/60">
                  {total} {total === 1 ? "item" : "items"} saved
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search saved messages & notes..."
                className="input input-sm input-bordered w-full pl-9 pr-3 rounded-full text-xs focus:input-primary"
              />
            </form>

            <button
              onClick={() => setShowNoteModal(true)}
              className="btn btn-sm btn-primary rounded-full gap-1.5 shadow-md shadow-primary/20 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> New Note
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col md:flex-row gap-6">
        {/* Left Filter Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          {/* Categories Filter */}
          <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300/80 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 px-1">
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setFilter("selectedCategory", "All")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  selectedCategory === "All"
                    ? "bg-primary text-primary-content font-bold shadow-sm"
                    : "hover:bg-base-200 text-base-content/80"
                }`}
              >
                <span>All Categories</span>
                <span className="badge badge-sm badge-ghost text-[10px]">{total}</span>
              </button>

              {(meta.categories || []).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setFilter("selectedCategory", cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? "bg-primary text-primary-content font-bold shadow-sm"
                      : "hover:bg-base-200 text-base-content/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        CATEGORY_COLORS[cat.name]?.split(" ")[0] || "bg-primary"
                      }`}
                    />
                    {cat.name}
                  </span>
                  <span className="text-[10px] opacity-70">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Folders Filter */}
          {meta.folders && meta.folders.length > 0 && (
            <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300/80 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 px-1 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" /> Folders
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter("selectedFolder", "All")}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedFolder === "All" ? "bg-base-300 font-bold" : "hover:bg-base-200/70 text-base-content/70"
                  }`}
                >
                  All Folders
                </button>
                {meta.folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter("selectedFolder", f)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors truncate ${
                      selectedFolder === f ? "bg-base-300 font-bold" : "hover:bg-base-200/70 text-base-content/70"
                    }`}
                  >
                    📁 {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags Filter */}
          {meta.tags && meta.tags.length > 0 && (
            <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300/80 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 px-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {meta.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter("selectedTag", selectedTag === t ? null : t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      selectedTag === t
                        ? "bg-primary text-primary-content border-primary"
                        : "bg-base-100 hover:bg-base-200 border-base-300 text-base-content/70"
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Feed Area */}
        <main className="flex-1 space-y-4">
          {/* Chat Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-base-200/60 p-1 rounded-xl border border-base-300/60 w-fit">
            {[
              { id: "all", label: "All Items" },
              { id: "direct", label: "Direct Chats" },
              { id: "group", label: "Groups" },
              { id: "note", label: "Personal Notes" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter("filterChatType", tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterChatType === tab.id
                    ? "bg-base-100 text-base-content font-bold shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading or Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-base-content/50 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Loading saved messages...</p>
            </div>
          ) : savedMessages.length === 0 ? (
            <div className="text-center py-20 px-4 bg-base-200/30 rounded-3xl border border-dashed border-base-300 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-base-content">No Saved Messages Found</h3>
              <p className="text-xs text-base-content/60 max-w-sm mx-auto">
                Save messages from your personal or group conversations to organize them with tags, folders, and private notes.
              </p>
              <button
                onClick={() => setShowNoteModal(true)}
                className="btn btn-sm btn-outline btn-primary rounded-full text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create a Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedMessages.map((item) => {
                const categoryClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Custom;
                const isNote = item.chatType === "note";
                const isGroupChat = item.chatType === "group";

                return (
                  <div
                    key={item._id}
                    className={`rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                      item.isPinned
                        ? "bg-base-100 border-primary/40 shadow-md shadow-primary/5 ring-1 ring-primary/20"
                        : "bg-base-100/90 border-base-300 hover:border-base-content/20 shadow-sm"
                    }`}
                  >
                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${categoryClass}`}
                        >
                          {item.category}
                        </span>
                        {item.folder && item.folder !== "General" && (
                          <span className="badge badge-sm badge-ghost text-[10px] gap-1 font-medium">
                            <Folder className="w-2.5 h-2.5" /> {item.folder}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-base-content/50">
                        <button
                          onClick={() => updateSavedMessage(item._id, { isPinned: !item.isPinned })}
                          title={item.isPinned ? "Unpin note" : "Pin note to top"}
                          className={`p-1 rounded-lg hover:bg-base-200 transition-colors ${
                            item.isPinned ? "text-primary font-bold" : "hover:text-base-content"
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => unsaveMessage(item._id)}
                          title="Remove saved item"
                          className="p-1 rounded-lg hover:bg-error/10 hover:text-error transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    {item.note && (
                      <div className="p-3 bg-amber-500/10 text-amber-900 dark:text-amber-100 rounded-xl border border-amber-500/20 text-xs font-medium whitespace-pre-wrap">
                        {item.note}
                      </div>
                    )}

                    {/* Original Message Preview (if not standalone note) */}
                    {!isNote && item.cachedPreview && (
                      <div className="p-2.5 bg-base-200/60 rounded-xl border border-base-300/60 text-xs text-base-content/80 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-base-content/50 font-semibold">
                          <span className="flex items-center gap-1">
                            {isGroupChat ? <Users className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {item.cachedPreview.senderName}
                          </span>
                          <span>{formatDistanceToNow(item.cachedPreview.createdAt)}</span>
                        </div>
                        <p className="line-clamp-2 italic text-base-content/70">
                          {item.cachedPreview.textSnippet || "Media attachment"}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-base-200 text-base-content/70"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer / Open in Chat Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-base-200/80 text-[11px] text-base-content/50">
                      <span>Saved {formatMessageTime(item.savedAt)}</span>

                      {!isNote && (
                        <button
                          onClick={() => handleOpenInChat(item)}
                          className="btn btn-xs btn-ghost gap-1 text-primary hover:bg-primary/10 font-bold"
                        >
                          Open in Chat <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* New Note Modal */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowNoteModal(false)}
        >
          <div
            className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">New Personal Note</h3>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 rounded-full hover:bg-base-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNoteSubmit} className="p-5 space-y-4">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write your note here..."
                rows={4}
                className="textarea textarea-bordered w-full text-sm rounded-xl focus:textarea-primary resize-none"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-base-content/60 uppercase">Category</label>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value)}
                    className="select select-sm select-bordered w-full text-xs rounded-lg"
                  >
                    {Object.keys(CATEGORY_COLORS).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-base-content/60 uppercase">Folder</label>
                  <input
                    type="text"
                    value={newNoteFolder}
                    onChange={(e) => setNewNoteFolder(e.target.value)}
                    placeholder="Folder name"
                    className="input input-sm input-bordered w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="btn btn-sm btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="btn btn-sm btn-primary text-xs"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedMessagesPage;
