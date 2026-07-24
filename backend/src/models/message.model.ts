import mongoose, { Document, Model } from "mongoose";

export interface MessageType extends Document {
    senderId: mongoose.Types.ObjectId;
    receiverId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    text?: string;
    image?: string;
    audio?: string;
    audioDuration?: number;
    mentions?: mongoose.Types.ObjectId[];
    isPinned?: boolean;
    isEdited?: boolean;
    poll?: {
        question: string;
        options: {
            text: string;
            votes: mongoose.Types.ObjectId[];
        }[];
    };
    reactions?: {
        emoji: string;
        users: mongoose.Types.ObjectId[];
    }[];
    replyTo?: mongoose.Types.ObjectId | any;
    isForwarded?: boolean;
    isSilent?: boolean;
    scheduledFor?: Date;
    isScheduled?: boolean;
    callEvent?: {
        status: string;
        callType: string;
        duration: number;
    };
    deletedFor?: mongoose.Types.ObjectId[];
    starredBy?: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId, //this will store the id of the user who is sending the message along with the message and other details
        ref: "User",// this is the reference to the user model
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
    },
    //these below are not required true because we can send a message without an image or text or both or none of them; having required true would mean that we need to send both image and text all times
    text: {
        type: String,
    },
    image: {
        type: String,
    },
    audio: {
        type: String,
    },
    audioDuration: {
        type: Number,
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    isPinned: {
        type: Boolean,
        default: false,
    },
    isSilent: {
        type: Boolean,
        default: false,
    },
    scheduledFor: {
        type: Date,
        default: null
    },
    isScheduled: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    poll: {
        question: String,
        options: [{
            text: String,
            votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
        }]
    },
    reactions: [{
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    callEvent: {
        status: String, // e.g., "missed", "ended", "rejected", "cancelled", "busy"
        callType: String, // "audio" or "video"
        duration: Number
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    starredBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
},
    { timestamps: true }
);

const Message: Model<MessageType> = mongoose.model<MessageType>("Message", messageSchema);

export default Message;