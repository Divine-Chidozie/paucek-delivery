require("dotenv").config();

const fs = require("fs/promises");
const crypto = require("crypto");
const multer = require("multer");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const Vendor = require("./models/Vendor");
const Delivery = require("./models/Delivery");
const SavedAddress = require("./models/SavedAddress");
const Rider = require("./models/Rider");

const app = express();
const PORT = process.env.PORT || 5000;

const PRIVATE_DOCUMENT_DIR = path.join(__dirname, "private-rider-documents");

const DISPATCH_RADIUS_METERS = Number(
  process.env.DISPATCH_RADIUS_METERS || 3000,
);

const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;

const riderDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// ========================================
// VALIDATION HELPERS
// ========================================

function validCoordinates(longitude, latitude) {
  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function validGeoPoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    point.type === "Point" &&
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    validCoordinates(point.coordinates[0], point.coordinates[1])
  );
}

function riderIsVerified(rider) {
  return (
    rider.onboardingStatus === "Verified" || rider.approvalStatus === "Approved"
  );
}

function riderHasFreshLocation(rider) {
  if (
    !rider.currentLocation ||
    !validGeoPoint(rider.currentLocation) ||
    !rider.locationUpdatedAt
  ) {
    return false;
  }

  const locationAge = Date.now() - new Date(rider.locationUpdatedAt).getTime();

  return locationAge >= 0 && locationAge <= MAX_LOCATION_AGE_MS;
}

// ========================================
// SERVE FRONTEND FILES
// ========================================

app.use("/pages", express.static(path.join(__dirname, "../pages")));
app.use("/dashboard", express.static(path.join(__dirname, "../dashboard")));
app.use("/styles", express.static(path.join(__dirname, "../styles")));
app.use("/scripts", express.static(path.join(__dirname, "../scripts")));
app.use("/images", express.static(path.join(__dirname, "../images")));
app.use("/queries", express.static(path.join(__dirname, "../queries")));

// ========================================
// HOMEPAGE AND HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/styles.css", (req, res) => {
  res.sendFile(path.join(__dirname, "../styles.css"));
});

app.get("/api", (req, res) => {
  res.json({
    message: "Paucek Deliveries API is running.",
    dispatchRadiusMeters: DISPATCH_RADIUS_METERS,
  });
});

// ========================================
// SAFE PUBLIC ACCOUNT DATA
// ========================================

function publicVendor(vendor) {
  return {
    id: vendor._id.toString(),
    firstName: vendor.firstName,
    lastName: vendor.lastName,
    email: vendor.email,
    accountType: vendor.accountType,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

function publicRider(rider) {
  return {
    id: rider._id.toString(),
    firstName: rider.firstName,
    lastName: rider.lastName,
    email: rider.email,
    phone: rider.phone,
    vehicleType: rider.vehicleType || null,
    onboardingStatus: rider.onboardingStatus || "Registered",
    approvalStatus: rider.approvalStatus,
    approvedAt: rider.approvedAt || null,
    verifiedAt: rider.verifiedAt || null,
    isAvailable: Boolean(rider.isAvailable),
    currentLocation: rider.currentLocation || null,
    locationUpdatedAt: rider.locationUpdatedAt || null,
    createdAt: rider.createdAt,
    updatedAt: rider.updatedAt,
  };
}

// ========================================
// AUTHENTICATION
// ========================================

async function authenticateVendor(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "merchant" || !decoded.sub) {
      return res.status(403).json({ message: "Access denied." });
    }

    const vendor = await Vendor.findById(decoded.sub);

    if (!vendor) {
      return res.status(401).json({
        message: "Vendor account not found. Please log in again.",
      });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        message: "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error("Vendor authentication error:", error.message);

    return res.status(500).json({
      message: "Unable to verify your account right now.",
    });
  }
}

async function authenticateRider(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "rider" || !decoded.sub) {
      return res.status(403).json({
        message: "Access denied. Rider account required.",
      });
    }

    const rider = await Rider.findById(decoded.sub);

    if (!rider) {
      return res.status(401).json({
        message: "Rider account not found. Please log in again.",
      });
    }

    if (
      rider.approvalStatus === "Rejected" ||
      rider.onboardingStatus === "Rejected"
    ) {
      return res.status(403).json({
        message: "Your rider application has been rejected.",
      });
    }

    req.rider = rider;
    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        message: "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error("Rider authentication error:", error.message);

    return res.status(500).json({
      message: "Unable to verify your rider account right now.",
    });
  }
}

