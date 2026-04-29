import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Member from '../models/Member.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// @route   POST /api/members
// @desc    Add a new team member
router.post('/', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, role, email, contact, additionalDetails } = req.body;
    
    if (!name || !role || !email) {
      return res.status(400).json({ message: 'Name, role, and email are required' });
    }

    const memberData = {
      name,
      role,
      email,
      contact,
      additionalDetails,
      profileImage: req.file ? req.file.filename : null,
    };


    const newMember = new Member(memberData);
    await newMember.save();

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Server error while adding member' });
  }
});

// @route   GET /api/members
// @desc    Get all team members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ message: 'Server error while fetching members' });
  }
});

// @route   GET /api/members/:id
// @desc    Get member by ID
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ message: 'Server error while fetching member details' });
  }
});

// @route   PUT /api/members/:id
// @desc    Update team member
router.put('/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, role, email, contact, additionalDetails } = req.body;
    
    let member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const updateData = {
      name: name || member.name,
      role: role || member.role,
      email: email || member.email,
      contact: contact !== undefined ? contact : member.contact,
      additionalDetails: additionalDetails !== undefined ? additionalDetails : member.additionalDetails,
    };

    if (req.file) {
      updateData.profileImage = req.file.filename;
    }

    member = await Member.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Server error while updating member' });
  }
});

// @route   DELETE /api/members/:id
// @desc    Remove team member
router.delete('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error while removing member' });
  }
});

export default router;

