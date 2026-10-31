const mongoose = require("mongoose");

const riderDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: [
        "governmentId",
        "driversLicense",
        "vehicleRegistration",
        "vehicleInsurance",
        "proofOfAddress",
        "profilePhoto",
      ],
      required: true,
    },
    fileKey: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Action Required"],
      default: "Pending",
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// GeoJSON Point schema for optional GPS locations.
const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates) {
          return (
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            coordinates.every(Number.isFinite) &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90
          );
        },
        message: "Coordinates must contain a valid longitude and latitude.",
      },
    },
  },
  { _id: false },
);

const riderSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },

    vehicleType: {
      type: String,
      enum: ["Motorcycle", "Car", "Bicycle", "Van", "Other"],
      default: null,
    },
    vehicleDetails: {
      make: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },
      model: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },
      registrationNumber: {
        type: String,
        trim: true,
        maxlength: 50,
        default: "",
      },
    },

    // Latest GPS position, stored as GeoJSON:
    // { type: "Point", coordinates: [longitude, latitude] }
    currentLocation: {
      type: geoPointSchema,
      default: undefined,
    },

    // Riders remain offline until they explicitly go online.
    isAvailable: {
      type: Boolean,
      default: false,
      index: true,
    },
    locationUpdatedAt: {
      type: Date,
      default: null,
    },

    documents: {
      type: [riderDocumentSchema],
      default: [],
    },

    onboardingStatus: {
      type: String,
      enum: [
        "Registered",
        "Documents Submitted",
        "Under Review",
        "Action Required",
        "Verified",
        "Rejected",
      ],
      default: "Registered",
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Retained for compatibility with existing backend routes.
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Enables efficient nearby-rider geographic queries.
riderSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("Rider", riderSchema);