function requireApprovedRider(req, res, next) {
  if (!riderIsVerified(req.rider)) {
    return res.status(403).json({
      message:
        "Complete rider verification before going online or accepting deliveries.",
      approvalStatus: req.rider.approvalStatus,
      onboardingStatus: req.rider.onboardingStatus,
    });
  }

  next();
}

// ========================================
// VENDOR REGISTRATION
// ========================================

app.post("/api/vendors/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      terms,
    } = req.body;

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof confirmPassword !== "string" ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    if (accountType !== "merchant") {
      return res.status(400).json({
        message: "This registration endpoint is for vendors only.",
      });
    }

    if (terms !== true) {
      return res.status(400).json({
        message: "You must accept the terms and conditions.",
      });
    }

    const existingVendor = await Vendor.findOne({
      email: normalizedEmail,
    });

    if (existingVendor) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const vendor = await Vendor.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      accountType: "merchant",
    });

    return res.status(201).json({
      message: "Vendor account created successfully.",
      vendor: publicVendor(vendor),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Vendor registration error:", error.message);

    return res.status(500).json({
      message: "Unable to create your account right now.",
    });
  }
});

// ========================================
// VENDOR LOGIN
// ========================================

app.post("/api/vendors/login", async (req, res) => {
  try {
    const { email, password, accountType } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password ||
      !accountType
    ) {
      return res.status(400).json({
        message: "Email, password, and account type are required.",
      });
    }

    if (accountType !== "merchant") {
      return res.status(403).json({
        message: "Use the rider login endpoint for rider accounts.",
      });
    }

    const vendor = await Vendor.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!vendor) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, vendor.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        sub: vendor._id.toString(),
        role: "merchant",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      vendor: publicVendor(vendor),
    });
  } catch (error) {
    console.error("Vendor login error:", error.message);

    return res.status(500).json({
      message: "An error occurred while logging in.",
    });
  }
});

// ========================================
// RIDER REGISTRATION
// ========================================

app.post("/api/riders/register", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } =
      req.body;

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof confirmPassword !== "string" ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    if (
      firstName.trim().length > 60 ||
      lastName.trim().length > 60 ||
      phone.trim().length > 30
    ) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const existingRider = await Rider.findOne({
      email: normalizedEmail,
    });

    if (existingRider) {
      return res.status(409).json({
        message: "A rider account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const rider = await Rider.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      approvalStatus: "Pending",
      isAvailable: false,
    });

    const token = jwt.sign(
      {
        sub: rider._id.toString(),
        role: "rider",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(201).json({
      message:
        "Rider registration successful. Complete verification before going online.",
      token,
      rider: publicRider(rider),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A rider account with this email already exists.",
      });
    }

    console.error("Rider registration error:", error.message);

    return res.status(500).json({
      message: "Unable to register your rider account right now.",
    });
  }
});

// ========================================
// RIDER LOGIN
// ========================================

app.post("/api/riders/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const rider = await Rider.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!rider) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, rider.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (
      rider.approvalStatus === "Rejected" ||
      rider.onboardingStatus === "Rejected"
    ) {
      return res.status(403).json({
        message: "Your rider application has been rejected.",
      });
    }

    const token = jwt.sign(
      {
        sub: rider._id.toString(),
        role: "rider",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      message: riderIsVerified(rider)
        ? "Rider login successful."
        : "Login successful. Complete rider verification before going online.",
      token,
      rider: publicRider(rider),
    });
  } catch (error) {
    console.error("Rider login error:", error.message);

    return res.status(500).json({
      message: "An error occurred while logging in.",
    });
  }
});

// ========================================
// GET RIDER PROFILE
// ========================================

app.get("/api/riders/me", authenticateRider, (req, res) => {
  return res.status(200).json({
    message: "Rider profile retrieved successfully.",
    rider: publicRider(req.rider),
  });
});

// ========================================
// GET RIDER VERIFICATION STATUS
// ========================================

