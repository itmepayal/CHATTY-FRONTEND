/**
 * ChatLayout
 * Centralized responsive 3-column layout container for the Chat experience.
 * Ensures consistent symmetrical borders, viewport containment, and no unwanted page scrollbars.
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
      className={`h-screen h-[100dvh] bg-base-200 flex items-center justify-center p-0 sm:p-2 md:p-3 lg:p-4 overscroll-none overflow-hidden ${className}`}
    >
      <div className="w-full h-full max-w-[1720px] mx-auto flex flex-col">
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
