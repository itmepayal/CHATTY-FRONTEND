import { MessageSquare } from "lucide-react";

const SidebarSkeleton = () => {
  const skeletonContacts = Array(8).fill(null);
  return (
    <aside className="h-full w-full md:w-[290px] lg:w-[310px] xl:w-[320px] border-r border-base-300/80 flex flex-col transition-all duration-200 bg-base-100">
      <div className="h-13 sm:h-14 shrink-0 border-b border-base-300/80 w-full px-3 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="skeleton size-8.5 sm:size-9 rounded-xl" />
          <div className="space-y-1">
            <div className="skeleton h-3.5 w-20 rounded" />
            <div className="skeleton h-2.5 w-14 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="skeleton size-8.5 sm:size-9 rounded-lg" />
          <div className="skeleton size-8.5 sm:size-9 rounded-lg" />
        </div>
      </div>

      <div className="px-3 pt-2 pb-1 sm:px-4 sm:pt-2.5 sm:pb-1.5">
        <div className="skeleton h-8 w-full rounded-lg" />
      </div>

      <div className="px-3 pb-2 sm:px-4 sm:pb-2.5 space-y-1.5">
        <div className="skeleton h-8.5 sm:h-9 w-full rounded-xl" />
        <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
          <div className="skeleton h-7 w-12 rounded-lg" />
          <div className="skeleton h-7 w-14 rounded-lg" />
          <div className="skeleton h-7 w-16 rounded-lg" />
          <div className="skeleton h-7 w-14 rounded-lg" />
        </div>
      </div>

      <div className="border-t border-base-300" />

      <div className="overflow-y-auto w-full py-1 space-y-0.5 px-2">
        {skeletonContacts.map((_, idx) => (
          <div
            key={idx}
            className="flex h-[62px] sm:h-[68px] items-center gap-2.5 sm:gap-3 rounded-xl px-2.5 sm:px-3 animate-pulse"
          >
            <div className="skeleton size-10 sm:size-11 rounded-full shrink-0" />
            <div className="text-left min-w-0 flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-28 rounded" />
              <div className="skeleton h-2.5 w-36 rounded" />
            </div>
            <div className="skeleton h-2.5 w-8 rounded shrink-0" />
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
