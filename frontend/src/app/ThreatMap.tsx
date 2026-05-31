import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// 1. MATH HELPER: THE "CLAUDE LOGO" PHANTOM BEAM GENERATOR
// ============================================================================
const SPREAD_RADIUS = 12; // Controls how wide the 5-point circle is (in degrees)

function processBeams(attack: any) {
  const isMissingSource = !attack.sourceIp || attack.sourceIp.toLowerCase() === 'multiple';
  const isMissingTarget = !attack.targetIp || attack.targetIp.toLowerCase() === 'multiple';

  // If we are missing BOTH, we can't draw anything on a map. Drop it.
  if (isMissingSource && isMissingTarget) return [];

  // If we have both perfectly, just return the standard single arc
  if (!isMissingSource && !isMissingTarget) {
    return [attack];
  }

  const generatedBeams = [];
  const NUM_BEAMS = 5;

  for (let i = 0; i < NUM_BEAMS; i++) {
    // 360 degrees divided by 5 points = 72 degree increments, converted to radians
    const angle = (i * (360 / NUM_BEAMS)) * (Math.PI / 180);

    if (isMissingSource && attack.targetLat && attack.targetLng) {
      // 💥 ORBITAL STRIKE (Missing Source)
      // Generate 5 fake sources in a circle converging ON the target
      generatedBeams.push({
        ...attack,
        sourceLat: attack.targetLat + (Math.cos(angle) * SPREAD_RADIUS),
        sourceLng: attack.targetLng + (Math.sin(angle) * SPREAD_RADIUS),
        isPhantom: true // Use this flag in your Globe to make these beams slightly transparent!
      });
      
    } else if (isMissingTarget && attack.sourceLat && attack.sourceLng) {
      // 💥 SCATTERSHOT (Missing Target)
      // Generate 5 fake targets in a circle exploding FROM the source
      generatedBeams.push({
        ...attack,
        targetLat: attack.sourceLat + (Math.cos(angle) * SPREAD_RADIUS),
        targetLng: attack.sourceLng + (Math.sin(angle) * SPREAD_RADIUS),
        isPhantom: true
      });
    }
  }

  return generatedBeams;
}

// ============================================================================
// 2. MAIN DASHBOARD COMPONENT
// ============================================================================
export default function ThreatMap({ data, onReset }: { data: any[], onReset: () => void }) {
  // Globe & Data State
  const globeEl = useRef<any>(null);
  const [activeArcs, setActiveArcs] = useState<any[]>([]);
  
  // UI Toggle State (Panels hidden by default)
  const [showLegend, setShowLegend] = useState(false); 
  const [showMonitor, setShowMonitor] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  // ==========================================================================
  // 3. THE INTERCEPTOR: Process raw data before handing it to the Globe
  // ==========================================================================
  useEffect(() => {
    if (data && data.length > 0) {
      // Map through every incoming attack. If it needs phantom beams, flatMap 
      // expands it from 1 item to 5 items automatically.
      const processedArcs = data.flatMap(attack => processBeams(attack));
      
      setActiveArcs(processedArcs);
    }
  }, [data]);

  return (
    <div className="relative w-full h-screen bg-black text-green-500 font-mono overflow-hidden">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-black/60 backdrop-blur-sm border-b border-green-900/50">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest text-green-400">⚡ THREAT MATRIX</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
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

          <div className="w-px h-6 bg-green-900/50 mx-2"></div>

          <button className="px-3 py-1.5 border border-cyan-700 text-cyan-500 rounded text-xs tracking-widest hover:bg-cyan-900/30">
            FULL REPORT
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

      {/* --- BACKGROUND GLOBE --- */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {/* Make sure your Globe component is using 'activeArcs' as its data source! */}
        {/* <Globe 
              ref={globeEl} 
              arcsData={activeArcs} 
              ... 
            /> */}
      </div>

      {/* --- CONDITIONAL: VECTOR LEGEND --- */}
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
              <div className="text-purple-500">● DDOS</div>
              <div className="text-gray-500 text-xs ml-4">Volumetric floods</div>
            </div>
            <div>
              <div className="text-gray-400">● UNKNOWN / MULTIPLE</div>
              <div className="text-gray-500 text-xs ml-4">Scattershot / Orbital Beams</div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONDITIONAL: RIGHT MONITOR --- */}
      {showMonitor && (
        <div className="absolute top-20 right-4 z-40 w-80 flex flex-col gap-4">
          <div className="bg-black/80 border border-green-900 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-gray-500 text-xs tracking-widest">SYSTEM STATUS</div>
            <div className="text-green-400 font-bold tracking-wider mt-1">MONITORING</div>
          </div>
          <div className="bg-black/80 border border-green-900 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-xs text-green-600 mb-4 tracking-widest">LIVE ACTIVE VECTORS</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Active Connections</span>
                <span>{activeArcs.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
