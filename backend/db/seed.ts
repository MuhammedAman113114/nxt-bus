import dotenv from 'dotenv';
import path from 'path';
import { pool } from '../src/config/database';
import bcrypt from 'bcrypt';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seeding...');
    
    // Create test users
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES 
        ('passenger@test.com', $1, 'passenger'),
        ('driver@test.com', $1, 'driver'),
        ('admin@test.com', $1, 'admin')
      RETURNING id, email, role
    `, [passwordHash]);
    
    console.log('✓ Created users:', userResult.rows.map(u => u.email).join(', '));
    
    // Create bus stops with QR codes
    console.log('Creating bus stops...');
    const stopResult = await client.query(`
      INSERT INTO bus_stops (name, location, qr_code)
      VALUES 
        ('Central Station', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), 'QR-CENTRAL-001'),
        ('MG Road', ST_SetSRID(ST_MakePoint(77.6033, 12.9759), 4326), 'QR-MGROAD-002'),
        ('Indiranagar', ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326), 'QR-INDIRANAGAR-003'),
        ('Koramangala', ST_SetSRID(ST_MakePoint(77.6309, 12.9352), 4326), 'QR-KORAMANGALA-004'),
        ('Electronic City', ST_SetSRID(ST_MakePoint(77.6648, 12.8456), 4326), 'QR-ECITY-005'),
        ('Whitefield', ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326), 'QR-WHITEFIELD-006'),
        ('Jayanagar', ST_SetSRID(ST_MakePoint(77.5833, 12.9250), 4326), 'QR-JAYANAGAR-007'),
        ('Malleshwaram', ST_SetSRID(ST_MakePoint(77.5707, 13.0039), 4326), 'QR-MALLESHWARAM-008')
      RETURNING id, name, qr_code
    `);
    
    console.log('✓ Created bus stops:', stopResult.rows.length);
    const stops = stopResult.rows;
    
    // Create routes
    console.log('Creating routes...');
    const routeResult = await client.query(`
      INSERT INTO routes (name, description, is_active)
      VALUES 
        ('Route 101 - City Circle', 'Circular route covering major city areas', true),
        ('Route 202 - Tech Corridor', 'Connects tech hubs and IT parks', true),
        ('Route 303 - South Express', 'Express route to southern suburbs', true)
      RETURNING id, name
    `);
    
    console.log('✓ Created routes:', routeResult.rows.map(r => r.name).join(', '));
    const routes = routeResult.rows;
    
    // Create route stops for Route 101
    console.log('Creating route stops...');
    await client.query(`
      INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_previous)
      VALUES 
        ($1, $2, 1, 0),
        ($1, $3, 2, 2.5),
        ($1, $4, 3, 3.2),
        ($1, $5, 4, 4.1),
        ($1, $2, 5, 5.8)
    `, [routes[0].id, stops[0].id, stops[1].id, stops[2].id, stops[6].id]);
    
    // Route stops for Route 202
    await client.query(`
      INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_previous)
      VALUES 
        ($1, $2, 1, 0),
        ($1, $3, 2, 4.5),
        ($1, $4, 3, 6.2),
        ($1, $5, 4, 8.3)
    `, [routes[1].id, stops[2].id, stops[3].id, stops[4].id, stops[5].id]);
    
    // Route stops for Route 303
    await client.query(`
      INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_previous)
      VALUES 
        ($1, $2, 1, 0),
        ($1, $3, 2, 3.8),
        ($1, $4, 3, 7.5),
        ($1, $5, 4, 12.4)
    `, [routes[2].id, stops[0].id, stops[6].id, stops[3].id, stops[4].id]);
    
    console.log('✓ Created route stops');
    
    // Create buses
    console.log('Creating buses...');
    const busResult = await client.query(`
      INSERT INTO buses (registration_number, capacity, is_active)
      VALUES 
        ('KA-01-AB-1234', 40, true),
        ('KA-01-CD-5678', 40, true),
        ('KA-01-EF-9012', 50, true),
        ('KA-01-GH-3456', 50, true),
        ('KA-01-IJ-7890', 35, true)
      RETURNING id, registration_number
    `);
    
    console.log('✓ Created buses:', busResult.rows.length);
    const buses = busResult.rows;
    
    // Create bus assignments
    console.log('Creating bus assignments...');
    const driverId = userResult.rows.find(u => u.role === 'driver')?.id;
    const now = new Date();
    const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
    
    await client.query(`
      INSERT INTO bus_assignments (bus_id, route_id, driver_id, scheduled_start, scheduled_end, actual_start, status)
      VALUES 
        ($1, $2, $3, $4, $5, $4, 'active'),
        ($6, $7, $3, $4, $5, $4, 'active'),
        ($8, $9, NULL, $4, $5, NULL, 'scheduled')
    `, [
      buses[0].id, routes[0].id, driverId, startTime, endTime,
      buses[1].id, routes[1].id,
      buses[2].id, routes[2].id
    ]);
    
    console.log('✓ Created bus assignments');
    
    // Create sample bus locations
    console.log('Creating sample bus locations...');
    await client.query(`
      INSERT INTO bus_locations (bus_id, location, heading, speed, recorded_at)
      VALUES 
        ($1, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), 45.5, 35.2, NOW() - INTERVAL '5 seconds'),
        ($2, ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326), 120.0, 42.8, NOW() - INTERVAL '3 seconds')
    `, [buses[0].id, buses[1].id]);
    
    console.log('✓ Created sample bus locations');
    
    // Create schedules
    console.log('Creating schedules...');
    await client.query(`
      INSERT INTO schedules (route_id, stop_id, scheduled_arrival, day_of_week, is_active)
      VALUES 
        ($1, $2, '08:00:00', NULL, true),
        ($1, $3, '08:15:00', NULL, true),
        ($1, $4, '08:30:00', NULL, true)
    `, [routes[0].id, stops[0].id, stops[1].id, stops[2].id]);
    
    console.log('✓ Created schedules');
    
    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully!');
    console.log('\nTest credentials:');
    console.log('  Passenger: passenger@test.com / password123');
    console.log('  Driver: driver@test.com / password123');
    console.log('  Admin: admin@test.com / password123');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seed;
