import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useDragControls,
} from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useContactStore } from "../../store/useContactStore";

/* ---------- constants ---------- */
const MIN_CHARS = 2; // backend bhi yehi check karta hai
const DEBOUNCE_MS = 350;
const FALLBACK_AVATAR = "/avatar.png";
const SPRING = { type: "spring", stiffness: 500, damping: 38 };

const TABS = [
  { key: "find", label: "Find people" },
  { key: "contacts", label: "My contacts" },
];

const FOCUSABLE =
  'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/* ---------- helpers ---------- */
const avatarSrc = (a) =>
  (typeof a === "string" ? a : a?.url) || FALLBACK_AVATAR;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------- small UI pieces ---------- */
const Avatar = ({ src, className = "" }) => {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? FALLBACK_AVATAR : avatarSrc(src)}
      onError={() => setFailed(true)}
      loading="lazy"
      alt=""
      className={className}
    />
  );
};

const Highlight = ({ text = "", term = "" }) => {
  if (!term || !text) return text;
  const needle = term.toLowerCase();
  return text.split(new RegExp(`(${escapeRe(term)})`, "ig")).map((part, i) =>
    part.toLowerCase() === needle ? (
      <mark key={i} className="rounded bg-primary/20 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

const RowSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.1 }}
    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
    aria-hidden="true"
  >
    <div className="size-11 rounded-full bg-base-300" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-2/5 rounded bg-base-300" />
      <div className="h-2.5 w-1/4 rounded bg-base-200" />
    </div>
    <div className="h-9 w-[5.5rem] rounded-lg bg-base-200" />
  </motion.div>
);

const StateMessage = ({ icon: Icon, title, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-1.5 px-6 text-center"
  >
    <div className="relative mb-2 grid size-16 place-items-center">
      {[0, 1].map((n) => (
        <motion.span
          key={n}
          className="absolute inset-0 rounded-full border border-primary/25"
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: n * 1.2,
            ease: "easeOut",
          }}
        />
      ))}
      <div className="relative grid size-14 place-items-center rounded-full bg-base-200">
        <Icon className="size-6 text-base-content/40" />
      </div>
    </div>
    <p className="text-sm font-semibold text-base-content/80">{title}</p>
    {hint && (
      <p className="max-w-[16rem] text-xs text-base-content/50">{hint}</p>
    )}
  </motion.div>
);

const Kbd = ({ children }) => (
  <kbd className="kbd kbd-xs inline-flex min-w-5 items-center justify-center">
    {children}
  </kbd>
);

const ContactRow = ({
  user,
  term,
  optionId,
  active,
  busy,
  removeMode,
  onToggle,
  onHover,
}) => {
  const isContact = !!user.isContact;

  return (
    <motion.li
      id={optionId}
      role="option"
      aria-selected={active}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
      transition={SPRING}
      onMouseMove={onHover}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "bg-base-200" : ""
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}

      <Avatar
        src={user.avatar}
        className="size-11 shrink-0 rounded-full bg-base-300 object-cover ring-2 ring-base-100"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-tight">
          <Highlight text={user.fullName} term={term} />
        </p>
        {user.username && (
          <p className="mt-0.5 truncate text-xs text-base-content/50">
            @<Highlight text={user.username} term={term} />
          </p>
        )}
      </div>

      <button
        type="button"
        tabIndex={-1} // keyboard: input se ArrowUp/Down + Enter
        disabled={busy}
        onClick={() => onToggle(user)}
        aria-label={
          isContact
            ? `Remove ${user.fullName} from contacts`
            : `Add ${user.fullName} to contacts`
        }
        className={`group/btn btn btn-sm h-9 min-h-9 min-w-[5.5rem] shrink-0 gap-1.5 rounded-lg border-0 transition-colors ${
          removeMode
            ? "bg-error/10 text-error hover:bg-error hover:text-error-content"
            : isContact
              ? "bg-success/10 text-success hover:bg-error/10 hover:text-error"
              : "btn-primary"
        }`}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : removeMode ? (
          <>
            <UserMinus className="size-4" /> Remove
          </>
        ) : isContact ? (
          <>
            <span className="inline-flex items-center gap-1.5 group-hover/btn:hidden">
              <Check className="size-4" /> Added
            </span>
            <span className="hidden items-center gap-1.5 group-hover/btn:inline-flex">
              <UserMinus className="size-4" /> Remove
            </span>
          </>
        ) : (
          <>
            <UserPlus className="size-4" /> Add
          </>
        )}
      </button>
    </motion.li>
  );
};

