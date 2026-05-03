import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      required: true,
      trim: true
    },
    number: {
      type: String,
      required: true,
      trim: true
    },
    postal: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    province: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    cif: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      default: null
    },
    address: {
      type: addressSchema,
      required: true
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      }
    }
  }
);

clientSchema.index(
  { company: 1, cif: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: false }
  }
);

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

export default Client;
