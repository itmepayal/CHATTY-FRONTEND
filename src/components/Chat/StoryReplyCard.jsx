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
          ? "border-primary-content/30 bg-primary-content/15 text-primary-content"
          : "border-base-300 bg-base-200/80 text-base-content"
      }`}
    >
      {/* Thumbnail or Text Icon */}
      <div
        className={`size-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border shadow-2xs ${
          isMine
            ? "bg-black/20 border-primary-content/20"
            : "bg-base-100 border-base-300"
        }`}
      >
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
          <div className="size-full flex items-center justify-center bg-gradient-to-tr from-primary to-secondary text-primary-content p-1 text-[8px] font-bold text-center">
            <span className="line-clamp-2 leading-tight">
              {storyReply.storyTextContent || "Story"}
            </span>
          </div>
        ) : (
          <div
            className={`size-full flex items-center justify-center ${
              isMine ? "text-primary-content" : "text-primary"
            }`}
          >
            <Sparkles className="size-4" />
          </div>
        )}
      </div>

      {/* Meta & Description */}
      <div className="flex flex-col min-w-0 pr-1">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            isMine ? "text-primary-content/90" : "text-primary"
          }`}
        >
          <Sparkles className="size-2.5" />
          <span>Replying to story</span>
        </span>
        <span
          className={`text-xs truncate font-medium ${
            isMine ? "text-primary-content" : "text-base-content"
          }`}
        >
          {storyReply.storyCaption ||
            storyReply.storyTextContent ||
            (isVideo ? "🎥 Video story" : isImage ? "📷 Photo story" : "Status")}
        </span>
      </div>
    </div>
  );
};

export default StoryReplyCard;
