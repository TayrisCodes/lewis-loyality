import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReward extends Document {
  customerId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  code: string;
  rewardType: string;
  issuedAt: Date;
  expiresAt: Date;
  status: "unused" | "used";
  usedAt?: Date;
}

const RewardSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  rewardType: {
    type: String,
    default: "Lewis Gift Card",
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["unused", "used"],
    default: "unused",
  },
  usedAt: Date,
});

// Indexes - Remove duplicate code index since it's already unique
RewardSchema.index({ customerId: 1 });

const Reward: Model<IReward> =
  mongoose.models.Reward || mongoose.model<IReward>("Reward", RewardSchema);

export default Reward;