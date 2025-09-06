// server.js
const express = require('express');
const multer = require('multer');
const { MongoClient, GridFSBucket } = require('mongodb');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 4000; // default backend port 4000
app.use(cors()); // allow requests from frontend (Next.js on 3000)

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('ERROR: MONGO_URI not set in environment');
  process.exit(1);
}

const client = new MongoClient(mongoURI);
let db, bucket;

async function connectDB() {
  if (db && bucket) return { db, bucket };
  await client.connect();
  db = client.db(process.env.DB_NAME || 'life_balance');
  bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  console.log('Connected to MongoDB', { dbName: db.databaseName });
  return { db, bucket };
}

// ensure uploads temp folder exists
const TMP_DIR = path.join(__dirname, 'tmp_uploads');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// multer config (store temp on disk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// POST /api/upload - accepts single file under field "file"
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    await connectDB();

    const localPath = req.file.path;
    const originalName = req.file.originalname;

    const uploadStream = bucket.openUploadStream(originalName, {
      metadata: {
        uploadedAt: new Date(),
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    const readStream = fs.createReadStream(localPath);
    readStream.pipe(uploadStream)
      .on('error', (err) => {
        console.error('GridFS upload error:', err);
        // cleanup local file
        try { fs.unlinkSync(localPath); } catch (e) {}
        res.status(500).json({ error: 'Error uploading file' });
      })
      .on('finish', () => {
        // cleanup local file
        try { fs.unlinkSync(localPath); } catch (e) {}
        res.status(200).json({ message: 'File uploaded successfully', fileId: uploadStream.id });
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/files - list uploaded files (simple)
app.get('/api/files', async (req, res) => {
  try {
    await connectDB();
    const files = await db.collection('uploads.files').find({}).toArray();
    // return a small subset of each file info
    const list = files.map(f => ({
      id: f._id,
      filename: f.filename,
      contentType: f.contentType,
      length: f.length,
      uploadDate: f.uploadDate,
      metadata: f.metadata,
    }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/files/:filename - download a file by filename
app.get('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    await connectDB();
    const downloadStream = bucket.openDownloadStreamByName(filename);

    downloadStream.on('file', (file) => {
      if (file.contentType) res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    });

    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });

    downloadStream.on('end', () => {
      res.end();
    });

    downloadStream.on('error', (err) => {
      console.error(err);
      res.status(404).send('File not found');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => console.log(`Express server running on port ${PORT}`));
