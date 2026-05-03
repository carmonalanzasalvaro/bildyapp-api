import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    hours: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const deliveryNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    format: {
      type: String,
      enum: ['material', 'hours'],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    workDate: {
      type: Date,
      required: true,
      index: true
    },
    material: {
      type: String,
      trim: true,
      default: null
    },
    quantity: {
      type: Number,
      min: 0,
      default: null
    },
    unit: {
      type: String,
      trim: true,
      default: null
    },
    hours: {
      type: Number,
      min: 0,
      default: null
    },
    workers: {
      type: [workerSchema],
      default: []
    },
    signed: {
      type: Boolean,
      default: false,
      index: true
    },
    signedAt: {
      type: Date,
      default: null
    },
    signatureUrl: {
      type: String,
      trim: true,
      default: null
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: null
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

deliveryNoteSchema.index({ company: 1, deleted: 1, workDate: -1 });
deliveryNoteSchema.index({ company: 1, client: 1, deleted: 1 });
deliveryNoteSchema.index({ company: 1, project: 1, deleted: 1 });

const DeliveryNote = mongoose.models.DeliveryNote || mongoose.model('DeliveryNote', deliveryNoteSchema);

export default DeliveryNote;
