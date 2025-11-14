import { pool } from '../config/database';
import { ETA } from '../types';
import { ETAService } from './eta.service';

interface NotificationPreferences {
  advanceMinutes: number;
  channels: ('push' | 'email' | 'sms')[];
}

interface Subscription {
  id: string;
  userId: string;
  routeId: string;
  stopId: string;
  notificationAdvanceMinutes: number;
  isActive: boolean;
}

export class NotificationService {
  // Send arrival reminder to a user
  static async sendArrivalReminder(
    userId: string,
    busId: string,
    eta: ETA
  ): Promise<void> {
    // Get user preferences
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return;
    }

    const user = userResult.rows[0];

    // Get bus and route info
    const busInfo = await pool.query(
      `SELECT 
        b.registration_number,
        r.name as route_name
       FROM buses b
       JOIN bus_assignments ba ON b.id = ba.bus_id
       JOIN routes r ON ba.route_id = r.id
       WHERE b.id = $1 AND ba.status = 'active'
       LIMIT 1`,
      [busId]
    );

    if (busInfo.rows.length === 0) {
      return;
    }

    const bus = busInfo.rows[0];

    // Get stop info
    const stopInfo = await pool.query(
      'SELECT name FROM bus_stops WHERE id = $1',
      [eta.stopId]
    );

    if (stopInfo.rows.length === 0) {
      return;
    }

    const stop = stopInfo.rows[0];

    const minutesUntilArrival = Math.round(
      (eta.estimatedArrival.getTime() - Date.now()) / (60 * 1000)
    );

    // Log notification (in production, this would send actual notifications)
    console.log(`
      📬 Arrival Reminder
      To: ${user.email}
      Bus: ${bus.registration_number} (${bus.route_name})
      Stop: ${stop.name}
      ETA: ${minutesUntilArrival} minutes
      Distance: ${eta.distance.toFixed(2)} km
    `);