app.get("/api/riders/verification", authenticateRider, (req, res) => {
  const rider = req.rider;

  return res.status(200).json({
    message: "Rider verification status retrieved successfully.",
    verification: {
      onboardingStatus: rider.onboardingStatus || "Registered",
      approvalStatus: rider.approvalStatus || "Pending",
      verifiedAt: rider.verifiedAt || null,
      approvedAt: rider.approvedAt || null,
      isVerified: riderIsVerified(rider),
      canGoOnline: riderIsVerified(rider),
      isAvailable: Boolean(rider.isAvailable),
    },
  });
});

// ========================================
// ADMIN: APPROVE OR REJECT RIDER
// ========================================

app.patch("/api/admin/riders/:id/approval", async (req, res) => {
  try {
    const configuredKey = process.env.RIDER_ADMIN_KEY;
    const suppliedKey = req.get("x-admin-key");

    if (!configuredKey) {
      return res.status(503).json({
        message: "Rider administration is not configured.",
      });
    }

    if (!suppliedKey || suppliedKey !== configuredKey) {
      return res.status(401).json({
        message: "Valid administrator credentials are required.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid rider ID.",
      });
    }

    const { approvalStatus } = req.body;

    if (!["Approved", "Rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        message: "approvalStatus must be Approved or Rejected.",
      });
    }

    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        message: "Rider not found.",
      });
    }

    rider.approvalStatus = approvalStatus;
    rider.approvedAt = approvalStatus === "Approved" ? new Date() : null;

    if (approvalStatus === "Rejected") {
      rider.isAvailable = false;
    }

    await rider.save();

    return res.status(200).json({
      message: `Rider application ${approvalStatus.toLowerCase()} successfully.`,
      rider: publicRider(rider),
    });
  } catch (error) {
    console.error("Rider approval error:", error.message);

    return res.status(500).json({
      message: "Unable to update rider approval.",
    });
  }
});

// ========================================
// RIDER: UPDATE CURRENT GPS LOCATION
// ========================================

app.patch("/api/riders/location", authenticateRider, async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    if (!validCoordinates(longitude, latitude)) {
      return res.status(400).json({
        message:
          "Valid numeric longitude and latitude coordinates are required.",
      });
    }

    req.rider.currentLocation = {
      type: "Point",
      coordinates: [longitude, latitude],
    };

    req.rider.locationUpdatedAt = new Date();

    await req.rider.save();

    return res.status(200).json({
      message: "Rider location updated successfully.",
      location: req.rider.currentLocation,
      locationUpdatedAt: req.rider.locationUpdatedAt,
    });
  } catch (error) {
    console.error("Rider location update error:", error);

    return res.status(500).json({
      message: "Unable to update rider location.",
    });
  }
});

// ========================================
// RIDER: GO ONLINE OR OFFLINE
// ========================================

app.patch(
  "/api/riders/availability",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          message: "isAvailable must be true or false.",
        });
      }

      if (isAvailable && !riderHasFreshLocation(req.rider)) {
        req.rider.isAvailable = false;
        await req.rider.save();

        return res.status(400).json({
          message:
            "Update your GPS location before going online. Your location must be less than two minutes old.",
        });
      }

      req.rider.isAvailable = isAvailable;
      await req.rider.save();

      return res.status(200).json({
        message: isAvailable
          ? "You are now online and can receive nearby delivery requests."
          : "You are now offline.",
        isAvailable: req.rider.isAvailable,
      });
    } catch (error) {
      console.error("Rider availability error:", error);

      return res.status(500).json({
        message: "Unable to update rider availability.",
      });
    }
  },
);

// ========================================
// GET LOGGED-IN VENDOR PROFILE
// ========================================

app.get("/api/vendors/me", authenticateVendor, (req, res) => {
  return res.status(200).json({
    message: "Profile retrieved successfully.",
    vendor: publicVendor(req.vendor),
  });
});

// ========================================
// UPDATE LOGGED-IN VENDOR PROFILE
// ========================================

app.patch("/api/vendors/me", authenticateVendor, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      return res.status(400).json({
        message: "First name and last name are required.",
      });
    }

    if (firstName.trim().length > 60 || lastName.trim().length > 60) {
      return res.status(400).json({
        message: "Names cannot exceed 60 characters.",
      });
    }

    req.vendor.firstName = firstName.trim();
    req.vendor.lastName = lastName.trim();

    await req.vendor.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      vendor: publicVendor(req.vendor),
    });
  } catch (error) {
    console.error("Vendor profile update error:", error.message);

    return res.status(500).json({
      message: "Unable to update your profile right now.",
    });
  }
});

