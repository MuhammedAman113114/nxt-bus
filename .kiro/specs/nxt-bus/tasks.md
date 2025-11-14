# Implementation Plan

- [x] 1. Set up project structure and development environment



  - Initialize monorepo structure with separate frontend and backend directories
  - Configure TypeScript for both frontend and backend with strict type checking
  - Set up ESLint and Prettier for code consistency
  - Create Docker Compose configuration for local development (PostgreSQL, Redis, Nginx)
  - Initialize Git repository with appropriate .gitignore files
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement database schema and migrations


  - [x] 2.1 Set up PostgreSQL with PostGIS extension


    - Create database initialization script
    - Enable PostGIS extension for spatial queries
    - Configure connection pooling
    - _Requirements: 1.1, 2.1, 3.1, 9.1_
  - [x] 2.2 Create database migration system


    - Set up migration tool (node-pg-migrate or similar)
    - Create initial migration for all tables (users, bus_stops, routes, buses, etc.)
    - Add spatial indexes on geography columns
    - Create composite indexes for frequently queried combinations
    - _Requirements: 1.1, 2.1, 3.1, 9.1_
  - [x] 2.3 Create seed data for development


    - Write seed script for sample bus stops with QR codes
    - Create sample routes with multiple stops
    - Add sample buses and schedules
    - Generate test user accounts (passengers and drivers)
    - _Requirements: 2.1, 7.1, 9.1_

- [x] 3. Build authentication and authorization system


  - [x] 3.1 Implement user registration and login


    - Create User model with password hashing using bcrypt
    - Implement JWT token generation and validation
    - Create registration endpoint with email and password validation
    - Create login endpoint returning JWT access and refresh tokens


    - _Requirements: 3.1, 4.1, 4.2, 4.3_
  - [x] 3.2 Implement role-based access control



    - Create middleware to verify JWT tokens


    - Implement role checking middleware (passenger, driver, admin)

    - Protect driver-only and admin-only endpoints
    - _Requirements: 3.1, 4.4_
  - [x] 3.3 Set up session management with Redis


    - Store active sessions in Redis with TTL
    - Implement refresh token rotation
    - Create logout endpoint that invalidates tokens
    - _Requirements: 3.5, 4.4_


  - [x]* 3.4 Write authentication tests


    - Test registration with valid and invalid inputs
    - Test login flow and token generation
    - Test protected endpoint access
    - Test session expiration and refresh
    - _Requirements: 3.1, 4.1, 4.2, 4.3_



- [x] 4. Implement core backend services


  - [x] 4.1 Create Location Service


    - Implement method to process and validate GPS coordinates


    - Create function to calculate distance between two points using Haversine formula
    - Implement method to store location updates in database
    - Create Redis caching layer for latest bus locations
    - Implement location update broadcasting logic
    - _Requirements: 1.1, 1.2, 3.2, 3.3_


  - [x] 4.2 Create Route Service


    - Implement method to fetch route details with stops
    - Create function to get all routes serving a specific stop
    - Implement method to calculate total route distance
    - Create function to determine next stops for a bus based on current location
    - _Requirements: 2.2, 7.1, 7.2, 7.4_

  - [x] 4.3 Create ETA Service

    - Implement ETA calculation algorithm using distance and average speed
    - Create function to detect delays by comparing scheduled vs estimated times
    - Implement method to get all ETAs for buses approaching a stop

    - Add confidence scoring based on data freshness and traffic patterns
    - Cache ETA calculations in Redis with 15-second TTL
    - _Requirements: 1.4, 5.1, 5.2_

  - [x] 4.4 Create Notification Service

    - Implement method to send arrival reminders based on ETA


    - Create function to send delay alerts to subscribed users
    - Implement subscription management (add, remove, update preferences)
    - Create notification queuing system for batch processing
    - _Requirements: 5.3, 5.4, 8.2, 8.3, 8.4_


  - [ ]* 4.5 Write service layer tests
    - Test Location Service coordinate validation and distance calculations
    - Test Route Service stop ordering and distance calculations
    - Test ETA Service accuracy with various scenarios


    - Test Notification Service subscription management
    - _Requirements: 1.1, 1.4, 5.1, 8.2_


