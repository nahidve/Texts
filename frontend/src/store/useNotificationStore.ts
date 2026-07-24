import { create } from 'zustand';

interface NotificationState {
  soundEnabled: boolean;
  pushEnabled: boolean;
  mentionsOnly: boolean;
  
  toggleSound: () => void;
  togglePush: () => void;
  toggleMentionsOnly: () => void;
  requestPushPermission: () => Promise<boolean>;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  // Load initial state from localStorage
  const savedSettings = localStorage.getItem('notification-settings');
  const initialSettings = savedSettings 
    ? JSON.parse(savedSettings) 
    : { soundEnabled: true, pushEnabled: false, mentionsOnly: false };

  const saveSettings = (settings: any) => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  };

  return {
    ...initialSettings,

    toggleSound: () => {
      const newState = !get().soundEnabled;
      set({ soundEnabled: newState });
      saveSettings({ ...get(), soundEnabled: newState });
    },

    togglePush: async () => {
      if (!get().pushEnabled) {
        const granted = await get().requestPushPermission();
        if (granted) {
          set({ pushEnabled: true });
          saveSettings({ ...get(), pushEnabled: true });
        }
      } else {
        set({ pushEnabled: false });
        saveSettings({ ...get(), pushEnabled: false });
      }
    },

    toggleMentionsOnly: () => {
      const newState = !get().mentionsOnly;
      set({ mentionsOnly: newState });
      saveSettings({ ...get(), mentionsOnly: newState });
    },

    requestPushPermission: async () => {
      if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
      }
      if (Notification.permission === "granted") {
        return true;
      }
      if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }
      return false;
    }
  };
});
