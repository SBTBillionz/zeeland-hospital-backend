const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


// =========================
// 📦 FILE UPLOAD SETUP
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });


// =========================
// 🔗 DATABASE
// =========================
mongoose.connect(
  "mongodb+srv://23cs1029:23cs1029p@cluster19220.jvummtr.mongodb.net/hospitalDB?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));


// =========================
// 👨‍⚕️ ONLINE USERS
// =========================
let onlineUsers = {};


// =========================
// 📊 MODELS
// =========================

// PATIENT
const Patient = mongoose.model("Patient", new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  phone: String,
  emergency: String,
  password: String,
  patientId: { type: String, unique: true }
}, { timestamps: true }));

// DOCTOR
const Doctor = mongoose.model("Doctor", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  specialty: String
}, { timestamps: true }));

// MESSAGE
const Message = mongoose.model("Message", new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  fileUrl: String,
  isRead: { type: Boolean, default: false }
}, { timestamps: true }));

// RECORD
const Record = mongoose.model("Record", new mongoose.Schema({
  doctor: String,
  patientId: String,
  record: String
}, { timestamps: true }));


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

// REGISTER
app.post("/api/registerPatient", async (req, res) => {
  try {
    const exists = await Patient.findOne({
      $or: [{ email: req.body.email }, { patientId: req.body.patientId }]
    });

    if (exists) return res.status(400).json({ message: "Patient exists" });

    const patient = new Patient(req.body);
    await patient.save();

    console.log("New patient:", patient.patientId);

    res.json({ message: "Registered", patientId: patient.patientId });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
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

// REGISTER
app.post("/api/registerDoctor", async (req, res) => {
  try {
    const { name, email, password, specialty } = req.body;

    if (!name || !email || !password || !specialty) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await Doctor.findOne({ email });
    if (exists) return res.status(400).json({ message: "Doctor exists" });

    const doctor = new Doctor({
      name,
      email,
      password,
      specialty: specialty.trim().toLowerCase()
    });

    await doctor.save();

    console.log("Doctor registered:", email);

    res.json({ message: "Doctor registered" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
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

// GET ALL
app.get("/api/doctors", async (req, res) => {
  const doctors = await Doctor.find();
  res.json(doctors);
});

// GET BY SPECIALTY
app.get("/api/doctors/:specialty", async (req, res) => {
  try {
    const specialty = req.params.specialty.trim().toLowerCase();

    console.log("Searching doctors for:", specialty);

    const doctors = await Doctor.find({ specialty });

    res.json(doctors);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// =========================
// 💬 MESSAGE ROUTES
// =========================

// SEND MESSAGE
app.post("/api/messages", upload.single("file"), async (req, res) => {
  try {
    const { from, to, message } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: "Sender and receiver required" });
    }

    if (!message && !req.file) {
      return res.status(400).json({ message: "Message or file required" });
    }

    const msg = new Message({
      from,
      to,
      message: message || "",
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await msg.save();

    console.log(`Message: ${from} → ${to}`);

    res.json({ message: "Message sent" });

  } catch (err) {
    console.log("Send error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET CHAT (1-to-1)
app.get("/api/messages", async (req, res) => {
  const { user1, user2 } = req.query;

  if (!user1 || !user2) {
    return res.json([]);
  }

  try {
    const messages = await Message.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ RECEIPT
app.post("/api/messages/read", async (req, res) => {
  const { from, to } = req.body;

  try {
    await Message.updateMany(
      { from, to, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "Messages marked as read" });

  } catch (err) {
    res.status(500).json({ error: err.message });
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
  res.json({ online: !!onlineUsers[req.params.user] });
});

app.post("/api/logout", (req, res) => {
  delete onlineUsers[req.body.user];
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

app.delete("/api/doctors/:id", async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
