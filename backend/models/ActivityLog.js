import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. "card.created", "card.moved", "member.added"
    message: { type: String, required: true }, // human-readable summary
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
