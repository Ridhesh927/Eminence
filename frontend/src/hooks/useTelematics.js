import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { getToken } from '../services/tokenService';

const getSocketBaseUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredApiUrl) return configuredApiUrl.replace(/\/api\/?$/, '');
  if (api.defaults.baseURL) return api.defaults.baseURL.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

export const useTelematics = (activeTab, explicitToken) => {
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState({ provider: 'simulator', simulated: true, connected: false });
  const fallbackIntervalRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'telematics') return;

    const authToken = explicitToken || getToken();
    const socketUrl = getSocketBaseUrl();

    const telemetrySocket = io(socketUrl, {
      auth: { token: authToken },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const joinRoom = () => {
      telemetrySocket.emit('join_admin_telemetry');
    };

    telemetrySocket.on('connect', () => {
      joinRoom();
    });

    // Also emit immediately in case socket connects synchronously
    joinRoom();

    telemetrySocket.on('telemetry_status', (st) => {
      setStatus(st);
    });

    telemetrySocket.on('telemetry_history', (hist) => {
      if (Array.isArray(hist) && hist.length > 0) {
        setHistory(hist);
        setTelemetry((prev) => prev || hist[hist.length - 1]);
      }
    });

    telemetrySocket.on('telemetry_update', (data) => {
      // Clear fallback interval if active, as real stream is working
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      setTelemetry(data);
      setHistory((previous) => [...previous, data].slice(-30));
    });

    telemetrySocket.on('connect_error', (err) => {
      console.warn('[useTelematics] Socket connection warning:', err.message);
    });

    // Fallback: If no telemetry received within 2.5s (offline dev, auth delay, or cold start),
    // immediately start simulated demo telemetry dials so the admin experience is seamless
    const fallbackTimer = setTimeout(() => {
      setTelemetry((current) => {
        if (current) return current; // Already receiving real packets

        setStatus({
          provider: 'simulator',
          simulated: true,
          connected: true,
          message: 'Real-time vehicle telemetry demo stream active.'
        });

        const initialDemo = {
          vehicleId: 'MH-12-BP-1001',
          timestamp: new Date().toISOString(),
          speed: 42,
          engineTemp: 91,
          temperature: 91,
          coolantAlert: null,
          fuelLevel: 84.5,
          rpm: 2180,
          healthScore: 99.4,
          alert: null,
          provider: 'simulator',
          simulated: true
        };

        setHistory((prev) => (prev.length > 0 ? prev : [initialDemo]));

        fallbackIntervalRef.current = setInterval(() => {
          setTelemetry((prev) => {
            const baseSpeed = prev?.speed ?? 42;
            const newSpeed = Math.max(15, Math.min(78, Math.round(baseSpeed + (Math.random() * 6 - 3))));
            const newRpm = Math.max(1400, Math.min(3200, Math.round(1800 + newSpeed * 17 + (Math.random() * 80 - 40))));
            const newTemp = Math.round(90 + (newSpeed > 60 ? 5 : 0) + (Math.random() * 2 - 1));
            const newFuel = Math.max(5, parseFloat(((prev?.fuelLevel ?? 84.5) - 0.02).toFixed(1)));
            const newHealth = Math.min(100, Math.max(80, parseFloat(((prev?.healthScore ?? 99.4) + (Math.random() * 0.2 - 0.1)).toFixed(1))));

            const updated = {
              vehicleId: 'MH-12-BP-1001',
              timestamp: new Date().toISOString(),
              speed: newSpeed,
              engineTemp: newTemp,
              temperature: newTemp,
              coolantAlert: newTemp >= 100 ? 'Coolant Overheating Risk' : null,
              fuelLevel: newFuel,
              rpm: newRpm,
              healthScore: newHealth,
              alert: null,
              provider: 'simulator',
              simulated: true
            };

            setHistory((old) => [...old, updated].slice(-30));
            return updated;
          });
        }, 2000);

        return initialDemo;
      });
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      telemetrySocket.emit('leave_admin_telemetry');
      telemetrySocket.disconnect();
    };
  }, [activeTab, explicitToken]);

  const forceStartDemo = () => {
    if (!telemetry) {
      const initialDemo = {
        vehicleId: 'MH-12-BP-1001',
        timestamp: new Date().toISOString(),
        speed: 45,
        engineTemp: 91,
        temperature: 91,
        coolantAlert: null,
        fuelLevel: 84.5,
        rpm: 2200,
        healthScore: 99.5,
        alert: null,
        provider: 'simulator',
        simulated: true
      };
      setTelemetry(initialDemo);
      setHistory([initialDemo]);
      setStatus({
        provider: 'simulator',
        simulated: true,
        connected: true,
        message: 'Live demo telematics stream started.'
      });
    }
  };

  return { telemetry, history, status, forceStartDemo };
};
