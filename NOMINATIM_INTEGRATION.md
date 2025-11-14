# Nominatim Integration for Stop Management

## Overview
Integrated **Nominatim (OpenStreetMap)** geocoding service to enable searching and adding bus stops with real addresses and coordinates.

## Features Implemented

### 1. **Location Search**
- Real-time search as you type (with 500ms debounce)
- Searches OpenStreetMap database for locations in India
- Shows up to 5 relevant results
- Displays full address for each result

### 2. **Place Selection**
- Click on search result to select location
- Auto-fills:
  - Stop name (extracted from address)
  - Full address
  - Latitude & Longitude coordinates
- Shows confirmation card with all details

### 3. **Confirmation Flow**
- Review selected location before saving
- Edit stop name if needed
- View coordinates (read-only from search)
- Option to change selection

### 4. **Edit Mode**
- Existing stops can still be edited manually
- Manual coordinate entry available in edit mode
- "Use My Location" button for current GPS location

## API Details

### Nominatim Search Endpoint
```
https://nominatim.openstreetmap.org/search
```

**Parameters:**
- `q` - Search query
- `format=json` - Response format
- `addressdetails=1` - Include address breakdown
- `limit=5` - Max 5 results
- `countrycodes=in` - Restrict to India

**Usage Policy:**
- Free and unlimited
- Must include User-Agent header
- Respect 1 request/second limit (handled by debounce)

## User Flow

### Adding New Stop:
1. Click "Add New Stop"
2. Type location name in search box (e.g., "Deralakatte Bus Stop")
3. Wait for search results (appears after 500ms)
4. Click on correct location from results
5. Review confirmation card with name, address, coordinates
6. Edit stop name if needed
7. Click "Create Stop"

### Editing Existing Stop:
1. Click "Edit" on any stop
2. Modify name or coordinates manually
3. Use "Use My Location" for GPS coordinates
4. Click "Update Stop"

## Benefits

✅ **100% Free** - No API key or costs
✅ **Accurate** - Real addresses from OpenStreetMap
✅ **Easy to Use** - Search by name, no need to know coordinates
✅ **Verified Locations** - Uses real places from OSM database
✅ **India-Focused** - Filtered to show only Indian locations

## Technical Implementation

### State Management
- `searchQuery` - Current search input
- `searchResults` - Array of Nominatim results
- `searching` - Loading state
- `selectedPlace` - Currently selected location

### Key Functions
- `searchPlaces()` - Calls Nominatim API
- `handleSearchInput()` - Debounced search trigger
- `selectPlace()` - Handles result selection
- `clearSelection()` - Reset to search again

## Files Modified
- `frontend/src/pages/AdminStopsManagement.tsx`

## Next Steps (Optional)
- Add map preview of selected location
- Cache recent searches
- Add "nearby stops" feature
- Integrate with route creation page