- [x] 5. Build REST API endpoints


  - [x] 5.1 Implement authentication endpoints

    - POST /api/auth/register - Create new user account
    - POST /api/auth/login - Authenticate and return tokens
    - POST /api/auth/logout - Invalidate session
    - GET /api/auth/me - Get current user profile
    - _Requirements: 3.1, 4.1, 4.2_

  - [x] 5.2 Implement bus stop endpoints
    - GET /api/stops - List all bus stops with pagination
    - GET /api/stops/:id - Get specific stop details
    - GET /api/stops/qr/:qrCode - Get stop by QR code
    - POST /api/stops - Create new stop (admin only)
    - _Requirements: 2.1, 2.2, 9.3_
  - [x] 5.3 Implement route endpoints
    - GET /api/routes - List all routes
    - GET /api/routes/:id - Get route details with stops
    - GET /api/routes/:id/stops - Get ordered list of stops for route
    - GET /api/routes/:id/buses - Get active buses on route
    - _Requirements: 2.2, 7.1, 7.2, 10.1_
  - [x] 5.4 Implement bus endpoints
    - GET /api/buses/:id - Get bus details
    - GET /api/buses/:id/location - Get current bus location
    - _Requirements: 1.1, 10.2_
  - [x] 5.5 Implement user subscription endpoints

    - GET /api/users/:id/subscriptions - Get user's route subscriptions
    - POST /api/users/:id/subscriptions - Subscribe to route/stop
    - DELETE /api/users/:id/subscriptions/:routeId - Unsubscribe from route
    - POST /api/notifications/preferences - Update notification settings
    - _Requirements: 8.1, 8.3, 8.5_
  - [ ]* 5.6 Write API endpoint tests
    - Test all endpoints with valid and invalid inputs
    - Test authentication and authorization on protected routes
    - Test error handling and status codes
    - Test pagination and filtering
    - _Requirements: 2.1, 4.1, 7.1, 8.1_



- [x] 6. Implement WebSocket real-time communication


  - [x] 6.1 Set up Socket.IO server







    - Configure Socket.IO with Express server
    - Implement JWT authentication for WebSocket connections
    - Create room-based architecture (one room per route)


    - Implement connection lifecycle handlers (connect, disconnect)
    - _Requirements: 1.2, 3.2, 3.3_

  - [x] 6.2 Implement driver location tracking
    - Create 'driver:connect' event handler to start tracking session
    - Implement 'driver:location' event handler to process GPS updates
    - Validate driver authorization and bus assignment
    - Store location updates in database and Redis cache
    - Create 'driver:disconnect' event handler to end session
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 6.3 Implement passenger subscription system
    - Create 'passenger:subscribe' event handler for route/stop subscriptions
    - Implement 'passenger:unsubscribe' event handler
    - Add users to appropriate Socket.IO rooms based on subscriptions
    - _Requirements: 1.1, 8.1_
  - [x] 6.4 Implement real-time broadcasting

    - Broadcast 'bus:location' events to subscribed passengers
    - Emit 'bus:eta' events when ETA calculations update
    - Send 'bus:delay' events when delays detected
    - Emit 'bus:arrival' events for arrival reminders
    - Broadcast 'route:status' events when bus goes online/offline

    - Implement message batching to reduce network traffic
    - _Requirements: 1.2, 5.3, 5.4, 8.2, 10.3_
  - [ ]* 6.5 Write WebSocket tests
    - Test connection authentication
    - Test driver location update flow

    - Test passenger subscription and message delivery
    - Test room-based broadcasting
    - _Requirements: 1.2, 3.2, 8.1_



- [x] 7. Build frontend foundation


  - [x] 7.1 Set up React application with TypeScript

    - Initialize React app with Vite for fast development
    - Configure TypeScript with strict mode


    - Set up React Router for navigation
    - Configure environment variables for API endpoints
    - _Requirements: All frontend requirements_

  - [x] 7.2 Create shared TypeScript interfaces and types
    - Define interfaces matching backend models (Bus, BusStop, Route, etc.)
    - Create type definitions for API responses
    - Define WebSocket event types
    - _Requirements: All frontend requirements_
  - [x] 7.3 Implement API service layer
    - Create axios instance with base configuration
    - Implement authentication interceptor for JWT tokens
    - Create service methods for all REST endpoints
    - Implement error handling and retry logic
    - _Requirements: 2.1, 4.1, 7.1, 8.1_
  - [x] 7.4 Implement WebSocket service
    - Create Socket.IO client wrapper
    - Implement connection management with auto-reconnect
    - Create event emitter pattern for component subscriptions
    - Implement message queuing during disconnection
    - _Requirements: 1.2, 3.2, 8.2_
  - [x] 7.5 Set up Service Worker for PWA


    - Configure Workbox for service worker generation
    - Implement caching strategies for static assets
    - Create offline fallback page
    - Implement background sync for failed requests
    - _Requirements: 6.2, 6.3_

