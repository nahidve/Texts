import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, BarChart2, Check, XCircle, Mic, Trash2, Pause, Play, BellOff, Clock, Paperclip, Sticker } from "lucide-react";
import toast from "react-hot-toast";
import CreatePollModal from "./CreatePollModal";
import MediaPicker from "./MediaPicker";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sendMessage, selectedGroup, selectedUser, editingMessage, editMessage, setEditingMessage, replyingToMessage, setReplyingToMessage } = useChatStore();
  const { socket } = useAuthStore();

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursor, setMentionCursor] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
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
      setFilePreview(null);
      setFileName("");
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

  const processFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    processFile(file);
  };

  const removeFile = () => {
    setFilePreview(null);
    setFileName("");
    if (fileInputRef2.current) fileInputRef2.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        processFile(file);
      }
    }
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
    if (!text.trim() && !imagePreview && !audioPreview && !filePreview) return;

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
        file: filePreview,
        fileName: fileName,
        replyTo: replyingToMessage?._id,
        isSilent,
        scheduledFor
      });

      setText("");
      setImagePreview(null);
      setFilePreview(null);
      setFileName("");
      setAudioPreview(null);
      setIsSilent(false);
      setScheduledFor("");
      setShowMediaPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (fileInputRef2.current) fileInputRef2.current.value = "";

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

  const handleMediaSelect = async (url: string, type: 'gif' | 'sticker' | 'emoji') => {
    if (type === 'emoji') {
      setText(prev => prev + url);
      return;
    }

    // For GIFs and Stickers, send immediately as an image
    try {
      await sendMessage({
        text: "",
        image: url,
        replyTo: replyingToMessage?._id,
        isSilent,
        scheduledFor
      });
      setShowMediaPicker(false);
      setReplyingToMessage(null);
      setIsSilent(false);
      setScheduledFor("");
    } catch (error) {
      console.error("Failed to send media:", error);
      toast.error(`Failed to send ${type}`);
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
    <div
      className={`relative z-10 w-full px-4 pb-4 pt-2 backdrop-blur-md transition-all ${isDragging ? 'bg-primary/10 ring-2 ring-primary ring-inset rounded-t-xl' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-base-100/80 backdrop-blur-sm rounded-t-xl pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary font-bold animate-bounce">
            <div className="p-4 bg-primary/20 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" /></svg>
            </div>
            Drop files here to upload
          </div>
        </div>
      )}
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

      {/* File Preview */}
      {filePreview && (
        <div className="mb-3 flex items-center gap-3">
          <div className="relative group transition-transform hover:scale-[1.02] bg-base-200 border border-base-300 rounded-xl p-3 flex items-center gap-3 shadow-sm pr-10">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
              <span className="text-sm font-semibold truncate">{fileName}</span>
              <span className="text-xs text-base-content/60">Attached File</span>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full hover:bg-base-300 transition-all text-base-content/70 hover:text-red-500"
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

      {/* Media Picker Popup (GIFs, Stickers, Emojis) */}
      {showMediaPicker && !editingMessage && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
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

        <input
          type="file"
          accept=".pdf,.zip,.docx,.ppt,.pptx,.apk,.exe,.mp3"
          ref={fileInputRef2}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Attach File */}
        {!editingMessage && (
          <button
            type="button"
            onClick={() => fileInputRef2.current?.click()}
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 ${filePreview ? "text-primary" : "text-zinc-400"
              }`}
            title="Attach file"
          >
            <Paperclip size={22} />
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

        {/* Media (GIF/Sticker/Emoji) Button */}
        {!editingMessage && (
          <button
            type="button"
            onClick={() => setShowMediaPicker(!showMediaPicker)}
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 ${showMediaPicker ? "text-primary" : "text-zinc-400"}`}
            title="GIFs & Stickers"
          >
            <Sticker size={22} />
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
        ) : (text.trim() || imagePreview || filePreview) ? (
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
