import { Loader2 } from "lucide-react";
import { formatDuration } from "./VoiceMessage.jsx";

const VideoMessage = ({ video, uploading = false, progress = 0 }) => (
  <div className="relative max-w-full overflow-hidden rounded-xl bg-black">
    <video
      src={video.url}
      controls={!uploading}
      playsInline
      preload="metadata"
      className="block max-h-72 w-full max-w-[320px] rounded-xl bg-black"
    />

    {!uploading && video.duration > 0 && (
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white">
        {formatDuration(video.duration)}
      </span>
    )}

    {uploading && (
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm text-white">
        <Loader2 className="size-5 animate-spin" />
        {progress > 0 && progress < 100 ? `${progress}%` : "Sending…"}
      </div>
    )}
  </div>
);

export default VideoMessage;
