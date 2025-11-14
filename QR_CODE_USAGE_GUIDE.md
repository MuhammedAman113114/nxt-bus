# QR Code Usage Guide

## 📱 How Passengers Can Access Bus Stop Information

When someone scans the QR code at a bus stop, they can access real-time bus arrival information in multiple ways:

### QR Code Format

The QR code contains JSON data:
```json
{
  "stopId": "90cff0c2-4628-439f-a331-46cc4adfe60c",
  "stopName": "deralakatte",
  "lat": 12.846541,
  "lon": 74.955675,
  "type": "bus_stop"
}
```

## 🎯 Access Methods

### Method 1: Using NXT Bus App (Recommended)

1. **Open the NXT Bus app** on your phone
2. **Tap "Scan QR Code"** button
3. **Point camera** at the QR code
4. **Automatically redirected** to bus stop page with real-time arrivals

**Features:**
- ✅ Real-time bus locations
- ✅ Live ETA calculations
- ✅ Route information
- ✅ Offline support
- ✅ Push notifications

### Method 2: Using Any QR Scanner App

1. **Open any QR scanner** (Google Lens, Camera app, etc.)
2. **Scan the QR code**
3. **Copy the JSON data** that appears
4. **Open NXT Bus app**
5. **Tap "Enter Code Manually"**
6. **Paste the JSON data**

### Method 3: Direct URL Access

Create a shareable URL with the stop ID:

**Format:**
```
https://your-domain.com/qr?stopId=90cff0c2-4628-439f-a331-46cc4adfe60c
```

**Or with full data:**
```
https://your-domain.com/qr?data=%7B%22stopId%22%3A%2290cff0c2-4628-439f-a331-46cc4adfe60c%22%2C%22stopName%22%3A%22deralakatte%22%7D
```

### Method 4: Direct Stop Page

If you know the stop ID, go directly to:
```
https://your-domain.com/stops/90cff0c2-4628-439f-a331-46cc4adfe60c
```

## 🔧 For Developers

### Parsing QR Code Data

```javascript
// Parse the QR code JSON
const qrData = JSON.parse(scannedText);

// Extract stop information
const stopId = qrData.stopId;
const stopName = qrData.stopName;
const lat = qrData.lat;
const lon = qrData.lon;

// Navigate to stop page
window.location.href = `/stops/${stopId}`;
```

### Generating QR Codes

**Admin Panel:**
1. Go to `/admin/qr-generator`
2. Select a bus stop
3. Download PNG or print PDF
4. Place at bus stop

**Programmatically:**
```javascript
import QRCode from 'qrcode';

const qrData = {
  stopId: "90cff0c2-4628-439f-a331-46cc4adfe60c",
  stopName: "deralakatte",
  lat: 12.846541,
  lon: 74.955675,
  type: "bus_stop"
};

const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
```

## 📋 Implementation Checklist

### For Bus Stop Operators:

- [ ] Generate QR code for each stop
- [ ] Print QR code with instructions
- [ ] Laminate for weather protection
- [ ] Mount at eye level (5-6 feet high)
- [ ] Ensure good lighting
- [ ] Test scanning from different angles
- [ ] Add "Scan for Real-Time Arrivals" text

### For App Developers:

- [x] QR scanner component
- [x] JSON parsing logic
- [x] Stop ID extraction
- [x] Navigation to stop page
- [x] Error handling
- [x] Manual input fallback
- [x] URL parameter support

## 🎨 QR Code Poster Template

```
┌─────────────────────────────────────┐
│                                     │
│         🚌 NXT Bus                  │
│                                     │
│         [QR CODE HERE]              │
│                                     │
│    Scan for Real-Time Arrivals     │
│                                     │
│    Stop: Deralakatte                │
│                                     │
│    Instructions:                    │
│    1. Open camera or QR app         │
│    2. Point at QR code              │
│    3. View live bus arrivals        │
│                                     │
└─────────────────────────────────────┘
```

## 🔍 Troubleshooting

### "Invalid QR Code" Error

**Causes:**
- QR code is damaged or unclear
- Wrong QR code format
- Stop ID doesn't exist in database

**Solutions:**
- Clean the QR code surface
- Ensure good lighting
- Try manual entry
- Contact support with stop name

### "Stop Not Found" Error

**Causes:**
- Stop has been removed from system
- Database connection issue
- Wrong stop ID

**Solutions:**
- Verify stop ID in admin panel
- Check database for stop record
- Regenerate QR code if needed

### Camera Permission Denied

**Solutions:**
- Enable camera in browser settings
- Use manual entry option
- Try different browser
- Check device permissions

## 📊 Analytics & Tracking

Track QR code usage:
- Number of scans per stop
- Peak scanning times
- User devices
- Scan success rate
- Error types

## 🔐 Security Considerations

1. **Data Validation**: Always validate stop ID before querying database
2. **Rate Limiting**: Prevent abuse with rate limits
3. **HTTPS Only**: Ensure all QR URLs use HTTPS
4. **No Sensitive Data**: Don't include passwords or tokens in QR codes
5. **Expiration**: Consider adding expiration dates for temporary stops

## 🌐 Multi-Language Support

Include language parameter in QR code:
```json
{
  "stopId": "90cff0c2-4628-439f-a331-46cc4adfe60c",
  "stopName": "deralakatte",
  "lat": 12.846541,
  "lon": 74.955675,
  "type": "bus_stop",
  "lang": "en"
}
```

## 📱 Deep Linking

For mobile apps, use deep links:
```
nxtbus://stop/90cff0c2-4628-439f-a331-46cc4adfe60c
```

## 🎯 Best Practices

1. **Clear Instructions**: Add text near QR code
2. **Multiple Sizes**: Provide different QR sizes for different distances
3. **High Contrast**: Use black QR on white background
4. **Error Correction**: Use high error correction level
5. **Test Regularly**: Scan QR codes periodically to ensure they work
6. **Backup Method**: Always provide manual entry option
7. **Accessibility**: Include text alternative for visually impaired users

## 📞 Support

If users have issues:
- Email: support@nxtbus.com
- Phone: [Your Number]
- Help Center: https://nxtbus.com/help
- Live Chat: Available in app

---

**Last Updated:** November 13, 2025
**Version:** 1.0