// ========================================
// SAVED ADDRESSES
// ========================================

app.get("/api/addresses", authenticateVendor, async (req, res) => {
  try {
    const addresses = await SavedAddress.find({
      vendor: req.vendor._id,
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      message: "Saved addresses retrieved successfully.",
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("Get saved addresses error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve saved addresses.",
    });
  }
});

app.post("/api/addresses", authenticateVendor, async (req, res) => {
  try {
    const {
      label,
      customLabel,
      contactName,
      phone,
      address,
      additionalDirections,
    } = req.body;

    if (
      !["Home", "Office", "Warehouse", "Custom"].includes(label) ||
      typeof contactName !== "string" ||
      !contactName.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      return res.status(400).json({
        message:
          "Provide a valid label, contact name, phone number, and address.",
      });
    }

    if (
      label === "Custom" &&
      (typeof customLabel !== "string" || !customLabel.trim())
    ) {
      return res.status(400).json({
        message: "Enter a name for your custom label.",
      });
    }

    const savedAddress = await SavedAddress.create({
      vendor: req.vendor._id,
      label,
      customLabel: label === "Custom" ? customLabel.trim() : "",
      contactName: contactName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      additionalDirections:
        typeof additionalDirections === "string"
          ? additionalDirections.trim()
          : "",
    });

    return res.status(201).json({
      message: "Address saved successfully.",
      address: savedAddress,
    });
  } catch (error) {
    console.error("Create saved address error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Unable to save this address.",
    });
  }
});

app.patch("/api/addresses/:id", authenticateVendor, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid saved address ID.",
      });
    }

    const allowedFields = [
      "label",
      "customLabel",
      "contactName",
      "phone",
      "address",
      "additionalDirections",
    ];

    const fields = Object.keys(req.body);

    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: "Provide valid fields to update.",
      });
    }

    const savedAddress = await SavedAddress.findOne({
      _id: id,
      vendor: req.vendor._id,
    });

    if (!savedAddress) {
      return res.status(404).json({
        message: "Saved address not found.",
      });
    }

    for (const field of fields) {
      if (typeof req.body[field] !== "string") {
        return res.status(400).json({
          message: `${field} must be text.`,
        });
      }

      savedAddress[field] = req.body[field].trim();
    }

    if (
      !["Home", "Office", "Warehouse", "Custom"].includes(savedAddress.label)
    ) {
      return res.status(400).json({
        message: "Select a valid address label.",
      });
    }

    if (savedAddress.label === "Custom" && !savedAddress.customLabel) {
      return res.status(400).json({
        message: "Enter a name for your custom label.",
      });
    }

    if (savedAddress.label !== "Custom") {
      savedAddress.customLabel = "";
    }

    await savedAddress.save();

    return res.status(200).json({
      message: "Address updated successfully.",
      address: savedAddress,
    });
  } catch (error) {
    console.error("Update saved address error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Unable to update this address.",
    });
  }
});

app.delete("/api/addresses/:id", authenticateVendor, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid saved address ID.",
      });
    }

    const savedAddress = await SavedAddress.findOneAndDelete({
      _id: id,
      vendor: req.vendor._id,
    });

    if (!savedAddress) {
      return res.status(404).json({
        message: "Saved address not found.",
      });
    }

    return res.status(200).json({
      message: "Address deleted successfully.",
    });
  } catch (error) {
    console.error("Delete saved address error:", error.message);

    return res.status(500).json({
      message: "Unable to delete this address.",
    });
  }
});

// ========================================
// CREATE A DELIVERY
// ========================================

