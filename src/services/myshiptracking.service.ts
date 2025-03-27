// src/services/myshiptracking.service.ts
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MyShipTrackingService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Use your provided API key or get it from environment variables
    this.apiKey =
      process.env.MYSHIPTRACKING_API_KEY ||
      "rOAvssV*V*CgFr1QNipG!3S*TVi3X^1cMr";
    this.baseUrl = "https://www.myshiptracking.com/api";
  }

  /**
   * Fetch vessel position by IMO number
   */
  async fetchVesselPositionByIMO(imo: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/vessels/imo/${imo}`, {
        headers: {
          "API-KEY": this.apiKey,
        },
      });

      if (response.data && response.data.status === "success") {
        return response.data.data;
      }

      console.log(`No data found for IMO ${imo}`);
      return null;
    } catch (error) {
      console.error(`Error fetching AIS data for IMO ${imo}:`, error);
      return null;
    }
  }

  /**
   * Update AIS data for all vessels in the database
   */
  async updateAllVesselsAISData(): Promise<void> {
    try {
      // Get all vessels with IMO numbers
      const vessels = await prisma.vessel.findMany({
        select: { id: true, imo: true },
      });

      console.log(`Updating AIS data for ${vessels.length} vessels`);

      // Process each vessel (with delay to respect API rate limits)
      for (const vessel of vessels) {
        const vesselData = await this.fetchVesselPositionByIMO(vessel.imo);

        if (vesselData && vesselData.position) {
          // Create new AIS record in database
          await prisma.aISData.create({
            data: {
              vesselId: vessel.id,
              latitude: vesselData.position.latitude,
              longitude: vesselData.position.longitude,
              speed:
                vesselData.speed !== undefined
                  ? parseFloat(vesselData.speed)
                  : null,
              course:
                vesselData.course !== undefined
                  ? parseFloat(vesselData.course)
                  : null,
              destination: vesselData.destination || null,
              eta: vesselData.eta ? new Date(vesselData.eta) : null,
            },
          });
          console.log(`Updated AIS data for vessel ${vessel.imo}`);
        } else {
          console.log(`No AIS data found for vessel ${vessel.imo}`);
        }

        // Add delay between requests to respect rate limits and conserve coins
        // 5 second delay to ensure we don't exceed rate limits
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      console.log("AIS data update completed");
    } catch (error) {
      console.error("Error in AIS data update process:", error);
    }
  }
}

export default new MyShipTrackingService();
