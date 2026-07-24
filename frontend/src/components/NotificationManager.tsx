import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useNotificationStore } from '../store/useNotificationStore';

const NotificationManager = () => {
  const { socket, authUser } = useAuthStore();
  const { soundEnabled, pushEnabled, mentionsOnly } = useNotificationStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // We try to load a notification sound if it exists in public folder
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = (message: any, isGroup: boolean) => {
      const { selectedUser, selectedGroup } = useChatStore.getState();
      
      // Do not notify if the user sent the message
      if (message.senderId === authUser._id) return;

      // Do not notify if the user is currently viewing the chat
      if (isGroup) {
        if (selectedGroup && selectedGroup._id === message.groupId) return;
      } else {
        if (selectedUser && selectedUser._id === message.senderId) return;
      }

      // Check if user was mentioned
      const isMentioned = message.text?.includes(`@${authUser.fullName}`) || message.text?.includes('@all');

      // Check if we should notify based on settings
      if (mentionsOnly && !isMentioned) return;

      // 1. Play Sound
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore auto-play blocking errors
        });
      }

      // 2. Browser Push Notification
      if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
        let title = isGroup ? "New Group Message" : "New Message";
        if (isMentioned) title = "You were mentioned!";
        
        let body = message.text || (message.image ? '📷 Image' : '🎵 Audio');
        
        new Notification(title, {
          body,
          icon: "/avatar.png",
          tag: isGroup ? message.groupId : message.senderId // groups notifications by chat
        });
      }
    };

    const onNewMessage = (msg: any) => handleNewMessage(msg, false);
    const onNewGroupMessage = (msg: any) => handleNewMessage(msg, true);

    socket.on("newMessage", onNewMessage);
    socket.on("newGroupMessage", onNewGroupMessage);

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("newGroupMessage", onNewGroupMessage);
    };
  }, [socket, authUser, soundEnabled, pushEnabled, mentionsOnly]);

  return null; // This is a background manager, renders nothing
};

export default NotificationManager;
