const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const geolib = require('geolib');
const fs = require('fs');
const { parse } = require('json2csv');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const classroomLocation = {
  latitude: 26.8793199,  // Actual classroom latitude
  longitude: 81.0644155, // Actual classroom longitude
};

const checkInRadius = 20; // 20 meters radius for attendance check-in
const checkIns = [];

app.post('/check-in', (req, res) => {
  const { name, latitude, longitude } = req.body;

  console.log(`Received coordinates: Latitude: ${latitude}, Longitude: ${longitude}, Name: ${name}`);

  if (!latitude || !longitude || !name) {
    return res.status(400).send({ message: 'Name, latitude, and longitude are required.' });
  }

  // Calculate the distance using geolib
  const distance = geolib.getDistance(
    { latitude, longitude },
    classroomLocation
  );

  console.log(`Calculated distance: ${distance} meters`);

  const attendance = distance <= checkInRadius ? 'yes' : 'no';
  const message = attendance === 'yes' ? 'You are within the range.' : 'You are out of range.';

  // Save the check-in
  const checkInTime = new Date().toISOString();
  checkIns.push({ name, latitude, longitude, distance, attendance, timestamp: checkInTime });

  return res.send({ attendance, message, distance });
});

app.get('/generate-csv', (req, res) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCheckIns = checkIns.filter(checkIn => new Date(checkIn.timestamp) > oneHourAgo);

  const fields = ['name', 'latitude', 'longitude', 'distance', 'attendance', 'timestamp'];
  const opts = { fields };

  try {
    const csv = parse(recentCheckIns, opts);
    const filePath = path.join(__dirname, 'public', 'checkins.csv');
    fs.writeFileSync(filePath, csv);
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Could not generate CSV file.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
