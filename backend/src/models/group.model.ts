import mongoose, { Document, Model } from "mongoose";

export interface GroupMember {
  user: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "moderator" | "member";
  joinedAt: Date;
}

export interface GroupType extends Document {
  name: string;
  description?: string;
  avatar?: string;
  members: GroupMember[];
  joinLink: string;
  settings: {
    slowMode: number;
    anonymousAdmins: boolean;
    sharedMedia: boolean;
  };
  permissions: {
    memberCanSendMessages: boolean;
    memberCanSendMedia: boolean;
    memberCanPinMessages: boolean;
    memberCanAddMembers: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const groupMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["owner", "admin", "moderator", "member"],
    default: "member",
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  avatar: {
    type: String,
    default: "",
  },
  members: [groupMemberSchema],
  joinLink: {
    type: String,
    required: true,
    unique: true,
  },
  settings: {
    slowMode: { type: Number, default: 0 }, // seconds
    anonymousAdmins: { type: Boolean, default: false },
    sharedMedia: { type: Boolean, default: true },
  },
  permissions: {
    memberCanSendMessages: { type: Boolean, default: true },
    memberCanSendMedia: { type: Boolean, default: true },
    memberCanPinMessages: { type: Boolean, default: false },
    memberCanAddMembers: { type: Boolean, default: false },
  },
}, { timestamps: true });

const Group: Model<GroupType> = mongoose.model<GroupType>("Group", groupSchema);

export default Group;
