import { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
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

export default function GroupCallModal() {
  const status = useGroupCallStore((s) => s.status);
  const groupName = useGroupCallStore((s) => s.groupName);
  const type = useGroupCallStore((s) => s.type);
  const peers = useGroupCallStore((s) => s.peers);
  const local = useGroupCallStore((s) => s.localStream);
  const micOn = useGroupCallStore((s) => s.micOn);
  const camOn = useGroupCallStore((s) => s.camOn);
  const connectedAt = useGroupCallStore((s) => s.connectedAt);
  const toggleMic = useGroupCallStore((s) => s.toggleMic);
  const toggleCam = useGroupCallStore((s) => s.toggleCam);
  const leaveCall = useGroupCallStore((s) => s.leaveCall);
  const authUser = useAuthStore((s) => s.authUser);

  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);

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

  // Active stream for minimized preview
  const primaryStream = list.find((p) => p.stream)?.stream || local;

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
            stream={primaryStream}
            seconds={seconds}
            muted={!micOn}
            onToggleMute={toggleMic}
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
              onMinimize={() => setMinimized(true)}
            />

            {/* Responsive Participant Grid */}
            <div
              className={`grid flex-1 min-h-0 auto-rows-fr content-center gap-2.5 sm:gap-4 overflow-y-auto p-3 sm:p-5 z-10 ${getParticipantGridCols(
                total,
              )}`}
            >
              {/* Local User Tile */}
              <CallParticipantCard
                self
                name="You"
                avatar={authUser?.avatar}
                stream={local}
                hasVideo={canUseCamera}
                videoOn={camOn}
                micOn={micOn}
                aspectRatio={
                  total <= 2 ? "aspect-video max-h-[75vh]" : "aspect-video"
                }
              />

              {/* Remote Participants */}
              {list.map((p) => {
                const hasVid = Boolean(p.stream?.getVideoTracks().length);
                return (
                  <CallParticipantCard
                    key={p.userId}
                    name={p.fullName || "Member"}
                    avatar={p.avatar}
                    stream={p.stream}
                    hasVideo={hasVid}
                    videoOn={p.video !== false}
                    micOn={p.audio !== false}
                    connecting={p.conn !== "connected" && p.conn !== "failed"}
                    failed={p.conn === "failed"}
                    aspectRatio={
                      total <= 2 ? "aspect-video max-h-[75vh]" : "aspect-video"
                    }
                  />
                );
              })}
            </div>

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
