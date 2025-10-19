import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQRCode extends Document {
  storeId: mongoose.Types.ObjectId;
  qrData: string;
  qrImageUrl: string;
  token: string;
  expiresAt: Date;
  generatedAt: Date;
  scanCount: number;
  lastScanned?: Date;
}

const QRCodeSchema = new Schema({
  storeId: {
    type: Schema.Types.ObjectId,
    ref: "Store",
    required: true,
    unique: true,
  },
  qrData: {
    type: String,
    required: true,
  },
  qrImageUrl: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  scanCount: {
    type: Number,
    default: 0,
  },
  lastScanned: Date,
});

// Indexes - Remove duplicate storeId index since it's already unique
QRCodeSchema.index({ token: 1 });

const QRCode: Model<IQRCode> =
  mongoose.models.QRCode || mongoose.model<IQRCode>("QRCode", QRCodeSchema);

export default QRCode;




