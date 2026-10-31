const mongoose = require("mongoose");

const savedAddressSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    label: {
      type: String,
      enum: ["Home", "Office", "Warehouse", "Custom"],
      required: true,
      trim: true,
    },

    customLabel: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    additionalDirections: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("SavedAddress", savedAddressSchema);
