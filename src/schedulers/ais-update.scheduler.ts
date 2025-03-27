// src/schedulers/ais-update.scheduler.ts
import cron from "node-cron";
import myShipTrackingService from "../services/myshiptracking.service";

// Run every 6 hours to conserve your API coins (adjust as needed)
// "0 */6 * * *" means "at minute 0 of every 6th hour"
cron.schedule("0 */6 * * *", async () => {
  console.log("Running scheduled AIS data update: " + new Date().toISOString());
  await myShipTrackingService.updateAllVesselsAISData();
});

export default function initSchedulers() {
  console.log("AIS update scheduler initialized");
}
