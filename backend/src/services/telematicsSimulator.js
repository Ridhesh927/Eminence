const { getIo } = require('../socket');

// In a real scenario, this state would come from Kafka/Redis streams emitted by physical OBD-II devices.
// We are simulating this by keeping an in-memory track of active vehicle sessions.
const activeVehicles = new Map(); // key: vehicleId, value: intervalTimer

/**
 * Generates a slight random variance to a base value.
 */
const fluctuate = (base, variance) => {
  const min = base - variance;
  const max = base + variance;
  return Math.random() * (max - min) + min;
};

/**
 * Starts an IoT telemetry simulation for a given vehicle/booking.
 */
const startTelemetrySimulation = (vehicleId) => {
  if (activeVehicles.has(vehicleId)) return; // Already running

  let currentSpeed = 0;
  let targetSpeed = 45; // target cruising speed
  let engineTemp = 90; // normal operating temp
  let fuelLevel = 85; // %
  let rpm = 800; // idle
  let healthScore = 100; // 0-100%

  const timer = setInterval(() => {
    try {
      const io = getIo();
      
      // Speed logic: slowly accelerate to target, then fluctuate
      if (currentSpeed < targetSpeed) {
        currentSpeed += fluctuate(3, 1);
        rpm = fluctuate(2500, 200);
      } else {
        currentSpeed = fluctuate(targetSpeed, 5);
        rpm = fluctuate(2000, 150);
      }
      
      // Random hard braking event (5% chance)
      const isHardBraking = Math.random() < 0.05;
      if (isHardBraking) {
        currentSpeed = Math.max(0, currentSpeed - 20);
        rpm = 1000;
      }

      // Temp logic: steady around 90-95
      engineTemp = fluctuate(92, 3);
      if (currentSpeed > 60) engineTemp += 5; // runs hotter at high speeds

      // Fuel logic: slow drain
      fuelLevel = Math.max(0, fuelLevel - 0.01);

      // Predictive Maintenance Logic
      // If speed or RPM is too high, health score degrades over time
      if (engineTemp > 98 || rpm > 2600) {
        healthScore = Math.max(0, healthScore - 0.5);
      } else if (healthScore < 100) {
        healthScore = Math.min(100, healthScore + 0.1); // slow recovery
      }

      // 1% chance for a severe mechanical anomaly
      if (Math.random() < 0.01) {
        engineTemp += 15; // spike temp
        healthScore -= 10;
      }

      let alertType = isHardBraking ? 'HARD_BRAKING' : null;
      if (healthScore < 50) {
        alertType = 'PREDICTIVE_MAINTENANCE_WARNING';
      }
      if (healthScore < 20) {
        alertType = 'CRITICAL_ENGINE_FAILURE_IMMINENT';
      }

      const telemetryData = {
        vehicleId,
        timestamp: new Date().toISOString(),
        speed: Math.round(currentSpeed), // km/h
        engineTemp: Math.round(engineTemp), // Celsius
        fuelLevel: parseFloat(fuelLevel.toFixed(1)), // %
        rpm: Math.round(rpm),
        healthScore: parseFloat(healthScore.toFixed(1)), // %
        alert: alertType
      };

      // Broadcast to the admin telemetry room
      io.to('admin_telemetry').emit('telemetry_update', telemetryData);
      
    } catch (err) {
      // socket might not be initialized yet, ignore
    }
  }, 2000); // Emits every 2 seconds

  activeVehicles.set(vehicleId, timer);
  console.log(`[Telematics] Started simulation for vehicle ${vehicleId}`);
};

/**
 * Stops an IoT telemetry simulation.
 */
const stopTelemetrySimulation = (vehicleId) => {
  const timer = activeVehicles.get(vehicleId);
  if (timer) {
    clearInterval(timer);
    activeVehicles.delete(vehicleId);
    console.log(`[Telematics] Stopped simulation for vehicle ${vehicleId}`);
  }
};

module.exports = {
  startTelemetrySimulation,
  stopTelemetrySimulation
};
