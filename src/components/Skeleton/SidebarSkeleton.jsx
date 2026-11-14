import { Users } from "lucide-react";

const SidebarSkeleton = () => {
  const skeletonContacts = Array(8).fill(null);
  return (
    <aside className="h-full w-full lg:w-80 xl:w-96 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      <div className="border-b border-base-300 w-full p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-5 sm:size-6 text-primary" />
          <span className="font-semibold text-base sm:text-lg">Contacts</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full px-4 py-3 flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="skeleton size-10 sm:size-11 rounded-full" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-1.5 rounded-md" />
              <div className="skeleton h-3 w-44 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
