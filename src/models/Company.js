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

const companySchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      uppercase: true,
      unique: true,
      index: true
    },
    address: {
      type: addressSchema,
      default: () => ({})
    },
    logo: {
      type: String,
      default: ''
    },
    isFreelance: {
      type: Boolean,
      default: false
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Company = model('Company', companySchema);

export default Company;