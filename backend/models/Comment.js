import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    card: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true, index: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
