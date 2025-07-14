const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// ✅ Allow all CORS (any origin, any method)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json()); // to parse JSON bodies

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB Connected");

  // ✅ Start server only after DB connection
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("❌ MongoDB Connection Failed:", err.message);
  process.exit(1); // Exit app if DB fails to connect
});


// ✅ Define Patient Schema and Model
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

// ✅ Test route
app.get("/", (req, res) => {
  console.log("GET / route hit");
  res.send("🧪 Zeeland Hospital API is running");
});

// ✅ Patient Registration Route
app.post("/api/registerPatient", async (req, res) => {
  console.log("POST /api/registerPatient called with body:", req.body);

  try {
    const { name, surname, email, phone, emergency, password, patientId } = req.body;

    // Validation check
    if (!name || !surname || !email || !phone || !emergency || !password || !patientId) {
      console.warn("❗ Missing fields in request");
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if patient already exists
    const existing = await Patient.findOne({ $or: [{ email }, { patientId }] });
    if (existing) {
      console.warn("⚠️ Duplicate patient registration attempt");
      return res.status(400).json({ message: "Patient already registered" });
    }

    // Save new patient
    const newPatient = new Patient({ name, surname, email, phone, emergency, password, patientId });
    await newPatient.save();

    console.log("✅ Patient registered:", newPatient);
    res.status(201).json({ message: "✅ Patient registered successfully", patient: newPatient });
  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Placeholder: Doctor Login Route
app.post("/api/loginDoctor", (req, res) => {
  console.log("POST /api/loginDoctor hit - not yet implemented");
  res.status(501).json({ message: "Login route not implemented yet" });
});

// ✅ Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// }); 
