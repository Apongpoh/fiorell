import mongoose, { Document, Schema } from "mongoose";

export interface ICryptoWallet extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Wallet details
  cryptocurrency: "bitcoin" | "monero";
  network: "mainnet" | "testnet";
  
  // Address information
  address: string;
  addressType: "receiving" | "change" | "user_provided";
  
  // Derivation path (for HD wallets)
  derivationPath?: string;
  addressIndex?: number;
  
  // Balance tracking
  balance: number; // Current balance in crypto
  balanceUSD: number; // USD equivalent
  lastBalanceCheck: Date;
  
  // Usage tracking
  isActive: boolean;
  usageCount: number; // How many times this address has been used
  totalReceived: number; // Total amount received
  totalSent: number; // Total amount sent
  
  // Security
  isWatchOnly: boolean; // True if we only watch this address
  encryptedPrivateKey?: string; // Encrypted private key (if we manage it)
  
  // Metadata
  label?: string; // User-defined label
  notes?: string; // Additional notes
  tags: string[]; // Tags for organization
  
  createdAt: Date;
  updatedAt: Date;
}

const CryptoWalletSchema = new Schema<ICryptoWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Wallet details
    cryptocurrency: {
      type: String,
      enum: ["bitcoin", "monero"],
      required: true,
      index: true,
    },
    network: {
      type: String,
      enum: ["mainnet", "testnet"],
      default: "mainnet",
      index: true,
    },
    
    // Address information
    address: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    addressType: {
      type: String,
      enum: ["receiving", "change", "user_provided"],
      default: "receiving",
    },
    
    // Derivation path (for HD wallets)
    derivationPath: {
      type: String,
      trim: true,
    },
    addressIndex: {
      type: Number,
      min: 0,
    },
    
    // Balance tracking
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceUSD: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastBalanceCheck: {
      type: Date,
      default: Date.now,
    },
    
    // Usage tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Security
    isWatchOnly: {
      type: Boolean,
      default: true, // Default to watch-only for security
    },
    encryptedPrivateKey: {
      type: String,
      select: false, // Never include in queries by default
    },
    
    // Metadata
    label: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
CryptoWalletSchema.index({ userId: 1, cryptocurrency: 1 });
CryptoWalletSchema.index({ cryptocurrency: 1, network: 1 });
CryptoWalletSchema.index({ address: 1, cryptocurrency: 1 }, { unique: true });
CryptoWalletSchema.index({ isActive: 1, usageCount: 1 });

// Virtual for display name
CryptoWalletSchema.virtual("displayName").get(function () {
  if (this.label) return this.label;
  return `${this.cryptocurrency.toUpperCase()} - ${this.address.substring(0, 8)}...`;
});

// Method to check if address needs new balance check
CryptoWalletSchema.methods.needsBalanceUpdate = function (maxAgeMinutes = 15): boolean {
  const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
  return Date.now() - this.lastBalanceCheck.getTime() > maxAge;
};

// Method to increment usage
CryptoWalletSchema.methods.incrementUsage = async function (): Promise<void> {
  this.usageCount += 1;
  await this.save();
};

export default mongoose.models.CryptoWallet ||
  mongoose.model<ICryptoWallet>("CryptoWallet", CryptoWalletSchema);