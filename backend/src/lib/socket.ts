import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";
import Call from "../models/call.model.js";



const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://texts-frontend-swart.vercel.app"],
    },
});

export function getReceiverSocketId(userId: string){
    return userSocketMap[userId];
}

//used to store online users
const userSocketMap: { [key: string]: string } = {};

// used to store users currently in a call (busy)
const busyUsers = new Set<string>();

// Track active group calls: GroupId -> Set of UserIds
const activeGroupCalls = new Map<string, Set<string>>();

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (typeof userId === "string") {
      userSocketMap[userId] = socket.id;
      
      // Join all group rooms the user is a member of
      Group.find({ "members.user": userId }).then(groups => {
          groups.forEach(group => {
              socket.join(`group_${group._id}`);
          });
      }).catch(err => console.error("Error joining group rooms:", err));
    }

    //io.emit() is used to send a message to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
        if (typeof userId === "string") {
          delete userSocketMap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
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
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userTyping", { userId });
                }
            }
        }
    });

    // --- WebRTC & Calling Signaling ---

    // 1. Initiate Call
    socket.on("CALL_INITIATE", async ({ receiverId, callerInfo, callType }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            if (busyUsers.has(receiverId)) {
                // User is busy
                io.to(socket.id).emit("USER_BUSY", { receiverId });
                // Save missed/busy call
                const callerId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
                await new Call({
                    callerId,
                    receiverId,
                    type: callType,
                    status: "busy",
                    duration: 0,
                    participants: [callerId, receiverId]
                }).save();
            } else {
                // Forward the call request
                io.to(receiverSocketId).emit("CALL_INCOMING", { 
                    callerId: typeof userId === "string" ? userId : socket.handshake.query.userId, 
                    callerInfo,
                    callType 
                });
            }
        }
    });

    socket.on("stopTyping", ({ receiverId, groupId }) => {
        if (typeof userId === "string") {
            if (groupId) {
                socket.to(`group_${groupId}`).emit("userStoppedTyping", { userId, groupId });
            } else if (receiverId) {
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userStoppedTyping", { userId });
                }
            }
        }
    });

    // 2. Accept Call
    socket.on("CALL_ACCEPT", ({ callerId }) => {
        const callerSocketId = getReceiverSocketId(callerId);
        if (typeof userId === "string") busyUsers.add(userId);
        if (callerSocketId) {
            busyUsers.add(callerId);
            io.to(callerSocketId).emit("CALL_ACCEPTED", { 
                receiverId: typeof userId === "string" ? userId : socket.handshake.query.userId 
            });
        }
    });

    // 3. Reject Call
    socket.on("CALL_REJECT", async ({ callerId, callType }) => {
        const callerSocketId = getReceiverSocketId(callerId);
        const receiverId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        
        await new Call({
            callerId,
            receiverId,
            type: callType || "audio",
            status: "rejected",
            duration: 0,
            participants: [callerId, receiverId]
        }).save();

        if (callerSocketId) {
            io.to(callerSocketId).emit("CALL_REJECTED", { receiverId });
        }
    });

    // 4. Cancel Call (Caller cancels before answer)
    socket.on("CALL_CANCEL", async ({ receiverId, callType }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        const callerId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        
        await new Call({
            callerId,
            receiverId,
            type: callType || "audio",
            status: "missed",
            duration: 0,
            participants: [callerId, receiverId]
        }).save();

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("CALL_CANCELLED", { callerId });
        }
    });

    // 5. End Call
    socket.on("CALL_END", async ({ targetId, duration, callType }) => {
        const targetSocketId = getReceiverSocketId(targetId);
        const currentUserId = typeof userId === "string" ? userId : socket.handshake.query.userId as string;
        
        if (typeof userId === "string") busyUsers.delete(userId);
        if (targetId) busyUsers.delete(targetId);

        // Save call
        await new Call({
            callerId: currentUserId,
            receiverId: targetId,
            type: callType || "audio",
            status: "ended",
            duration: duration || 0,
            participants: [currentUserId, targetId]
        }).save();

        if (targetSocketId) {
            io.to(targetSocketId).emit("CALL_ENDED", { enderId: currentUserId });
        }
    });

    // 6. WebRTC Signaling (SDP Offer/Answer & ICE Candidates)
    socket.on("WEBRTC_SIGNAL", ({ targetId, signalData }) => {
        const targetSocketId = getReceiverSocketId(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit("WEBRTC_SIGNAL", { 
                senderId: typeof userId === "string" ? userId : socket.handshake.query.userId, 
                signalData 
            });
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

            // If empty, cleanup
            if (activeGroupCalls.get(groupId)!.size === 0) {
                activeGroupCalls.delete(groupId);
            }
        }
    });

    socket.on("GROUP_WEBRTC_SIGNAL", ({ targetId, groupId, signalData }) => {
        const targetSocketId = getReceiverSocketId(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit("GROUP_WEBRTC_SIGNAL", { 
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
        }
    });
});



export { io, app, server };