app.post("/api/deliveries", authenticateVendor, async (req, res) => {
  try {
    const {
      recipientName,
      recipientPhone,
      pickupContactName,
      pickupPhone,
      pickupAddress,
      deliveryAddress,
      additionalDirections,
      packageDescription,
      packageSize,
      specialInstructions,
      distanceKm,
      estimatedDurationMinutes,
      estimatedFee,
      pickupLocation,
      destinationLocation,
    } = req.body;

    const requiredFields = {
      recipientName,
      recipientPhone,
      pickupContactName,
      pickupPhone,
      pickupAddress,
      deliveryAddress,
      packageDescription,
      packageSize,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          message: `${field} is required.`,
        });
      }
    }

    if (
      typeof distanceKm !== "number" ||
      !Number.isFinite(distanceKm) ||
      distanceKm < 0 ||
      typeof estimatedDurationMinutes !== "number" ||
      !Number.isFinite(estimatedDurationMinutes) ||
      estimatedDurationMinutes < 1 ||
      typeof estimatedFee !== "number" ||
      !Number.isFinite(estimatedFee) ||
      estimatedFee < 0
    ) {
      return res.status(400).json({
        message: "Invalid delivery distance, duration, or fee.",
      });
    }

    if (pickupLocation !== undefined && !validGeoPoint(pickupLocation)) {
      return res.status(400).json({
        message:
          "pickupLocation must be a GeoJSON Point with valid [longitude, latitude] coordinates.",
      });
    }

    if (
      destinationLocation !== undefined &&
      !validGeoPoint(destinationLocation)
    ) {
      return res.status(400).json({
        message:
          "destinationLocation must be a GeoJSON Point with valid [longitude, latitude] coordinates.",
      });
    }

    const delivery = await Delivery.create({
      vendor: req.vendor._id,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      pickupContactName: pickupContactName.trim(),
      pickupPhone: pickupPhone.trim(),
      pickupAddress: pickupAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      additionalDirections:
        typeof additionalDirections === "string"
          ? additionalDirections.trim()
          : "",
      packageDescription: packageDescription.trim(),
      packageSize: packageSize.trim(),
      specialInstructions:
        typeof specialInstructions === "string"
          ? specialInstructions.trim()
          : "",
      distanceKm,
      estimatedDurationMinutes,
      estimatedFee,
      ...(pickupLocation ? { pickupLocation } : {}),
      ...(destinationLocation ? { destinationLocation } : {}),
      status: "Pending",
    });

    return res.status(201).json({
      message: "Delivery saved successfully.",
      delivery,
      dispatchReady: Boolean(pickupLocation && destinationLocation),
      dispatchNote:
        pickupLocation && destinationLocation
          ? "Delivery has the coordinates required for nearby dispatch."
          : "Delivery saved, but nearby rider dispatch requires pickupLocation and destinationLocation coordinates.",
    });
  } catch (error) {
    console.error("Create delivery error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please check your delivery details.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A duplicate tracking number was generated. Please retry.",
      });
    }

    return res.status(500).json({
      message: "Unable to save delivery.",
    });
  }
});

// ========================================
// RIDER: AVAILABLE NEARBY DELIVERIES
// ========================================

