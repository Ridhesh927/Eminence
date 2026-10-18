import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useTelematics } from '../../hooks/useTelematics';

const TelematicsTab = ({ activeTab, token }) => {
  const { telemetry, history, status, forceStartDemo } = useTelematics(activeTab, token);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-loft-50 font-serif">Live Fleet Telematics</h1>
          <p className="text-sm text-loft-400 mt-1">
            {status.simulated ? 'Simulation mode — generated vehicle telemetry for demos and testing.' : 'Real-time telemetry from connected fleet devices.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {telemetry?.vehicleId && (
            <span className="hidden sm:inline-flex text-xs font-mono bg-loft-900 text-copper-400 px-3 py-1.5 rounded-full border border-loft-800">
              Vehicle: {telemetry.vehicleId}
            </span>
          )}
          <div className="flex items-center gap-2 bg-moss-500/10 text-moss-500 px-4 py-2 rounded-full border border-moss-500/20">
          <div className="w-2 h-2 rounded-full bg-moss-500 animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-wider">
            {status.simulated ? 'Simulation Active' : status.connected ? 'Device Stream Active' : 'No Device Stream'}
          </span>
        </div>
        </div>
      </div>

      {!telemetry ? (
        <div className="card p-12 bg-loft-900 border-loft-800 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-copper-500 border-t-transparent animate-spin mb-4"></div>
          <h3 className="text-xl font-bold text-loft-50">Waiting for Telemetry Signal...</h3>
          <p className="text-loft-400 mt-2">
            {status.simulated ? 'Starting the demo telemetry simulator.' : 'Waiting for a connected vehicle telemetry provider.'}
          </p>
          <button
            onClick={forceStartDemo}
            className="mt-6 px-5 py-2.5 bg-copper-500 hover:bg-copper-600 text-loft-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-copper-500/20"
          >
            Launch Demo Telematics Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {telemetry.alert && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-500 animate-bounce" />
                <div>
                  <h4 className="text-red-500 font-bold uppercase tracking-wider text-sm">Critical Alert Triggered</h4>
                  <p className="text-red-400 text-xs">Vehicle {telemetry.vehicleId} reported: {telemetry.alert}</p>
                </div>
              </div>
              <span className="text-red-500 text-xs font-bold">{new Date(telemetry.timestamp).toLocaleTimeString()}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Current Speed</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-loft-50 font-serif">{telemetry.speed}</span>
                <span className="text-loft-400 mb-1 font-medium">km/h</span>
              </div>
              <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${telemetry.speed > 60 ? 'bg-red-500' : 'bg-blue-500'}`}
                  animate={{ width: `${Math.min(100, (telemetry.speed / 120) * 100)}%` }}
                  transition={{ type: 'spring', bounce: 0 }}
                />
              </div>
            </div>

            <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
              <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Engine RPM</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-loft-50 font-serif">{telemetry.rpm}</span>
                <span className="text-loft-400 mb-1 font-medium">rpm</span>
              </div>
              <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-purple-500"
                  animate={{ width: `${Math.min(100, (telemetry.rpm / 6000) * 100)}%` }}
                  transition={{ type: 'spring', bounce: 0 }}
                />
              </div>
            </div>

            <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-copper-500/10 rounded-full blur-2xl"></div>
              <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Engine Temp</p>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold font-serif ${telemetry.engineTemp > 95 ? 'text-red-500' : 'text-loft-50'}`}>
                  {telemetry.engineTemp}
                </span>
                <span className="text-loft-400 mb-1 font-medium">°C</span>
              </div>
              <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${telemetry.engineTemp > 95 ? 'bg-red-500' : 'bg-copper-500'}`}
                  animate={{ width: `${Math.min(100, (telemetry.engineTemp / 120) * 100)}%` }}
                  transition={{ type: 'spring', bounce: 0 }}
                />
              </div>
            </div>

            <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-moss-500/10 rounded-full blur-2xl"></div>
              <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Fuel Level</p>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold font-serif ${telemetry.fuelLevel < 20 ? 'text-red-500' : 'text-loft-50'}`}>
                  {telemetry.fuelLevel}
                </span>
                <span className="text-loft-400 mb-1 font-medium">%</span>
              </div>
              <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${telemetry.fuelLevel < 20 ? 'bg-red-500' : 'bg-moss-500'}`}
                  animate={{ width: `${telemetry.fuelLevel}%` }}
                  transition={{ type: 'spring', bounce: 0 }}
                />
              </div>
            </div>
          </div>
          <div className="card p-5 bg-loft-900 border-loft-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-loft-300 mb-3">Recent Samples</h3>
            <div className="flex gap-2 overflow-x-auto">
              {history.slice(-12).map((sample) => (
                <div key={sample.timestamp} className="min-w-24 rounded-lg bg-loft-950 px-3 py-2 text-xs text-loft-400">
                  <div className="font-mono text-loft-200">{sample.speed} km/h</div>
                  <div>{new Date(sample.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelematicsTab;
