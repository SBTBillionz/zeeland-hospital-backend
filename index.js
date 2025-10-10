const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB Connected");
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => {
  console.error("❌ MongoDB Connection Failed:", err.message);
  process.exit(1);
});

// ✅ SCHEMAS AND MODELS

// Patient Model
const patientSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: { type: String, unique: true },
  phone: String,
  emergency: String,
  password: String,
  patientId: { type: String, unique: true }
}, { timestamps: true });

const Patient = mongoose.model("Patient", patientSchema);

// Doctor Model
const doctorSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);

// Message Model
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  fileUrl: String,         // optional file/image
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

// Typing Status (temporary memory)
let typingStatus = {}; // { userId: true/false }

// ✅ TEST ROUTE
app.get("/", (req, res) => res.send("🏥 FCTA General Hospital API running 🚀"));

// ✅ PATIENT ROUTES

// Register new patient
app.post("/api/registerPatient", async (req, res) => {
  try {
    const exists = await Patient.findOne({
      $or: [{ email: req.body.email }, { patientId: req.body.patientId }]
    });
    if (exists) return res.status(400).json({ message: "Patient already registered" });

    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json({ message: "Patient registered successfully", patient });
  } catch (err) {
    res.status(500).json({ message: "Error registering patient", error: err.message });
  }
});

// Patient login
app.post("/api/loginPatient", async (req, res) => {
  const { email, password, patientId } = req.body;
  const patient = await Patient.findOne({
    $or: [{ email }, { patientId }],
    password
  });

  if (patient) {
    res.json({ message: "Login successful", patientId: patient.patientId });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Get all patients (for Doctor/Admin)
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch patients", error: err.message });
  }
});

// ✅ ADMIN ROUTES

// Admin login (fixed credentials)
app.post("/api/adminLogin", (req, res) => {
  const { username, password } = req.body;
  if (username === "Drpaau001" && password === "Paau001") {
    return res.json({ message: "Admin login successful" });
  } else {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
});

// ✅ DOCTOR ROUTES

// Register doctor (Admin only)
app.post("/api/registerDoctor", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const exists = await Doctor.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Doctor already registered" });

    const doctor = new Doctor({ name, email, password });
    await doctor.save();
    res.status(201).json({ message: "Doctor registered successfully", doctorEmail: doctor.email });
  } catch (err) {
    res.status(500).json({ message: "Error registering doctor", error: err.message });
  }
});

// Doctor login
app.post("/api/loginDoctor", async (req, res) => {
  const { email, password } = req.body;
  const doctor = await Doctor.findOne({ email, password });
  if (doctor) {
    res.json({ message: "Login successful", doctorEmail: doctor.email });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Get all registered doctors
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch doctors", error: err.message });
  }
});

// ✅ MESSAGING SYSTEM (Patients ↔ Doctors)

app.post("/api/messages", async (req, res) => {
  try {
    const newMsg = new Message(req.body);
    await newMsg.save();
    res.status(201).json({ message: "Message sent", data: newMsg });
  } catch (err) {
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
});

app.get("/api/messages", async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ message: "Missing patientId" });

  try {
    const messages = await Message.find({
      $or: [{ from: patientId }, { to: patientId }]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});

// ✅ Update / Delete / Read message

app.put("/api/messages/:id", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update message", error: err.message });
  }
});

app.delete("/api/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
});

// ✅ Mark message as read
app.put("/api/messages/:id/read", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark as read", error: err.message });
  }
});

// ✅ Typing status (temporary)
app.post("/api/typing", (req, res) => {
  const { user, isTyping } = req.body;
  typingStatus[user] = isTyping;
  res.json({ message: "Typing status updated" });
});

app.get("/api/typing/:user", (req, res) => {
  const user = req.params.user;
  res.json({ typing: typingStatus[user] || false });
});
