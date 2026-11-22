import SlidingSidebar from "../Sidebar/SlidingSidebar";

/**
 * ChatLayout
 * Centralized responsive layout container for the Chat experience.
 * Centered container with balanced responsive max-width and outer whitespace,
 * preventing full-width stretching on large screens while maintaining edge-to-edge
 * usability on mobile devices.
 */
export const ChatLayout = ({
  banner,
  sidebar,
  content,
  infoPanel,
  modal,
  className = "",
}) => {
  return (
    <div
      className={`h-screen w-full bg-base-200/90 text-base-content flex flex-col items-center justify-center overscroll-none overflow-hidden relative ${className}`}
    >
      {/* Ambient Glow Blobs matching Profile & Settings pages */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 top-16 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-20 size-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full h-full max-w-[1720px] 2xl:max-w-[1800px] mx-auto flex flex-col px-0 sm:px-4 lg:px-6 2xl:px-8 py-0 sm:py-3 lg:py-4 relative z-10 min-w-0">
        <div className="bg-base-100 sm:rounded-2xl shadow-xl sm:border border-base-300/80 w-full h-full flex flex-col overflow-hidden relative">
          {banner}

          <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
            <SlidingSidebar />
            {sidebar}
            {content}
            {infoPanel}
          </div>
        </div>
      </div>

      {modal}
    </div>
  );
};

export default ChatLayout;
