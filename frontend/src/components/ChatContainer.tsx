import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
// import { Pin, Edit2, SmilePlus, Reply, Forward, Trash2, Phone, Video } from "lucide-react";
import { Pin, Edit2, SmilePlus, Reply, Forward, Trash2, Mic, Star, Clock, BellOff, Phone, Video, Download, File as FileIcon } from "lucide-react";
import ForwardModal from "./ForwardModal";
import VoiceMessage from "./VoiceMessage";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
    votePoll,
    pinMessage,
    setEditingMessage,
    setReplyingToMessage,
    reactToMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    typingUsers,
    recordingAudioUsers,
    localSearchQuery,
    highlightedMessageId,
    setHighlightedMessageId,
    toggleStarMessage
  } = useChatStore();

  const [forwardingMessage, setForwardingMessage] = useState<any>(null);

  const { authUser } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedGroup) {
      getMessages(selectedGroup._id, true);
    } else if (selectedUser) {
      getMessages(selectedUser._id, false);
    }

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, selectedGroup?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages && !highlightedMessageId) {
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, highlightedMessageId]);

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      setTimeout(() => {
        messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        // Optional: clear the highlight after a few seconds so it doesn't get stuck
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }, 500);
    }
  }, [highlightedMessageId]);

  const filteredMessages = localSearchQuery
    ? messages.filter((m) => m.text?.toLowerCase().includes(localSearchQuery.toLowerCase()))
    : messages;

  const getSenderInfo = (senderId: string) => {
    if (selectedUser && senderId === selectedUser._id) {
      return { name: selectedUser.fullName, avatar: selectedUser.profilePic };
    }
    if (selectedGroup) {
      const member = selectedGroup.members.find((m: any) => m.user?._id === senderId);
      if (member) return { name: member.user?.fullName, avatar: member.user?.profilePic };
    }
    return { name: "Unknown", avatar: "/avatar.png" };
  };

  const isAdminOrOwner = selectedGroup?.members.some((m: any) => m.user?._id === authUser?._id && (m.role === "admin" || m.role === "owner"));
  const canPin = !selectedGroup || selectedGroup.permissions?.memberCanPinMessages || isAdminOrOwner;

  const pinnedMessages = messages.filter(m => m.isPinned);

  const targetId = selectedGroup?._id || selectedUser?._id;
  const isGroup = !!selectedGroup;
  const currentWallpaper = authUser?.wallpapers?.find((w: any) => w.chatId === targetId && w.chatModel === (isGroup ? 'Group' : 'User'))?.url;

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      {pinnedMessages.length > 0 && (
        <div className="bg-base-200/50 border-b border-base-300 p-2 px-4 flex items-center gap-3 backdrop-blur-md sticky top-0 z-20">
          <Pin className="text-primary size-4" />
          <div className="flex-1 overflow-hidden flex gap-2">
            <span className="font-semibold text-xs text-primary shrink-0">Pinned Message:</span>
            <span className="text-xs text-base-content/70 truncate">{pinnedMessages[pinnedMessages.length - 1].text || "Attachment"}</span>
          </div>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto p-4 space-y-6 relative ${currentWallpaper ? 'bg-cover bg-center bg-no-repeat bg-fixed' : 'bg-base-100'}`}
        style={currentWallpaper ? { backgroundImage: `url(${currentWallpaper})` } : {}}
      >
        {/* Dark overlay for better text readability on wallpapers */}
        {currentWallpaper && <div className="absolute inset-0 bg-base-100/40 z-0 pointer-events-none" />}

        <div className="relative z-10 space-y-6">
          {filteredMessages.map((message) => {
            const isMe = message.senderId === authUser?._id;
            const senderInfo = getSenderInfo(message.senderId);
            const isHighlighted = message._id === highlightedMessageId;
            return (
              <div
                key={message._id}
                ref={(el) => { messageRefs.current[message._id] = el; }}
                id={`msg-${message._id}`}
                className={`w-full flex ${isMe ? "justify-end" : "justify-start"} group relative ${isHighlighted ? 'animate-pulse bg-primary/10 rounded-xl p-2' : ''}`}
              >
                <div className={`flex items-end gap-3 max-w-[75%]`}>
                  {!isMe && (
                    <div className="avatar shrink-0 self-end">
                      <div className="w-10 h-10 rounded-xl border shadow-sm overflow-hidden" title={senderInfo.name}>
                        <img
                          src={senderInfo.avatar || "/avatar.png"}
                          alt="profile"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && selectedGroup && (
                      <span className="text-xs font-semibold text-primary pl-1">{senderInfo.name}</span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl border shadow-sm break-words whitespace-pre-wrap relative text-[15px] ${
                        isMe 
                          ? "rounded-br-sm bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white border-transparent shadow-cyan-500/20" 
                          : "rounded-bl-sm bg-white/80 border-white/60 text-slate-800 backdrop-blur-sm"
                      } ${message.isPinned ? "ring-2 ring-yellow-400" : ""} ${message.audio && !message.text ? "p-0 shadow-none border-none bg-transparent" : ""}`}
                    >
                      {/* Hover Actions */}
                      <div className={`absolute -top-3 ${isMe ? "-left-20" : "-right-20"} hidden group-hover:flex items-center gap-0.5 bg-base-200 border border-base-300 rounded-lg shadow-md p-1 z-10`}>
                        <div className="dropdown dropdown-top dropdown-end">
                          <div tabIndex={0} role="button" className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-yellow-500 transition-colors" title="React">
                            <SmilePlus size={14} />
                          </div>
                          <ul tabIndex={0} className="dropdown-content z-[1] p-1 shadow bg-base-100 rounded-box w-max flex gap-1 mb-1 border border-base-300">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                              <li key={emoji}>
                                <button onClick={() => reactToMessage(message._id, emoji)} className="text-xl hover:bg-base-200 rounded-lg p-1.5 transition-transform hover:scale-125">{emoji}</button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {canPin && (
                          <button onClick={() => pinMessage(message._id)} className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-primary transition-colors" title={message.isPinned ? "Unpin" : "Pin"}>
                            <Pin size={14} className={message.isPinned ? "fill-primary text-primary" : ""} />
                          </button>
                        )}
                        <button onClick={() => setReplyingToMessage(message)} className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-blue-500 transition-colors" title="Reply">
                          <Reply size={14} />
                        </button>
                        <button onClick={() => setForwardingMessage(message)} className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-green-500 transition-colors" title="Forward">
                          <Forward size={14} />
                        </button>
                        <button onClick={() => toggleStarMessage(message._id)} className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-yellow-500 transition-colors" title="Star message">
                          <Star size={14} className={authUser && message.starredBy?.includes(authUser._id) ? 'fill-yellow-500 text-yellow-500' : ''} />
                        </button>
                        <div className="dropdown dropdown-top dropdown-end">
                          <div tabIndex={0} role="button" className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </div>
                          <ul tabIndex={0} className="dropdown-content z-[1] menu p-1.5 shadow-xl bg-base-100 rounded-box w-max mb-1 border border-base-300">
                            <li>
                              <button onClick={() => deleteMessageForMe(message._id)} className="text-xs text-red-500 hover:bg-red-500/10">Delete for me</button>
                            </li>
                            {isMe && (
                              <li>
                                <button onClick={() => deleteMessageForEveryone(message._id)} className="text-xs text-red-500 hover:bg-red-500/10">Delete for everyone</button>
                              </li>
                            )}
                          </ul>
                        </div>
                        {isMe && (!message.poll || !message.poll.question) && !message.image && (
                          <button onClick={() => setEditingMessage(message)} className="p-1.5 hover:bg-base-300 rounded-md text-zinc-400 hover:text-accent transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>

                      {message.isPinned && (
                        <div className="flex items-center gap-1 text-primary text-[10px] uppercase font-bold mb-1 opacity-70">
                          <Pin size={10} className="fill-primary" /> Pinned
                        </div>
                      )}
                      {authUser && message.starredBy?.includes(authUser._id) && (
                        <div className="flex items-center gap-1 text-yellow-500 text-[10px] uppercase font-bold mb-1 opacity-90">
                          <Star size={10} className="fill-yellow-500" /> Starred
                        </div>
                      )}
                      {message.isForwarded && (
                        <div className="flex items-center gap-1 text-[10px] text-base-content/60 italic mb-1">
                          <Forward size={10} /> Forwarded
                        </div>
                      )}
                      {message.replyTo && typeof message.replyTo === 'object' && (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`msg-${message.replyTo._id}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={`mb-1.5 p-2 rounded-lg bg-base-300/50 border-l-4 border-primary text-xs cursor-pointer hover:bg-base-300 transition-colors ${isMe ? "opacity-80" : ""}`}
                        >
                          <div className="font-semibold text-primary mb-0.5">{message.replyTo.senderId === authUser?._id ? "You" : (selectedGroup?.members.find((m: any) => m.user?._id === message.replyTo.senderId)?.user?.fullName || "Someone")}</div>
                          <div className="truncate text-base-content/70">{message.replyTo.text || (message.replyTo.image ? "Image" : "Poll")}</div>
                        </div>
                      )}
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="max-w-[200px] rounded-md mb-2 border"
                        />
                      )}
                      {message.audio && (
                        <div className="mb-2">
                          <VoiceMessage
                            audioUrl={message.audio}
                            duration={message.audioDuration}
                            isMe={isMe}
                          />
                        </div>
                      )}
                      {message.fileUrl && (
                        <div className="mb-2">
                          <div className={`flex items-center gap-3 p-3 rounded-xl border min-w-[200px] max-w-xs ${isMe ? 'bg-primary/20 border-primary/30 text-primary-content' : 'bg-base-200 border-base-300'}`}>
                            <div className={`p-2 rounded-lg ${isMe ? 'bg-primary/30 text-primary-content' : 'bg-primary/10 text-primary'}`}>
                              <FileIcon size={20} />
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <span className="text-sm font-semibold truncate" title={message.fileName || "File"}>{message.fileName || "File"}</span>
                              <span className="text-[10px] uppercase font-bold opacity-70">Document</span>
                            </div>
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={message.fileName}
                              className={`p-2 rounded-full transition-colors ${isMe ? 'hover:bg-primary/40 text-primary-content' : 'hover:bg-base-300 text-base-content/70 hover:text-primary'}`}
                              title="Download File"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        </div>
                      )}
                      {message.text && (
                        <div className="text-sm">
                          {message.text.split(/(@[a-zA-Z0-9_ ]+|https?:\/\/[^\s]+)/g).map((part: string, i: number) => {
                            if (part === "@all") {
                              return <span key={i} className="text-accent font-bold bg-accent/10 px-1 rounded">{part}</span>;
                            }
                            if (part.startsWith("http://") || part.startsWith("https://")) {
                              if (part.includes("/join/")) {
                                return (
                                  <div key={i} className="mt-2 mb-1">
                                    <a href={part} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary shadow-md hover:scale-105 transition-transform text-white">
                                      Join Group
                                    </a>
                                  </div>
                                );
                              }
                              return (
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                  {part}
                                </a>
                              );
                            }
                            const mentionedMember = selectedGroup?.members.find((m: any) => m.user && `@${m.user.fullName}` === part);
                            if (mentionedMember && message.mentions?.includes(mentionedMember.user?._id)) {
                              return <span key={i} className="text-primary font-bold bg-primary/10 px-1 rounded">{part}</span>;
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                      )}

                      {message.poll && message.poll.question && (
                        <div className="mt-3 bg-base-100 p-4 rounded-xl border border-base-300 w-full min-w-[250px] shadow-sm">
                          <h4 className="font-bold mb-3 text-base">{message.poll.question}</h4>
                          <div className="space-y-2">
                            {message.poll.options.map((opt: any, idx: number) => {
                              const totalVotes = message.poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                              const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                              const hasVoted = opt.votes.includes(authUser?._id);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => votePoll(message._id, idx)}
                                  className={`w-full text-left relative overflow-hidden rounded-lg border p-2 transition-colors ${hasVoted ? 'border-primary/50 bg-primary/5' : 'border-base-300 hover:bg-base-200/50'}`}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                  <div className="relative flex justify-between items-center text-sm z-10">
                                    <span className={`font-medium ${hasVoted ? 'text-primary' : ''}`}>{opt.text}</span>
                                    <span className="text-xs font-semibold text-zinc-500 bg-base-100 px-1.5 py-0.5 rounded-md">{percent}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-xs text-zinc-500 mt-3 text-right">
                            {message.poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0)} votes
                          </div>
                        </div>
                      )}

                      {message.callEvent && message.callEvent.status && (
                        <div className="flex items-center gap-3 p-3 bg-base-300/50 rounded-xl border border-base-300 w-full min-w-[200px] mt-2 shadow-sm">
                          <div className={`p-2 rounded-full ${message.callEvent.status === 'missed' || message.callEvent.status === 'rejected' || message.callEvent.status === 'cancelled' ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'}`}>
                            {message.callEvent.callType === 'video' ? <Video className="size-5" /> : <Phone className="size-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold capitalize">
                              {message.callEvent.status === 'missed' ? 'Missed Call' :
                                message.callEvent.status === 'cancelled' ? 'Cancelled Call' :
                                  message.callEvent.status === 'ended' ? 'Call Ended' :
                                    message.callEvent.status === 'rejected' ? 'Declined Call' :
                                      message.callEvent.status === 'busy' ? 'User Busy' : 'Call'}
                            </span>
                            {message.callEvent.duration > 0 ? (
                              <span className="text-xs text-base-content/70 font-mono mt-0.5">{message.callEvent.duration}s</span>
                            ) : (
                              <span className="text-xs text-base-content/70 font-medium mt-0.5">{formatMessageTime(message.createdAt)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
                      {message.isScheduled && <span title="Scheduled Message"><Clock size={10} className="text-primary" /></span>}
                      {message.isSilent && <span title="Sent Silently"><BellOff size={10} className="text-zinc-400" /></span>}
                      {formatMessageTime(message.createdAt)}
                      {message.isEdited && <span className="italic">(edited)</span>}
                    </span>

                    {message.reactions && message.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        {message.reactions.map((reaction: any, idx: number) => {
                          const hasReacted = reaction.users?.includes(authUser?._id);
                          return (
                            <button
                              key={idx}
                              onClick={() => reactToMessage(message._id, reaction.emoji)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full border ${hasReacted ? 'bg-primary/20 border-primary/50' : 'bg-base-200/80 border-base-300'} hover:bg-base-300 transition-colors`}
                            >
                              <span>{reaction.emoji}</span>
                              <span className="font-semibold text-[10px] opacity-70">{reaction.users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing Indicator */}
        {typingUsers?.length > 0 && (
          <div className="w-full flex justify-start">
            <div className="flex items-center gap-3 bg-base-200/50 text-base-content/70 px-4 py-2 rounded-xl rounded-bl-none text-sm animate-pulse w-fit border border-base-300">
              <span className="loading loading-dots loading-sm text-primary"></span>
              <span className="italic font-medium">
                {typingUsers.map((id: string) => {
                  if (selectedGroup) {
                    const member = selectedGroup.members.find((m: any) => m.user?._id === id);
                    return member ? member.user?.fullName : "Someone";
                  }
                  return selectedUser?.fullName || "Someone";
                }).join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
              </span>
            </div>
          </div>
        )}

        {/* Recording Audio Indicator */}
        {recordingAudioUsers?.length > 0 && (
          <div className="w-full flex justify-start mt-2">
            <div className="flex items-center gap-3 bg-base-200/50 text-base-content/70 px-4 py-2 rounded-xl rounded-bl-none text-sm animate-pulse w-fit border border-base-300">
              <Mic className="size-4 text-primary animate-bounce" />
              <span className="italic font-medium">
                {recordingAudioUsers.map((id: string) => {
                  if (selectedGroup) {
                    const member = selectedGroup.members.find((m: any) => m.user?._id === id);
                    return member ? member.user?.fullName : "Someone";
                  }
                  return selectedUser?.fullName || "Someone";
                }).join(", ")} {recordingAudioUsers.length > 1 ? "are" : "is"} recording audio...
              </span>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <MessageInput />

      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </div>
  );



};
export default ChatContainer;