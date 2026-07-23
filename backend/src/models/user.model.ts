import mongoose, { Document, Model } from "mongoose";

export interface UserType extends Document {
    email: string;
    fullName: string;
    password: string;
    profilePic?: string;
    archivedChats: mongoose.Types.ObjectId[];
    archivedGroups: mongoose.Types.ObjectId[];
    pinnedChats: mongoose.Types.ObjectId[];
    pinnedGroups: mongoose.Types.ObjectId[];
    mutedChats: { chatId: string, chatModel: "User" | "Group", mutedUntil: Date }[];
    wallpapers: { chatId: string, chatModel: "User" | "Group", url: string }[];
    lastSeen?: Date;
}

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePic: {
        type: String,
        default: ""
    },
    archivedChats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    archivedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    }],
    pinnedChats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    pinnedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    }],
    mutedChats: [{
        chatId: { type: String, required: true },
        chatModel: { type: String, enum: ['User', 'Group'], required: true },
        mutedUntil: { type: Date, required: true }
    }],
    wallpapers: [{
        chatId: { type: String, required: true },
        chatModel: { type: String, enum: ['User', 'Group'], required: true },
        url: { type: String, required: true }
    }],
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }
);

const User: Model<UserType> = mongoose.model<UserType>("User", userSchema);

export default User;