import { pool } from '../config/database';

interface BusAssignment {
  id: string;
  driverId: string;
  busId: string;
  busNumber: string;
  busName: string;
  registrationNumber: string;
  isPrimary: boolean;
  canSwitchToSameName: boolean;
  status: string;
  assignedAt: Date;
}

interface BusChangeRequest {
  id: string;
  driverId: string;
  currentBusId: string;
  requestedBusId: string;
  reason: string;
  status: string;
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export class DriverAssignmentService {
  // Get all buses a driver is allowed to use
  static async getAllowedBuses(driverId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM get_allowed_buses_for_driver($1)`,
      [driverId]
    );
    
    return result.rows;
  }

  // Check if driver can use a specific bus
  static async canDriverUseBus(driverId: string, busId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT can_driver_use_bus($1, $2) as can_use`,
      [driverId, busId]
    );
    
    return result.rows[0]?.can_use || false;
  }

  // Get driver's current assignments
  static async getDriverAssignments(driverId: string): Promise<BusAssignment[]> {
    const result = await pool.query(
      `SELECT 
        dba.id,
        dba.driver_id as "driverId",
        dba.bus_id as "busId",
        b.bus_number as "busNumber",
        b.bus_name as "busName",
        b.registration_number as "registrationNumber",
        dba.is_primary as "isPrimary",
        dba.can_switch_to_same_name as "canSwitchToSameName",
        dba.status,
        dba.assigned_at as "assignedAt"
       FROM driver_bus_assignments_new dba
       JOIN buses b ON dba.bus_id = b.id
       WHERE dba.driver_id = $1 AND dba.status = 'active'
       ORDER BY dba.is_primary DESC, b.bus_number ASC`,
      [driverId]
    );
    
    return result.rows;
  }

  // Assign driver to bus (Admin only)
  static async assignDriverToBus(
    driverId: string,
    busId: string,
    assignedBy: string,
    isPrimary: boolean = false,
    canSwitchToSameName: boolean = true,
    notes?: string
  ): Promise<any> {
    // If setting as primary, unset other primary assignments
    if (isPrimary) {
      await pool.query(
        `UPDATE driver_bus_assignments_new 
         SET is_primary = false 
         WHERE driver_id = $1 AND is_primary = true`,
        [driverId]
      );
    }

    const result = await pool.query(
      `INSERT INTO driver_bus_assignments_new (
        driver_id, bus_id, assigned_by, is_primary, can_switch_to_same_name, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6)
      ON CONFLICT (driver_id, bus_id) 
      DO UPDATE SET 
        is_primary = $4,
        can_switch_to_same_name = $5,
        status = 'active',
        notes = $6,
        updated_at = NOW()
      RETURNING id`,
      [driverId, busId, assignedBy, isPrimary, canSwitchToSameName, notes]
    );
    
    return result.rows[0];
  }

  // Unassign driver from bus (Admin only)
  static async unassignDriverFromBus(driverId: string, busId: string): Promise<void> {
    await pool.query(
      `UPDATE driver_bus_assignments_new 
       SET status = 'inactive', updated_at = NOW()
       WHERE driver_id = $1 AND bus_id = $2`,
      [driverId, busId]
    );
  }

  // Request bus change (Driver)
  static async requestBusChange(
    driverId: string,
    currentBusId: string,
    requestedBusId: string,
    reason: string
  ): Promise<any> {
    // Check if driver can already use the requested bus
    const canUse = await this.canDriverUseBus(driverId, requestedBusId);
    if (canUse) {
      throw new Error('You already have access to this bus');
    }

    // Check if there's already a pending request
    const existing = await pool.query(
      `SELECT id FROM bus_change_requests 
       WHERE driver_id = $1 AND requested_bus_id = $2 AND status = 'pending'`,
      [driverId, requestedBusId]
    );

    if (existing.rows.length > 0) {
      throw new Error('You already have a pending request for this bus');
    }

    const result = await pool.query(
      `INSERT INTO bus_change_requests (
        driver_id, current_bus_id, requested_bus_id, reason, status
      )
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, driver_id as "driverId", current_bus_id as "currentBusId", 
                requested_bus_id as "requestedBusId", reason, status, requested_at as "requestedAt"`,
      [driverId, currentBusId, requestedBusId, reason]
    );
    
    return result.rows[0];
  }

