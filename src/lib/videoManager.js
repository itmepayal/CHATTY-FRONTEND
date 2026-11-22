/**
 * Video Manager
 * Provides HD resolution profiles, adaptive bitrate, RTCRtpSender parameter tuning,
 * and device capability detection for 1:1 and Group video calling.
 */

export const RESOLUTION_PRESETS = Object.freeze({
  "360p": {
    label: "360p (SD)",
    width: 640,
    height: 360,
    frameRate: 24,
    maxBitrate: 400_000, // 400 kbps
    scaleResolutionDownBy: 3,
    badge: "SD",
  },
  "480p": {
    label: "480p (Standard)",
    width: 854,
    height: 480,
    frameRate: 25,
    maxBitrate: 800_000, // 800 kbps
    scaleResolutionDownBy: 2,
    badge: "SD",
  },
  "720p": {
    label: "720p (HD)",
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrate: 1_800_000, // 1.8 Mbps
    scaleResolutionDownBy: 1,
    badge: "HD",
  },
  "1080p": {
    label: "1080p (Full HD)",
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 3_500_000, // 3.5 Mbps
    scaleResolutionDownBy: 1,
    badge: "FHD",
  },
});

/**
 * Applies resolution constraints to a video track and updates RTCRtpSender encoding parameters.
 */
export async function applyResolutionPreset(videoTrack, sender, presetKey = "720p") {
  const preset = RESOLUTION_PRESETS[presetKey] || RESOLUTION_PRESETS["720p"];

  // 1. Apply MediaStreamTrack constraints if supported
  if (videoTrack && typeof videoTrack.applyConstraints === "function") {
    try {
      await videoTrack.applyConstraints({
        width: { ideal: preset.width },
        height: { ideal: preset.height },
        frameRate: { ideal: preset.frameRate, max: preset.frameRate },
      });
    } catch (err) {
      console.warn(`[videoManager] Could not apply ${presetKey} track constraints:`, err?.message || err);
    }
  }

  // 2. Adjust RTCRtpSender encoding parameters (bitrate / scaleResolutionDownBy)
  if (sender && typeof sender.getParameters === "function" && typeof sender.setParameters === "function") {
    try {
      const params = sender.getParameters();
      if (params && params.encodings && params.encodings.length > 0) {
        if (!params.encodings[0]) params.encodings[0] = {};
        params.encodings[0].maxBitrate = preset.maxBitrate;
        if (preset.scaleResolutionDownBy && preset.scaleResolutionDownBy > 1) {
          params.encodings[0].scaleResolutionDownBy = preset.scaleResolutionDownBy;
        } else {
          delete params.encodings[0].scaleResolutionDownBy;
        }
        await sender.setParameters(params);
      }
    } catch (err) {
      console.warn(`[videoManager] Could not tune RTCRtpSender parameters for ${presetKey}:`, err?.message || err);
    }
  }

  return preset;
}

/**
 * Chooses the best resolution preset based on network quality and bandwidth preferences.
 */
export function getAdaptiveResolutionPreset(networkQuality, lowBandwidthMode = false) {
  if (lowBandwidthMode) return "360p";

  switch (networkQuality) {
    case "excellent":
      return "1080p";
    case "good":
      return "720p";
    case "weak":
      return "480p";
    case "poor":
    case "reconnecting":
      return "360p";
    default:
      return "720p";
  }
}
