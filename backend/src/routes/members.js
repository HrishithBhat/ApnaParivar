const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireFamilyAdmin, requireFamilyAccess } = require('../middleware/permissions');
const { FamilyMember, Family } = require('../models');

const router = express.Router();

// @route   POST /api/members/connect
// @desc    Create a relationship between two existing members (spouse or parent-child)
// @access  Private (Family Admin)
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    let { familyId, sourceId, targetId, relation } = req.body || {};

    if (!sourceId || !targetId || !relation) {
      return res.status(400).json({ success: false, message: 'sourceId, targetId and relation are required' });
    }
    if (sourceId === targetId) {
      return res.status(400).json({ success: false, message: 'Cannot relate a member to themselves' });
    }

    // If familyId not provided, infer from user's primary family
    const famRaw = req.user.primaryFamily?.familyId;
    const userFamIdStr = typeof famRaw === 'string' ? famRaw : (famRaw?._id?.toString?.() || famRaw?.toString?.() || '');
    const targetFamilyId = familyId || userFamIdStr;
    if (!targetFamilyId) {
      return res.status(400).json({ success: false, message: 'Family ID is required' });
    }

    const family = await Family.findById(targetFamilyId);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });

    // Only admins can edit relationships
    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only family admins can edit relationships' });
    }

    // Load members and validate same family
    const [src, dst] = await Promise.all([
      FamilyMember.findById(sourceId),
      FamilyMember.findById(targetId)
    ]);
    if (!src || !dst) return res.status(404).json({ success: false, message: 'One or both members not found' });
    if (src.familyId.toString() !== family._id.toString() || dst.familyId.toString() !== family._id.toString()) {
      return res.status(403).json({ success: false, message: 'Members must belong to the target family' });
    }

    relation = String(relation).toLowerCase();
    const changes = [];

    if (relation === 'spouse') {
      src.relationships = src.relationships || {}; src.relationships.spouse = src.relationships.spouse || [];
      dst.relationships = dst.relationships || {}; dst.relationships.spouse = dst.relationships.spouse || [];
      const hasSrc = !!src.relationships.spouse.find(s => s.memberId?.toString() === dst._id.toString());
      const hasDst = !!dst.relationships.spouse.find(s => s.memberId?.toString() === src._id.toString());
      if (!hasSrc) { src.relationships.spouse.push({ memberId: dst._id, isCurrentSpouse: true }); changes.push('src.spouse+'); }
      if (!hasDst) { dst.relationships.spouse.push({ memberId: src._id, isCurrentSpouse: true }); changes.push('dst.spouse+'); }
      await Promise.all([src.save(), dst.save()]);
      return res.json({ success: true, message: 'Spouse connection added', changes });
    }

    // Normalize to parent flow: parentId -> childId
    let parent = src, child = dst;
    if (relation === 'child') {
      parent = dst; child = src;
    } else if (relation !== 'parent') {
      return res.status(400).json({ success: false, message: 'Unsupported relation. Use spouse, parent, or child' });
    }

    parent.relationships = parent.relationships || {};
    child.relationships = child.relationships || {};
    child.relationships.children = child.relationships.children || [];

    // Set parent field on child based on parent.gender if possible
    const gender = (parent.gender || '').toLowerCase();
    const parentField = gender === 'female' ? 'mother' : 'father';

    // Prevent overwriting a different existing parent of same role
    if (child.relationships[parentField] && child.relationships[parentField].toString() !== parent._id.toString()) {
      return res.status(400).json({ success: false, message: `Child already has a ${parentField} set` });
    }

    // Write links
    child.relationships[parentField] = parent._id;
    parent.relationships.children = parent.relationships.children || [];
    if (!parent.relationships.children.find(id => id.toString() === child._id.toString())) {
      parent.relationships.children.push(child._id);
    }

    await Promise.all([parent.save(), child.save()]);
    return res.json({ success: true, message: 'Parent-child relationship added', changes: ['child.'+parentField,'parent.children+'] });
  } catch (error) {
    console.error('❌ Connect members error:', error);
    res.status(500).json({ success: false, message: 'Failed to create relationship' });
  }
});

