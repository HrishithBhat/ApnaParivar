const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Photo, Family, User } = require('../models');
const { authenticateToken } = require('../middleware/permissions');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/photos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Upload photos
router.post('/upload', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { familyId, title, description, category, tags } = req.body;

    // Verify user has access to this family
    const user = await User.findById(userId);
    const famIdStr = (familyId && familyId.toString()) || '';
    const userFamStr = user?.primaryFamily?.familyId?.toString() || '';
    if (!user || !user.primaryFamily || userFamStr !== famIdStr) {
      return res.status(403).json({ error: 'You can only upload photos to your own family' });
    }

    // Verify family exists
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Enforce admin-only uploads per requirements
    if (!family.isAdmin(userId)) {
      return res.status(403).json({ error: 'Only family admins can upload photos' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedPhotos = [];

    // Process each uploaded file
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    for (const file of req.files) {
      const photoUrl = `${baseUrl}/uploads/photos/${file.filename}`;
      const photo = new Photo({
        familyId,
        title: title || 'Family Photo',
        description: description || '',
        url: photoUrl,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        category: category || 'family',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        uploadedBy: userId
      });

      await photo.save();
      uploadedPhotos.push(photo);
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
      photos: uploadedPhotos
    });

  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Get family photos
router.get('/family/:familyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { familyId } = req.params;

    // Verify user has access to this family
    const user = await User.findById(userId);
    const famIdStr = (familyId && familyId.toString()) || '';
    const userFamStr = user?.primaryFamily?.familyId?.toString() || '';
    if (!user || !user.primaryFamily || userFamStr !== famIdStr) {
      return res.status(403).json({ error: 'You can only view photos from your own family' });
    }

    const photos = await Photo.find({ familyId })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 });

    res.json({ photos });

  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Delete photo
router.delete('/:photoId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { photoId } = req.params;

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Verify user has access (either family creator or photo uploader)
    const family = await Family.findById(photo.familyId);
    
    if (photo.uploadedBy.toString() !== userId && !family.isAdmin(userId)) {
      return res.status(403).json({ error: 'You can only delete your own photos or family admin can delete any photo' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads/photos', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Photo.findByIdAndDelete(photoId);

    res.json({ message: 'Photo deleted successfully' });

  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;