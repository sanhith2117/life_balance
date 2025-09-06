const express = require('express');
const multer = require('multer');
const { MongoClient, GridFSBucket } = require('mongodb');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000; // ⚠️ use 4000 instead of 3000
app.use(cors()); // allow Next.js frontend to call API

// MongoDB Configuration
const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI);

let db, bucket;

client.connect().then(() => {
  db = client.db(process.env.DB_NAME || 'life_balance'); // use env var
  bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  console.log('Connected to MongoDB');
}).catch(err => console.error(err));

const upload = multer({ dest: 'uploads/' });

// Upload Route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  const uploadStream = bucket.openUploadStream(req.file.originalname);
  fs.createReadStream(req.file.path)
    .pipe(uploadStream)
    .on('finish', () => {
      fs.unlinkSync(req.file.path);
      res.status(200).send('File uploaded successfully');
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).send('Error uploading file');
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
