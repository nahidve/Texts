import { Server } from "socket.io";
import http from "http";
import express from "express";



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

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (typeof userId === "string") {
      userSocketMap[userId] = socket.id;
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

    // --- WebRTC & Calling Signaling ---

    // 1. Initiate Call
    socket.on("CALL_INITIATE", ({ receiverId, callerInfo, callType }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            if (busyUsers.has(receiverId)) {
                // User is busy
                io.to(socket.id).emit("USER_BUSY", { receiverId });
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
    socket.on("CALL_REJECT", ({ callerId }) => {
        const callerSocketId = getReceiverSocketId(callerId);
        if (callerSocketId) {
            io.to(callerSocketId).emit("CALL_REJECTED", { 
                receiverId: typeof userId === "string" ? userId : socket.handshake.query.userId 
            });
        }
    });

    // 4. Cancel Call (Caller cancels before answer)
    socket.on("CALL_CANCEL", ({ receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("CALL_CANCELLED", { 
                callerId: typeof userId === "string" ? userId : socket.handshake.query.userId 
            });
        }
    });

    // 5. End Call
    socket.on("CALL_END", ({ targetId }) => {
        const targetSocketId = getReceiverSocketId(targetId);
        
        if (typeof userId === "string") busyUsers.delete(userId);
        if (targetId) busyUsers.delete(targetId);

        if (targetSocketId) {
            io.to(targetSocketId).emit("CALL_ENDED", { 
                enderId: typeof userId === "string" ? userId : socket.handshake.query.userId 
            });
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
    
    // 7. Handle cleanup on disconnect
    socket.on("disconnect", () => {
        if (typeof userId === "string") {
            busyUsers.delete(userId);
        }
    });

});



export { io, app, server };