# Where to Get ETA on User Side

## 🎯 User Flow

### Step 1: Search for Routes
1. Go to the passenger search page: `http://localhost:5173`
2. Enter your starting location in the "From" field (e.g., "BIT")
3. Optionally enter destination in the "To" field
4. Click "🔍 Search Buses"

### Step 2: View Available Routes
You'll see a list of routes matching your search with:
- Route name and bus number
- Departure and arrival times
- Scheduled duration
- List of stops

### Step 3: Get Real-Time ETA
On each route card, you'll see a button:

**"🕐 Get Real-Time ETA"**

Click this button to:
1. Share your current GPS location (browser will ask for permission)
2. Get real-time arrival time based on actual bus location
3. See how many minutes until the bus arrives

### Step 4: View ETA Information
After clicking, you'll see:

```
🚌 Real-Time ETA
Arrives in 4 minutes
ETA: 12:45
Bus: AKMS • Source: osrm
[🔄 Refresh button]
```

## 📱 What You'll See

### Before Getting ETA:
```
┌─────────────────────────────────────┐
│ 🚍 aaaa                             │
│ Bus: AKMS                           │
│                                     │
│ From: BIT → To: Mangalore          │
│ 11:00      →      12:20            │
│                                     │
│ Stops: deralakatte, pumpwell       │
│                                     │
│ ┌─────────────────────────────────┐│
│ │  🕐 Get Real-Time ETA           ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### After Getting ETA:
```
┌─────────────────────────────────────┐
│ 🚍 aaaa                             │
│ Bus: AKMS                           │
│                                     │
│ From: BIT → To: Mangalore          │
│ 11:00      →      12:20            │
│                                     │
│ Stops: deralakatte, pumpwell       │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🚌 Real-Time ETA      [🔄 Refresh]│
│ │                                  ││
│ │ Arrives in 4 minutes             ││
│ │ ETA: 12:45                       ││
│ │ Bus: AKMS • Source: osrm         ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 🔄 Refreshing ETA

The ETA is calculated based on:
- Current bus location (from driver's GPS)
- Your current location (from your device GPS)
- Real-time routing (using OSRM)

To get updated ETA, click the **"🔄 Refresh"** button.

## ⚠️ Requirements

1. **Location Permission**: Your browser must have location access enabled
2. **Active Bus**: The bus must have updated its location within the last 2 minutes
3. **Internet Connection**: Required to fetch real-time data

## 🚫 Troubleshooting

### "Please enable location access"
- Your browser is blocking location access
- Click the location icon in the address bar
- Allow location access for this site

### "No active buses found"
- The bus hasn't updated its location recently
- The driver app might not be running
- Try again in a few moments

### "Failed to get ETA"
- Check your internet connection
- Make sure the backend server is running
- Try refreshing the page

## 💡 Tips

1. **Best Time to Check**: Check ETA when you're ready to board
2. **Refresh Regularly**: ETA updates as the bus moves
3. **Multiple Routes**: You can get ETA for multiple routes
4. **Accuracy**: OSRM provides accurate routing considering actual roads

## 🎨 Visual Features

- **Green gradient background**: Indicates real-time data
- **Large minutes display**: Easy to see at a glance
- **Refresh button**: Update ETA anytime
- **Source indicator**: Shows if using OSRM or fallback calculation

## 📍 How It Works

1. You click "Get Real-Time ETA"
2. Your browser shares your GPS location
3. Backend finds the nearest active bus on that route
4. Calculates travel time using OSRM routing API
5. Returns arrival time and minutes until arrival
6. Displays in a beautiful green card

## 🔐 Privacy

- Your location is only used for ETA calculation
- Location is not stored permanently
- Only sent when you click the ETA button
- You control when to share location

## 📊 What the Data Means

- **Arrives in X minutes**: Time until bus reaches your location
- **ETA: HH:MM**: Exact arrival time
- **Bus: XXXX**: Bus number serving this route
- **Source: osrm**: Routing method used (osrm = accurate, fallback = estimated)

## 🎯 Next Steps

After seeing the ETA:
1. Plan your departure time
2. Head to the bus stop
3. Refresh ETA as needed
4. Board when the bus arrives!

---

**Need Help?** Check the browser console (F12) for detailed logs or contact support.
