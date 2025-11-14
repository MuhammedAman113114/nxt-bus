import axios from 'axios';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT = 5000; // 5 seconds

interface OSRMResponse {
  code: string;
  routes: Array<{
    duration: number;
    distance: number;
  }>;
}

export class OSRMService {
  /**
   * Get route duration from OSRM
   * @param fromLon Starting longitude
   * @param fromLat Starting latitude
   * @param toLon Destination longitude
   * @param toLat Destination latitude
   * @returns Duration in seconds, or null if failed
   */
  static async getRouteDuration(
    fromLon: number,
    fromLat: number,
    toLon: number,
    toLat: number
  ): Promise<number | null> {
    try {
      const url = `${OSRM_BASE_URL}/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
      
      console.log(`[OSRM] Requesting route: ${url}`);
      
      const response = await axios.get<OSRMResponse>(url, {
        timeout: OSRM_TIMEOUT,
      });

      if (response.data.code === 'Ok' && response.data.routes.length > 0) {
        const duration = response.data.routes[0].duration;
        console.log(`[OSRM] Route duration: ${duration}s`);
        return duration;
      }

      console.warn(`[OSRM] Invalid response code: ${response.data.code}`);
      return null;
    } catch (error: any) {
      console.error(`[OSRM] Error:`, error.message);
      return null;
    }
  }

  /**
   * Calculate haversine distance between two points
   * @returns Distance in kilometers
   */
  static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimate travel time using haversine distance and average speed
   * @param distanceKm Distance in kilometers
   * @param avgSpeedKmh Average speed in km/h (default: 30)
   * @returns Duration in seconds
   */
  static estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 30): number {
    return Math.round((distanceKm / avgSpeedKmh) * 3600);
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
