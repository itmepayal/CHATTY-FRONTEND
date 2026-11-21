import { Sparkles } from "lucide-react";

export const StoryReplyCard = ({ storyReply, isMine }) => {
  if (!storyReply) return null;

  const isVideo = storyReply.storyMediaType === "video";
  const isImage = storyReply.storyMediaType === "image";
  const isText = storyReply.storyMediaType === "text";

  return (
    <div
      className={`mb-2 flex items-center gap-2.5 rounded-xl border p-2 text-left select-none transition-all ${
        isMine
          ? "border-white/20 bg-black/20 text-white"
          : "border-white/10 bg-[#151F30]/80 text-[#F8FAFC]"
      }`}
    >
      {/* Thumbnail or Text Icon */}
      <div className="size-11 rounded-lg overflow-hidden shrink-0 bg-[#101827] flex items-center justify-center border border-white/10 shadow-xs">
        {isImage && storyReply.storyPreviewUrl ? (
          <img
            src={storyReply.storyPreviewUrl}
            alt="Story"
            className="size-full object-cover"
          />
        ) : isVideo && storyReply.storyPreviewUrl ? (
          <video
            src={storyReply.storyPreviewUrl}
            className="size-full object-cover"
          />
        ) : isText ? (
          <div className="size-full flex items-center justify-center bg-gradient-to-tr from-[#22C7F2] to-[#397BFF] text-slate-950 p-1 text-[8px] font-bold text-center">
            <span className="line-clamp-2 leading-tight">
              {storyReply.storyTextContent || "Story"}
            </span>
          </div>
        ) : (
          <div className="size-full flex items-center justify-center bg-[#151F30] text-[#22C7F2]">
            <Sparkles className="size-4" />
          </div>
        )}
      </div>

      {/* Meta & Description */}
      <div className="flex flex-col min-w-0 pr-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#22C7F2] flex items-center gap-1">
          <Sparkles className="size-2.5" />
          <span>Replying to story</span>
        </span>
        <span className="text-xs truncate font-medium text-[#F8FAFC]">
          {storyReply.storyCaption ||
            storyReply.storyTextContent ||
            (isVideo ? "🎥 Video story" : isImage ? "📷 Photo story" : "Status")}
        </span>
      </div>
    </div>
  );
};

export default StoryReplyCard;
