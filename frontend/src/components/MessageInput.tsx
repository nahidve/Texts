import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, BarChart2, Check, XCircle, Smile, Mic, Trash2, Pause, Play, BellOff, Clock } from "lucide-react";
import toast from "react-hot-toast";
import CreatePollModal from "./CreatePollModal";
import EmojiPicker from 'emoji-picker-react';

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sendMessage, selectedGroup, selectedUser, editingMessage, editMessage, setEditingMessage, replyingToMessage, setReplyingToMessage } = useChatStore();
  const { socket } = useAuthStore();

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursor, setMentionCursor] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSilent, setIsSilent] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<number>(0); // track duration without stale closure issue

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      setImagePreview(editingMessage.image || null);
    } else {
      setText("");
      setImagePreview(null);
    }
  }, [editingMessage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendAudio = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

    // Capture duration from ref (always accurate regardless of state timing)
    const finalDuration = durationRef.current;

    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);
    durationRef.current = 0;

    if (socket) {
      socket.emit("stopRecordingAudio", {
        receiverId: selectedUser?._id,
        groupId: selectedGroup?._id
      });
    }

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const audioData = reader.result as string;
          try {
            await sendMessage({
              text: "",
              audio: audioData,
              audioDuration: finalDuration,
              replyTo: replyingToMessage?._id,
              isSilent,
              scheduledFor
            });
            setReplyingToMessage(null);
            setIsSilent(false);
            setScheduledFor("");
          } catch (e) {
            console.error("Failed to send audio:", e);
            toast.error("Failed to send audio message");
          }
          resolve();
        };
        reader.onerror = () => resolve(); // don't hang forever
      };

      mediaRecorderRef.current!.stop();
      // Stop all tracks so microphone indicator goes away
      mediaRecorderRef.current!.stream?.getTracks().forEach(t => t.stop());
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      durationRef.current = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Use timeslice=250ms so data accumulates progressively (faster send)
      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
      durationRef.current = 0;

      if (socket) {
        socket.emit("recordingAudio", {
          receiverId: selectedUser?._id,
          groupId: selectedGroup?._id
        });
      }

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          if (next >= 120) {
            handleSendAudio();
            return prev;
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isRecordingPaused) {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isRecordingPaused) {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            handleSendAudio();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent sending
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (socket) {
        socket.emit("stopRecordingAudio", {
          receiverId: selectedUser?._id,
          groupId: selectedGroup?._id
        });
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioPreview) return;

    if (editingMessage) {
      await editMessage(editingMessage._id, text.trim());
      return;
    }

    let finalMentions: string[] = [];
    if (selectedGroup) {
      if (text.includes("@all")) {
        finalMentions = selectedGroup.members.map((m: any) => m.user._id);
      } else {
        selectedGroup.members.forEach((m: any) => {
          if (m.user && text.includes(`@${m.user.fullName}`)) {
            finalMentions.push(m.user._id);
          }
        });
      }
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        audio: audioPreview,
        audioDuration: audioPreview ? recordingDuration : undefined,
        replyTo: replyingToMessage?._id,
        isSilent,
        scheduledFor
      });

      setText("");
      setImagePreview(null);
      setAudioPreview(null);
      setIsSilent(false);
      setScheduledFor("");
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (socket) {
        socket.emit("stopTyping", {
          receiverId: selectedUser?._id,
          groupId: selectedGroup?._id
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (socket) {
      socket.emit("typing", {
        receiverId: selectedUser?._id,
        groupId: selectedGroup?._id
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          receiverId: selectedUser?._id,
          groupId: selectedGroup?._id
        });
      }, 2000);
    }

    if (selectedGroup) {
      const cursor = e.target.selectionStart || 0;
      const textBeforeCursor = val.slice(0, cursor);
      const match = textBeforeCursor.match(/@([a-zA-Z0-9_ ]*)$/);

      if (match) {
        setShowMentions(true);
        setMentionQuery(match[1].toLowerCase());
        setMentionCursor(cursor - match[0].length);
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (name: string) => {
    const before = text.slice(0, mentionCursor);
    const after = text.slice(text.indexOf(" ", mentionCursor) === -1 ? text.length : text.indexOf(" ", mentionCursor));
    setText(`${before}@${name} ${after}`);
    setShowMentions(false);
  };

  const filteredMembers = selectedGroup
    ? selectedGroup.members.filter((m: any) => m.user?.fullName?.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <div className="relative z-10 w-full px-4 pb-4 pt-2 backdrop-blur-md">
      {/* Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-3">
          <div className="relative group transition-transform hover:scale-[1.02]">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-24 h-24 rounded-xl object-cover border border-zinc-500 shadow-lg"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-base-300 hover:bg-base-200 transition-all shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mentions Popup */}
      {showMentions && (
        <div className="absolute bottom-full left-4 mb-2 w-64 bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50">
          <div className="p-2 border-b border-base-300">
            <span className="text-xs font-semibold text-zinc-500">Mentions</span>
          </div>
          <div
            className="px-4 py-2 hover:bg-base-200 cursor-pointer flex items-center gap-3"
            onClick={() => insertMention("all")}
          >
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">@</div>
            <span className="font-medium">all</span>
          </div>
          {filteredMembers.map((m: any) => (
            <div
              key={m.user?._id || Math.random()}
              className="px-4 py-2 hover:bg-base-200 cursor-pointer flex items-center gap-3 transition-colors"
              onClick={() => m.user && insertMention(m.user.fullName)}
            >
              <img src={m.user?.profilePic || "/avatar.png"} alt="" className="size-8 rounded-full object-cover" />
              <span className="font-medium text-sm">{m.user?.fullName || "Unknown"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && !editingMessage && (
        <div className="absolute bottom-full right-4 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-base-300">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setText(prev => prev + emojiData.emoji);
            }}
            theme={"dark" as any}
          />
        </div>
      )}

      {/* Reply Banner */}
      {replyingToMessage && !editingMessage && (
        <div className="flex items-center justify-between bg-base-300/50 text-base-content px-4 py-2 rounded-t-xl text-sm border-t border-x border-base-300 backdrop-blur-sm">
          <div className="flex items-center gap-2 max-w-[80%] overflow-hidden">
            <span className="font-semibold text-primary shrink-0">Replying to:</span>
            <span className="truncate italic opacity-80">{replyingToMessage.text || (replyingToMessage.image ? "Image" : "Poll")}</span>
          </div>
          <button type="button" onClick={() => setReplyingToMessage(null)} className="hover:text-red-400 transition-colors p-1">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-primary/20 text-primary-content px-4 py-2 rounded-t-xl text-sm border-t border-x border-primary/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">Editing message</span>
          </div>
          <button onClick={() => setEditingMessage(null)} className="hover:text-red-400 transition-colors">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className={`relative flex items-center gap-3 bg-base-200/70 border backdrop-blur-md shadow-xl px-5 py-3 ${editingMessage || replyingToMessage ? 'rounded-b-2xl rounded-t-none border-primary/30 border-t-0 bg-primary/5' : 'rounded-2xl border-base-300'
          }`}
      >
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-2 w-full animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center gap-3 bg-base-200 px-4 py-2 rounded-xl border border-base-300 shadow-lg w-full">
              <div className="relative flex items-center justify-center mr-2">
                {!isRecordingPaused && <div className="size-3 rounded-full bg-red-500 animate-ping absolute"></div>}
                <div className={`size-3 rounded-full ${isRecordingPaused ? 'bg-base-content/40' : 'bg-red-500'} relative shadow-[0_0_8px_rgba(239,68,68,0.8)]`}></div>
              </div>
              <span className={`font-mono font-bold tracking-wider text-lg ${isRecordingPaused ? 'text-base-content/60' : 'text-red-500'}`}>
                {formatDuration(recordingDuration)}
              </span>

              <div className={`flex items-center gap-1 ml-4 ${isRecordingPaused ? 'opacity-30' : 'opacity-80'}`}>
                <span className={`w-1 h-3 bg-red-500 rounded-full ${!isRecordingPaused && 'animate-pulse'}`} style={{ animationDelay: '0ms' }}></span>
                <span className={`w-1 h-4 bg-red-500 rounded-full ${!isRecordingPaused && 'animate-pulse'}`} style={{ animationDelay: '150ms' }}></span>
                <span className={`w-1 h-2 bg-red-500 rounded-full ${!isRecordingPaused && 'animate-pulse'}`} style={{ animationDelay: '300ms' }}></span>
                <span className={`w-1 h-5 bg-red-500 rounded-full ${!isRecordingPaused && 'animate-pulse'}`} style={{ animationDelay: '450ms' }}></span>
                <span className={`w-1 h-3 bg-red-500 rounded-full ${!isRecordingPaused && 'animate-pulse'}`} style={{ animationDelay: '600ms' }}></span>
              </div>

              <div className="flex-1 flex justify-end items-center gap-2">
                {isRecordingPaused ? (
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="btn btn-circle btn-sm btn-ghost text-primary hover:bg-primary/10 transition-colors"
                    title="Resume Recording"
                  >
                    <Play size={18} className="fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="btn btn-circle btn-sm btn-ghost text-base-content/70 hover:bg-base-300 transition-colors"
                    title="Pause Recording"
                  >
                    <Pause size={18} className="fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={cancelRecording}
                  className="btn btn-circle btn-sm btn-ghost text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Cancel Recording"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <input
            type="text"
            className="flex-1 bg-transparent focus:outline-none placeholder:italic placeholder:text-sm sm:placeholder:text-base text-base"
            placeholder="Type something"
            value={text}
            onChange={handleTextChange}
          />
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Attach Image */}
        {!editingMessage && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 ${imagePreview ? "text-emerald-500" : "text-zinc-400"
              }`}
          >
            <Image size={22} />
          </button>
        )}

        {/* Attach Poll */}
        {!editingMessage && selectedGroup && (
          <button
            type="button"
            onClick={() => setShowPollModal(true)}
            className="transition-all duration-200 p-2 rounded-full text-zinc-400 hover:scale-110"
            title="Create Poll"
          >
            <BarChart2 size={22} />
          </button>
        )}

        {/* Emoji Button */}
        {!editingMessage && (
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 ${showEmojiPicker ? "text-primary" : "text-zinc-400"}`}
            title="Emojis"
          >
            <Smile size={22} />
          </button>
        )}

        {/* Send / Save / Record / Stop */}
        {isRecording ? (
          <button
            type="button"
            onClick={handleSendAudio}
            className="transition-all duration-300 p-3 rounded-full bg-primary text-primary-content hover:scale-110 shadow-[0_0_15px_rgba(var(--p),0.5)] flex items-center justify-center animate-in zoom-in"
            title="Send Audio"
          >
            <Send size={20} className="ml-1" />
          </button>
        ) : (text.trim() || imagePreview) ? (
          <div className="flex items-center gap-1 bg-base-200 rounded-full pr-1">
            {!editingMessage && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSilent(!isSilent)}
                  className={`p-2 rounded-full transition-colors ${isSilent ? 'text-primary' : 'text-zinc-400 hover:text-base-content'}`}
                  title={isSilent ? "Will send silently" : "Send silently"}
                >
                  <BellOff size={16} />
                </button>
                <div className="relative group">
                  <button
                    type="button"
                    className={`p-2 rounded-full transition-colors ${scheduledFor ? 'text-primary' : 'text-zinc-400 hover:text-base-content'}`}
                    title="Schedule message"
                  >
                    <Clock size={16} />
                  </button>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-100 border border-base-300 rounded p-1 text-xs"
                    style={{ pointerEvents: 'auto' }}
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              className="transition-all duration-200 p-2.5 rounded-full bg-primary text-primary-content hover:scale-105 shadow-md ml-1"
            >
              {editingMessage ? <Check size={18} /> : <Send size={18} />}
            </button>
          </div>
        ) : !editingMessage ? (
          <button
            type="button"
            onClick={startRecording}
            className="transition-all duration-200 p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-content hover:scale-110 shadow-sm"
            title="Record Audio"
          >
            <Mic size={22} />
          </button>
        ) : (
          <button
            type="submit"
            disabled
            className="transition-all duration-200 p-2.5 rounded-full bg-primary text-primary-content opacity-50 shadow-md"
          >
            <Check size={20} />
          </button>
        )}
      </form>

      {/* Poll Modal Overlay */}
      {showPollModal && <CreatePollModal onClose={() => setShowPollModal(false)} />}
    </div>
  );
};

export default MessageInput;
