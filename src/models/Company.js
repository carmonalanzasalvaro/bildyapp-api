import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    cif: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    logo: {
      type: String,
      default: null,
      trim: true
    },
    isFreelance: {
      type: Boolean,
      default: false
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
        delete ret.id;
        return ret;
      }
    }
  }
);

const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

export default Company;
