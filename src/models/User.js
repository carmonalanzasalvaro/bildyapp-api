import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const addressSchema = new Schema(
  {
    street: {
      type: String,
      trim: true,
      default: ''
    },
    number: {
      type: String,
      trim: true,
      default: ''
    },
    postal: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    province: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    _id: false
  }
);

const refreshTokenSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      select: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    nif: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true
    },
    verificationCode: {
      type: String,
      default: ''
    },
    verificationAttempts: {
      type: Number,
      default: 3
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      default: null
    },
    address: {
      type: addressSchema,
      default: () => ({})
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: []
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        delete ret.password;
        delete ret.verificationCode;
        delete ret.refreshTokens;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

userSchema.virtual('fullName').get(function () {
  return `${this.name} ${this.lastName}`.trim();
});

const User = model('User', userSchema);

export default User;