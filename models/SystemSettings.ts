import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettings extends Document {
  // Validation Rules
  validationRules: {
    allowedTINs: string[]; // Array of allowed TINs (multiple TINs supported)
    minReceiptAmount: number; // Minimum receipt amount in ETB
    receiptValidityHours: number; // Receipt age limit in hours
    requireStoreActive: boolean; // Store must be active
    requireReceiptUploadsEnabled: boolean; // Store must allow receipt uploads
  };

  // Visit Limits
  visitLimits: {
    visitLimitHours: number; // Hours between allowed visits (24-hour limit)
  };

  // Reward Rules
  rewardRules: {
    requiredVisits: number; // Number of visits needed for reward (default: 5)
    rewardPeriodDays: number; // Days within which visits must occur (default: 45)
  };

  // Reward Settings
  rewardSettings: {
    discountPercent: number; // Discount percentage (default: 10)
    initialExpirationDays: number; // Days until expiration after creation (default: 45)
    redemptionExpirationDays: number; // Days until expiration after redemption (default: 30)
  };

  // Track who last updated
  updatedBy?: mongoose.Types.ObjectId; // Superadmin who last updated
  updatedByEmail?: string; // Email for quick reference
  
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema(
  {
    validationRules: {
      allowedTINs: {
        type: [String],
        default: ['0003169685'], // Default TIN
        validate: {
          validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every(tin => /^[0-9]{6,20}$/.test(tin)),
          message: 'Allowed TINs must be an array of valid TIN numbers (6-20 digits)'
        }
      },
      minReceiptAmount: {
        type: Number,
        default: 2000, // Default minimum amount in ETB
        min: [0, 'Minimum receipt amount must be positive']
      },
      receiptValidityHours: {
        type: Number,
        default: 24, // Default: 24 hours
        min: [1, 'Receipt validity must be at least 1 hour']
      },
      requireStoreActive: {
        type: Boolean,
        default: true
      },
      requireReceiptUploadsEnabled: {
        type: Boolean,
        default: true
      }
    },
    
    visitLimits: {
      visitLimitHours: {
        type: Number,
        default: 24, // Default: 24 hours between visits
        min: [1, 'Visit limit must be at least 1 hour']
      }
    },
    
    rewardRules: {
      requiredVisits: {
        type: Number,
        default: 5, // Default: 5 visits needed
        min: [1, 'Required visits must be at least 1']
      },
      rewardPeriodDays: {
        type: Number,
        default: 45, // Default: 45 days
        min: [1, 'Reward period must be at least 1 day']
      }
    },
    
    rewardSettings: {
      discountPercent: {
        type: Number,
        default: 10, // Default: 10% discount
        min: [0, 'Discount percent must be non-negative'],
        max: [100, 'Discount percent cannot exceed 100']
      },
      initialExpirationDays: {
        type: Number,
        default: 45, // Default: 45 days from creation
        min: [1, 'Initial expiration must be at least 1 day']
      },
      redemptionExpirationDays: {
        type: Number,
        default: 30, // Default: 30 days after redemption
        min: [1, 'Redemption expiration must be at least 1 day']
      }
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    updatedByEmail: {
      type: String,
      required: false,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'systemsettings' // Explicit collection name
  }
);

// Ensure only one SystemSettings document exists (singleton pattern)
SystemSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);

export default SystemSettings;