app.get(
  "/api/riders/deliveries/available",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      if (!req.rider.isAvailable) {
        return res.status(200).json({
          message: "You are offline. Go online to see nearby deliveries.",
          count: 0,
          radiusMeters: DISPATCH_RADIUS_METERS,
          diagnostics: {
            eligiblePendingDeliveries: null,
            eligibleDeliveriesWithPickupCoordinates: null,
            reason: "RIDER_OFFLINE",
          },
          deliveries: [],
        });
      }

      if (!riderHasFreshLocation(req.rider)) {
        req.rider.isAvailable = false;
        await req.rider.save();

        return res.status(200).json({
          message:
            "Your GPS location is missing or outdated. Update your location and go online again.",
          count: 0,
          radiusMeters: DISPATCH_RADIUS_METERS,
          diagnostics: {
            eligiblePendingDeliveries: null,
            eligibleDeliveriesWithPickupCoordinates: null,
            reason: "GPS_MISSING_OR_OUTDATED",
          },
          deliveries: [],
        });
      }

      const availableFilter = {
        status: "Pending",
        $or: [{ rider: null }, { rider: { $exists: false } }],
      };

      const eligiblePendingDeliveries =
        await Delivery.countDocuments(availableFilter);

      const eligibleDeliveriesWithPickupCoordinates =
        await Delivery.countDocuments({
          ...availableFilter,
          "pickupLocation.type": "Point",
          "pickupLocation.coordinates.0": { $type: "number" },
          "pickupLocation.coordinates.1": { $type: "number" },
        });

      const deliveries = await Delivery.find({
        ...availableFilter,
        pickupLocation: {
          $near: {
            $geometry: req.rider.currentLocation,
            $maxDistance: DISPATCH_RADIUS_METERS,
          },
        },
      })
        .select(
          "trackingNumber pickupAddress deliveryAddress pickupLocation destinationLocation additionalDirections packageDescription packageSize specialInstructions distanceKm estimatedDurationMinutes estimatedFee status createdAt",
        )
        .limit(50);

      let message = "Nearby deliveries retrieved successfully.";
      let reason = "DELIVERIES_FOUND";

      if (deliveries.length === 0) {
        if (eligiblePendingDeliveries === 0) {
          message =
            "No unassigned pending deliveries are available in the database.";
          reason = "NO_PENDING_UNASSIGNED_DELIVERIES";
        } else if (eligibleDeliveriesWithPickupCoordinates === 0) {
          message =
            "Pending deliveries exist, but none has usable pickup coordinates for GPS dispatch.";
          reason = "NO_USABLE_PICKUP_COORDINATES";
        } else {
          message =
            "Pending deliveries with pickup coordinates exist, but none is within your dispatch radius.";
          reason = "NO_DELIVERIES_WITHIN_RADIUS";
        }
      }

      return res.status(200).json({
        message,
        count: deliveries.length,
        radiusMeters: DISPATCH_RADIUS_METERS,
        diagnostics: {
          eligiblePendingDeliveries,
          eligibleDeliveriesWithPickupCoordinates,
          reason,
        },
        deliveries,
      });
    } catch (error) {
      console.error("Nearby deliveries error:", error);

      if (
        error.code === 2 ||
        error.codeName === "BadValue" ||
        /2dsphere|geoNear|geospatial/i.test(error.message)
      ) {
        return res.status(500).json({
          message:
            "Location search is not ready. Ensure Delivery.pickupLocation has a 2dsphere index and the location fields are configured in the Delivery model.",
        });
      }

      return res.status(500).json({
        message: "Unable to retrieve nearby deliveries.",
      });
    }
  },
);

// ========================================
// RIDER: ACCEPT A DELIVERY
// ========================================

app.patch(
  "/api/riders/deliveries/:id/accept",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid delivery ID.",
        });
      }

      if (!req.rider.isAvailable || !riderHasFreshLocation(req.rider)) {
        return res.status(403).json({
          message:
            "Update your GPS location and go online before accepting a delivery.",
        });
      }

      const delivery = await Delivery.findOneAndUpdate(
        {
          _id: id,
          status: "Pending",
          $or: [{ rider: null }, { rider: { $exists: false } }],
          pickupLocation: {
            $near: {
              $geometry: req.rider.currentLocation,
              $maxDistance: DISPATCH_RADIUS_METERS,
            },
          },
        },
        {
          $set: {
            rider: req.rider._id,
            status: "Assigned",
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!delivery) {
        return res.status(409).json({
          message:
            "This delivery is no longer available or is outside your dispatch radius. Refresh nearby jobs and try again.",
        });
      }

      return res.status(200).json({
        message: "Delivery accepted successfully.",
        delivery,
      });
    } catch (error) {
      console.error("Accept delivery error:", error);

      return res.status(500).json({
        message: "Unable to accept this delivery.",
      });
    }
  },
);

// ========================================
// RIDER: MY ASSIGNED DELIVERIES
// ========================================

app.get(
  "/api/riders/deliveries/assigned",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      const deliveries = await Delivery.find({
        rider: req.rider._id,
        status: { $in: ["Assigned", "Picked Up", "In Transit"] },
      }).sort({ updatedAt: -1 });

      return res.status(200).json({
        message: "Assigned deliveries retrieved successfully.",
        count: deliveries.length,
        deliveries,
      });
    } catch (error) {
      console.error("Assigned deliveries error:", error);

      return res.status(500).json({
        message: "Unable to retrieve assigned deliveries.",
      });
    }
  },
);

// ========================================
// RIDER: DELIVERY HISTORY
// ========================================