- [x] 8. Implement passenger web app core features

  - [x] 8.1 Create authentication pages


    - Build login page with email/password form
    - Create registration page with validation
    - Implement password strength indicator
    - Add form error handling and display
    - Store JWT tokens in localStorage
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 8.2 Build QR code scanner component



    - Implement camera access using HTML5 getUserMedia API
    - Integrate QR code scanning library (jsQR or html5-qrcode)
    - Create UI for scanner with camera preview
    - Handle camera permission requests and errors
    - Decode QR code and extract bus stop ID
    - Navigate to bus stop page after successful scan
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 8.3 Create bus stop page



    - Display bus stop name and location
    - Show list of routes serving the stop
    - Display upcoming buses with ETAs for each route
    - Implement real-time updates via WebSocket
    - Show distance to each approaching bus
    - Add loading states and error handling
    - _Requirements: 1.1, 1.3, 1.4, 2.2, 2.3_
  - [x] 8.4 Implement map component with Leaflet

    - Set up Leaflet map with OpenStreetMap tiles
    - Create custom markers for buses and stops
    - Implement map controls (zoom, pan, center)
    - Add bus location markers that update in real-time
    - Display bus heading/direction with arrow icons
    - _Requirements: 1.1, 1.2, 7.1_
  - [x] 8.5 Build route page



    - Display route name and description
    - Show complete route path on map using polylines
    - Mark all stops along route with clickable markers
    - Display distance between consecutive stops
    - Show total route distance
    - List active buses currently on route
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1_
  - [x] 8.6 Create bus list component



    - Display list of buses with route information
    - Show ETA and distance for each bus
    - Display bus status (active, idle, offline)
    - Show last update timestamp
    - Implement sorting by ETA or distance
    - Add visual indicators for delays
    - _Requirements: 1.3, 1.4, 5.1, 10.4, 10.5_
  - [x] 8.7 Implement user profile and subscriptions



    - Create profile page showing user information
    - Build subscription management interface
    - Allow users to subscribe to routes and stops
    - Configure notification preferences (timing, channels)
    - Display list of active subscriptions
    - Implement unsubscribe functionality
    - _Requirements: 4.4, 8.1, 8.3, 8.5_
  - [x] 8.8 Add notification system



    - Implement browser push notification support
    - Create in-app notification banner component
    - Display arrival reminders based on user preferences
    - Show delay alerts for subscribed routes
    - Implement notification history view
    - Add notification permission request flow
    - _Requirements: 5.3, 5.4, 8.2, 8.4_


- [ ] 9. Implement low-bandwidth optimizations
  - [x] 9.1 Add data compression and optimization



    - Enable gzip compression on all API responses
    - Implement delta updates for location changes (send only changed data)
    - Minimize JSON payloads by removing unnecessary fields
    - Use shorter property names in WebSocket messages
    - _Requirements: 6.1, 6.3_
  - [x] 9.2 Implement progressive loading strategy



    - Load critical data first (stop info, ETAs) before map tiles
    - Lazy load map component until needed
    - Defer loading of non-critical features
    - Show text-based information before rendering maps
    - _Requirements: 6.3, 6.4_
  - [x] 9.3 Add offline support with caching



    - Cache route and stop data in IndexedDB
    - Store last known bus locations for offline viewing
    - Implement stale-while-revalidate pattern
    - Display data freshness indicators
    - Queue failed requests for retry when online
    - _Requirements: 1.5, 6.2, 6.5_
  - [x] 9.4 Optimize map rendering



    - Implement map tile caching for frequently viewed areas
    - Use lower resolution tiles on slow connections
    - Limit number of visible bus markers
    - Simplify route polylines for better performance
    - _Requirements: 6.3, 7.1_




