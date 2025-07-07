const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const Patient = mongoose.model('Patient', new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  phone: String,
  emergency: String,
  password: String,
  patientId: String
}));

const Doctor = mongoose.model('Doctor', new mongoose.Schema({
  email: String,
  password: String
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
}));

app.post('/api/registerPatient', async (req, res) => {
  try {
    const newPatient = new Patient(req.body);
    await newPatient.save();
    res.json({ patientId: newPatient.patientId });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/loginPatient', async (req, res) => {
  const { patientId, password } = req.body;
  const patient = await Patient.findOne({ patientId, password });
  if (patient) res.json({ patientId: patient.patientId });
  else res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/loginDoctor', async (req, res) => {
  const { email, password } = req.body;
  const doctor = await Doctor.findOne({ email, password });
  if (doctor) res.json({ email: doctor.email });
  else res.status(401).json({ error: 'Invalid doctor login' });
});

app.get('/api/patients', async (req, res) => {
  const patients = await Patient.find({}, { name: 1, surname: 1, patientId: 1 });
  res.json(patients);
});

app.get('/api/messages', async (req, res) => {
  const { patientId } = req.query;
  const messages = await Message.find({ $or: [{ from: patientId }, { to: patientId }] });
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  const message = new Message(req.body);
  await message.save();
  res.json({ status: 'Message sent' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