    // In production, integrate with:
    // - Push notification service (Firebase, OneSignal, etc.)
    // - Email service (SendGrid, AWS SES, etc.)
    // - SMS service (Twilio, AWS SNS, etc.)
  }

  // Send delay alert to subscribed users
  static async sendDelayAlert(
    routeId: string,
    delayMinutes: number
  ): Promise<void> {
    // Get all active subscriptions for this route
    const subscriptions = await pool.query(
      `SELECT DISTINCT
        u.id as user_id,
        u.email,
        us.stop_id
       FROM user_subscriptions us
       JOIN users u ON us.user_id = u.id
       WHERE us.route_id = $1
         AND us.is_active = true`,
      [routeId]
    );

    // Get route info
    const routeInfo = await pool.query(
      'SELECT name FROM routes WHERE id = $1',
      [routeId]
    );

    if (routeInfo.rows.length === 0) {
      return;
    }

    const route = routeInfo.rows[0];

    // Send notification to each subscriber
    for (const sub of subscriptions.rows) {
      console.log(`
        ⚠️ Delay Alert
        To: ${sub.email}
        Route: ${route.name}
        Delay: ${delayMinutes} minutes
      `);
    }
  }

  // Subscribe user to route/stop notifications
  static async subscribeToRoute(
    userId: string,
    routeId: string,
    stopId: string,
    preferences: NotificationPreferences
  ): Promise<Subscription> {
    // Check if subscription already exists
    const existing = await pool.query(
      `SELECT id FROM user_subscriptions
       WHERE user_id = $1 AND route_id = $2 AND stop_id = $3`,
      [userId, routeId, stopId]
    );

    if (existing.rows.length > 0) {
      // Update existing subscription
      const result = await pool.query(
        `UPDATE user_subscriptions
         SET notification_advance_minutes = $1, is_active = true
         WHERE id = $2
         RETURNING *`,
        [preferences.advanceMinutes, existing.rows[0].id]
      );

      return this.mapSubscription(result.rows[0]);
    }

    // Create new subscription
    const result = await pool.query(
      `INSERT INTO user_subscriptions (user_id, route_id, stop_id, notification_advance_minutes, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [userId, routeId, stopId, preferences.advanceMinutes]
    );

    return this.mapSubscription(result.rows[0]);
  }

  // Unsubscribe user from route/stop notifications
  static async unsubscribeFromRoute(
    userId: string,
    routeId: string,
    stopId: string
  ): Promise<void> {
    await pool.query(
      `UPDATE user_subscriptions
       SET is_active = false
       WHERE user_id = $1 AND route_id = $2 AND stop_id = $3`,
      [userId, routeId, stopId]
    );
  }

  // Get user's subscriptions
  static async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const result = await pool.query(
      `SELECT 
        us.*,
        r.name as route_name,
        bs.name as stop_name
       FROM user_subscriptions us
       JOIN routes r ON us.route_id = r.id
       JOIN bus_stops bs ON us.stop_id = bs.id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY r.name, bs.name`,
      [userId]
    );

    return result.rows.map(this.mapSubscription);
  }

  // Check and send notifications for upcoming arrivals
  static async checkAndSendArrivalNotifications(): Promise<void> {
    // Get all active subscriptions
    const subscriptions = await pool.query(
      `SELECT 
        us.user_id,
        us.route_id,
        us.stop_id,
        us.notification_advance_minutes
       FROM user_subscriptions us
       WHERE us.is_active = true`
    );

    for (const sub of subscriptions.rows) {
      // Get ETAs for buses on this route approaching this stop
      const etas = await ETAService.getETAsForStop(sub.stop_id);

      for (const eta of etas) {
        const minutesUntilArrival = Math.round(
          (eta.estimatedArrival.getTime() - Date.now()) / (60 * 1000)
        );

        // Check if we should send notification
        if (
          minutesUntilArrival <= sub.notification_advance_minutes &&
          minutesUntilArrival > 0
        ) {
          // Check if we haven't sent this notification recently
          const notificationKey = `notif:sent:${sub.user_id}:${eta.busId}:${sub.stop_id}`;
          
          // In production, check Redis to avoid duplicate notifications
          // For now, just send
          await this.sendArrivalReminder(sub.user_id, eta.busId, eta);
        }
      }
    }
  }

  // Check and send delay notifications
  static async checkAndSendDelayNotifications(): Promise<void> {
    // Get all active bus assignments
    const assignments = await pool.query(
      `SELECT 
        ba.bus_id,
        ba.route_id
       FROM bus_assignments ba
       WHERE ba.status = 'active'`
    );

    for (const assignment of assignments.rows) {
      // Get scheduled stops for this bus
      const stops = await pool.query(
        `SELECT 
          rs.stop_id,
          s.scheduled_arrival
         FROM route_stops rs
         JOIN schedules s ON rs.route_id = s.route_id AND rs.stop_id = s.stop_id
         WHERE rs.route_id = $1
         ORDER BY rs.stop_order ASC
         LIMIT 1`,
        [assignment.route_id]
      );

      if (stops.rows.length === 0) {
        continue;
      }

      const nextStop = stops.rows[0];
      
      // Calculate delay
      const now = new Date();
      const scheduledTime = new Date();
      const [hours, minutes] = nextStop.scheduled_arrival.split(':');
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const delay = await ETAService.detectDelay(
        assignment.bus_id,
        nextStop.stop_id,
        scheduledTime
      );

      // Send alert if delay is significant (> 5 minutes)
      if (delay > 5) {
        await this.sendDelayAlert(assignment.route_id, delay);
      }
    }
  }

  // Helper to map database row to Subscription object
  private static mapSubscription(row: any): Subscription {
    return {
      id: row.id,
      userId: row.user_id,
      routeId: row.route_id,
      stopId: row.stop_id,
      notificationAdvanceMinutes: row.notification_advance_minutes,
      isActive: row.is_active,
    };
  }

  // Update notification preferences
  static async updateNotificationPreferences(
    userId: string,
    subscriptionId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    await pool.query(
      `UPDATE user_subscriptions
       SET notification_advance_minutes = $1
       WHERE id = $2 AND user_id = $3`,
      [preferences.advanceMinutes, subscriptionId, userId]
    );
  }

  // Get notification history (placeholder for future implementation)
  static async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    // In production, this would query a notifications history table
    return [];
  }
}
