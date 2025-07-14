const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Patient schema & model (defined directly here)
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  emergency: { type: String, required: true },
  password: { type: String, required: true },
  patientId: { type: String, required: true, unique: true }
}, { timestamps: true });

const Patient = mongoose.model("Patient", patientSchema);

// Optional test route
app.get("/", (req, res) => {
  res.send("🧪 Zeeland Hospital API is running");
});

// ✅ Patient registration route
app.post("/api/registerPatient", async (req, res) => {
  try {
    const { name, surname, email, phone, emergency, password, patientId } = req.body;

    // Check if email or patientId already exists
    const existing = await Patient.findOne({ $or: [{ email }, { patientId }] });
    if (existing) {
      return res.status(400).json({ message: "❌ Patient already registered" });
    }

    // Save the new patient
    const newPatient = new Patient({ name, surname, email, phone, emergency, password, patientId });
    await newPatient.save();

    res.status(201).json({ message: "✅ Patient registered successfully", patient: newPatient });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "❌ Server error", "error": error });
  }
});

// Placeholder route for login doctor (you can implement this later)
app.post("/api/loginDoctor", (req, res) => {
  res.send("🔐 Doctor login route not yet implemented");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
