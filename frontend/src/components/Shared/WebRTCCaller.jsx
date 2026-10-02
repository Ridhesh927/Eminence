import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Peer from 'peerjs';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

const WebRTCCaller = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const hasChatWidget = Boolean(isAuthenticated && user && user.role !== 'admin');
  const [peer, setPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, calling, connected, error
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    // Connect to our own Node.js backend PeerServer
    const newPeer = new Peer({
      host: window.location.hostname,
      port: 3000,
      path: '/peerjs'
    });

    newPeer.on('open', (id) => {
      console.log('My WebRTC Caller ID is:', id);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      setStatus('error');
    });

    setPeer(newPeer);

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      newPeer.destroy();
    };
  }, []);

  const startCall = async () => {
    if (!peer) return;
    setStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Call the known admin peer ID
      const outgoingCall = peer.call('eminence-admin', stream);
      
      outgoingCall.on('stream', (remoteStream) => {
        setStatus('connected');
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play();
        }
      });

      outgoingCall.on('close', () => {
        endCall();
      });

      setCall(outgoingCall);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setStatus('error');
    }
  };

  const endCall = () => {
    if (call) call.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setStatus('idle');
    setCall(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  return (
    <div className={`fixed ${hasChatWidget ? 'bottom-24' : 'bottom-6'} right-6 z-40 transition-all duration-300`}>
      <audio ref={remoteAudioRef} className="hidden" />
      
      {status === 'idle' && (
        <button 
          onClick={startCall}
          className="w-14 h-14 bg-moss-600 hover:bg-moss-500 text-white rounded-full shadow-lg shadow-moss-950/40 border border-moss-400/30 transition-transform duration-200 hover:scale-105 flex items-center justify-center cursor-pointer"
          title="Call Free Helpline"
          aria-label="Call Free Helpline"
        >
          <Phone className="w-6 h-6" />
        </button>
      )}

      {(status === 'calling' || status === 'connected') && (
        <div className="bg-loft-900 border border-loft-700 rounded-xl shadow-2xl p-4 flex flex-col items-center gap-4 w-64 text-white">
          <div className="text-sm font-semibold">
            {status === 'calling' ? 'Ringing Admin...' : 'Live Call Connected'}
          </div>
          
          {status === 'connected' && (
            <div className="flex gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-400">Audio Encrypted (WebRTC)</span>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={toggleMute}
              className={`p-3 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-loft-800 hover:bg-loft-700'}`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              onClick={endCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-900 border border-red-700 rounded-xl shadow-xl p-4 flex flex-col items-center gap-2 w-64 text-white">
          <div className="text-sm">Microphone access denied or Admin offline.</div>
          <button onClick={() => setStatus('idle')} className="text-xs underline text-red-300">Close</button>
        </div>
      )}
    </div>
  );
};

export default WebRTCCaller;
