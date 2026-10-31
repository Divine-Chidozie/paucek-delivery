const mongoose = require("mongoose");
const crypto = require("crypto");

const deliverySchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    // Null until a rider successfully accepts the delivery.
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null,
      index: true,
    },

    trackingNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    pickupContactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    pickupPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // GeoJSON coordinates use [longitude, latitude].
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    destinationLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    additionalDirections: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    packageDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    packageSize: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    estimatedFee: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Failed",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true },
);

// Supports nearby pickup searches.
deliverySchema.index({ pickupLocation: "2dsphere" });

deliverySchema.pre("validate", function () {
  if (!this.trackingNumber) {
    this.trackingNumber =
      "PAU-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  }
});

module.exports = mongoose.model("Delivery", deliverySchema);
