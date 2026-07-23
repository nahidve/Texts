import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";



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
});



export { io, app, server };