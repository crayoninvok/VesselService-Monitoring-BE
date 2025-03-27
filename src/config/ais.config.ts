// AIS Service Configuration
export const AIS_CONFIG = {
  // Set to 'mock' or 'real' to choose between mock data or real API
  SERVICE_TYPE: 'mock',
  
  // API settings (for real API)
  API_KEY: process.env.MYSHIPTRACKING_API_KEY || 'rOAvssV*V*CgFr1QNipG!3S*TVi3X^1cMr',
  API_ENDPOINT: 'https://www.myshiptracking.com/api/vessels/imo'
};