  // Get driver's bus change requests
  static async getDriverRequests(driverId: string): Promise<BusChangeRequest[]> {
    const result = await pool.query(
      `SELECT 
        bcr.id,
        bcr.driver_id as "driverId",
        bcr.current_bus_id as "currentBusId",
        cb.bus_number as "currentBusNumber",
        bcr.requested_bus_id as "requestedBusId",
        rb.bus_number as "requestedBusNumber",
        bcr.reason,
        bcr.status,
        bcr.requested_at as "requestedAt",
        bcr.reviewed_by as "reviewedBy",
        bcr.reviewed_at as "reviewedAt",
        bcr.review_notes as "reviewNotes"
       FROM bus_change_requests bcr
       LEFT JOIN buses cb ON bcr.current_bus_id = cb.id
       LEFT JOIN buses rb ON bcr.requested_bus_id = rb.id
       WHERE bcr.driver_id = $1
       ORDER BY bcr.requested_at DESC`,
      [driverId]
    );
    
    return result.rows;
  }

  // Get all pending bus change requests (Admin)
  static async getPendingRequests(): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        bcr.id,
        bcr.driver_id as "driverId",
        u.name as "driverName",
        u.email as "driverEmail",
        bcr.current_bus_id as "currentBusId",
        cb.bus_number as "currentBusNumber",
        bcr.requested_bus_id as "requestedBusId",
        rb.bus_number as "requestedBusNumber",
        bcr.reason,
        bcr.status,
        bcr.requested_at as "requestedAt"
       FROM bus_change_requests bcr
       JOIN users u ON bcr.driver_id = u.id
       LEFT JOIN buses cb ON bcr.current_bus_id = cb.id
       LEFT JOIN buses rb ON bcr.requested_bus_id = rb.id
       WHERE bcr.status = 'pending'
       ORDER BY bcr.requested_at ASC`
    );
    
    return result.rows;
  }

  // Approve bus change request (Admin)
  static async approveBusChangeRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    // Get request details
    const request = await pool.query(
      `SELECT driver_id, requested_bus_id FROM bus_change_requests WHERE id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    const { driver_id, requested_bus_id } = request.rows[0];

    // Update request status
    await pool.query(
      `UPDATE bus_change_requests 
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
       WHERE id = $3`,
      [reviewedBy, reviewNotes, requestId]
    );

    // Assign driver to the requested bus
    await this.assignDriverToBus(driver_id, requested_bus_id, reviewedBy, false, true, 'Approved via bus change request');
  }

  // Reject bus change request (Admin)
  static async rejectBusChangeRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE bus_change_requests 
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
       WHERE id = $3`,
      [reviewedBy, reviewNotes, requestId]
    );
  }

  // Get all driver assignments (Admin)
  static async getAllDriverAssignments(): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        dba.id,
        dba.driver_id as "driverId",
        u.name as "driverName",
        u.email as "driverEmail",
        dba.bus_id as "busId",
        b.bus_number as "busNumber",
        b.bus_name as "busName",
        b.registration_number as "registrationNumber",
        dba.is_primary as "isPrimary",
        dba.can_switch_to_same_name as "canSwitchToSameName",
        dba.status,
        dba.assigned_at as "assignedAt"
       FROM driver_bus_assignments_new dba
       JOIN users u ON dba.driver_id = u.id
       JOIN buses b ON dba.bus_id = b.id
       WHERE dba.status = 'active'
       ORDER BY u.name ASC, dba.is_primary DESC`
    );
    
    return result.rows;
  }

  // Get bus groups
  static async getBusGroups(): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        bg.id,
        bg.bus_name as "busName",
        bg.description,
        COUNT(bgm.bus_id) as "busCount"
       FROM bus_groups bg
       LEFT JOIN bus_group_members bgm ON bg.id = bgm.group_id
       GROUP BY bg.id, bg.bus_name, bg.description
       ORDER BY bg.bus_name ASC`
    );
    
    return result.rows;
  }

  // Get buses in a group
  static async getBusesInGroup(groupId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        b.id,
        b.bus_number as "busNumber",
        b.bus_name as "busName",
        b.registration_number as "registrationNumber",
        b.status
       FROM bus_group_members bgm
       JOIN buses b ON bgm.bus_id = b.id
       WHERE bgm.group_id = $1
       ORDER BY b.bus_number ASC`,
      [groupId]
    );
    
    return result.rows;
  }
}