// @route   GET /api/members
// @desc    List members for a family (defaults to user's primary family)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    let reqFamilyId = (req.query.familyId || '').toString().trim();
    const q = (req.query.q || '').toString().trim();
    const memberId = (req.query.memberId || '').toString().trim();
    const user = req.user;

    const famRaw = user.primaryFamily?.familyId;
    const userFamIdStr = typeof famRaw === 'string'
      ? famRaw
      : (famRaw?._id?.toString?.() || famRaw?.toString?.() || '');

    // Normalize target family id: accept either ObjectId string or Family.familyId slug
    let targetFamilyId = reqFamilyId || userFamIdStr;
    if (!targetFamilyId) {
      return res.status(400).json({ success: false, message: 'Family ID is required' });
    }

    // Resolve slug to ObjectId when necessary
    let targetFamilyObjectId = null;
    const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(targetFamilyId);
    if (looksLikeObjectId) {
      targetFamilyObjectId = new mongoose.Types.ObjectId(targetFamilyId);
    } else {
      const famBySlug = await Family.findOne({ familyId: targetFamilyId.toLowerCase(), isActive: true, isDeleted: false }).select('_id');
      if (!famBySlug) {
        return res.status(404).json({ success: false, message: 'Family not found' });
      }
      targetFamilyObjectId = famBySlug._id;
      targetFamilyId = famBySlug._id.toString();
    }

    // Ensure user has access to this family
    const famRaw2 = user.primaryFamily?.familyId;
    const userFamStr = typeof famRaw2 === 'string'
      ? famRaw2
      : (famRaw2?._id?.toString?.() || famRaw2?.toString?.() || '');
    if (userFamStr !== targetFamilyId.toString()) {
      return res.status(403).json({ success: false, message: 'Family access required' });
    }

    // Build base filter
    const filter = { familyId: targetFamilyObjectId || targetFamilyId, isActive: true, isDeleted: false };

    // Optional: filter by specific memberId
    if (memberId) {
      filter._id = memberId;
    } else if (q) {
      // Escape regex special chars
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const looksLikeId = /^[a-fA-F0-9]{24}$/.test(q);
      if (looksLikeId) {
        // Fast path: allow id match, or (rarely) if names contain hex-like string
        const rxId = new RegExp(escapeRegExp(q), 'i');
        filter.$or = [
          { firstName: rxId },
          { lastName: rxId },
          { nickname: rxId },
          { _id: new mongoose.Types.ObjectId(q) }
        ];
      } else {
        const tokens = q.split(/\s+/).filter(Boolean).map(t => new RegExp(escapeRegExp(t), 'i'));
        if (tokens.length <= 1) {
          const rx = tokens[0] || new RegExp(escapeRegExp(q), 'i');
          filter.$or = [
            { firstName: rx },
            { lastName: rx },
            { nickname: rx }
          ];
        } else {
          // Require all tokens to be present in either first or last name
          filter.$and = tokens.map(rx => ({ $or: [ { firstName: rx }, { lastName: rx }, { nickname: rx } ] }));
        }
      }
    }

    const members = await FamilyMember.find(filter)
      .select('firstName lastName nickname gender dateOfBirth isAlive relationships generation createdAt')
      .sort({ firstName: 1, lastName: 1 })
      .limit(100);

    res.json({ success: true, members });
  } catch (error) {
    console.error('❌ List family members error:', error);
    res.status(500).json({ success: false, message: 'Failed to list family members' });
  }
});

