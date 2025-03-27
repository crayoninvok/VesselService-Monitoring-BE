import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MockAISService {
  /**
   * Generate mock AIS data for testing
   * @param vesselId Optional specific vessel ID
   */
  async generateMockAISData(vesselId?: string): Promise<void> {
    try {
      let vessels;

      // Get vessels to update - either specific vessel or all vessels
      if (vesselId) {
        vessels = await prisma.vessel.findMany({
          where: { id: vesselId },
        });
      } else {
        vessels = await prisma.vessel.findMany();
      }

      if (vessels.length === 0) {
        console.log("No vessels found to update");
        return;
      }

      console.log(`Generating mock AIS data for ${vessels.length} vessels`);

      for (const vessel of vessels) {
        // Get last position or use default
        const lastPosition = await prisma.aISData.findFirst({
          where: { vesselId: vessel.id },
          orderBy: { timestamp: "desc" },
        });

        // Create slightly different position (simulating movement)
        // If no previous position, use Singapore as default
        const baseLat = lastPosition ? lastPosition.latitude : 1.352;
        const baseLng = lastPosition ? lastPosition.longitude : 103.865;

        // Random movement between -0.01 and 0.01 degrees (about 1km)
        const latitude = baseLat + (Math.random() * 0.02 - 0.01);
        const longitude = baseLng + (Math.random() * 0.02 - 0.01);

        // Generate random speed between 5-20 knots
        const speed = 5 + Math.random() * 15;

        // Generate random course between 0-359 degrees
        const course = Math.floor(Math.random() * 360);

        // Create a mock destination based on vessel type
        let destination = "SINGAPORE";
        if (vessel.type.toLowerCase().includes("container")) {
          const destinations = [
            "HONG KONG",
            "SHANGHAI",
            "BUSAN",
            "TOKYO",
            "SINGAPORE",
          ];
          destination =
            destinations[Math.floor(Math.random() * destinations.length)];
        } else if (vessel.type.toLowerCase().includes("tanker")) {
          const destinations = [
            "DUBAI",
            "HOUSTON",
            "ROTTERDAM",
            "SINGAPORE",
            "PORT KLANG",
          ];
          destination =
            destinations[Math.floor(Math.random() * destinations.length)];
        }

        // ETA 1-5 days from now
        const daysToAdd = 1 + Math.floor(Math.random() * 5);
        const eta = new Date();
        eta.setDate(eta.getDate() + daysToAdd);

        // Store new AIS data
        const aisData = await prisma.aISData.create({
          data: {
            vesselId: vessel.id,
            latitude,
            longitude,
            speed,
            course,
            destination,
            eta,
          },
        });

        console.log(
          `Created mock AIS data for vessel ${vessel.name} (${
            vessel.imo
          }): Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`
        );
      }

      console.log("Mock AIS data generation completed successfully");
    } catch (error) {
      console.error("Error generating mock AIS data:", error);
    }
  }

  /**
   * Update all vessels with mock AIS data
   */
  async updateAllVesselsAISData(): Promise<void> {
    await this.generateMockAISData();
  }
}

export default new MockAISService();
