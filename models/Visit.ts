import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisit extends Document {
  customerId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  timestamp: Date;
  rewardEarned: boolean;
}

const VisitSchema = new Schema({
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
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  rewardEarned: {
    type: Boolean,
    default: false,
  },
});

// Indexes
VisitSchema.index({ customerId: 1, timestamp: -1 });
VisitSchema.index({ storeId: 1, timestamp: -1 });

const Visit: Model<IVisit> =
  mongoose.models.Visit || mongoose.model<IVisit>("Visit", VisitSchema);

export default Visit;




