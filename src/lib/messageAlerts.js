import {
  playMessageSound as servicePlaySound,
  showDesktopNotification,
} from "../services/notificationService.js";
import { useNotificationSettings } from "../store/useNotificationSettingsStore.js";

export const playMessageSound = (volumePercent) => {
  servicePlaySound({
    volume: volumePercent,
    soundEnabled: true,
    force: true,
  });
};

export const notifyIncoming = ({
  title,
  body,
  icon,
  chatKey,
  senderName,
  messageType,
}) => {
  const { settings } = useNotificationSettings.getState();

  if (settings.soundEnabled) {
    servicePlaySound({
      volume: settings.soundVolume,
      soundEnabled: true,
    });
  }

  if (settings.desktopNotifications) {
    showDesktopNotification({
      senderName: senderName || title,
      text: body,
      avatar: icon,
      chatId: chatKey,
      messageType: messageType || "text",
      showPreview: settings.showPreview,
      desktopNotifications: true,
    });
  }
};

export default {
  playMessageSound,
  notifyIncoming,
};
