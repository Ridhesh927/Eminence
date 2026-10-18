const { getIo } = require('../socket');
const { isSimulatorEnabled } = require('./telemetryProvider');

// In a real scenario, this state would come from Kafka/Redis streams emitted by physical OBD-II devices.
// We are simulating this by keeping an in-memory track of active vehicle sessions.
const activeVehicles = new Map(); // key: vehicleId, value: intervalTimer
const telemetryHistory = new Map(); // key: vehicleId, value: latest samples

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
  if (!isSimulatorEnabled()) return false;
  if (activeVehicles.has(vehicleId)) return true; // Already running

  let currentSpeed = 38;
  let targetSpeed = 45; // target cruising speed
  let engineTemp = 90; // normal operating temp
  let fuelLevel = 85; // %
  let rpm = 2150; // running rpm
  let healthScore = 100; // 0-100%

  const emitTick = () => {
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
        temperature: Math.round(engineTemp), // Celsius (TC-KRI-004 & Mobile HUD alias)
        coolantAlert: engineTemp >= 100 ? 'Coolant Overheating Risk' : null,
        fuelLevel: parseFloat(fuelLevel.toFixed(1)), // %
        rpm: Math.round(rpm),
        healthScore: parseFloat(healthScore.toFixed(1)), // %
        alert: alertType,
        provider: 'simulator',
        simulated: true
      };

      const samples = telemetryHistory.get(vehicleId) || [];
      samples.push(telemetryData);
      telemetryHistory.set(vehicleId, samples.slice(-30));

      // Broadcast to the admin telemetry room and vehicle telemetry room
      io.to('admin_telemetry').emit('telemetry_update', telemetryData);
      io.to(`vehicle_${vehicleId}`).emit('telemetry_update', telemetryData);
      
    } catch (err) {
      // socket might not be initialized yet, ignore
    }
  };

  emitTick();
  const timer = setInterval(emitTick, 2000);

  activeVehicles.set(vehicleId, timer);
  console.log(`[Telematics] Started simulation for vehicle ${vehicleId}`);
  return true;
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

const getTelemetryHistory = (vehicleId) => telemetryHistory.get(vehicleId) || [];

module.exports = {
  startTelemetrySimulation,
  stopTelemetrySimulation,
  getTelemetryHistory
};