app.get(
  "/api/riders/deliveries/history",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      const deliveries = await Delivery.find({
        rider: req.rider._id,
        status: { $in: ["Delivered", "Failed"] },
      }).sort({ updatedAt: -1 });

      return res.status(200).json({
        message: "Delivery history retrieved successfully.",
        count: deliveries.length,
        deliveries,
      });
    } catch (error) {
      console.error("Rider delivery history error:", error);

      return res.status(500).json({
        message: "Unable to retrieve delivery history.",
      });
    }
  },
);

// ========================================
// RIDER: UPDATE DELIVERY STATUS
// ========================================

app.patch(
  "/api/riders/deliveries/:id/status",
  authenticateRider,
  requireApprovedRider,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid delivery ID.",
        });
      }

      const transitions = {
        "Picked Up": "Assigned",
        "In Transit": "Picked Up",
        Delivered: "In Transit",
      };

      const expectedCurrentStatus = transitions[status];

      if (!expectedCurrentStatus) {
        return res.status(400).json({
          message:
            "Invalid status. Riders may update deliveries to Picked Up, In Transit, or Delivered.",
        });
      }

      const delivery = await Delivery.findOneAndUpdate(
        {
          _id: id,
          rider: req.rider._id,
          status: expectedCurrentStatus,
        },
        {
          $set: { status },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!delivery) {
        return res.status(409).json({
          message:
            "Delivery not found, not assigned to you, or the status has changed. Refresh and try again.",
        });
      }

      return res.status(200).json({
        message: `Delivery status updated to ${status}.`,
        delivery,
      });
    } catch (error) {
      console.error("Update delivery status error:", error);

      return res.status(500).json({
        message: "Unable to update delivery status.",
      });
    }
  },
);

// ========================================
// PUBLIC PACKAGE TRACKING
// ========================================

app.get("/api/track/:trackingNumber", async (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber.trim().toUpperCase();

    if (!/^PAU-[A-F0-9]{8}$/.test(trackingNumber)) {
      return res.status(400).json({
        message: "Please enter a valid Paucek tracking number.",
      });
    }

    const delivery = await Delivery.findOne({
      trackingNumber,
    }).select(
      "trackingNumber status createdAt updatedAt distanceKm estimatedDurationMinutes",
    );

    if (!delivery) {
      return res.status(404).json({
        message: "We couldn't find a delivery with that tracking number.",
      });
    }

    return res.status(200).json({
      message: "Tracking information retrieved successfully.",
      tracking: {
        trackingNumber: delivery.trackingNumber,
        status: delivery.status,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
        distanceKm: delivery.distanceKm,
        estimatedDurationMinutes: delivery.estimatedDurationMinutes,
      },
    });
  } catch (error) {
    console.error("Package tracking error:", error);

    return res.status(500).json({
      message: "Unable to retrieve tracking information right now.",
    });
  }
});

// ========================================
// GET ALL DELIVERIES FOR LOGGED-IN VENDOR
// ========================================

app.get("/api/deliveries", authenticateVendor, async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      vendor: req.vendor._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Deliveries retrieved successfully.",
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error("Get deliveries error:", error);

    return res.status(500).json({
      message: "Unable to retrieve deliveries.",
    });
  }
});

// ========================================
// GET ONE DELIVERY FOR LOGGED-IN VENDOR
// ========================================

app.get("/api/deliveries/:id", authenticateVendor, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid delivery ID.",
      });
    }

    const delivery = await Delivery.findOne({
      _id: req.params.id,
      vendor: req.vendor._id,
    });

    if (!delivery) {
      return res.status(404).json({
        message: "Delivery not found.",
      });
    }

    return res.status(200).json({
      message: "Delivery retrieved successfully.",
      delivery,
    });
  } catch (error) {
    console.error("Get delivery error:", error);

    return res.status(500).json({
      message: "Unable to retrieve delivery.",
    });
  }
});

// ========================================
// START SERVER
// ========================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from your .env file.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from your .env file.");
    }

    if (
      !Number.isFinite(DISPATCH_RADIUS_METERS) ||
      DISPATCH_RADIUS_METERS <= 0
    ) {
      throw new Error("DISPATCH_RADIUS_METERS must be a positive number.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");
    console.log(
      `Nearby rider dispatch radius: ${DISPATCH_RADIUS_METERS} metres.`,
    );

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