- [ ] 10. Build driver web app
  - [x] 10.1 Create driver login page







    - Build driver-specific login form


    - Validate driver credentials
    - Store driver session with bus assignment
    - _Requirements: 3.1_



  - [ ] 10.2 Implement GPS tracking component
    - Request geolocation permission from browser
    - Start continuous GPS tracking using watchPosition API

    - Display current location accuracy
    - Show connection status indicator


    - _Requirements: 3.2, 3.3_
  - [ ] 10.3 Create driver dashboard
    - Display assigned route and bus information


    - Show current location on map
    - Display next stops on route

    - Show tracking status (active/inactive)


    - Implement start/stop tracking buttons

    - _Requirements: 3.2, 3.4_





  - [ ] 10.4 Implement location transmission
    - Send GPS coordinates via WebSocket every 5 seconds




    - Include heading and speed in location updates
    - Handle connection failures with retry logic




    - Queue location updates during disconnection
    - _Requirements: 3.3, 3.5_
  - [x] 10.5 Add route progress indicator


    - Display list of upcoming stops


    - Highlight current position on route


    - Show estimated time to next stop
    - Display completed vs remaining stops

    - _Requirements: 3.4, 7.1_






- [ ] 11. Implement admin portal for QR code generation
  - [ ] 11.1 Create admin authentication
    - Build admin login page



    - Implement admin role verification



    - Protect admin routes with authorization middleware
    - _Requirements: 9.4_
  - [x] 11.2 Build bus stop management interface


    - Create form to add new bus stops

    - Display list of all bus stops
    - Implement edit and delete functionality





    - Show stop location on map for verification
    - _Requirements: 9.1, 9.4_
  - [ ] 11.3 Implement QR code generation
    - Generate unique QR codes for each bus stop
    - Encode stop ID and coordinates in QR code


    - Create downloadable QR code images (PNG/SVG)
    - Generate printable PDF with stop information and QR code


    - _Requirements: 9.1, 9.2, 9.4_
  - [x] 11.4 Create route management interface


    - Build form to create new routes
    - Implement stop ordering interface (drag and drop)
    - Calculate and display route distances
    - Assign buses to routes



    - _Requirements: 7.1, 7.2, 9.5_

- [ ] 12. Add monitoring and error tracking
  - [ ] 12.1 Implement application logging
    - Set up structured logging with Winston or Pino
    - Log all API requests and responses


    - Log WebSocket connection events
    - Log database queries and performance
    - _Requirements: All requirements for debugging_


  - [ ] 12.2 Add error tracking
    - Integrate error tracking service (Sentry or similar)
    - Capture and report frontend errors
    - Capture and report backend errors




    - Include context and user information in error reports
    - _Requirements: All requirements for reliability_
  - [ ] 12.3 Implement health check endpoints
    - Create /health endpoint for service status
    - Check database connectivity
    - Check Redis connectivity

    - Return service version and uptime
    - _Requirements: All requirements for monitoring_

- [x] 13. Create deployment configuration

  - [ ] 13.1 Set up Docker containers
    - Create Dockerfile for backend application
    - Create Dockerfile for frontend application
    - Configure multi-stage builds for optimization
    - _Requirements: All requirements for deployment_
  - [x] 13.2 Create production Docker Compose

    - Configure PostgreSQL with persistent volumes
    - Configure Redis with persistence
    - Set up Nginx as reverse proxy and load balancer
    - Configure SSL/TLS certificates
    - _Requirements: All requirements for deployment_


  - [ ] 13.3 Write deployment documentation
    - Document environment variables and configuration
    - Create deployment guide with step-by-step instructions
    - Document backup and recovery procedures
    - Create troubleshooting guide
    - _Requirements: All requirements for operations_

- [ ] 14. Perform integration and end-to-end testing
  - [ ] 14.1 Set up E2E testing framework
    - Configure Playwright or Cypress
    - Create test fixtures and helper functions
    - Set up test database with seed data
    - _Requirements: All requirements for quality assurance_
  - [ ] 14.2 Write critical user flow tests
    - Test passenger QR code scan and bus viewing flow
    - Test driver login and GPS tracking flow
    - Test notification delivery for subscribed routes
    - Test offline mode and data caching
    - Test system behavior during driver disconnection
    - _Requirements: 1.1, 2.1, 3.2, 5.3, 6.2_
  - [ ] 14.3 Perform cross-browser testing
    - Test on Chrome, Firefox, Safari, and Edge
    - Test on mobile browsers (iOS Safari, Chrome Mobile)
    - Verify responsive design on various screen sizes
    - Test camera and geolocation permissions on different browsers
    - _Requirements: All frontend requirements_
  - [ ] 14.4 Conduct performance testing
    - Simulate 1000+ concurrent WebSocket connections
    - Test API response times under load
    - Measure database query performance
    - Test low-bandwidth scenarios with network throttling
    - _Requirements: 1.2, 6.1, 6.3_
