import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, BarChart2, Check, XCircle, Smile } from "lucide-react";
import toast from "react-hot-toast";
import CreatePollModal from "./CreatePollModal";
import EmojiPicker from 'emoji-picker-react';

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sendMessage, selectedGroup, selectedUser, editingMessage, editMessage, setEditingMessage, replyingToMessage, setReplyingToMessage } = useChatStore();
  const { socket } = useAuthStore();

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursor, setMentionCursor] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

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
        mentions: finalMentions.length > 0 ? finalMentions : undefined,
      });

      setText("");
      setImagePreview(null);
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
        className={`relative flex items-center gap-3 bg-base-200/70 border backdrop-blur-md shadow-xl px-5 py-3 ${
          editingMessage || replyingToMessage ? 'rounded-b-2xl rounded-t-none border-primary/30 border-t-0 bg-primary/5' : 'rounded-2xl border-base-300'
        }`}
      >
        <input
          type="text"
          className="flex-1 bg-transparent focus:outline-none placeholder:italic placeholder:text-sm sm:placeholder:text-base text-base"
          placeholder="Type something"
          value={text}
          onChange={handleTextChange}
        />

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
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
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

        {/* Send / Save */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="transition-transform duration-200 p-2 rounded-full bg-primary text-primary-content hover:scale-110 shadow-md disabled:opacity-50"
        >
          {editingMessage ? <Check size={22} /> : <Send size={22} />}
        </button>
      </form>

      {/* Poll Modal Overlay */}
      {showPollModal && <CreatePollModal onClose={() => setShowPollModal(false)} />}
    </div>
  );
};

export default MessageInput;
