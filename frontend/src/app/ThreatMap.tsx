import React, { useState, useRef, useEffect } from 'react';

export default function ThreatMap({ data, onReset }: { data: any[], onReset: () => void }) {
  // 1. FIXED TYPESCRIPT REFS (Initialized with null)
  const globeEl = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);
  const speedRef = useRef<number>(1);

  // 2. EXISTING DATA STATE
  const [activeArcs, setActiveArcs] = useState<any[]>([]);
  const [activeRings, setActiveRings] = useState<any[]>([]);
  const [currentAttack, setCurrentAttack] = useState<any>(null);
  const [tickerEvents, setTickerEvents] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // 3. NEW UI TOGGLE STATE (Defaulting to hidden so the globe shows)
  const [showLegend, setShowLegend] = useState(false); 
  const [showMonitor, setShowMonitor] = useState(false);

  // Example useEffect for Globe logic (Keep your existing logic here)
  useEffect(() => {
    // Globe initialization and data feeding goes here
  }, [data]);

  return (
    <div className="relative w-full h-screen bg-black text-green-500 font-mono overflow-hidden">
      
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-black/60 backdrop-blur-sm border-b border-green-900/50">
        
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest text-green-400">⚡ THREAT MATRIX</span>
        </div>

        {/* Right Side: Controls & Toggles */}
        <div className="flex items-center gap-4">
          
          {/* NEW TOGGLE BUTTONS */}
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className={`px-3 py-1.5 border rounded text-xs tracking-widest transition-colors ${
              showLegend ? 'bg-green-900/50 border-green-500 text-green-400' : 'border-green-900 text-green-700 hover:border-green-500 hover:text-green-400'
            }`}
          >
            {showLegend ? 'HIDE LEGEND' : 'SHOW LEGEND'}
          </button>

          <button 
            onClick={() => setShowMonitor(!showMonitor)}
            className={`px-3 py-1.5 border rounded text-xs tracking-widest transition-colors ${
              showMonitor ? 'bg-green-900/50 border-green-500 text-green-400' : 'border-green-900 text-green-700 hover:border-green-500 hover:text-green-400'
            }`}
          >
            {showMonitor ? 'HIDE MONITOR' : 'SHOW MONITOR'}
          </button>

          <div className="w-px h-6 bg-green-900/50 mx-2"></div> {/* Divider */}

          {/* Existing Buttons */}
          <button className="px-3 py-1.5 border border-cyan-700 text-cyan-500 rounded text-xs tracking-widest hover:bg-cyan-900/30">
            FULL REPORT
          </button>
          <button className="px-3 py-1.5 border border-green-700 text-green-500 rounded text-xs tracking-widest hover:bg-green-900/30">
            EXPORT PNG
          </button>
          <button 
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 5 : 1)}
            className="px-3 py-1.5 border border-yellow-700 text-yellow-500 rounded text-xs tracking-widest hover:bg-yellow-900/30"
          >
            {playbackSpeed}X SPEED
          </button>
          <button 
            onClick={onReset}
            className="px-3 py-1.5 border border-red-900 text-red-500 rounded text-xs tracking-widest hover:bg-red-900/30"
          >
            CLOSE SESSION
          </button>
        </div>
      </div>


      {/* ================= BACKGROUND GLOBE ================= */}
      {/* Assuming your Globe component renders here */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {/* <Globe ref={globeEl} ... /> */}
      </div>


      {/* ================= LEFT PANEL: LIVE INTERCEPT ================= */}
      {/* (Assuming you want to keep the left event tracker always visible) */}
      <div className="absolute top-20 left-4 z-40 w-80 flex flex-col gap-4">
        <div className="bg-black/80 border border-green-900 p-4 rounded-lg backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,0,0.1)]">
          <h3 className="text-xs text-green-600 mb-4 tracking-widest">● LIVE INTERCEPT</h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">ORIGIN</div>
              <div className="text-red-500">149.241.132.89</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">TARGET</div>
              <div className="text-blue-500">212.64.6.62</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">VECTOR</div>
              <div className="text-red-400">Malware / Ransomware</div>
            </div>
          </div>
        </div>
      </div>


      {/* ================= CONDITIONAL CENTER PANEL: VECTOR LEGEND ================= */}
      {showLegend && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-black/90 border border-green-500 p-6 rounded-lg backdrop-blur-md shadow-[0_0_30px_rgba(0,255,0,0.15)]">
          <h3 className="text-xs text-green-500 mb-6 tracking-widest">ⓘ VECTOR LEGEND</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-red-500">● MALWARE / RANSOMWARE</div>
              <div className="text-gray-500 text-xs ml-4">Malicious payloads</div>
            </div>
            <div>
              <div className="text-orange-500">● PHISHING</div>
              <div className="text-gray-500 text-xs ml-4">Deceptive attacks</div>
            </div>
            <div>
              <div className="text-yellow-500">● CREDENTIAL ATTACKS</div>
              <div className="text-gray-500 text-xs ml-4">Password & access attacks</div>
            </div>
            <div>
              <div className="text-blue-500">● DDOS</div>
              <div className="text-gray-500 text-xs ml-4">Volumetric floods</div>
            </div>
            <div>
              <div className="text-purple-500">● APT / TARGETED ATTACKS</div>
              <div className="text-gray-500 text-xs ml-4">Advanced persistent threats</div>
            </div>
            <div>
              <div className="text-green-500">● DATA THEFT / EXFILTRATION</div>
              <div className="text-gray-500 text-xs ml-4">Unauthorized extraction</div>
            </div>
          </div>
        </div>
      )}


      {/* ================= CONDITIONAL RIGHT PANEL: MONITOR ================= */}
      {showMonitor && (
        <div className="absolute top-20 right-4 z-40 w-80 flex flex-col gap-4">
          
          {/* Status Box */}
          <div className="bg-black/80 border border-green-900 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-gray-500 text-xs tracking-widest">SYSTEM STATUS</div>
            <div className="text-green-400 font-bold tracking-wider mt-1">MONITORING</div>
          </div>

          {/* Live Vectors */}
          <div className="bg-black/80 border border-green-900 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-xs text-green-600 mb-4 tracking-widest">LIVE ACTIVE VECTORS</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300"><span className="text-red-500">●</span> Malware</span>
                <span>5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300"><span className="text-yellow-500">●</span> Credentials</span>
                <span>4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300"><span className="text-blue-500">●</span> DDoS</span>
                <span>2</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
