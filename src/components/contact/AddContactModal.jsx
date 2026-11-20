import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Loader2,
  QrCode,
  Scan,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useContactStore } from "../../store/useContactStore";
import ProfileCardModal from "./ProfileCardModal";
import QRCodeModal from "./QRCodeModal";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SecondaryButton,
  PrimaryButton,
} from "../chat-ui";
import {
  ContactRow,
  Kbd,
  RowSkeleton,
  SPRING,
  StateMessage,
} from "./AddContactComponents.jsx";
import {
  MIN_CHARS,
  TABS,
  useAddContactLogic,
} from "./useAddContactLogic.js";
import { customToast as toast } from "../toast";
import { getShareableProfileUrl } from "../../utils/deepLink";

/**
 * AddContactModal
 * Dedicated modal for searching and managing user contacts with QR discovery.
 */
export const AddContactModal = ({ open, onClose }) => {
  const {
    uid,
    listboxId,
    optionId,
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
  } = useAddContactLogic(open, onClose);

  const [selectedUserForCard, setSelectedUserForCard] = useState(null);
  const authUser = useAuthStore((s) => s.authUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const { fetchUserQRCode, resolveQRPayload } = useContactStore();

  // QR state
  const [myQR, setMyQR] = useState(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [isResolvingQr, setIsResolvingQr] = useState(false);

  // Load My QR when switching to QR tab
  const handleLoadQR = async () => {
    if (myQR) return;
    setIsQrLoading(true);
    try {
      const data = await fetchUserQRCode(authUser?.id || authUser?._id);
      if (data?.qrCode) setMyQR(data);
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const targetIdentifier =
      authUser?.username || authUser?.id || authUser?._id;
    const link =
      myQR?.shareUrl || getShareableProfileUrl(targetIdentifier);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Profile link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!myQR?.qrCode) return;
    const a = document.createElement("a");
    a.href = myQR.qrCode;
    a.download = `chatty-qr-${authUser?.username || "profile"}.png`;
    a.click();
    toast.success("QR code downloaded");
  };

  const handleResolveQR = async (e) => {
    e?.preventDefault();
    if (!scanInput.trim()) return;
    setIsResolvingQr(true);
    try {
      const data = await resolveQRPayload(scanInput.trim());
      if (data?.user) {
        setSelectedUserForCard(data.user);
        setScanInput("");
      }
    } finally {
      setIsResolvingQr(false);
    }
  };

  const handleMessageUser = (user) => {
    setSelectedUser(user);
    onClose();
  };

  return (
    <ModalLayout
      open={open}
      onClose={onClose}
      size="md"
      aria-labelledby={`${uid}-modal-title`}
    >
      <ModalHeader
        id={`${uid}-modal-title`}
        icon={UserPlus}
        title="Add contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"} saved`}
        onClose={onClose}
      />

      <ModalBody className="space-y-3.5">
        {/* Navigation tabs */}
        <LayoutGroup id={`${uid}-tabs`}>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl bg-base-200/80 p-1 select-none border border-base-300/50"
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
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setTab(key);
                    if (key === "qr") handleLoadQR();
                  }}
                  className={`relative flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-[13px] font-semibold transition-colors ${
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
                  <span className="relative z-10 truncate">{label}</span>
                  {key === "contacts" && (
                    <span
                      className={`relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none ${
                        contacts.length > 0
                          ? "bg-primary text-primary-content"
                          : "bg-base-300/70 text-base-content/60"
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

        {tab !== "qr" ? (
          <>
            {/* Search input field */}
            <div
              className={`flex h-10 sm:h-11 w-full items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-3 transition-all duration-150 ${
                searchFocused
                  ? "border-primary/60 ring-2 ring-primary/10 shadow-xs"
                  : "hover:border-base-content/30"
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
                  items[activeIndex] ? optionId(items[activeIndex].id) : undefined
                }
                aria-autocomplete="list"
                aria-label={
                  tab === "find" ? "Search people" : "Filter your contacts"
                }
                autoComplete="off"
                spellCheck={false}
                className="h-full min-w-0 grow bg-transparent text-sm outline-none placeholder:text-base-content/45"
                placeholder={
                  tab === "find"
                    ? "Search by username, email, or phone number"
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
                    className="grid size-6 shrink-0 place-items-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
                  >
                    <X className="size-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Filter toolbar for My Contacts */}
            {tab === "contacts" && contacts.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-1 text-xs">
                <div className="flex items-center gap-1">
                  {["all", "online", "recent"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setContactFilter(f)}
                      className={`btn btn-xs rounded-lg capitalize border-0 ${
                        contactFilter === f
                          ? "bg-primary text-primary-content font-bold"
                          : "bg-base-200/80 text-base-content/60 hover:text-base-content"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-base-content/60">
                  <span>Sort:</span>
                  <select
                    value={contactSort}
                    onChange={(e) => setContactSort(e.target.value)}
                    className="select select-xs select-bordered rounded-lg bg-base-100 text-xs font-medium"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="online">Online First</option>
                    <option value="recent">Recently Added</option>
                  </select>
                </div>
              </div>
            )}

            {/* Search hint */}
            {tab === "find" && term.length > 0 && !canSearch && (
              <p className="px-1 text-xs text-base-content/50">
                Type {MIN_CHARS - term.length} more{" "}
                {MIN_CHARS - term.length === 1 ? "character" : "characters"} to search
              </p>
            )}

            <p className="sr-only" role="status" aria-live="polite">
              {statusText}
            </p>

            {/* Scrollable contact list */}
            <div className="h-60 sm:h-72 max-h-[42dvh] overflow-y-auto overscroll-contain rounded-2xl border border-base-300/60 bg-base-200/30 p-1.5 space-y-1">
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
                  hint={`Type at least ${MIN_CHARS} characters of a name, username, or phone`}
                />
              )}

              {showNoResults && (
                <StateMessage
                  icon={Search}
                  title="No users found"
                  hint="Check the spelling or try searching by username or phone"
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
                items.length === 0 && (
                  <StateMessage
                    icon={Search}
                    title="No contacts match your filters"
                    hint="Try clearing your search query or filter"
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
                        isOnline={isUserOnline(u.id)}
                        removeMode={tab === "contacts"}
                        onToggle={toggle}
                        onHover={() => setActiveIndex(i)}
                        onSelectUser={(user) => setSelectedUserForCard(user)}
                        onMessage={handleMessageUser}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </>
        ) : (
          /* My QR & Scan tab */
          <div className="space-y-4 py-1">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-base-300/80 bg-base-200/40 p-4 text-center">
              {isQrLoading ? (
                <div className="flex h-44 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : myQR?.qrCode ? (
                <div className="space-y-3">
                  <div className="inline-block rounded-2xl bg-white p-3 shadow-md ring-4 ring-primary/20">
                    <img
                      src={myQR.qrCode}
                      alt="My Profile QR Code"
                      className="size-40 sm:size-44 object-contain rounded-xl"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-base-content">
                      @{authUser?.username || authUser?.fullName}
                    </p>
                    <p className="text-xs text-base-content/50">
                      Scan or share this code to connect instantly
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyProfileLink}
                      className="btn btn-xs btn-outline gap-1.5 rounded-lg"
                    >
                      {copiedLink ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                      <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="btn btn-xs btn-primary gap-1.5 rounded-lg"
                    >
                      <Download className="size-3" />
                      <span>Download QR</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadQR}
                  className="btn btn-sm btn-primary rounded-xl"
                >
                  Generate My QR
                </button>
              )}
            </div>

            {/* Scan or Paste Code section */}
            <form onSubmit={handleResolveQR} className="space-y-2">
              <label className="text-xs font-semibold text-base-content/70 flex items-center gap-1.5">
                <Scan className="size-3.5 text-primary" />
                <span>Scan or Enter Discovery Code</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Paste QR payload, link, or @username"
                  className="input input-sm input-bordered flex-1 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  disabled={isResolvingQr || !scanInput.trim()}
                  className="btn btn-sm btn-primary rounded-xl px-4 text-xs gap-1.5"
                >
                  {isResolvingQr ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Lookup</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-between sm:justify-between">
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-base-content/40">
          <span className="inline-flex items-center gap-1">
            <Kbd><ArrowUp className="size-2.5" /></Kbd>
            <Kbd><ArrowDown className="size-2.5" /></Kbd>
            <span>navigate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Enter</Kbd>
            <span>select</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Esc</Kbd>
            <span>close</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SecondaryButton size="sm" onClick={onClose}>
            Done
          </SecondaryButton>
        </div>
      </ModalFooter>

      {selectedUserForCard && (
        <ProfileCardModal
          open={Boolean(selectedUserForCard)}
          onClose={() => setSelectedUserForCard(null)}
          user={selectedUserForCard}
        />
      )}
    </ModalLayout>
  );
};

export default AddContactModal;
