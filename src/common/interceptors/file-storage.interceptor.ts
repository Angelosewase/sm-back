import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';

/**
 * Custom multer storage configuration that generates unique filenames
 * with original file extensions for uploadable files.
 *
 * Filename format: {timestamp}-{randomHash}.{ext}
 * Example: 1732624800000-a1b2c3d4e5f6.png
 */
export const schoolLogoStorage = diskStorage({
  destination: (req, file, cb) => {
    // Files will be stored in uploads/schools-logos directory
    cb(null, 'uploads/schools-logos');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + random hash + original extension
    const ext = extname(file.originalname);
    const randomHash = crypto.randomBytes(6).toString('hex');
    const timestamp = Date.now();
    const filename = `${timestamp}-${randomHash}${ext}`;

    cb(null, filename);
  },
});

/**
 * File type filter for school logos
 * Allows only image files
 */
export const logoFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'), false);
  }
};