/* ---------- modal ---------- */
const AddContactModal = ({ open, onClose }) => {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const optionId = (id) => `${uid}-opt-${id}`;

  const panelRef = useRef(null);
  const dragControls = useDragControls();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("find");
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settledTerm, setSettledTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const {
    contacts,
    results,
    isSearching,
    searchUsers,
    clearResults,
    addContact,
    removeContact,
  } = useContactStore();

  const term = q.trim();
  const canSearch = term.length >= MIN_CHARS;

  /* ----- derived lists ----- */
  const contactItems = useMemo(() => {
    const needle = term.toLowerCase();
    return [...contacts]
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
      .filter(
        (c) =>
          !needle ||
          [c.fullName, c.username].some((v) =>
            v?.toLowerCase().includes(needle),
          ),
      )
      .map((c) => ({ ...c, isContact: true }));
  }, [contacts, term]);

  const items = tab === "find" ? (canSearch ? results : []) : contactItems;

  const isSettled = settledTerm === term;
  const showSkeleton =
    tab === "find" &&
    canSearch &&
    results.length === 0 &&
    (isSearching || !isSettled);
  const showNoResults =
    tab === "find" &&
    canSearch &&
    results.length === 0 &&
    !isSearching &&
    isSettled;
  const dimResults = tab === "find" && canSearch && (isSearching || !isSettled);

  /* ----- reset on close ----- */
  useEffect(() => {
    if (open) return;
    setQ("");
    setTab("find");
    setActiveIndex(-1);
    setSettledTerm("");
    clearResults();
  }, [open, clearResults]);

  /* ----- debounced search (only on "Find people") ----- */
  useEffect(() => {
    if (!open || tab !== "find") return;
    if (!canSearch) {
      clearResults();
      setSettledTerm("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      await searchUsers(term);
      if (!cancelled) setSettledTerm(term);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, tab, term, canSearch, searchUsers, clearResults]);

  /* ----- keep highlighted row valid ----- */
  useEffect(() => {
    setActiveIndex(items.length ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, tab, term]);

  useEffect(() => {
    const u = items[activeIndex];
    if (!u) return;
    document
      .getElementById(optionId(u.id))
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  /* ----- Esc: pehle search clear, phir close ----- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (q) setQ("");
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, q, onClose]);

  /* ----- lock body scroll + restore focus on close ----- */
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  /* ----- actions ----- */
  const toggle = useCallback(
    async (u) => {
      const id = String(u.id);
      if (busyIds.has(id)) return;
      setBusyIds((prev) => new Set(prev).add(id));
      try {
        await (u.isContact ? removeContact(id) : addContact(u));
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [busyIds, addContact, removeContact],
  );

  const onInputKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const u = items[activeIndex];
      if (u) toggle(u);
    }
  };

  // focus trap inside the dialog
  const onPanelKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const statusText =
    tab === "find"
      ? canSearch && isSettled && !isSearching
        ? `${results.length} ${results.length === 1 ? "person" : "people"} found`
        : ""
      : `${contactItems.length} ${contactItems.length === 1 ? "contact" : "contacts"}`;

  if (typeof document === "undefined") return null;

  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${uid}-title`}
              className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-base-300 bg-base-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onPanelKeyDown}
            >
              {/* drag handle - sirf mobile (neeche kheench kar band karo) */}
              <div
                className="-mt-1 mb-3 flex h-4 cursor-grab touch-none justify-center sm:hidden"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden="true"
              >
                <div className="h-1 w-10 rounded-full bg-base-300" />
              </div>

              {/* header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/30">
                    <UserPlus className="size-5" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h3 id={`${uid}-title`} className="text-base font-semibold">
                      Add contacts
                    </h3>
                    <p className="mt-0.5 text-xs text-base-content/50">
                      {contacts.length}{" "}
                      {contacts.length === 1 ? "contact" : "contacts"} saved
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-circle shrink-0"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* tabs */}
              <LayoutGroup id={`${uid}-tabs`}>
                <div
                  className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-base-200 p-1"
                  role="tablist"
                >
                  {TABS.map(({ key, label }) => {
                    const active = tab === key;
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setTab(key)}
                        className={`relative flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors ${
                          active
                            ? "text-base-content"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="contact-tab-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-lg bg-base-100 shadow-sm ring-1 ring-base-300/60"
                          />
                        )}
                        <span className="relative z-10">{label}</span>
                        {key === "contacts" && (
                          <span
                            className={`relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none ${
                              contacts.length > 0
                                ? "bg-primary/15 text-primary"
                                : "bg-base-300/70 text-base-content/50"
                            }`}
                          >
                            {contacts.length}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>

              {/* search */}
              <label
                className={`input input-bordered mt-3 flex h-12 w-full items-center gap-2.5 rounded-xl px-3.5 transition-all duration-200 ${
                  searchFocused
                    ? "border-primary/50 bg-base-100 shadow-md shadow-primary/10"
                    : "bg-base-200/60"
                }`}
              >
                <Search
                  className={`size-4 shrink-0 transition-colors ${
                    searchFocused ? "text-primary" : "text-base-content/50"
                  }`}
                />
                <input
                  autoFocus
                  role="combobox"
                  aria-expanded={items.length > 0}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    items[activeIndex]
                      ? optionId(items[activeIndex].id)
                      : undefined
                  }
                  aria-autocomplete="list"
                  aria-label={
                    tab === "find" ? "Search people" : "Filter your contacts"
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className="h-full min-w-0 grow bg-transparent text-base outline-none sm:text-sm"
                  placeholder={
                    tab === "find"
                      ? "Search by name or username"
                      : "Filter your contacts"
                  }
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {tab === "find" && isSearching && (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                )}
                <AnimatePresence>
                  {q && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setQ("")}
                      aria-label="Clear search"
                      className="grid size-7 shrink-0 place-items-center rounded-full text-base-content/40 transition-colors hover:bg-base-300/60 hover:text-base-content"
                    >
                      <X className="size-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </label>

              {/* min-chars progress hint */}
              {tab === "find" && term.length > 0 && !canSearch && (
                <p className="mt-2 px-1 text-xs text-base-content/50">
                  Type {MIN_CHARS - term.length} more{" "}
                  {MIN_CHARS - term.length === 1 ? "character" : "characters"}{" "}
                  to search
                </p>
              )}

              {/* screen-reader status */}
              <p className="sr-only" role="status" aria-live="polite">
                {statusText}
              </p>

              {/* list */}
              <div className="mt-3 h-80 max-h-[42dvh] overflow-y-auto overscroll-contain rounded-2xl border border-base-300/60 bg-base-200/30 p-1.5">
                {showSkeleton && (
                  <div className="space-y-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <RowSkeleton key={i} index={i} />
                    ))}
                  </div>
                )}

                {tab === "find" && !canSearch && (
                  <StateMessage
                    icon={Search}
                    title="Find people to chat with"
                    hint={`Type at least ${MIN_CHARS} characters of a name or username`}
                  />
                )}

                {showNoResults && (
                  <StateMessage
                    icon={Search}
                    title="No users found"
                    hint="Check the spelling or try a different name"
                  />
                )}

                {tab === "contacts" && contacts.length === 0 && (
                  <StateMessage
                    icon={Users}
                    title="No contacts yet"
                    hint="Search for people in Find people and add them here"
                  />
                )}

                {tab === "contacts" &&
                  contacts.length > 0 &&
                  contactItems.length === 0 && (
                    <StateMessage
                      icon={Search}
                      title="No contacts match your search"
                      hint="Try a different name or username"
                    />
                  )}

                {items.length > 0 && (
                  <ul
                    id={listboxId}
                    role="listbox"
                    aria-label={tab === "find" ? "Search results" : "Contacts"}
                    className={`space-y-0.5 transition-opacity duration-150 ${
                      dimResults ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    <AnimatePresence initial={false}>
                      {items.map((u, i) => (
                        <ContactRow
                          key={u.id}
                          user={u}
                          term={term}
                          optionId={optionId(u.id)}
                          active={i === activeIndex}
                          busy={busyIds.has(String(u.id))}
                          removeMode={tab === "contacts"}
                          onToggle={toggle}
                          onHover={() => setActiveIndex(i)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              {/* keyboard hints - desktop only */}
              <div className="mt-4 hidden items-center justify-center gap-4 text-[11px] text-base-content/40 sm:flex">
                <span className="inline-flex items-center gap-1.5">
                  <Kbd>
                    <ArrowUp className="size-3" />
                  </Kbd>
                  <Kbd>
                    <ArrowDown className="size-3" />
                  </Kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Kbd>Enter</Kbd> add / remove
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Kbd>Esc</Kbd> close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
};

export default AddContactModal;
