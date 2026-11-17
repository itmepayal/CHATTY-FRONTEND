/**
 * ChatLayout
 * Centralized responsive 3-column layout container for the Chat experience.
 * Ensures consistent symmetrical borders, viewport containment, and no unwanted page scrollbars.
 * Container max-width, margins, and gutters exactly match Settings and Profile pages (max-w-7xl, mx-auto, px-0 sm:px-6 lg:px-8).
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
      className={`h-screen h-[100dvh] bg-base-200/90 flex flex-col justify-center overscroll-none overflow-hidden relative ${className}`}
    >
      {/* Ambient Glow Blobs matching Settings and Profile Pages */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 top-16 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-20 size-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full h-full max-w-7xl mx-auto flex flex-col px-0 sm:px-6 lg:px-8 py-0 sm:py-5 lg:py-7 relative z-10">
        <div className="bg-base-100 sm:rounded-2xl shadow-xl sm:border border-base-300 w-full h-full flex flex-col overflow-hidden relative">
          {banner}

          <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
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
