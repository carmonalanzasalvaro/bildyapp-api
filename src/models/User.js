import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 3,
      min: 0
    }
  },
  {
    _id: false
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null
    },
    lastName: {
      type: String,
      trim: true,
      default: null
    },
    nif: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    address: {
      type: String,
      trim: true,
      default: null
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending'
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    verification: {
      type: verificationSchema,
      required: true
    },
    deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.verification;
        delete ret.id;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

userSchema.virtual('fullName').get(function fullName() {
  return [this.name, this.lastName].filter(Boolean).join(' ').trim() || undefined;
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
