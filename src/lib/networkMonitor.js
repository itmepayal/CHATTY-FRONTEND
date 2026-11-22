/**
 * WebRTC Adaptive Network Monitor with Hysteresis
 * Analyzes RTCPeerConnection statistics and computes connection health.
 */

export class NetworkQualityMonitor {
  constructor({ pc, onQualityChange, onStatsUpdate, intervalMs = 2500 }) {
    this.pc = pc;
    this.onQualityChange = onQualityChange || (() => {});
    this.onStatsUpdate = onStatsUpdate || (() => {});
    this.intervalMs = intervalMs;
    this.timer = null;

    this.prevBytesSent = 0;
    this.prevBytesReceived = 0;
    this.prevTimestamp = 0;

    this.currentQuality = "good";
    this.pendingQuality = null;
    this.pendingCount = 0;
    this.HYSTERESIS_THRESHOLD = 2; // Require 2 consecutive intervals to change state
  }

  start() {
    this.stop();
    this.timer = setInterval(() => this._pollStats(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async _pollStats() {
    if (!this.pc || this.pc.connectionState === "closed") {
      this.stop();
      return;
    }

    try {
      const stats = await this.pc.getStats();
      let rtt = 0;
      let packetLoss = 0;
      let jitter = 0;
      let bitrate = 0;
      let fps = 0;
      let droppedFrames = 0;

      let totalPackets = 0;
      let totalPacketsLost = 0;
      let bytesNow = 0;
      let now = Date.now();

      stats.forEach((report) => {
        // Candidate pair for RTT
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          if (report.currentRoundTripTime) {
            rtt = Math.round(report.currentRoundTripTime * 1000);
          }
        }

        // Inbound RTP for audio / video
        if (report.type === "inbound-rtp") {
          if (typeof report.packetsLost === "number") {
            totalPacketsLost += report.packetsLost;
          }
          if (typeof report.packetsReceived === "number") {
            totalPackets += report.packetsReceived;
          }
          if (typeof report.jitter === "number") {
            jitter = Math.max(jitter, Math.round(report.jitter * 1000));
          }
          if (typeof report.framesPerSecond === "number") {
            fps = report.framesPerSecond;
          }
          if (typeof report.framesDropped === "number") {
            droppedFrames = report.framesDropped;
          }
          if (typeof report.bytesReceived === "number") {
            bytesNow += report.bytesReceived;
          }
        }

        // Outbound RTP
        if (report.type === "outbound-rtp" && typeof report.bytesSent === "number") {
          bytesNow += report.bytesSent;
        }
      });

      // Compute packet loss percentage
      if (totalPackets + totalPacketsLost > 0) {
        packetLoss = Math.min(100, Math.round((totalPacketsLost / (totalPackets + totalPacketsLost)) * 100));
      }

      // Compute bitrate in kbps
      if (this.prevTimestamp > 0 && now > this.prevTimestamp) {
        const timeDiffSec = (now - this.prevTimestamp) / 1000;
        const bytesDiff = Math.max(0, bytesNow - (this.prevBytesSent + this.prevBytesReceived));
        bitrate = Math.round((bytesDiff * 8) / (timeDiffSec * 1000));
      }

      this.prevBytesSent = bytesNow;
      this.prevTimestamp = now;

      // Determine instant quality band
      let instantQuality = "good";
      if (this.pc.iceConnectionState === "disconnected") {
        instantQuality = "reconnecting";
      } else if (rtt < 100 && packetLoss < 1 && jitter < 30) {
        instantQuality = "excellent";
      } else if (rtt < 260 && packetLoss < 4 && jitter < 65) {
        instantQuality = "good";
      } else if (rtt < 450 && packetLoss < 9 && jitter < 120) {
        instantQuality = "weak";
      } else {
        instantQuality = "poor";
      }

      // Apply Hysteresis
      if (instantQuality === this.currentQuality) {
        this.pendingQuality = null;
        this.pendingCount = 0;
      } else {
        if (instantQuality === this.pendingQuality) {
          this.pendingCount++;
          if (this.pendingCount >= this.HYSTERESIS_THRESHOLD) {
            this.currentQuality = instantQuality;
            this.pendingQuality = null;
            this.pendingCount = 0;
            this.onQualityChange(this.currentQuality);
          }
        } else {
          this.pendingQuality = instantQuality;
          this.pendingCount = 1;
        }
      }

      const metrics = {
        rtt,
        packetLoss,
        jitter,
        bitrate,
        fps,
        droppedFrames,
      };

      this.onStatsUpdate(metrics);
    } catch (err) {
      // getStats failure fallback
    }
  }
}
