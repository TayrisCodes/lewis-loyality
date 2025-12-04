import mongoose, { Schema, Document, Model } from "mongoose";

export type ReceiptStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'flagged_manual_requested' | 'needs_store_selection';

export interface IReceipt extends Document {
  customerPhone?: string;
  customerId?: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;  // Optional - can be null for receipts without QR scan
  imageUrl: string;
  ocrText?: string;
  
  // Extracted fields from OCR
  tin?: string;
  branchText?: string;
  invoiceNo?: string;
  dateOnReceipt?: string;  // YYYY-MM-DD format
  totalAmount?: number;
  barcodeData?: string;
  
  // Validation and status
  status: ReceiptStatus;
  reason?: string;
  flags?: string[];  // Array of validation issues
  
  // Review information
  processedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Fraud detection fields
  imageHash?: string; // pHash for duplicate detection
  fraudScore?: number; // 0-100 (overall fraud score)
  tamperingScore?: number; // 0-100 (image tampering score)
  aiDetectionScore?: number; // 0-100 (AI generation probability)
  fraudFlags?: string[]; // Array of specific fraud indicators
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    customerPhone: {
      type: String,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: false,  // Optional - can be null for receipts uploaded without QR scan
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    ocrText: {
      type: String,
    },
    
    // Extracted fields
    tin: String,
    branchText: String,
    invoiceNo: {
      type: String,
      sparse: true,
      index: true,
    },
    dateOnReceipt: String,
    totalAmount: Number,
    barcodeData: {
      type: String,
      sparse: true,
      index: true,
    },
    
    // Validation
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged', 'flagged_manual_requested', 'needs_store_selection'],
      default: 'pending',
      index: true,
    },
    reason: String,
    flags: [String],
    
    // Review
    processedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
    
    // Fraud detection fields
    imageHash: {
      type: String,
      // Index is defined below at schema level (sparse index)
    },
    fraudScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    tamperingScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiDetectionScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    fraudFlags: [String],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ReceiptSchema.index({ storeId: 1, status: 1, createdAt: -1 });
ReceiptSchema.index({ customerPhone: 1, createdAt: -1 });
ReceiptSchema.index({ status: 1, createdAt: -1 });

// Fraud detection indexes
ReceiptSchema.index({ imageHash: 1 }, { sparse: true }); // For duplicate detection (sparse since imageHash is optional)
ReceiptSchema.index({ fraudScore: 1, status: 1 }); // For fraud queries

const Receipt: Model<IReceipt> =
  mongoose.models.Receipt || mongoose.model<IReceipt>("Receipt", ReceiptSchema);

export default Receipt;