// @route   POST /api/members
// @desc    Add a new family member
// @access  Private (Family Admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      familyId,
      firstName,
      lastName,
      dateOfBirth,
      dateOfDeath,
      placeOfBirth,
      gender,
      occupation,
      education,
      bio,
      relationshipType,
      relatedToMemberId,
      phone,
      address,
      customFields = []
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Validate date of birth if provided
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        return res.status(400).json({
          success: false,
          message: 'Date of birth cannot be in the future'
        });
      }
    }

    // Use user's primary family if familyId not provided
    const targetFamilyId = familyId || req.user.primaryFamily?.familyId;
    
    if (!targetFamilyId) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a family to add members'
      });
    }

    // Check if user has access to this family
    if (req.user.primaryFamily?.familyId?.toString() !== targetFamilyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only add members to your own family'
      });
    }

    const family = await Family.findById(targetFamilyId);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    // Enforce admin-only creation per requirements (admin1/admin2/admin3)
    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only family admins can add members'
      });
    }

    // Create new family member with proper field mapping to schema
    const member = new FamilyMember({
      familyId: targetFamilyId,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
      // Map placeOfBirth string to structured object (use as city if provided)
      placeOfBirth: placeOfBirth ? { city: placeOfBirth } : undefined,
      // Map address to currentAddress.street
      currentAddress: address ? { street: address } : undefined,
      gender,
      // Map simple fields to complex model structure
      profession: {
        currentJob: occupation ? { title: occupation } : {},
        education: education ? [{ degree: education }] : []
      },
      notes: bio || '',
      // Map contact info into schema contact structure
      contact: {
        phoneNumbers: phone ? [{ type: 'mobile', number: phone, isPrimary: true }] : [],
        emails: req.body.email ? [{ type: 'personal', email: req.body.email, isPrimary: true }] : []
      },
      customFields,
      addedBy: req.user._id,
      lastModifiedBy: req.user._id
    });

    await member.save();

    // Update family stats
    await family.updateStats();

    // Handle relationships if provided
    if (relatedToMemberId && relationshipType) {
      const related = await FamilyMember.findById(relatedToMemberId);
      if (related && related.familyId.toString() === targetFamilyId.toString()) {
        switch (relationshipType) {
          case 'father_of': {
            // New member is father of related member
            related.relationships = related.relationships || {};
            related.relationships.father = member._id;
            await related.save();
            member.relationships = member.relationships || {};
            member.relationships.children = member.relationships.children || [];
            if (!member.relationships.children.find(id => id.toString() === related._id.toString())) {
              member.relationships.children.push(related._id);
              await member.save();
            }
            break;
          }
          case 'mother_of': {
            related.relationships = related.relationships || {};
            related.relationships.mother = member._id;
            await related.save();
            member.relationships = member.relationships || {};
            member.relationships.children = member.relationships.children || [];
            if (!member.relationships.children.find(id => id.toString() === related._id.toString())) {
              member.relationships.children.push(related._id);
              await member.save();
            }
            break;
          }
          case 'child_of': {
            // New member is child of related member. Infer parent role by related.gender
            const parentRole = (related.gender === 'male') ? 'father' : (related.gender === 'female' ? 'mother' : 'father');
            member.relationships = member.relationships || {};
            member.relationships[parentRole] = related._id;
            await member.save();
            related.relationships = related.relationships || {};
            related.relationships.children = related.relationships.children || [];
            if (!related.relationships.children.find(id => id.toString() === member._id.toString())) {
              related.relationships.children.push(member._id);
              await related.save();
            }
            break;
          }
          case 'spouse_of': {
            // Add spouse entries for both
            member.relationships = member.relationships || {};
            member.relationships.spouse = member.relationships.spouse || [];
            if (!member.relationships.spouse.find(s => s.memberId?.toString() === related._id.toString())) {
              member.relationships.spouse.push({ memberId: related._id, isCurrentSpouse: true });
              await member.save();
            }
            related.relationships = related.relationships || {};
            related.relationships.spouse = related.relationships.spouse || [];
            if (!related.relationships.spouse.find(s => s.memberId?.toString() === member._id.toString())) {
              related.relationships.spouse.push({ memberId: member._id, isCurrentSpouse: true });
              await related.save();
            }
            break;
          }
          default:
            break;
        }
      }
    }

    // Populate member data for response (align with schema paths)
    await member.populate([
      { path: 'relationships.father', select: 'firstName lastName' },
      { path: 'relationships.mother', select: 'firstName lastName' },
      { path: 'relationships.children', select: 'firstName lastName' },
      { path: 'relationships.spouse.memberId', select: 'firstName lastName' },
      { path: 'addedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Family member added successfully',
      member: {
        id: member._id,
        fullName: member.fullName,
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        age: member.age,
        gender: member.gender,
        parents: {
          father: member.relationships?.father || null,
          mother: member.relationships?.mother || null
        },
        spouses: (member.relationships?.spouse || []).map(s => ({
          member: s.memberId,
          marriageDate: s.marriageDate,
          divorceDate: s.divorceDate,
          isCurrentSpouse: s.isCurrentSpouse,
          marriagePlace: s.marriagePlace
        })),
        children: member.relationships?.children || [],
        contact: member.contact,
        currentAddress: member.currentAddress,
        placeOfBirth: member.placeOfBirth,
        customFields: member.customFields,
        createdAt: member.createdAt,
        createdBy: member.addedBy
      }
    });
  } catch (error) {
    console.error('❌ Add family member error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A member with this email already exists in this family'
      });
    }

    // Surface validation errors clearly to the client
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('; ') });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add family member'
    });
  }
});

