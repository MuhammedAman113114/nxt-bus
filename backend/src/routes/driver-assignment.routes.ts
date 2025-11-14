import { Router, Request, Response } from 'express';
import { DriverAssignmentService } from '../services/driver-assignment.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ==================== DRIVER ENDPOINTS ====================

// Get buses driver is allowed to use
router.get('/my-allowed-buses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const buses = await DriverAssignmentService.getAllowedBuses(driverId);
    
    res.json({ buses });
  } catch (error) {
    console.error('Error fetching allowed buses:', error);
    res.status(500).json({ error: 'Failed to fetch allowed buses' });
  }
});

// Get driver's current assignments
router.get('/my-assignments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const assignments = await DriverAssignmentService.getDriverAssignments(driverId);
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Check if driver can use a specific bus
router.get('/can-use-bus/:busId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { busId } = req.params;
    
    const canUse = await DriverAssignmentService.canDriverUseBus(driverId, busId);
    
    res.json({ canUse });
  } catch (error) {
    console.error('Error checking bus permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Request bus change
router.post('/request-bus-change', authenticateToken, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { currentBusId, requestedBusId, reason } = req.body;

    if (!currentBusId || !requestedBusId || !reason) {
      return res.status(400).json({ error: 'Current bus, requested bus, and reason are required' });
    }

    const request = await DriverAssignmentService.requestBusChange(
      driverId,
      currentBusId,
      requestedBusId,
      reason
    );
    
    res.status(201).json({ 
      message: 'Bus change request submitted successfully',
      request 
    });
  } catch (error: any) {
    console.error('Error requesting bus change:', error);
    res.status(400).json({ error: error.message || 'Failed to submit request' });
  }
});

// Get driver's bus change requests
router.get('/my-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const requests = await DriverAssignmentService.getDriverRequests(driverId);
    
    res.json({ requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all driver assignments
router.get('/admin/assignments', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const assignments = await DriverAssignmentService.getAllDriverAssignments();
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Assign driver to bus
router.post('/admin/assign', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { driverId, busId, isPrimary, canSwitchToSameName, notes } = req.body;

    if (!driverId || !busId) {
      return res.status(400).json({ error: 'Driver ID and Bus ID are required' });
    }

    await DriverAssignmentService.assignDriverToBus(
      driverId,
      busId,
      adminId,
      isPrimary || false,
      canSwitchToSameName !== false, // Default to true
      notes
    );
    
    res.json({ message: 'Driver assigned to bus successfully' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Unassign driver from bus
router.delete('/admin/unassign', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { driverId, busId } = req.body;

    if (!driverId || !busId) {
      return res.status(400).json({ error: 'Driver ID and Bus ID are required' });
    }

    await DriverAssignmentService.unassignDriverFromBus(driverId, busId);
    
    res.json({ message: 'Driver unassigned from bus successfully' });
  } catch (error) {
    console.error('Error unassigning driver:', error);
    res.status(500).json({ error: 'Failed to unassign driver' });
  }
});

// Get pending bus change requests
router.get('/admin/pending-requests', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await DriverAssignmentService.getPendingRequests();
    
    res.json({ requests });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve bus change request
router.post('/admin/approve-request/:requestId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { requestId } = req.params;
    const { reviewNotes } = req.body;

    await DriverAssignmentService.approveBusChangeRequest(requestId, adminId, reviewNotes);
    
    res.json({ message: 'Bus change request approved successfully' });
  } catch (error: any) {
    console.error('Error approving request:', error);
    res.status(400).json({ error: error.message || 'Failed to approve request' });
  }
});

// Reject bus change request
router.post('/admin/reject-request/:requestId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { requestId } = req.params;
    const { reviewNotes } = req.body;

    if (!reviewNotes) {
      return res.status(400).json({ error: 'Review notes are required for rejection' });
    }

    await DriverAssignmentService.rejectBusChangeRequest(requestId, adminId, reviewNotes);
    
    res.json({ message: 'Bus change request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Get bus groups
router.get('/admin/bus-groups', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const groups = await DriverAssignmentService.getBusGroups();
    
    res.json({ groups });
  } catch (error) {
    console.error('Error fetching bus groups:', error);
    res.status(500).json({ error: 'Failed to fetch bus groups' });
  }
});

// Get buses in a group
router.get('/admin/bus-groups/:groupId/buses', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const buses = await DriverAssignmentService.getBusesInGroup(groupId);
    
    res.json({ buses });
  } catch (error) {
    console.error('Error fetching group buses:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

export default router;
