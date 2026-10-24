const MessageSkeleton = () => {
  const skeletonMessages = Array(6).fill(null);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4 bg-base-200/40">
      {skeletonMessages.map((_, idx) => {
        const mine = idx % 2 !== 0;
        return (
          <div
            key={idx}
            className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
          >
            <div className="skeleton size-8 rounded-full shrink-0" />
            <div
              className={`skeleton h-12 rounded-2xl ${
                idx % 3 === 0 ? "w-56" : "w-40"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
