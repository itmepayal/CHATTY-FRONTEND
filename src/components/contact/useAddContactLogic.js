import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useContactStore } from "../../store/useContactStore";
import { useAuthStore } from "../../store/useAuthStore";

export const MIN_CHARS = 2;
export const DEBOUNCE_MS = 350;

export const TABS = [
  { key: "find", label: "Find people" },
  { key: "contacts", label: "My contacts" },
  { key: "qr", label: "My QR & Scan" },
];

export const useAddContactLogic = (open, onClose) => {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const optionId = (id) => `${uid}-opt-${id}`;

  const panelRef = useRef(null);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("find");
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settledTerm, setSettledTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [contactFilter, setContactFilter] = useState("all"); // "all" | "online" | "recent"
  const [contactSort, setContactSort] = useState("name"); // "name" | "online" | "recent"

  const {
    contacts,
    results,
    isSearching,
    searchUsers,
    clearResults,
    addContact,
    removeContact,
    sendContactRequest,
    acceptContactRequest,
    cancelContactRequest,
  } = useContactStore();

  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const onlineSet = useMemo(
    () => new Set((Array.isArray(onlineUsers) ? onlineUsers : []).map(String)),
    [onlineUsers],
  );

  const isUserOnline = useCallback(
    (id) => onlineSet.has(String(id)),
    [onlineSet],
  );

  const term = q.trim();
  const canSearch = term.length >= MIN_CHARS;

  const contactItems = useMemo(() => {
    const needle = term.toLowerCase();
    let list = [...contacts].filter(
      (c) =>
        !needle ||
        [c.fullName, c.username, c.phone, c.email].some((v) =>
          v?.toLowerCase().includes(needle),
        ),
    );

    // Apply Filter
    if (contactFilter === "online") {
      list = list.filter((c) => isUserOnline(c.id));
    }

    // Apply Sort
    if (contactSort === "name") {
      list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    } else if (contactSort === "online") {
      list.sort((a, b) => {
        const aOn = isUserOnline(a.id) ? 1 : 0;
        const bOn = isUserOnline(b.id) ? 1 : 0;
        return bOn - aOn || (a.fullName || "").localeCompare(b.fullName || "");
      });
    } else if (contactSort === "recent") {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list.map((c) => ({ ...c, isContact: true, relationship: "connected" }));
  }, [contacts, term, contactFilter, contactSort, isUserOnline]);

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

  // Reset internal state when modal closes
  useEffect(() => {
    if (open) return;
    setQ("");
    setTab("find");
    setActiveIndex(-1);
    setSettledTerm("");
    setContactFilter("all");
    setContactSort("name");
    clearResults();
  }, [open, clearResults]);

  // Debounced search on Find People tab
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

  useEffect(() => {
    setActiveIndex(items.length ? 0 : -1);
  }, [items.length, tab, term]);

  useEffect(() => {
    const u = items[activeIndex];
    if (!u) return;
    document
      .getElementById(optionId(u.id))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const toggle = useCallback(
    async (u) => {
      const id = String(u.id);
      if (busyIds.has(id)) return;
      setBusyIds((prev) => new Set(prev).add(id));
      try {
        if (u.relationship === "incoming_request" && (u.requestId || u.id || u._id)) {
          await acceptContactRequest(u.requestId || u.id || u._id);
        } else if (u.isContact || u.relationship === "connected") {
          await removeContact(id);
        } else if (u.relationship === "request_sent") {
          await cancelContactRequest(u.requestId || u.id || u._id || id);
        } else {
          await sendContactRequest(id);
        }
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [busyIds, acceptContactRequest, cancelContactRequest, removeContact, sendContactRequest],
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

  const statusText =
    tab === "find"
      ? canSearch && isSettled && !isSearching
        ? `${results.length} ${results.length === 1 ? "person" : "people"} found`
        : ""
      : `${contactItems.length} ${contactItems.length === 1 ? "contact" : "contacts"}`;

  return {
    uid,
    listboxId,
    optionId,
    panelRef,
    q,
    setQ,
    tab,
    setTab,
    busyIds,
    activeIndex,
    setActiveIndex,
    searchFocused,
    setSearchFocused,
    contacts,
    isSearching,
    term,
    canSearch,
    items,
    showSkeleton,
    showNoResults,
    dimResults,
    toggle,
    onInputKeyDown,
    statusText,
    isUserOnline,
    contactFilter,
    setContactFilter,
    contactSort,
    setContactSort,
  };
};