// @route   GET /api/members/:memberId
// @desc    Get family member details
// @access  Private (Family Member)
router.get('/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await FamilyMember.findById(memberId)
      .populate('relationships.father', 'firstName lastName dateOfBirth')
      .populate('relationships.mother', 'firstName lastName dateOfBirth')
      .populate('relationships.children', 'firstName lastName dateOfBirth')
      .populate('relationships.spouse.memberId', 'firstName lastName dateOfBirth')
      .populate('addedBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .select('-__v');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Check if user has access to this family
    const family = await Family.findById(member.familyId);
    // Allow any active family member to view details
    const sameFamily = req.user.primaryFamily?.familyId?.toString() === member.familyId.toString();
    if (!sameFamily) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this family'
      });
    }

    res.json({
      success: true,
      member: {
        id: member._id,
        fullName: member.fullName,
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        age: member.age,
        gender: member.gender,
        parents: {
          father: member.relationships?.father || null,
          mother: member.relationships?.mother || null
        },
        spouses: (member.relationships?.spouse || []).map(s => ({
          member: s.memberId,
          marriageDate: s.marriageDate,
          divorceDate: s.divorceDate,
          isCurrentSpouse: s.isCurrentSpouse,
          marriagePlace: s.marriagePlace
        })),
        children: member.relationships?.children || [],
        contact: member.contact,
        currentAddress: member.currentAddress,
        placeOfBirth: member.placeOfBirth,
        photos: member.photos,
        timeline: member.timeline,
        customFields: member.customFields,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        createdBy: member.addedBy,
        updatedBy: member.lastModifiedBy
      }
    });
  } catch (error) {
    console.error('❌ Get family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get family member details'
    });
  }
});

// @route   PUT /api/members/:memberId
// @desc    Update family member
// @access  Private (Family Admin)
router.put('/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      relationship,
      parents,
      spouse,
      address,
      phone,
      customFields
    } = req.body;

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Check if user has admin access to this family
    const family = await Family.findById(member.familyId);
    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a family admin to edit members'
      });
    }

    // Update fields
    if (firstName) member.firstName = firstName;
    if (lastName) member.lastName = lastName;
    if (email !== undefined) member.email = email;
    if (dateOfBirth) member.dateOfBirth = new Date(dateOfBirth);
    if (gender) member.gender = gender;
    if (relationship) member.relationship = relationship;
    if (parents) member.parents = parents.filter(p => p);
    if (spouse !== undefined) member.spouse = spouse;
    if (address || phone) {
      member.contactInfo = {
        ...member.contactInfo,
        ...(address && { address }),
        ...(phone && { phone }),
        email: member.email
      };
    }
    if (customFields) member.customFields = customFields;

  member.lastModifiedBy = req.user._id;
  member.updatedAt = new Date();

    await member.save();

    // Populate updated member data
    await member.populate([
      { path: 'parents', select: 'firstName lastName' },
      { path: 'spouse', select: 'firstName lastName' },
      { path: 'lastModifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Family member updated successfully',
      member: {
        id: member._id,
        fullName: member.fullName,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        dateOfBirth: member.dateOfBirth,
        age: member.age,
        gender: member.gender,
        relationship: member.relationship,
        parents: member.parents,
        spouse: member.spouse,
        contactInfo: member.contactInfo,
        customFields: member.customFields,
        updatedAt: member.updatedAt,
        updatedBy: member.lastModifiedBy
      }
    });
  } catch (error) {
    console.error('❌ Update family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update family member'
    });
  }
});

