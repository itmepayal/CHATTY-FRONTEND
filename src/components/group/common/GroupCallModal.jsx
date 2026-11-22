import { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Smile,
  Sparkles,
  Subtitles,
  LayoutGrid,
  Maximize2,
} from "lucide-react";
import { useGroupCallStore } from "../../../store/useGroupCallStore";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  CALL_SPRING,
  getParticipantGridCols,
} from "../../Call/common/callTokens";
import CallHeader from "../../Call/common/CallHeader";
import CallActionBar from "../../Call/common/CallActionBar";
import CallControlButton from "../../Call/common/CallControlButton";
import CallParticipantCard from "../../Call/common/CallParticipantCard";
import MinimizedCallView from "../../Call/common/MinimizedCallView";
import CallReactionsOverlay from "../../Call/common/CallReactionsOverlay";
import CallCaptionsOverlay from "../../Call/common/CallCaptionsOverlay";
import CallReactionsBar from "../../Call/common/CallReactionsBar";
import CaptionsModal from "../../Call/modals/CaptionsModal";
import VideoEffectsModal from "../../Call/modals/VideoEffectsModal";

export default function GroupCallModal() {
  const status = useGroupCallStore((s) => s.status);
  const groupName = useGroupCallStore((s) => s.groupName);
  const type = useGroupCallStore((s) => s.type);
  const peers = useGroupCallStore((s) => s.peers);
  const local = useGroupCallStore((s) => s.localStream);
  const micOn = useGroupCallStore((s) => s.micOn);
  const camOn = useGroupCallStore((s) => s.camOn);
  const connectedAt = useGroupCallStore((s) => s.connectedAt);
  const activeSpeakerId = useGroupCallStore((s) => s.activeSpeakerId);
  const viewMode = useGroupCallStore((s) => s.viewMode);
  const setViewMode = useGroupCallStore((s) => s.setViewMode);
  const isScreenSharing = useGroupCallStore((s) => s.isScreenSharing);
  const screenShareState = useGroupCallStore((s) => s.screenShareState);
  const screenSharingPeerId = useGroupCallStore((s) => s.screenSharingPeerId);
  const hasScreenAudio = useGroupCallStore((s) => s.hasScreenAudio);
  const incomingReactions = useGroupCallStore((s) => s.incomingReactions);
  const isHost = useGroupCallStore((s) => s.isHost);
  const captionsEnabled = useGroupCallStore((s) => s.captionsEnabled);
  const activeCaption = useGroupCallStore((s) => s.activeCaption);
  const captionHistory = useGroupCallStore((s) => s.captionHistory);
  const backgroundEffect = useGroupCallStore((s) => s.backgroundEffect);
  const videoFilter = useGroupCallStore((s) => s.videoFilter);
  const arEffect = useGroupCallStore((s) => s.arEffect);
  const setVideoEffects = useGroupCallStore((s) => s.setVideoEffects);
  const processorStatus = useGroupCallStore((s) => s.processorStatus);
  const processorMessage = useGroupCallStore((s) => s.processorMessage);
  const toggleMic = useGroupCallStore((s) => s.toggleMic);
  const toggleCam = useGroupCallStore((s) => s.toggleCam);
  const toggleScreenShare = useGroupCallStore((s) => s.toggleScreenShare);
  const sendGroupReaction = useGroupCallStore((s) => s.sendGroupReaction);
  const kickParticipant = useGroupCallStore((s) => s.kickParticipant);
  const muteParticipant = useGroupCallStore((s) => s.muteParticipant);
  const toggleCaptions = useGroupCallStore((s) => s.toggleCaptions);
  const leaveCall = useGroupCallStore((s) => s.leaveCall);
  const authUser = useAuthStore((s) => s.authUser);

  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [showCaptionsModal, setShowCaptionsModal] = useState(false);
  const [showEffectsModal, setShowEffectsModal] = useState(false);

  // Auto-expand on new call start
  useEffect(() => {
    if (status !== "idle") {
      setMinimized(false);
    }
  }, [status]);

  // Live timer tick
  useEffect(() => {
    if (!connectedAt) {
      setSeconds(0);
      return;
    }
    const tick = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  const list = Object.values(peers || {});
  const total = list.length + 1;
  const canUseCamera = Boolean(local?.getVideoTracks().length);
  const isVideo = type === "video";

  const subtitle =
    list.length === 0
      ? "Ringing… waiting for members"
      : connectedAt
        ? null
        : "Connecting…";

  // Active stream for minimized preview (prioritize screen sharer if active)
  const primaryStream =
    (screenSharingPeerId
      ? list.find((p) => p.userId === screenSharingPeerId)?.stream
      : null) ||
    list.find((p) => p.stream)?.stream ||
    local;

  const handlePin = (uid) => {
    setPinnedUserId((prev) => (prev === uid ? null : uid));
  };

  // Determine prominent participant for Speaker View
  let prominentParticipant = null;
  if (screenSharingPeerId) {
    prominentParticipant = list.find((p) => p.userId === screenSharingPeerId);
  } else if (pinnedUserId) {
    if (pinnedUserId === "self" || pinnedUserId === authUser?._id) {
      prominentParticipant = { self: true };
    } else {
      prominentParticipant = list.find((p) => p.userId === pinnedUserId);
    }
  } else if (activeSpeakerId) {
    if (activeSpeakerId === "self" || activeSpeakerId === authUser?._id) {
      prominentParticipant = { self: true };
    } else {
      prominentParticipant = list.find((p) => p.userId === activeSpeakerId);
    }
  } else {
    prominentParticipant = list[0] || { self: true };
  }

  const isSpeakerView =
    viewMode === "speaker" || Boolean(screenSharingPeerId) || isScreenSharing;

  return (
    <MotionConfig reducedMotion="user">
      {/* Minimized Floating Picture-in-Picture View */}
      <AnimatePresence>
        {status !== "idle" && minimized && (
          <MinimizedCallView
            key="minimized-group"
            title={groupName || "Group Call"}
            avatar={null}
            isVideo={isVideo}
            isScreenSharing={isScreenSharing || Boolean(screenSharingPeerId)}
            peerScreenSharing={Boolean(screenSharingPeerId)}
            stream={primaryStream}
            localStream={local}
            cameraOff={!camOn}
            seconds={seconds}
            muted={!micOn}
            onToggleMute={toggleMic}
            onToggleCamera={toggleCam}
            onExpand={() => setMinimized(false)}
            onEnd={leaveCall}
            isGroup
            participantCount={total}
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Group Call Screen */}
      <AnimatePresence>
        {status !== "idle" && !minimized && (
          <motion.div
            key="group-call-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={CALL_SPRING}
            role="dialog"
            aria-modal="true"
            aria-label={`${isVideo ? "Video" : "Voice"} call in ${groupName}`}
            className="fixed inset-0 z-[70] flex flex-col justify-between overflow-hidden bg-[#0a0c10] text-white"
          >
            {/* Background Ambience */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#11141c] via-[#0a0c10] to-black" />
            <div className="pointer-events-none absolute left-1/2 top-1/4 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

            {/* Standardized Header */}
            <CallHeader
              title={groupName || "Group call"}
              subtitle={subtitle}
              isVideo={isVideo}
              connected={Boolean(connectedAt)}
              connecting={!connectedAt && list.length > 0}
              seconds={seconds}
              participantCount={total}
              isScreenSharing={isScreenSharing}
              peerScreenSharing={Boolean(screenSharingPeerId)}
              captionsEnabled={captionsEnabled}
              viewMode={viewMode}
              onToggleViewMode={() =>
                setViewMode?.(viewMode === "gallery" ? "speaker" : "gallery")
              }
              onMinimize={() => setMinimized(true)}
            />

            {/* Screen Share Indicator Banner */}
            {(isScreenSharing || screenSharingPeerId) && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 rounded-full bg-primary/95 px-4 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md border border-white/20">
                <ScreenShare className="size-3.5" />
                <span>
                  {isScreenSharing
                    ? "You are sharing your screen"
                    : `${
                        list.find((p) => p.userId === screenSharingPeerId)
                          ?.fullName || "Someone"
                      } is sharing screen`}
                </span>
                {hasScreenAudio && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                    <Volume2 className="size-2.5" />
                    Audio
                  </span>
                )}
                {isScreenSharing && (
                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    className="ml-1 rounded-lg bg-black/40 px-2 py-0.5 text-[11px] hover:bg-black/60 transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>
            )}

            {/* Viewport: Speaker View vs Gallery View */}
            {isSpeakerView ? (
              /* Speaker / Presentation Layout */
              <div className="flex-1 min-h-0 flex flex-col justify-between p-3 sm:p-5 z-10 gap-3">
                {/* Main Prominent Stage */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                  {prominentParticipant?.self ? (
                    <CallParticipantCard
                      self
                      userId="self"
                      name="You"
                      avatar={authUser?.avatar}
                      stream={local}
                      hasVideo={canUseCamera || isScreenSharing}
                      videoOn={camOn || isScreenSharing}
                      isScreenSharing={isScreenSharing}
                      micOn={micOn}
                      isSpeaking={
                        activeSpeakerId === "self" ||
                        activeSpeakerId === authUser?._id
                      }
                      isPinned={
                        pinnedUserId === "self" ||
                        pinnedUserId === authUser?._id
                      }
                      onPin={handlePin}
                      aspectRatio="aspect-auto h-full max-h-[65vh] w-full max-w-4xl"
                    />
                  ) : prominentParticipant ? (
                    <CallParticipantCard
                      key={prominentParticipant.userId}
                      userId={prominentParticipant.userId}
                      name={prominentParticipant.fullName || "Member"}
                      avatar={prominentParticipant.avatar}
                      stream={prominentParticipant.stream}
                      hasVideo={
                        Boolean(
                          prominentParticipant.stream?.getVideoTracks().length,
                        ) || screenSharingPeerId === prominentParticipant.userId
                      }
                      videoOn={
                        prominentParticipant.video !== false ||
                        screenSharingPeerId === prominentParticipant.userId
                      }
                      isScreenSharing={
                        screenSharingPeerId === prominentParticipant.userId
                      }
                      micOn={prominentParticipant.audio !== false}
                      connecting={
                        prominentParticipant.conn !== "connected" &&
                        prominentParticipant.conn !== "failed"
                      }
                      failed={prominentParticipant.conn === "failed"}
                      isSpeaking={
                        activeSpeakerId === prominentParticipant.userId
                      }
                      isHost={isHost}
                      isPinned={pinnedUserId === prominentParticipant.userId}
                      onPin={handlePin}
                      onKick={kickParticipant}
                      onMute={muteParticipant}
                      aspectRatio="aspect-auto h-full max-h-[65vh] w-full max-w-4xl"
                    />
                  ) : null}
                </div>

                {/* Bottom Thumbnail Strip */}
                <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 max-h-32 justify-center">
                  {!prominentParticipant?.self && (
                    <div className="w-32 sm:w-40 shrink-0">
                      <CallParticipantCard
                        self
                        userId="self"
                        name="You"
                        avatar={authUser?.avatar}
                        stream={local}
                        hasVideo={canUseCamera || isScreenSharing}
                        videoOn={camOn || isScreenSharing}
                        isScreenSharing={isScreenSharing}
                        micOn={micOn}
                        isSpeaking={
                          activeSpeakerId === "self" ||
                          activeSpeakerId === authUser?._id
                        }
                        onPin={handlePin}
                        aspectRatio="aspect-video"
                      />
                    </div>
                  )}

                  {list
                    .filter((p) => p.userId !== prominentParticipant?.userId)
                    .map((p) => (
                      <div key={p.userId} className="w-32 sm:w-40 shrink-0">
                        <CallParticipantCard
                          userId={p.userId}
                          name={p.fullName || "Member"}
                          avatar={p.avatar}
                          stream={p.stream}
                          hasVideo={
                            Boolean(p.stream?.getVideoTracks().length) ||
                            screenSharingPeerId === p.userId
                          }
                          videoOn={
                            p.video !== false ||
                            screenSharingPeerId === p.userId
                          }
                          isScreenSharing={screenSharingPeerId === p.userId}
                          micOn={p.audio !== false}
                          connecting={
                            p.conn !== "connected" && p.conn !== "failed"
                          }
                          failed={p.conn === "failed"}
                          isSpeaking={activeSpeakerId === p.userId}
                          isHost={isHost}
                          onPin={handlePin}
                          onKick={kickParticipant}
                          onMute={muteParticipant}
                          aspectRatio="aspect-video"
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* Gallery Grid Layout */
              <div
                className={`grid flex-1 min-h-0 auto-rows-fr content-center gap-2.5 sm:gap-4 overflow-y-auto p-3 sm:p-5 z-10 ${getParticipantGridCols(
                  total,
                )}`}
              >
                {/* Local User Tile */}
                <CallParticipantCard
                  self
                  userId="self"
                  name="You"
                  avatar={authUser?.avatar}
                  stream={local}
                  hasVideo={canUseCamera || isScreenSharing}
                  videoOn={camOn || isScreenSharing}
                  isScreenSharing={isScreenSharing}
                  micOn={micOn}
                  isSpeaking={
                    activeSpeakerId === "self" ||
                    activeSpeakerId === authUser?._id
                  }
                  isPinned={
                    pinnedUserId === "self" || pinnedUserId === authUser?._id
                  }
                  onPin={handlePin}
                  aspectRatio={
                    total <= 2 ? "aspect-video max-h-[75vh]" : "aspect-video"
                  }
                />

                {/* Remote Participants */}
                {list.map((p) => {
                  const isRemoteSharing = screenSharingPeerId === p.userId;
                  const hasVid =
                    Boolean(p.stream?.getVideoTracks().length) ||
                    isRemoteSharing;
                  return (
                    <CallParticipantCard
                      key={p.userId}
                      userId={p.userId}
                      name={p.fullName || "Member"}
                      avatar={p.avatar}
                      stream={p.stream}
                      hasVideo={hasVid}
                      videoOn={p.video !== false || isRemoteSharing}
                      isScreenSharing={isRemoteSharing}
                      micOn={p.audio !== false}
                      connecting={p.conn !== "connected" && p.conn !== "failed"}
                      failed={p.conn === "failed"}
                      isSpeaking={activeSpeakerId === p.userId}
                      isHost={isHost}
                      isPinned={pinnedUserId === p.userId}
                      onPin={handlePin}
                      onKick={kickParticipant}
                      onMute={muteParticipant}
                      aspectRatio={
                        total <= 2
                          ? "aspect-video max-h-[75vh]"
                          : "aspect-video"
                      }
                    />
                  );
                })}
              </div>
            )}

            {/* Overlays */}
            <CallReactionsOverlay reactions={incomingReactions} />
            <CallCaptionsOverlay caption={activeCaption} />

            {/* Modals & Bars */}
            <CallReactionsBar
              isOpen={showReactionsBar}
              onClose={() => setShowReactionsBar(false)}
              onSelectReaction={sendGroupReaction}
            />

            <CaptionsModal
              isOpen={showCaptionsModal}
              onClose={() => setShowCaptionsModal(false)}
              captionsEnabled={captionsEnabled}
              onToggleCaptions={toggleCaptions}
              captionHistory={captionHistory}
            />

            <VideoEffectsModal
              isOpen={showEffectsModal}
              onClose={() => setShowEffectsModal(false)}
              currentBackground={backgroundEffect}
              currentFilter={videoFilter}
              currentAr={arEffect}
              onApplyEffects={setVideoEffects}
              localStream={local}
              processorStatus={processorStatus}
              processorMessage={processorMessage}
            />

            {/* Standardized Action Bar Dock */}
            <CallActionBar>
              <CallControlButton
                icon={micOn ? Mic : MicOff}
                label={micOn ? "Mute" : "Unmute"}
                variant={!micOn ? "active" : "glass"}
                onClick={toggleMic}
              />

              {isVideo && (
                <CallControlButton
                  icon={camOn ? Video : VideoOff}
                  label={camOn ? "Stop video" : "Start video"}
                  variant={!camOn ? "active" : "glass"}
                  onClick={toggleCam}
                />
              )}

              {/* Virtual Background & Studio Effects */}
              {isVideo && (
                <CallControlButton
                  icon={Sparkles}
                  label="Effects"
                  variant={
                    backgroundEffect !== "none" ||
                    videoFilter !== "none" ||
                    arEffect !== "none"
                      ? "active"
                      : "glass"
                  }
                  onClick={() => setShowEffectsModal(true)}
                />
              )}

              {/* Screen Share */}
              {isVideo && (
                <CallControlButton
                  icon={isScreenSharing ? ScreenShareOff : ScreenShare}
                  label={
                    screenShareState === "REQUESTING_PERMISSION"
                      ? "Requesting..."
                      : screenShareState === "STARTING"
                        ? "Starting..."
                        : isScreenSharing
                          ? "Stop sharing"
                          : "Share screen"
                  }
                  variant={isScreenSharing ? "active" : "glass"}
                  onClick={toggleScreenShare}
                  disabled={
                    screenShareState === "REQUESTING_PERMISSION" ||
                    screenShareState === "STARTING" ||
                    screenShareState === "STOPPING"
                  }
                />
              )}

              {/* Reactions */}
              <CallControlButton
                icon={Smile}
                label="React"
                variant={showReactionsBar ? "active" : "glass"}
                onClick={() => setShowReactionsBar((prev) => !prev)}
              />

              {/* Captions */}
              <CallControlButton
                icon={Subtitles}
                label="Captions"
                variant={captionsEnabled ? "active" : "glass"}
                onClick={() => setShowCaptionsModal(true)}
              />

              {/* View Mode Toggle */}
              <CallControlButton
                icon={isSpeakerView ? LayoutGrid : Maximize2}
                label={isSpeakerView ? "Gallery view" : "Speaker view"}
                variant="glass"
                onClick={() =>
                  setViewMode?.(viewMode === "gallery" ? "speaker" : "gallery")
                }
              />

              <CallControlButton
                icon={PhoneOff}
                label="Leave"
                variant="danger"
                size="lg"
                onClick={leaveCall}
              />
            </CallActionBar>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
