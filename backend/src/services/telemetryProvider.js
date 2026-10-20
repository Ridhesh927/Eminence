const getTelemetryProvider = () => {
  const configuredProvider = (process.env.TELEMETRY_PROVIDER || '').toLowerCase();
  if (configuredProvider) return configuredProvider;
  return process.env.NODE_ENV === 'production' ? 'none' : 'simulator';
};

const isSimulatorEnabled = () => (
  getTelemetryProvider() === 'simulator' && (
    process.env.NODE_ENV !== 'production'
  )
);

const getTelemetryStatus = () => ({
  provider: getTelemetryProvider(),
  simulated: isSimulatorEnabled(),
  connected: isSimulatorEnabled(),
  message: isSimulatorEnabled()
    ? 'Generated telemetry is active for demos and testing.'
    : 'No real telemetry provider is connected.'
});

module.exports = {
  getTelemetryProvider,
  isSimulatorEnabled,
  getTelemetryStatus
};
