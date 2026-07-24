import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useNotificationStore } from '../store/useNotificationStore';

// A valid base64 wav for a subtle "pop" sound
const VALID_POP_SOUND = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; // Empty silent stub, wait, let me use a tiny beep
// Actually, here is a small synthetic beep using base64:
const BEEP_SOUND = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD//w==";

const NotificationManager = () => {
  const { socket, authUser } = useAuthStore();
  const { soundEnabled, pushEnabled, mentionsOnly } = useNotificationStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Attempt to load standard notification or fallback to synthetic beep
    const audio = new Audio('/notification.mp3');
    audio.onerror = () => {
      audio.src = BEEP_SOUND;
    };
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = (message: any, isGroup: boolean) => {
      const { selectedUser, selectedGroup } = useChatStore.getState();
      
      const senderId = message.senderId?._id || message.senderId;

      // Do not notify if the user sent the message
      if (senderId === authUser._id) return;

      // Do not notify if the user is currently viewing the chat
      if (isGroup) {
        if (selectedGroup && selectedGroup._id === message.groupId) return;
      } else {
        if (selectedUser && selectedUser._id === senderId) return;
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
    
    // Reaction & Story Handlers
    const onReaction = (data: any) => {
      // Data from messageUpdated or storyReacted
      if (!mentionsOnly) {
        if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{});
        if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification("New Reaction!", { body: "Someone reacted to your message or story.", icon: "/avatar.png" });
        }
      }
    };

    // Call Handlers
    const onCall = (data: any) => {
      if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
        const callerName = data.callerInfo?.fullName || "Someone";
        new Notification("Incoming Call", { body: `${callerName} is calling you...`, icon: "/avatar.png" });
      }
      if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{});
    };

    socket.on("newMessage", onNewMessage);
    socket.on("newGroupMessage", onNewGroupMessage);
    socket.on("messageUpdated", onReaction); // For normal message reactions
    socket.on("storyReacted", onReaction); // For story reactions
    socket.on("CALL_INCOMING", onCall);
    socket.on("GROUP_CALL_INCOMING", onCall);

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("newGroupMessage", onNewGroupMessage);
      socket.off("messageUpdated", onReaction);
      socket.off("storyReacted", onReaction);
      socket.off("CALL_INCOMING", onCall);
      socket.off("GROUP_CALL_INCOMING", onCall);
    };
  }, [socket, authUser, soundEnabled, pushEnabled, mentionsOnly]);

  return null; // This is a background manager, renders nothing
};

export default NotificationManager;
