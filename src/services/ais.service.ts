import { AIS_CONFIG } from "../config/ais.config";
import mockAisService from "./mock-ais.service";
import myShipTrackingService from "./myshiptracking.service";

/**
 * Factory function to get the appropriate AIS service based on configuration
 */
export const getAisService = () => {
  if (AIS_CONFIG.SERVICE_TYPE === "real") {
    console.log("Using real AIS data from MyShipTracking API");
    return myShipTrackingService;
  } else {
    console.log("Using mock AIS data generator");
    return mockAisService;
  }
};

// Export a default service instance based on configuration
export default getAisService();
