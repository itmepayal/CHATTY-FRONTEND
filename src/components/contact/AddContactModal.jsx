import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SecondaryButton,
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

/**
 * AddContactModal
 * Dedicated modal for searching and managing user contacts.
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
  } = useAddContactLogic(open, onClose);

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
            className="grid grid-cols-2 gap-1 rounded-xl bg-base-200/80 p-1 select-none border border-base-300/50"
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
                  onClick={() => setTab(key)}
                  className={`relative flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs sm:text-[13px] font-semibold transition-colors ${
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
                className="grid size-6 shrink-0 place-items-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

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
            items.length === 0 && (
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
                    isOnline={isUserOnline(u.id)}
                    removeMode={tab === "contacts"}
                    onToggle={toggle}
                    onHover={() => setActiveIndex(i)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
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

        <SecondaryButton size="sm" onClick={onClose}>
          Done
        </SecondaryButton>
      </ModalFooter>
    </ModalLayout>
  );
};

export default AddContactModal;
