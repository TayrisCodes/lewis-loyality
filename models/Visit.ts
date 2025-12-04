import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisit extends Document {
  customerId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  timestamp: Date;
  rewardEarned: boolean;
  
  // Receipt verification fields
  receiptId?: mongoose.Types.ObjectId;  // Reference to Receipt if visit was via receipt
  visitMethod: 'qr' | 'receipt';  // How the visit was recorded
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
  
  // Receipt verification fields
  receiptId: {
    type: Schema.Types.ObjectId,
    ref: "Receipt",
    required: false,
  },
  visitMethod: {
    type: String,
    enum: ['qr', 'receipt'],
    default: 'qr',
    required: true,
  },
});

// Indexes
VisitSchema.index({ customerId: 1, timestamp: -1 });
VisitSchema.index({ storeId: 1, timestamp: -1 });
VisitSchema.index({ receiptId: 1 });  // Index for receipt-based visits
VisitSchema.index({ visitMethod: 1, timestamp: -1 });  // Index for filtering by method

const Visit: Model<IVisit> =
  mongoose.models.Visit || mongoose.model<IVisit>("Visit", VisitSchema);

export default Visit;




