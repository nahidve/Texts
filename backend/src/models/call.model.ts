import mongoose, { Document, Model } from "mongoose";

export interface CallType extends Document {
  callerId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId; // Optional for group calls
  groupId?: mongoose.Types.ObjectId; // For group calls
  type: "audio" | "video";
  status: "accepted" | "rejected" | "missed" | "cancelled" | "busy" | "ended";
  duration: number; // in seconds
  participants: mongoose.Types.ObjectId[]; // All participants who joined
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["accepted", "rejected", "missed", "cancelled", "busy", "ended"],
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Call: Model<CallType> = mongoose.model<CallType>("Call", callSchema);

export default Call;
