// Shared type definitions
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Bus {
  id: string;
  routeId: string;
  currentLocation: GeoCoordinates;
  heading: number;
  speed: number;
  lastUpdate: Date;
  status: 'active' | 'idle' | 'offline';
}

export interface BusStop {
  id: string;
  name: string;
  location: GeoCoordinates;
  qrCode: string;
  routes: string[];
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  stops: BusStop[];
  activeBuses: number;
}

export interface User {
  id: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  createdAt: Date;
}

export interface ETA {
  busId: string;
  stopId: string;
  estimatedArrival: Date;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
}