// @route   DELETE /api/members/:memberId
// @desc    Delete family member (soft delete)
// @access  Private (Family Admin)
router.delete('/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Check if user has admin access to this family
    const family = await Family.findById(member.familyId);
    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a family admin to delete members'
      });
    }

    // Soft delete
    member.isActive = false;
    member.isDeleted = true;
    member.lastModifiedBy = req.user._id;
    member.updatedAt = new Date();
    await member.save();

    // Clean up relationships in other members to avoid dangling references
    try {
      // Remove this member from children/siblings/grand-* arrays and spouse list
      await FamilyMember.updateMany(
        { familyId: member.familyId },
        {
          $pull: {
            'relationships.children': member._id,
            'relationships.siblings': member._id,
            'relationships.grandchildren': member._id,
            'relationships.grandparents': member._id,
            'relationships.spouse': { memberId: member._id }
          }
        }
      );

      // Null out father references
      await FamilyMember.updateMany(
        { familyId: member.familyId, 'relationships.father': member._id },
        { $set: { 'relationships.father': null } }
      );
      // Null out mother references
      await FamilyMember.updateMany(
        { familyId: member.familyId, 'relationships.mother': member._id },
        { $set: { 'relationships.mother': null } }
      );
    } catch (relErr) {
      console.error('⚠️ Relationship cleanup error after delete:', relErr);
      // continue; not fatal for the delete operation
    }

    // Update family stats
    await family.updateStats();

    res.json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete family member'
    });
  }
});

// @route   POST /api/members/:memberId/photos
// @desc    Add photo to family member
// @access  Private (Family Admin)
router.post('/:memberId/photos', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { url, caption, isPrimary = false } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
      });
    }

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Check admin access
    const family = await Family.findById(member.familyId);
    const userAdmin = family.admins.find(admin => 
      admin.userId.toString() === req.user._id.toString()
    );

    if (!userAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You must be a family admin to add photos'
      });
    }

    // If setting as primary, remove primary from other photos
    if (isPrimary) {
      member.photos.forEach(photo => {
        photo.isPrimary = false;
      });
    }

    // Add new photo
    member.photos.push({
      url,
      caption,
      isPrimary,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

  member.lastModifiedBy = req.user._id;
    member.updatedAt = new Date();

    await member.save();

    res.json({
      success: true,
      message: 'Photo added successfully',
      photo: member.photos[member.photos.length - 1]
    });
  } catch (error) {
    console.error('❌ Add photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add photo'
    });
  }
});

// @route   POST /api/members/:memberId/timeline
// @desc    Add timeline event to family member
// @access  Private (Family Admin)
router.post('/:memberId/timeline', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { date, title, description, type = 'general' } = req.body;

    if (!date || !title) {
      return res.status(400).json({
        success: false,
        message: 'Date and title are required'
      });
    }

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Check admin access
    const family = await Family.findById(member.familyId);
    const userAdmin = family.admins.find(admin => 
      admin.userId.toString() === req.user._id.toString()
    );

    if (!userAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You must be a family admin to add timeline events'
      });
    }

    // Add timeline event
    member.timeline.push({
      date: new Date(date),
      title,
      description,
      type,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    // Sort timeline by date
    member.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    member.updatedBy = req.user._id;
    member.updatedAt = new Date();

    await member.save();

    res.json({
      success: true,
      message: 'Timeline event added successfully',
      event: member.timeline[member.timeline.length - 1]
    });
  } catch (error) {
    console.error('❌ Add timeline event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add timeline event'
    });
  }
});

module.exports = router;
// Position update endpoint below

// @route   PUT /api/members/:memberId/position
// @desc    Update a member node's position on the canvas
// @access  Private (Family Admin)
router.put('/:memberId/position', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { x, y } = req.body || {};

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return res.status(400).json({ success: false, message: 'Valid x and y are required' });
    }

    const member = await FamilyMember.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Family member not found' });

    const family = await Family.findById(member.familyId);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });

    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only family admins can move nodes' });
    }

    member.position = member.position || {};
    member.position.x = x;
    member.position.y = y;
    member.lastModifiedBy = req.user._id;
    member.updatedAt = new Date();
    await member.save();

    return res.json({ success: true, message: 'Position updated' });
  } catch (error) {
    console.error('❌ Update position error:', error);
    res.status(500).json({ success: false, message: 'Failed to update position' });
  }
});