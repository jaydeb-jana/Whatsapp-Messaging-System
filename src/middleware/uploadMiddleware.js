const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Blocked dangerous executable extensions for security
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.ps1', '.com', '.scr', '.pif', '.hta', '.cpl', '.jar'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate clean sanitized filename with timestamp
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Allow ANY file format except dangerous executables
  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error(`Executable files (${ext}) cannot be uploaded for security reasons.`), false);
  } else {
    cb(null, true);
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024
  },
  fileFilter
});

module.exports = upload;
