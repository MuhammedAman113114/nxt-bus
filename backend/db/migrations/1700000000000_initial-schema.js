/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      check: "role IN ('passenger', 'driver', 'admin')",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Add trigger for updated_at
  pgm.createTrigger('users', 'update_users_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });

  // Bus stops table with PostGIS geometry
  pgm.createTable('bus_stops', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    location: {
      type: 'geography(POINT, 4326)',
      notNull: true,
    },
    qr_code: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create spatial index for efficient location queries
  pgm.createIndex('bus_stops', 'location', {
    method: 'gist',
  });

  // Routes table
  pgm.createTable('routes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Route stops junction table (maintains order)
  pgm.createTable('route_stops', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes',
      onDelete: 'CASCADE',
    },
    stop_id: {
      type: 'uuid',
      notNull: true,
      references: 'bus_stops',
      onDelete: 'CASCADE',
    },
    stop_order: {
      type: 'integer',
      notNull: true,
    },
    distance_from_previous: {
      type: 'decimal(10, 2)',
    },
  });

  // Unique constraint on route_id and stop_order
  pgm.addConstraint('route_stops', 'unique_route_stop_order', {
    unique: ['route_id', 'stop_order'],
  });

  // Buses table
  pgm.createTable('buses', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    registration_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    capacity: {
      type: 'integer',
      notNull: true,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Bus assignments (which bus is on which route)
  pgm.createTable('bus_assignments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    bus_id: {
      type: 'uuid',
      notNull: true,
      references: 'buses',
      onDelete: 'CASCADE',
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes',
      onDelete: 'CASCADE',
    },
    driver_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    scheduled_start: {
      type: 'timestamp',
      notNull: true,
    },
    scheduled_end: {
      type: 'timestamp',
      notNull: true,
    },
    actual_start: {
      type: 'timestamp',
    },
    actual_end: {
      type: 'timestamp',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      check: "status IN ('scheduled', 'active', 'completed', 'cancelled')",
    },
  });

  // Bus locations (time-series data)
  pgm.createTable('bus_locations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    bus_id: {
      type: 'uuid',
      notNull: true,
      references: 'buses',
      onDelete: 'CASCADE',
    },
    location: {
      type: 'geography(POINT, 4326)',
      notNull: true,
    },
    heading: {
      type: 'decimal(5, 2)',
    },
    speed: {
      type: 'decimal(5, 2)',
    },
    recorded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Indexes for bus locations
  pgm.createIndex('bus_locations', ['bus_id', 'recorded_at'], {
    name: 'idx_bus_locations_bus_time',
  });

  pgm.createIndex('bus_locations', 'location', {
    method: 'gist',
    name: 'idx_bus_locations_location',
  });

  // User subscriptions
  pgm.createTable('user_subscriptions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes',
      onDelete: 'CASCADE',
    },
    stop_id: {
      type: 'uuid',
      notNull: true,
      references: 'bus_stops',
      onDelete: 'CASCADE',
    },
    notification_advance_minutes: {
      type: 'integer',
      notNull: true,
      default: 10,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Unique constraint on user subscriptions
  pgm.addConstraint('user_subscriptions', 'unique_user_route_stop', {
    unique: ['user_id', 'route_id', 'stop_id'],
  });

  // Schedules table
  pgm.createTable('schedules', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes',
      onDelete: 'CASCADE',
    },
    stop_id: {
      type: 'uuid',
      notNull: true,
      references: 'bus_stops',
      onDelete: 'CASCADE',
    },
    scheduled_arrival: {
      type: 'time',
      notNull: true,
    },
    day_of_week: {
      type: 'integer',
      check: 'day_of_week BETWEEN 0 AND 6',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('schedules');
  pgm.dropTable('user_subscriptions');
  pgm.dropTable('bus_locations');
  pgm.dropTable('bus_assignments');
  pgm.dropTable('buses');
  pgm.dropTable('route_stops');
  pgm.dropTable('routes');
  pgm.dropTable('bus_stops');
  pgm.dropTable('users');
};
