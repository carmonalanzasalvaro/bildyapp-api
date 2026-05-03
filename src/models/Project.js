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

const projectSchema = new mongoose.Schema(
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
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    projectCode: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: addressSchema,
      required: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    notes: {
      type: String,
      trim: true,
      default: null
    },
    active: {
      type: Boolean,
      default: true,
      index: true
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

projectSchema.index(
  { company: 1, projectCode: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: false }
  }
);

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
