const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


// =========================
// 📦 FILE UPLOAD SETUP
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


// =========================
// 🔗 DATABASE
// =========================
mongoose.connect(
  "mongodb+srv://23cs1029:23cs1029p@cluster19220.jvummtr.mongodb.net/hospitalDB?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));


// =========================
// 👨‍⚕️ ONLINE USERS TRACKING
// =========================
let onlineUsers = {};


// =========================
// 📊 MODELS
// =========================

// PATIENT
const patientSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  phone: String,
  emergency: String,
  password: String,
  patientId: { type: String, unique: true }
}, { timestamps: true });

const Patient = mongoose.model("Patient", patientSchema);


// DOCTOR (UPDATED)
const doctorSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  specialty: String
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);


// MESSAGE (UPDATED)
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  specialty: String,
  fileUrl: String,
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);


// RECORDS
const recordSchema = new mongoose.Schema({
  doctor: String,
  patientId: String,
  record: String
}, { timestamps: true });

const Record = mongoose.model("Record", recordSchema);


// =========================
// 🧑‍⚕️ ADMIN LOGIN
// =========================
app.post("/api/adminLogin", (req, res) => {
  const { username, password } = req.body;

  if (username === "23cs@gmail.com" && password === "23cs1029") {
    return res.json({ message: "Admin login success" });
  }

  res.status(401).json({ message: "Invalid admin credentials" });
});


// =========================
// 🧑 PATIENT ROUTES
// =========================
app.post("/api/registerPatient", async (req, res) => {
  try {
    const exists = await Patient.findOne({
      $or: [{ email: req.body.email }, { patientId: req.body.patientId }]
    });

    if (exists) return res.status(400).json({ message: "Patient exists" });

    const patient = new Patient(req.body);
    await patient.save();

    res.json({ message: "Registered", patientId: patient.patientId });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// LOGIN PATIENT
app.post("/api/loginPatient", async (req, res) => {
  const { patientId, password } = req.body;

  const user = await Patient.findOne({ patientId, password });

  if (!user) return res.status(401).json({ error: "Invalid login" });

  onlineUsers[user.patientId] = true;

  res.json({ patientId: user.patientId });
});


// GET PATIENTS
app.get("/api/patients", async (req, res) => {
  const data = await Patient.find();
  res.json(data);
});


// =========================
// 👨‍⚕️ DOCTOR ROUTES
// =========================

// REGISTER DOCTOR
app.post("/api/registerDoctor", async (req, res) => {
  try {
    const exists = await Doctor.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ message: "Doctor exists" });

    const doctor = new Doctor(req.body);
    await doctor.save();

    res.json({ message: "Doctor registered" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// LOGIN DOCTOR
app.post("/api/loginDoctor", async (req, res) => {
  const { email, password } = req.body;

  const doctor = await Doctor.findOne({ email, password });

  if (!doctor) return res.status(401).json({ error: "Invalid login" });

  onlineUsers[email] = true;

  res.json({
    doctorEmail: doctor.email,
    specialty: doctor.specialty
  });
});


// GET DOCTORS
app.get("/api/doctors", async (req, res) => {
  const doctors = await Doctor.find();
  res.json(doctors);
});


// GET BY SPECIALTY
app.get("/api/doctors/:specialty", async (req, res) => {
  const doctors = await Doctor.find({ specialty: req.params.specialty });
  res.json(doctors);
});


// =========================
// 💬 MESSAGE ROUTES (WITH FILE)
// =========================
app.post("/api/messages", upload.single("file"), async (req, res) => {
  try {
    const msg = new Message({
      from: req.body.from,
      to: req.body.to,
      message: req.body.message,
      specialty: req.body.specialty,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await msg.save();
    res.json({ message: "Message sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET MESSAGES
app.get("/api/messages", async (req, res) => {
  const { patientId, specialty } = req.query;

  try {
    const messages = await Message.find({
      $or: [{ from: patientId }, { to: patientId }],
      ...(specialty && { specialty })
    }).sort({ createdAt: 1 });

    res.json(messages);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// =========================
// 📁 RECORDS
// =========================
app.post("/api/records", async (req, res) => {
  try {
    const record = new Record(req.body);
    await record.save();

    res.json({ message: "Record saved" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/records", async (req, res) => {
  const data = await Record.find();
  res.json(data);
});


// =========================
// 📡 ONLINE STATUS
// =========================
app.get("/api/status/:user", (req, res) => {
  const user = req.params.user;

  res.json({
    online: !!onlineUsers[user]
  });
});

app.post("/api/logout", (req, res) => {
  const { user } = req.body;
  delete onlineUsers[user];
  res.json({ message: "Logged out" });
});


// =========================
// 🏠 HOME
// =========================
app.get("/", (req, res) => {
  res.send("🏥 Hospital API Running...");
});
// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
