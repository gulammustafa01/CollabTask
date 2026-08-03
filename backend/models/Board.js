import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Board", boardSchema);
