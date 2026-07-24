import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";
import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";



const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://AIGramX-frontend-swart.vercel.app"],
    },
});

// used to store online users and their multiple tabs
const userSockets = new Map<string, Set<string>>();

// used to store users currently in a call (busy)
const busyUsers = new Set<string>();

// Track active group calls: GroupId -> Set of UserIds
const activeGroupCalls = new Map<string, Set<string>>();

// Track active 1-on-1 / multi-party calls: CallId (Original CallerId) -> Set of UserIds
const activeCalls = new Map<string, Set<string>>();

export function getReceiverSocketId(userId: string) {
    const sockets = userSockets.get(userId);
    if (sockets) return Array.from(sockets);
    return null;
}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (typeof userId === "string") {
        socket.join(userId);

        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        // Join all group rooms the user is a member of
        Group.find({ "members.user": userId }).then(groups => {
            groups.forEach(group => {
                socket.join(`group_${group._id}`);
            });
        }).catch(err => console.error("Error joining group rooms:", err));
    }

    //io.emit() is used to send a message to all connected clients
    io.emit("getOnlineUsers", Array.from(userSockets.keys()));

    socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);
        if (typeof userId === "string") {
            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                    try {
                        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                    } catch (e) { console.error("Error updating lastSeen", e); }
                }
            }
        }
        io.emit("getOnlineUsers", Array.from(userSockets.keys()));
    });

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log("A user joined the room", socket.id, roomId);
    });

    socket.on("typing", ({ receiverId, groupId }) => {
        if (typeof userId === "string") {
            if (groupId) {
                socket.to(`group_${groupId}`).emit("userTyping", { userId, groupId });
            } else if (receiverId) {
                io.to(receiverId).emit("userTyping", { userId });
            }
        }
    });

    socket.on("recordingAudio", ({ receiverId, groupId }) => {
        if (typeof userId === "string") {
            if (groupId) {
                socket.to(`group_${groupId}`).emit("userRecordingAudio", { userId, groupId });
            } else if (receiverId) {
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userRecordingAudio", { userId });
                }
            }
        }
    });

    // --- WebRTC & Calling Signaling ---

    socket.on("CALL_INITIATE", async ({ receiverId, callerInfo, callType }) => {
        const callerId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;

        if (userSockets.has(receiverId)) {
            if (busyUsers.has(receiverId)) {
                // User is busy
                io.to(socket.id).emit("USER_BUSY", { receiverId });
                // Save busy call
                await new Call({
                    callerId,
                    receiverId,
                    type: callType,
                    status: "busy",
                    duration: 0,
                    participants: [callerId, receiverId]
                }).save();

                const msg = await new Message({
                    senderId: callerId,
                    receiverId,
                    callEvent: { status: "busy", callType, duration: 0 }
                }).save();
                io.to(socket.id).emit("newMessage", msg);
                io.to(receiverId).emit("newMessage", msg);

            } else {
                // Forward the call request
                io.to(receiverId).emit("CALL_INCOMING", {
                    callerId,
                    callerInfo,
                    callType
                });
            }
        } else {
            // User is offline
            io.to(socket.id).emit("USER_OFFLINE", { receiverId });

            await new Call({
                callerId,
                receiverId,
                type: callType,
                status: "missed",
                duration: 0,
                participants: [callerId, receiverId]
            }).save();

            const msg = await new Message({
                senderId: callerId,
                receiverId,
                callEvent: { status: "missed", callType, duration: 0 }
            }).save();

            io.to(socket.id).emit("newMessage", msg);
        }
    });

    socket.on("stopTyping", ({ receiverId, groupId }) => {
        if (typeof userId === "string") {
            if (groupId) {
                socket.to(`group_${groupId}`).emit("userStoppedTyping", { userId, groupId });
            } else if (receiverId) {
                io.to(receiverId).emit("userStoppedTyping", { userId });
            }
        }
    });

    socket.on("stopRecordingAudio", ({ receiverId, groupId }) => {
        if (typeof userId === "string") {
            if (groupId) {
                socket.to(`group_${groupId}`).emit("userStoppedRecordingAudio", { userId, groupId });
            } else if (receiverId) {
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userStoppedRecordingAudio", { userId });
                }
            }
        }
    });

    // 2. Accept Call
    socket.on("CALL_ACCEPT", ({ callerId }) => {
        const receiverId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        if (typeof userId === "string") busyUsers.add(userId);

        if (!activeCalls.has(callerId)) {
            activeCalls.set(callerId, new Set([callerId, receiverId]));
        } else {
            activeCalls.get(callerId)!.add(receiverId);
        }

        if (userSockets.has(callerId)) {
            busyUsers.add(callerId);
            io.to(callerId).emit("CALL_ACCEPTED", {
                receiverId,
                callId: callerId
            });
        }
    });

    // 3. Reject Call
    socket.on("CALL_REJECT", async ({ callerId, callType }) => {
        const receiverId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;

        await new Call({
            callerId,
            receiverId,
            type: callType || "audio",
            status: "rejected",
            duration: 0,
            participants: [callerId, receiverId]
        }).save();

        const msg = await new Message({
            senderId: callerId,
            receiverId,
            callEvent: { status: "rejected", callType: callType || "audio", duration: 0 }
        }).save();

        if (userSockets.has(callerId)) {
            io.to(callerId).emit("CALL_REJECTED", { receiverId });
            io.to(callerId).emit("newMessage", msg);
        }
        if (userSockets.has(receiverId)) {
            io.to(receiverId).emit("newMessage", msg);
        }
    });

    // 4. Cancel Call (Caller cancels before answer)
    socket.on("CALL_CANCEL", async ({ receiverId, callType }) => {
        const callerId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;

        await new Call({
            callerId,
            receiverId,
            type: callType || "audio",
            status: "missed",
            duration: 0,
            participants: [callerId, receiverId]
        }).save();

        const msg = await new Message({
            senderId: callerId,
            receiverId,
            callEvent: { status: "missed", callType: callType || "audio", duration: 0 }
        }).save();

        if (userSockets.has(receiverId)) {
            io.to(receiverId).emit("CALL_CANCELLED", { callerId });
            io.to(receiverId).emit("newMessage", msg);
        }
        if (userSockets.has(callerId)) {
            io.to(callerId).emit("newMessage", msg);
        }
    });

    // 5. End Call
    socket.on("CALL_END", async ({ targetId, duration, callType, callId }) => {
        const currentUserId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;

        if (typeof userId === "string") busyUsers.delete(userId);

        let shouldEndCallForEveryone = false;
        let remainingParticipants = new Set<string>();

        // Remove from activeCalls
        const activeCallId = callId || currentUserId;
        if (activeCalls.has(activeCallId)) {
            const participants = activeCalls.get(activeCallId)!;
            participants.delete(currentUserId);

            remainingParticipants = new Set(participants);

            // Notify others that someone left
            participants.forEach(pId => {
                io.to(pId).emit("CALL_PARTICIPANT_LEFT", { userId: currentUserId, callId: activeCallId });
            });

            if (participants.size <= 1) {
                activeCalls.delete(activeCallId);
                shouldEndCallForEveryone = true;
            }
        } else {
            shouldEndCallForEveryone = true;
        }

        // Save call log message
        if (targetId) {
            try {
                await new Call({
                    callerId: currentUserId,
                    receiverId: targetId,
                    type: callType || "audio",
                    status: "ended",
                    duration: duration || 0,
                    participants: [currentUserId, targetId]
                }).save();

                const msg = await new Message({
                    senderId: currentUserId,
                    receiverId: targetId,
                    callEvent: { status: "ended", callType: callType || "audio", duration: duration || 0 }
                }).save();

                if (userSockets.has(targetId)) {
                    io.to(targetId).emit("newMessage", msg);
                }
                if (userSockets.has(currentUserId)) {
                    io.to(currentUserId).emit("newMessage", msg);
                }
            } catch (err) {
                console.error("Error saving call log on end:", err);
            }
        }

        if (shouldEndCallForEveryone) {
            remainingParticipants.forEach(pId => {
                if (userSockets.has(pId)) {
                    io.to(pId).emit("CALL_ENDED", { enderId: currentUserId });
                }
            });
            if (targetId && !remainingParticipants.has(targetId) && userSockets.has(targetId)) {
                io.to(targetId).emit("CALL_ENDED", { enderId: currentUserId });
            }
        }
    });

    // 6. WebRTC Signaling (SDP Offer/Answer & ICE Candidates)
    socket.on("WEBRTC_SIGNAL", ({ targetId, signalData, callId }) => {
        const senderId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        console.log(`[Socket] WEBRTC_SIGNAL (${signalData.type}) from ${senderId} to ${targetId}`);
        if (userSockets.has(targetId)) {
            io.to(targetId).emit("WEBRTC_SIGNAL", {
                senderId,
                signalData,
                callId
            });
        } else {
            console.log(`[Socket] Target ${targetId} is offline for WEBRTC_SIGNAL`);
        }
    });

    // --- Add Participants to Call ---
    socket.on("ADD_PARTICIPANT_REQUEST", ({ targetId, callId, callerInfo }) => {
        const inviterId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        console.log(`[Socket] ADD_PARTICIPANT_REQUEST from ${inviterId} to ${targetId} for call ${callId}`);

        if (userSockets.has(targetId) && !busyUsers.has(targetId)) {
            io.to(targetId).emit("ADD_PARTICIPANT_INCOMING", {
                inviterId,
                callerInfo,
                callId
            });
        } else {
            console.log(`[Socket] ADD_PARTICIPANT_FAILED for ${targetId} (busy/offline)`);
            io.to(socket.id).emit("ADD_PARTICIPANT_FAILED", { targetId, reason: busyUsers.has(targetId) ? "busy" : "offline" });
        }
    });

    socket.on("ADD_PARTICIPANT_ACCEPT", ({ callId }) => {
        const joinerId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        console.log(`[Socket] ADD_PARTICIPANT_ACCEPT by ${joinerId} for call ${callId}`);
        busyUsers.add(joinerId);

        if (activeCalls.has(callId)) {
            const participants = activeCalls.get(callId)!;
            participants.add(joinerId);

            console.log(`[Socket] Call ${callId} now has participants:`, Array.from(participants));
            // Notify existing participants (excluding joiner)
            participants.forEach(participantId => {
                if (participantId !== joinerId) {
                    console.log(`[Socket] Notifying ${participantId} that ${joinerId} joined`);
                    io.to(participantId).emit("CALL_PARTICIPANT_JOINED", {
                        userId: joinerId,
                        callId
                    });
                }
            });
        } else {
            console.log(`[Socket] Call ${callId} not found in activeCalls!`);
        }
    });

    socket.on("ADD_PARTICIPANT_REJECT", ({ callId, inviterId }) => {
        const rejecterId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        console.log(`[Socket] ADD_PARTICIPANT_REJECT by ${rejecterId} for call ${callId}`);
        if (userSockets.has(inviterId)) {
            io.to(inviterId).emit("ADD_PARTICIPANT_REJECTED", { callId, userId: rejecterId });
        }
    });

    // --- Group Calling ---
    socket.on("GROUP_CALL_INITIATE", ({ groupId, callerInfo, callType }) => {
        if (!activeGroupCalls.has(groupId)) {
            activeGroupCalls.set(groupId, new Set());
        }
        const currentUserId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        activeGroupCalls.get(groupId)!.add(currentUserId);

        socket.to(`group_${groupId}`).emit("GROUP_CALL_INCOMING", {
            groupId,
            callerId: currentUserId,
            callerInfo,
            callType,
            participants: Array.from(activeGroupCalls.get(groupId)!)
        });
    });

    socket.on("JOIN_GROUP_CALL", ({ groupId }) => {
        const currentUserId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        if (!activeGroupCalls.has(groupId)) {
            activeGroupCalls.set(groupId, new Set());
        }
        activeGroupCalls.get(groupId)!.add(currentUserId);

        // Notify others in the group that someone joined the call
        socket.to(`group_${groupId}`).emit("GROUP_USER_JOINED", {
            userId: currentUserId,
            participants: Array.from(activeGroupCalls.get(groupId)!)
        });
    });

    socket.on("LEAVE_GROUP_CALL", async ({ groupId, duration, callType }) => {
        const currentUserId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        if (activeGroupCalls.has(groupId)) {
            activeGroupCalls.get(groupId)!.delete(currentUserId);
            socket.to(`group_${groupId}`).emit("GROUP_USER_LEFT", {
                userId: currentUserId,
                participants: Array.from(activeGroupCalls.get(groupId)!)
            });

            // Save group call record for this user
            await new Call({
                callerId: currentUserId,
                groupId: groupId,
                type: callType || "audio",
                status: "ended",
                duration: duration || 0,
                participants: [currentUserId]
            }).save();

            const msg = await new Message({
                senderId: currentUserId,
                groupId: groupId,
                callEvent: { status: "ended", callType: callType || "audio", duration: duration || 0 }
            }).save();
            socket.to(`group_${groupId}`).emit("newGroupMessage", msg);
            io.to(socket.id).emit("newGroupMessage", msg);

            // If empty, cleanup
            if (activeGroupCalls.get(groupId)!.size === 0) {
                activeGroupCalls.delete(groupId);
            }
        }
    });

    socket.on("GROUP_WEBRTC_SIGNAL", ({ targetId, groupId, signalData }) => {
        if (userSockets.has(targetId)) {
            io.to(targetId).emit("GROUP_WEBRTC_SIGNAL", {
                senderId: typeof userId === "string" ? userId : socket.handshake.query.userId,
                groupId,
                signalData
            });
        }
    });

    // 7. Handle cleanup on disconnect
    socket.on("disconnect", () => {
        if (typeof userId === "string") {
            busyUsers.delete(userId);

            // Remove from any active group calls
            activeGroupCalls.forEach((participants, groupId) => {
                if (participants.has(userId)) {
                    participants.delete(userId);
                    io.to(`group_${groupId}`).emit("GROUP_USER_LEFT", {
                        userId: userId,
                        participants: Array.from(participants)
                    });
                    if (participants.size === 0) {
                        activeGroupCalls.delete(groupId);
                    }
                }
            });

            // Remove from any multiparty ad-hoc calls
            activeCalls.forEach((participants, callId) => {
                if (participants.has(userId)) {
                    participants.delete(userId);
                    participants.forEach(pId => {
                        io.to(pId).emit("CALL_PARTICIPANT_LEFT", { userId, callId });
                    });
                    if (participants.size <= 1) {
                        activeCalls.delete(callId);
                        participants.forEach(pId => {
                            io.to(pId).emit("CALL_ENDED", { enderId: userId });
                        });
                    }
                }
            });
        }
    });
});



export { io, app, server };