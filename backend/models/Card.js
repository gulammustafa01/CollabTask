import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    list: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    aiSuggested: { type: Boolean, default: false },
    dueDate: { type: Date },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    order: { type: Number, required: true, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Card", cardSchema);
