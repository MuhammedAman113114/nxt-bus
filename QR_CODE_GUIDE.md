# QR Code Generation Guide for Bus Stops

## Overview
Each bus stop has a unique URL that can be converted into a QR code. When passengers scan the QR code, they see all buses serving that stop.

## URL Format

### Stop-Specific Page
```
https://yourdomain.com/stop/{stopId}
```

Example:
- Stop ID: `123e4567-e89b-12d3-a456-426614174000`
- URL: `https://yourdomain.com/stop/123e4567-e89b-12d3-a456-426614174000`

### Search with Pre-filled Locations
```
https://yourdomain.com/?from={fromLocation}&to={toLocation}
```

Example:
- From: BIT
- To: Mangalore
- URL: `https://yourdomain.com/?from=BIT&to=Mangalore`

## How to Generate QR Codes

### Method 1: Using Admin Panel (Recommended)
1. Go to Admin Dashboard → Manage Stops
2. Click on a stop
3. Click "Generate QR Code" button
4. Download the QR code image
5. Print and place at the bus stop

### Method 2: Using Online QR Code Generators
1. Get the stop ID from the database or admin panel
2. Create the URL: `https://yourdomain.com/stop/{stopId}`
3. Go to a QR code generator website:
   - https://www.qr-code-generator.com/
   - https://www.qrcode-monkey.com/
   - https://www.the-qrcode-generator.com/
4. Paste the URL
5. Customize the QR code (optional):
   - Add logo
   - Change colors
   - Add frame with text
6. Download and print

### Method 3: Using Node.js Script
```javascript
const QRCode = require('qrcode');
const fs = require('fs');

// Get all stops from database
const stops = [
  { id: '123e4567-e89b-12d3-a456-426614174000', name: 'BIT Gate' },
  { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Deralakatte' }
];

// Generate QR codes for all stops
stops.forEach(async (stop) => {
  const url = `https://yourdomain.com/stop/${stop.id}`;
  const filename = `qr-${stop.name.replace(/\s+/g, '-').toLowerCase()}.png`;
  
  await QRCode.toFile(filename, url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  console.log(`Generated QR code for ${stop.name}: ${filename}`);
});
```

## QR Code Best Practices

### Size and Placement
- **Minimum Size**: 2cm x 2cm for close-range scanning
- **Recommended Size**: 5cm x 5cm to 10cm x 10cm
- **Height**: Place at eye level (1.2m - 1.5m from ground)
- **Location**: Protected from weather, well-lit area

### Design
- **High Contrast**: Black on white background works best
- **Error Correction**: Use Level H (30% error correction) for outdoor use
- **Border**: Include white border (quiet zone) around QR code
- **Text**: Add stop name and instructions below QR code

### Material
- **Outdoor**: Use weatherproof laminated stickers or metal plates
- **Indoor**: Regular printed stickers work fine
- **Durability**: UV-resistant materials for outdoor stops

## Example QR Code Poster Template

```
┌─────────────────────────────┐
│                             │
│    [NXT Bus Logo]           │
│                             │
│    ┌─────────────┐          │
│    │             │          │
│    │  QR CODE    │          │
│    │             │          │
│    └─────────────┘          │
│                             │
│    BIT Gate Bus Stop        │
│                             │
│  📱 Scan to see live        │
│     bus arrivals            │
│                             │
│  Stop ID: BIT-001           │
│                             │
└─────────────────────────────┘
```

## Testing QR Codes

1. **Before Printing**:
   - Test with multiple QR code scanner apps
   - Test with different phone cameras
   - Verify the URL opens correctly

2. **After Printing**:
   - Scan from different distances (30cm - 2m)
   - Test in different lighting conditions
   - Verify readability after lamination

## Database Query to Get Stop IDs

```sql
-- Get all stops with their IDs
SELECT id, name, qr_code 
FROM bus_stops 
ORDER BY name;

-- Get stop URL for a specific stop
SELECT 
  id,
  name,
  CONCAT('https://yourdomain.com/stop/', id) as qr_url
FROM bus_stops
WHERE name = 'BIT Gate';
```

## Features of Stop Page

When passengers scan the QR code, they see:
- ✅ Stop name and location
- ✅ All buses serving this stop
- ✅ Route details (from/to, timings)
- ✅ Stop position in each route
- ✅ Click to search from this stop
- ✅ Share button to send link to others
- ✅ No login required

## URL Parameters for Search

The search page supports URL parameters for pre-filled searches:

```
/?from=BIT&to=Mangalore
/?from=Deralakatte&to=City%20Center
```

This allows you to:
- Create direct links for common routes
- Share specific search results
- Bookmark frequent searches
- Generate QR codes for popular route combinations
