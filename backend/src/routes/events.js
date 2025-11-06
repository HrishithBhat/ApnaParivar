const express = require('express');
const { Event, Family, FamilyMember, User } = require('../models');
const { authenticateToken } = require('../middleware/permissions');

const router = express.Router();

// Create a new event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    
    // Get user's family
    const user = await User.findById(userId);
    if (!user || !user.primaryFamily) {
      return res.status(404).json({ error: 'User not found or not in a family' });
    }

    const familyId = user.primaryFamily.familyId;

    // Verify family exists
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Enforce admin-only event creation per requirements
    if (!family.isAdmin(userId)) {
      return res.status(403).json({ error: 'Only family admins can create events' });
    }

    const {
      title,
      description,
      eventType,
      date,
      endDate,
      location,
      participants,
      isRecurring,
      recurrencePattern,
      significance,
      isPrivate,
      tags
    } = req.body;

    // Basic validation
    if (!title || !eventType || !date) {
      return res.status(400).json({ 
        error: 'Title, event type, and date are required' 
      });
    }

    // Parse participants if provided as string
    let participantNames = [];
    if (participants && typeof participants === 'string') {
      participantNames = participants.split(',').map(name => name.trim()).filter(name => name);
    }

    const eventData = {
      familyId,
      title,
      description: description || '',
      eventType,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location: location || '',
      participantNames,
      isRecurring: isRecurring || false,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      significance: significance || 'medium',
      isPrivate: isPrivate || false,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      createdBy: userId
    };

    const event = new Event(eventData);
    await event.save();

    // Populate creator info
    await event.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get family events
router.get('/family/:familyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { familyId } = req.params;

    // Verify user has access to this family
    const user = await User.findById(userId);
    const famIdStr = (familyId && familyId.toString()) || '';
    const userFamStr = user?.primaryFamily?.familyId?.toString() || '';
    if (!user || !user.primaryFamily || userFamStr !== famIdStr) {
      return res.status(403).json({ error: 'You can only view events from your own family' });
    }

    const events = await Event.find({ familyId })
      .populate('createdBy', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .sort({ date: -1 });

    res.json({ events });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get user's family events (convenience endpoint)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    
    const user = await User.findById(userId);
    if (!user || !user.primaryFamily) {
      return res.status(404).json({ error: 'User not found or not in a family' });
    }

    const events = await Event.find({ familyId: user.primaryFamily.familyId })
      .populate('createdBy', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .sort({ date: -1 });

    res.json({ events });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Update event
router.put('/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify user has access (either event creator or family admin)
    const family = await Family.findById(event.familyId);
    
    if (event.createdBy.toString() !== userId && !family.isAdmin(userId)) {
      return res.status(403).json({ error: 'You can only edit your own events or family admin can edit any event' });
    }

    // Update fields
    const updateFields = {
      ...req.body,
      updatedBy: userId
    };

    // Handle date fields
    if (updateFields.date) {
      updateFields.date = new Date(updateFields.date);
    }
    if (updateFields.endDate) {
      updateFields.endDate = new Date(updateFields.endDate);
    }

    // Handle participants if provided as string
    if (updateFields.participants && typeof updateFields.participants === 'string') {
      updateFields.participantNames = updateFields.participants.split(',').map(name => name.trim()).filter(name => name);
      delete updateFields.participants;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      updateFields,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('participants', 'firstName lastName');

    res.json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify user has access (either event creator or family admin)
    const family = await Family.findById(event.familyId);
    
    if (event.createdBy.toString() !== userId && !family.isAdmin(userId)) {
      return res.status(403).json({ error: 'You can only delete your own events or family admin can delete any event' });
    }

    await Event.findByIdAndDelete(eventId);

    res.json({ message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;