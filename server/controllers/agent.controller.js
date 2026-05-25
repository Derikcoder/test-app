import FieldServiceAgent from '../models/FieldServiceAgent.model.js';
import User from '../models/User.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import MachineServiceHistory from '../models/MachineServiceHistory.model.js';
import Machine from '../models/Machine.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';
import { formatSequenceId, getNextSequenceValue } from '../utils/sequence.util.js';
import { AGENT_CATEGORIES, getAllowedSkillsForCategory } from '../config/agentTaxonomy.js';
import { imageSize } from 'image-size';

const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  return skills.map((skill) => String(skill).trim()).filter(Boolean);
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePreferredProviders = (providers) => {
  if (!Array.isArray(providers)) return [];

  return providers
    .map((provider) => ({
      businessName: String(provider?.businessName || '').trim(),
      location: String(provider?.location || '').trim(),
      category: String(provider?.category || '').trim(),
      supplierProductType: String(provider?.supplierProductType || '').trim(),
      preferredBrands: Array.isArray(provider?.preferredBrands)
        ? provider.preferredBrands.map((brand) => String(brand || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((provider) => (
      provider.businessName
      || provider.location
      || provider.category
      || provider.supplierProductType
      || provider.preferredBrands.length > 0
    ));
};

const validateCategorySkills = (category, skills) => {
  if (!AGENT_CATEGORIES.includes(category)) {
    return {
      valid: false,
      message: `Category must be one of: ${AGENT_CATEGORIES.join(', ')}`,
    };
  }

  const allowedSkills = getAllowedSkillsForCategory(category);
  const invalidSkills = skills.filter((skill) => !allowedSkills.includes(skill));

  if (invalidSkills.length > 0) {
    return {
      valid: false,
      message: `Invalid skills for category "${category}": ${invalidSkills.join(', ')}`,
    };
  }

  return { valid: true };
};

const MAX_PROFILE_PHOTO_BYTES = 500 * 1024;
const PROFILE_PHOTO_DIMENSION = 512;
const ALLOWED_PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];

const deriveInviteState = (linkedUser) => {
  if (!linkedUser) {
    return {
      hasCompletedPasswordSetup: null,
      canResendInvite: false,
    };
  }

  const hasCompletedPasswordSetup = linkedUser.hasCompletedPasswordSetup === true;
  const canResendInvite = !hasCompletedPasswordSetup;

  return {
    hasCompletedPasswordSetup,
    canResendInvite,
  };
};

const attachInviteState = async (agentDoc) => {
  if (!agentDoc) return agentDoc;

  const agent = agentDoc.toObject ? agentDoc.toObject() : { ...agentDoc };
  if (!agent.userAccount) {
    return {
      ...agent,
      hasCompletedPasswordSetup: null,
      canResendInvite: false,
    };
  }

  const linkedUser = await User.findById(agent.userAccount).select('hasCompletedPasswordSetup');
  return {
    ...agent,
    ...deriveInviteState(linkedUser),
  };
};

const resolvePublicCustomerName = () => 'Verified Customer';

// @desc    Get all field service agents
// @route   GET /api/agents
// @access  Private
export const getAgents = async (req, res) => {
  try {
    const agents = await FieldServiceAgent.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    const hydratedAgents = await Promise.all(agents.map((agent) => attachInviteState(agent)));
    res.json(hydratedAgents);
  } catch (error) {
    logError('Get agents error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single field service agent
// @route   GET /api/agents/:id
// @access  Private
export const getAgentById = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(await attachInviteState(agent));
  } catch (error) {
    logError('Get agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get calling field agent's own profile (no createdBy restriction)
// @route   GET /api/agents/me
// @access  Private (fieldServiceAgent)
export const getMyAgentProfile = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({ userAccount: req.user._id });
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    res.json(await attachInviteState(agent));
  } catch (error) {
    logError('Get my agent profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public-facing field service agent profile
// @route   GET /api/agents/public/:id
// @access  Public
export const getPublicAgentProfile = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findById(req.params.id).select([
      'firstName',
      'lastName',
      'employeeId',
      'category',
      'skills',
      'status',
      'assignedArea',
      'averageRating',
      'ratingsCount',
      'totalJobsAttended',
      'jobsCompleted',
      'profilePhoto',
      'preferredSuppliers',
      'preferredThirdPartyServiceProviders',
      'userAccount',
    ].join(' '));

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const allAssignedServiceCalls = await ServiceCall.find({
      assignedAgent: agent._id,
    })
      .select([
        'callNumber',
        'title',
        'serviceType',
        'status',
        'scheduledDate',
        'completedDate',
        'invoicedDate',
        'createdAt',
        'updatedAt',
        'laborHours',
        'partsCost',
        'partsUsed',
        'feedbackHistory',
        'machineId',
      ].join(' '))
      .populate('machineId', 'serviceCategory machineType generatorMakeModel machineModelNumber')
      .sort({ updatedAt: -1 })
      .lean();

    const serviceCallsWithFeedback = allAssignedServiceCalls
      .filter((serviceCall) => Array.isArray(serviceCall.feedbackHistory) && serviceCall.feedbackHistory.length > 0);

    const publicReviews = serviceCallsWithFeedback
      .flatMap((serviceCall) => {
        const entries = Array.isArray(serviceCall.feedbackHistory) ? serviceCall.feedbackHistory : [];
        return entries
          .filter((entry) => ['invoice', 'completedService'].includes(entry?.stage))
          .map((entry) => ({
            reviewId: entry?._id,
            callNumber: serviceCall.callNumber,
            stage: entry.stage,
            rating: entry.rating,
            feedback: entry.feedback || '',
            submittedAt: entry.submittedAt,
            customerName: resolvePublicCustomerName(),
          }));
      })
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    const machineMap = new Map();
    const expertiseBrandsSet = new Set();

    const upsertMachineAggregate = ({ machineDoc, servicedAt, partsUsed }) => {
      if (machineDoc?._id) {
        const key = String(machineDoc._id);
        const existing = machineMap.get(key) || {
          machineId: key,
          serviceCategory: machineDoc.serviceCategory || '',
          machineType: machineDoc.machineType || '',
          generatorMakeModel: machineDoc.generatorMakeModel || '',
          machineModelNumber: machineDoc.machineModelNumber || '',
          servicesRendered: 0,
          lastServicedAt: null,
        };

        existing.servicesRendered += 1;
        if (!existing.lastServicedAt || new Date(servicedAt || 0) > new Date(existing.lastServicedAt || 0)) {
          existing.lastServicedAt = servicedAt || existing.lastServicedAt;
        }

        machineMap.set(key, existing);
      }

      const normalizedParts = Array.isArray(partsUsed) ? partsUsed : [];
      normalizedParts.forEach((part) => {
        const brand = String(part?.actualBrand || part?.brand || '').trim();
        if (brand) expertiseBrandsSet.add(brand);
      });
    };

    const serviceCallsWithMachine = allAssignedServiceCalls
      .filter((serviceCall) => serviceCall.machineId);

    serviceCallsWithMachine.forEach((serviceCall) => {
      upsertMachineAggregate({
        machineDoc: serviceCall.machineId,
        servicedAt: serviceCall.completedDate || serviceCall.updatedAt,
        partsUsed: serviceCall.partsUsed,
      });
    });

    const machineHistoryAgentIds = [String(agent._id)];
    if (agent.userAccount) machineHistoryAgentIds.push(String(agent.userAccount));

    const machineHistory = await MachineServiceHistory.find({
      agentId: { $in: machineHistoryAgentIds },
    })
          .populate('machineId', 'serviceCategory machineType generatorMakeModel machineModelNumber')
          .sort({ servicedAt: -1 })
          .limit(300)
          .lean();

    machineHistory.forEach((entry) => {
      upsertMachineAggregate({
        machineDoc: entry.machineId,
        servicedAt: entry.servicedAt,
        partsUsed: entry.partsUsed,
      });
    });

    const machineRegistryEntries = await Machine.find({
      $or: [
        { lastServiceAgent: { $in: machineHistoryAgentIds } },
        { createdBy: { $in: machineHistoryAgentIds } },
      ],
    })
      .select('serviceCategory machineType generatorMakeModel machineModelNumber serviceCount lastServicedAt')
      .sort({ serviceCount: -1, lastServicedAt: -1 })
      .limit(300)
      .lean();

    machineRegistryEntries.forEach((machineDoc) => {
      if (!machineDoc?._id) return;

      const key = String(machineDoc._id);
      const existing = machineMap.get(key) || {
        machineId: key,
        serviceCategory: machineDoc.serviceCategory || '',
        machineType: machineDoc.machineType || '',
        generatorMakeModel: machineDoc.generatorMakeModel || '',
        machineModelNumber: machineDoc.machineModelNumber || '',
        servicesRendered: 0,
        lastServicedAt: null,
      };

      existing.servicesRendered = Math.max(
        Number(existing.servicesRendered || 0),
        Number(machineDoc.serviceCount || 0)
      );

      if (!existing.lastServicedAt || new Date(machineDoc.lastServicedAt || 0) > new Date(existing.lastServicedAt || 0)) {
        existing.lastServicedAt = machineDoc.lastServicedAt || existing.lastServicedAt;
      }

      machineMap.set(key, existing);
    });

    const statusBreakdown = allAssignedServiceCalls.reduce((acc, serviceCall) => {
      const status = String(serviceCall.status || 'unknown');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const completedOrInvoicedCalls = allAssignedServiceCalls
      .filter((serviceCall) => ['completed', 'invoiced'].includes(serviceCall.status));

    const totalLaborHours = completedOrInvoicedCalls
      .reduce((sum, serviceCall) => sum + Number(serviceCall.laborHours || 0), 0);

    const totalPartsCost = completedOrInvoicedCalls
      .reduce((sum, serviceCall) => sum + Number(serviceCall.partsCost || 0), 0);

    const totalPartsLineItems = completedOrInvoicedCalls
      .reduce((sum, serviceCall) => {
        const partsUsed = Array.isArray(serviceCall.partsUsed) ? serviceCall.partsUsed : [];
        return sum + partsUsed.length;
      }, 0);

    const totalPartUnits = completedOrInvoicedCalls
      .reduce((sum, serviceCall) => {
        const partsUsed = Array.isArray(serviceCall.partsUsed) ? serviceCall.partsUsed : [];
        return sum + partsUsed.reduce((innerSum, part) => innerSum + Number(part?.quantity || 0), 0);
      }, 0);

    const recentServiceEvidence = completedOrInvoicedCalls
      .map((serviceCall) => ({
        callNumber: serviceCall.callNumber,
        title: serviceCall.title || '',
        serviceType: serviceCall.serviceType || '',
        status: serviceCall.status,
        customerName: resolvePublicCustomerName(),
        serviceDate: serviceCall.invoicedDate || serviceCall.completedDate || serviceCall.updatedAt || serviceCall.createdAt,
        machine: serviceCall.machineId
          ? {
              machineId: String(serviceCall.machineId._id || ''),
              machineType: serviceCall.machineId.machineType || '',
              generatorMakeModel: serviceCall.machineId.generatorMakeModel || '',
              machineModelNumber: serviceCall.machineId.machineModelNumber || '',
            }
          : null,
        hasMachineLink: Boolean(serviceCall.machineId?._id),
        dataCompleteness: {
          machineLinked: Boolean(serviceCall.machineId?._id),
          partsCaptured: Array.isArray(serviceCall.partsUsed) && serviceCall.partsUsed.length > 0,
          laborCaptured: Number(serviceCall.laborHours || 0) > 0,
        },
        laborHours: Number(serviceCall.laborHours || 0),
        partsCost: Number(serviceCall.partsCost || 0),
        partsLineItems: Array.isArray(serviceCall.partsUsed) ? serviceCall.partsUsed.length : 0,
      }))
      .sort((a, b) => new Date(b.serviceDate || 0) - new Date(a.serviceDate || 0))
      .slice(0, 20);

    const machinesWorkedOn = Array.from(machineMap.values())
      .sort((a, b) => {
        if (b.servicesRendered !== a.servicesRendered) return b.servicesRendered - a.servicesRendered;
        return new Date(b.lastServicedAt || 0) - new Date(a.lastServicedAt || 0);
      })
      .slice(0, 30);

    const publicAgentProfile = {
      _id: agent._id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      employeeId: agent.employeeId,
      category: agent.category,
      skills: agent.skills || [],
      status: agent.status,
      assignedArea: agent.assignedArea || '',
      averageRating: Number(agent.averageRating || 0),
      ratingsCount: Number(agent.ratingsCount || 0),
      totalJobsAttended: Number(agent.totalJobsAttended || 0),
      jobsCompleted: Number(agent.jobsCompleted || 0),
      profilePhoto: agent.profilePhoto || {},
      preferredSuppliers: Array.isArray(agent.preferredSuppliers) ? agent.preferredSuppliers : [],
      preferredThirdPartyServiceProviders: Array.isArray(agent.preferredThirdPartyServiceProviders)
        ? agent.preferredThirdPartyServiceProviders
        : [],
      serviceReport: {
        totalAssignedJobs: allAssignedServiceCalls.length,
        completedOrInvoicedJobs: completedOrInvoicedCalls.length,
        statusBreakdown,
        totalLaborHours,
        totalPartsCost,
        totalPartsLineItems,
        totalPartUnits,
        recentServiceEvidence,
      },
      expertiseBrands: Array.from(expertiseBrandsSet).sort((a, b) => a.localeCompare(b)),
      machinesWorkedOn,
      publicReviews,
    };

    return res.json(publicAgentProfile);
  } catch (error) {
    logError('Get public agent profile error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Create new field service agent
// @route   POST /api/agents
// @access  Private
export const createAgent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      backupEmail,
      phoneNumber,
      category,
      skills,
      status,
      assignedArea,
      vehicleNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !category) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedBackupEmail = backupEmail ? normalizeEmail(backupEmail) : '';
    const normalizedSkills = normalizeSkills(skills);
    const categoryValidation = validateCategorySkills(category, normalizedSkills);
    if (!categoryValidation.valid) {
      return res.status(400).json({ message: categoryValidation.message });
    }

    if (normalizedBackupEmail && normalizedBackupEmail === normalizedEmail) {
      return res.status(400).json({ message: 'Backup email must differ from the primary email' });
    }

    // Check if email already exists
    const agentExists = await FieldServiceAgent.findOne({ email: normalizedEmail });

    if (agentExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Employee IDs are generated by the system to keep sequence integrity.
    let employeeId;
    let attempts = 0;

    do {
      const nextEmployeeSequence = await getNextSequenceValue('agent_employee_id');
      employeeId = formatSequenceId('AGT', nextEmployeeSequence);
      attempts += 1;
    } while (await FieldServiceAgent.findOne({ employeeId }) && attempts < 5);

    if (await FieldServiceAgent.findOne({ employeeId })) {
      return res.status(500).json({ message: 'Failed to generate a unique employee ID' });
    }

    const agent = await FieldServiceAgent.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phoneNumber,
      backupEmail: normalizedBackupEmail,
      employeeId,
      category,
      skills: normalizedSkills,
      status,
      assignedArea,
      vehicleNumber,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Agent created: ${agent.firstName} ${agent.lastName} (${agent.employeeId})`);
    res.status(201).json(agent);
  } catch (error) {
    logError('Create agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update field service agent
// @route   PUT /api/agents/:id
// @access  Private
export const updateAgent = async (req, res) => {
  try {
    const isFieldAgentSelfUpdate = req.user?.role === 'fieldServiceAgent';
    const isSuperAdmin = req.user?.role === 'superAdmin' || req.user?.isSuperUser === true;
    const governanceFields = ['governanceFlag', 'governanceFlagNote'];
    const governanceUpdateRequested = governanceFields.some((field) => req.body?.[field] !== undefined);
    const agent = isFieldAgentSelfUpdate
      ? await FieldServiceAgent.findOne({
          _id: req.params.id,
          userAccount: req.user._id,
        })
      : await FieldServiceAgent.findOne({
          _id: req.params.id,
          createdBy: req.user._id,
        });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (governanceUpdateRequested && !isSuperAdmin) {
      return res.status(403).json({
        message: 'Only Super Admin can update governance flag status',
      });
    }

    if (isFieldAgentSelfUpdate) {
      const selfEditableFields = [
        'email',
        'phoneNumber',
        'backupEmail',
        'assignedArea',
        'vehicleNumber',
        'notes',
        'category',
        'skills',
        'preferredSuppliers',
        'preferredThirdPartyServiceProviders',
      ];
      const attemptedFields = Object.keys(req.body || {});
      const disallowedFields = attemptedFields.filter((field) => !selfEditableFields.includes(field));

      if (disallowedFields.length > 0) {
        return res.status(403).json({
          message: 'Field agents can only update approved profile particulars',
          disallowedFields,
          editableFields: selfEditableFields,
        });
      }
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = FieldServiceAgent.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== agent[field]
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Update editable fields
    const targetCategory = req.body.category ?? agent.category;
    const targetSkills = req.body.skills !== undefined ? normalizeSkills(req.body.skills) : agent.skills;
    const targetPreferredSuppliers = req.body.preferredSuppliers !== undefined
      ? normalizePreferredProviders(req.body.preferredSuppliers)
      : agent.preferredSuppliers;
    const targetPreferredThirdPartyServiceProviders = req.body.preferredThirdPartyServiceProviders !== undefined
      ? normalizePreferredProviders(req.body.preferredThirdPartyServiceProviders)
      : agent.preferredThirdPartyServiceProviders;
    const targetEmail = req.body.email !== undefined ? normalizeEmail(req.body.email) : agent.email;
    const targetBackupEmail = req.body.backupEmail !== undefined
      ? (req.body.backupEmail ? normalizeEmail(req.body.backupEmail) : '')
      : (agent.backupEmail || '');

    if (!targetEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (targetBackupEmail && targetBackupEmail === targetEmail) {
      return res.status(400).json({ message: 'Backup email must differ from the primary email' });
    }

    const categoryValidation = validateCategorySkills(targetCategory, targetSkills);
    if (!categoryValidation.valid) {
      return res.status(400).json({ message: categoryValidation.message });
    }

    if (targetEmail !== agent.email) {
      const duplicateAgent = await FieldServiceAgent.findOne({ email: targetEmail });
      if (duplicateAgent && String(duplicateAgent._id) !== String(agent._id)) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const linkedUser = agent.userAccount ? await User.findById(agent.userAccount) : null;
      const duplicateUser = await User.findOne({ email: targetEmail });
      if (duplicateUser && (!linkedUser || String(duplicateUser._id) !== String(linkedUser._id))) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      if (linkedUser) {
        linkedUser.email = targetEmail;
        await linkedUser.save();
      }
    }

    const previousGovernanceFlag = agent.governanceFlag;
    const previousGovernanceFlagNote = agent.governanceFlagNote;

    FieldServiceAgent.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'skills') {
          agent[field] = targetSkills;
        } else if (field === 'preferredSuppliers') {
          agent[field] = targetPreferredSuppliers;
        } else if (field === 'preferredThirdPartyServiceProviders') {
          agent[field] = targetPreferredThirdPartyServiceProviders;
        } else if (field === 'email') {
          agent[field] = targetEmail;
        } else if (field === 'backupEmail') {
          agent[field] = targetBackupEmail;
        } else if (field === 'governanceFlagNote') {
          agent[field] = String(req.body[field] || '').trim();
        } else {
          agent[field] = req.body[field];
        }
      }
    });

    if (governanceUpdateRequested && (agent.governanceFlag !== previousGovernanceFlag || agent.governanceFlagNote !== previousGovernanceFlagNote)) {
      agent.governanceFlagUpdatedAt = new Date();
      agent.governanceFlagUpdatedBy = req.user?._id;
    }

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent updated: ${updatedAgent.employeeId}`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload or replace field agent profile photo
// @route   PATCH /api/agents/:id/profile-photo
// @access  Private
export const uploadAgentProfilePhoto = async (req, res) => {
  try {
    const isFieldAgentSelfUpdate = req.user?.role === 'fieldServiceAgent';
    const agent = isFieldAgentSelfUpdate
      ? await FieldServiceAgent.findOne({
          _id: req.params.id,
          userAccount: req.user._id,
        })
      : await FieldServiceAgent.findOne({
          _id: req.params.id,
          createdBy: req.user._id,
        });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Profile photo file is required' });
    }

    if (!ALLOWED_PROFILE_PHOTO_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Profile photo must be JPG or PNG' });
    }

    if (req.file.size > MAX_PROFILE_PHOTO_BYTES) {
      return res.status(400).json({ message: 'Profile photo size must be 500KB or less' });
    }

    let dimensions;
    try {
      dimensions = imageSize(req.file.buffer);
    } catch (dimensionError) {
      return res.status(400).json({ message: 'Unable to read image dimensions. Upload a valid JPG or PNG image.' });
    }

    if (dimensions.width !== PROFILE_PHOTO_DIMENSION || dimensions.height !== PROFILE_PHOTO_DIMENSION) {
      return res.status(400).json({ message: 'Profile photo must be exactly 512x512 pixels' });
    }

    agent.profilePhoto = {
      mimeType: req.file.mimetype,
      data: req.file.buffer.toString('base64'),
      size: req.file.size,
      width: dimensions.width,
      height: dimensions.height,
      uploadedAt: new Date(),
    };

    const updatedAgent = await agent.save();

    logInfo(`✅ Agent profile photo updated: ${updatedAgent.employeeId}`);
    return res.json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedAgent.profilePhoto,
    });
  } catch (error) {
    logError('Upload agent profile photo error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Delete field service agent
// @route   DELETE /api/agents/:id
// @access  Private
export const deleteAgent = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.deleteOne();
    logInfo(`✅ Agent deleted: ${agent.employeeId}`);
    res.json({ message: 'Agent removed successfully' });
  } catch (error) {
    logError('Delete agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agent performance metrics
// @route   GET /api/agents/:id/performance
// @access  Private
export const getAgentPerformance = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      agent: {
        _id: agent._id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        employeeId: agent.employeeId
      },
      performance: {
        totalJobsAttended: agent.totalJobsAttended,
        averageRating: agent.averageRating.toFixed(2),
        ratingsCount: agent.ratingsCount,
        hourlyRate: agent.hourlyRate,
        specializations: agent.specializations,
        availability: agent.availability
      },
      estimatedMetrics: {
        averageEarningsPerJob: agent.hourlyRate > 0 && agent.totalJobsAttended > 0 
          ? (agent.hourlyRate * 2).toFixed(2) // Assuming 2-hour average job
          : 0
      }
    });
  } catch (error) {
    logError('Get agent performance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agents by specialization
// @route   GET /api/agents/specialization/:specialization
// @access  Private
export const getAgentsBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;

    const agents = await FieldServiceAgent.find({
      specializations: specialization,
      createdBy: req.user._id
    })
      .sort({ averageRating: -1, totalJobsAttended: -1 });

    res.json(agents);
  } catch (error) {
    logError('Get agents by specialization error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get top-rated agents
// @route   GET /api/agents/top-rated
// @access  Private
export const getTopRatedAgents = async (req, res) => {
  try {
    const { limit = 10, minRatings = 3 } = req.query;

    const agents = await FieldServiceAgent.find({
      createdBy: req.user._id,
      ratingsCount: { $gte: minRatings }
    })
      .sort({ averageRating: -1, totalJobsAttended: -1 })
      .limit(parseInt(limit));

    res.json(agents);
  } catch (error) {
    logError('Get top-rated agents error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update agent availability
// @route   PATCH /api/agents/:id/availability
// @access  Private
export const updateAgentAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    const validAvailability = ['available', 'busy', 'off-duty'];
    if (!availability || !validAvailability.includes(availability)) {
      return res.status(400).json({ 
        message: `Availability must be one of: ${validAvailability.join(', ')}` 
      });
    }

    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.availability = availability;
    if (availability !== 'off-duty' && agent.currentLocation) {
      agent.currentLocation.updatedAt = new Date();
    }

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent availability updated: ${updatedAgent.employeeId} → ${availability}`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent availability error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update agent location
// @route   PATCH /api/agents/:id/location
// @access  Private
export const updateAgentLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.currentLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      updatedAt: new Date()
    };

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent location updated: ${updatedAgent.employeeId} (${lat}, ${lng})`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent location error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update agent self-dispatch access
// @route   PATCH /api/agents/:id/self-dispatch-access
// @access  Private
export const updateAgentSelfDispatchAccess = async (req, res) => {
  try {
    const { selfDispatchSuspended, reason = '' } = req.body;

    if (typeof selfDispatchSuspended !== 'boolean') {
      return res.status(400).json({ message: 'selfDispatchSuspended must be a boolean value' });
    }

    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.selfDispatchSuspended = selfDispatchSuspended;
    agent.selfDispatchSuspendedReason = selfDispatchSuspended ? reason : '';

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent self-dispatch access updated: ${updatedAgent.employeeId} → ${selfDispatchSuspended ? 'suspended' : 'enabled'}`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent self-dispatch access error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available agents for assignment
// @route   GET /api/agents/available/list
// @access  Private
export const getAvailableAgents = async (req, res) => {
  try {
    const { specialization } = req.query;

    const filter = {
      availability: 'available',
      createdBy: req.user._id
    };

    if (specialization) {
      filter.specializations = specialization;
    }

    const agents = await FieldServiceAgent.find(filter)
      .sort({ averageRating: -1, totalJobsAttended: -1 });

    res.json(agents);
  } catch (error) {
    logError('Get available agents error:', error);
    res.status(500).json({ message: error.message });
  }
};
