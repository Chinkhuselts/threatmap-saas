"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import { Play, Pause, Activity, Download, Maximize, ChevronRight, FastForward, ShieldAlert, BarChart2, X, Info } from "lucide-react";

// --- EXPANDED VECTOR ONTOLOGY ---
const getVectorStyle = (type: string) => {
  if (!type || type.trim() === "" || type === "Unknown") return { name: "Unknown / Other", color: ["#1e293b", "#64748b"], desc: "Unclassified traffic" };
  const vector = type.toLowerCase();
  
  if (vector.includes("malware") || vector.includes("virus") || vector.includes("trojan") || vector.includes("ransom")) 
    return { name: "Malware / Ransomware", color: ["#991b1b", "#ef4444"], desc: "Malicious payloads" };
    
  if (vector.includes("phish") || vector.includes("spoof")) 
    return { name: "Phishing", color: ["#c2410c", "#f97316"], desc: "Deceptive attacks" };
    
  if (vector.includes("credential") || vector.includes("brute") || vector.includes("ssh") || vector.includes("login")) 
    return { name: "Credential Attacks", color: ["#a16207", "#eab308"], desc: "Password & access attacks" };
    
  if (vector.includes("ddos") || vector.includes("flood")) 
    return { name: "DDoS", color: ["#1d4ed8", "#3b82f6"], desc: "Volumetric floods" };
    
  if (vector.includes("apt") || vector.includes("target") || vector.includes("exploit") || vector.includes("zero")) 
    return { name: "APT / Targeted Attacks", color: ["#6b21a8", "#a855f7"], desc: "Advanced persistent threats" };
    
  if (vector.includes("data") || vector.includes("theft") || vector.includes("exfil")) 
    return { name: "Data Theft / Exfiltration", color: ["#15803d", "#22c55e"], desc: "Unauthorized extraction" };
    
  if (vector.includes("recon") || vector.includes("scan") || vector.includes("discovery")) 
    return { name: "Reconnaissance", color: ["#475569", "#f8fafc"], desc: "Network scanning" };
    
  return { name: "Unknown / Other", color: ["#1e293b", "#64748b"], desc: "Unclassified traffic" }; 
};

export default function ThreatMap({ data, onReset }: { data: any[], onReset: () => void }) {
  const globeEl = useRef<any>(null);
  
  const [activeArcs, setActiveArcs] = useState<any[]>([]);
  const [activeRings, setActiveRings] = useState<any[]>([]);
  const [currentAttack, setCurrentAttack] = useState<any>(null);
  const [tickerEvents, setTickerEvents] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  const isPausedRef = useRef(false);
  const speedRef = useRef(1);
  const [countriesGeoJSON, setCountriesGeoJSON] = useState<any>(null);
  
  const initialVectors = {
    "Malware / Ransomware": 0, "Phishing": 0, "Credential Attacks": 0, "DDoS": 0, 
    "APT / Targeted Attacks": 0, "Data Theft / Exfiltration": 0, "Reconnaissance": 0, "Unknown / Other": 0
  };

  const [liveStats, setLiveStats] = useState({ totalProcessed: 0, uniqueSources: new Set<string>(), uniqueTargets: new Set<string>(), affectedRegions: new Set<string>() });
  const [liveVectors, setLiveVectors] = useState<Record<string, number>>(initialVectors);
  const [originCounts, setOriginCounts] = useState<Record<string, number>>({});
  const [targetCounts, setTargetCounts] = useState<Record<string, number>>({});
  const currentIndex = useRef(0);

  const fullStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const valid = data.filter((r: any) => r.source_geo && r.target_geo);
    
    const vectors = { ...initialVectors } as Record<string, number>;
    const origins: Record<string, number> = {};
    const targets: Record<string, number> = {};
    const ips: Record<string, number> = {};
    const uniqueIPs = new Set<string>();

    valid.forEach((row: any) => {
      const v = getVectorStyle(row.raw_data?.[3]).name;
      const srcC = row.source_geo.country || "UNCLASSIFIED";
      const tgtC = row.target_geo.country || "UNCLASSIFIED";
      const ip = row.source_ip;

      vectors[v] = (vectors[v] || 0) + 1;
      origins[srcC] = (origins[srcC] || 0) + 1;
      targets[tgtC] = (targets[tgtC] || 0) + 1;
      ips[ip] = (ips[ip] || 0) + 1;
      uniqueIPs.add(ip);
    });

    return {
      total: valid.length,
      uniqueAttackers: uniqueIPs.size,
      vectors: Object.entries(vectors).sort((a,b) => b[1]-a[1]),
      origins: Object.entries(origins).sort((a,b) => b[1]-a[1]).slice(0, 10),
      targets: Object.entries(targets).sort((a,b) => b[1]-a[1]).slice(0, 10),
      ips: Object.entries(ips).sort((a,b) => b[1]-a[1]).slice(0, 5)            
    };
  }, [data]);

  const togglePause = () => { const next = !isPaused; setIsPaused(next); isPausedRef.current = next; };
  const cycleSpeed = () => { const next = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 5 : 1; setPlaybackSpeed(next); speedRef.current = next; };

  const exportScreenshot = () => {
    if (globeEl.current) {
      const canvas = globeEl.current.renderer().domElement;
      const link = document.createElement('a');
      link.download = `IR_Threat_Report_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0); 
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.log(err));
    else document.exitFullscreen();
  };

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json()).then(setCountriesGeoJSON);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const validData = data.filter(row => row.source_geo && row.target_geo);
    let animationFrameId: number;
    let lastFireTime = 0;

    const loop = (timestamp: number) => {
      const delay = 1500 / speedRef.current;
      if (!isPausedRef.current && timestamp - lastFireTime > delay) {
        const nextAttack = validData[currentIndex.current];
        const { name: vectorType, color: colors } = getVectorStyle(nextAttack.raw_data[3]);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const srcCountry = nextAttack.source_geo.country || "UNCLASSIFIED";
        const tgtCountry = nextAttack.target_geo.country || "UNCLASSIFIED";

        const newArc = {
          startLat: nextAttack.source_geo.lat, startLng: nextAttack.source_geo.lon,
          endLat: nextAttack.target_geo.lat, endLng: nextAttack.target_geo.lon,
          color: colors, id: Math.random().toString(),
          sourceText: `[${srcCountry}] ${nextAttack.source_ip}`, targetText: `[${tgtCountry}] ${nextAttack.target_ip}`
        };
        
        const newRingSource = { lat: nextAttack.source_geo.lat, lng: nextAttack.source_geo.lon, color: colors[0], isSource: true };
        const newRingTarget = { lat: nextAttack.target_geo.lat, lng: nextAttack.target_geo.lon, color: colors[1], isSource: false };

        setCurrentAttack({ source: nextAttack.source_ip, target: nextAttack.target_ip, type: vectorType, country: srcCountry, seqNumber: currentIndex.current + 1, totalLogs: validData.length });

        setLiveStats(prev => ({ 
          totalProcessed: prev.totalProcessed + 1, 
          uniqueSources: new Set(prev.uniqueSources).add(nextAttack.source_ip), 
          uniqueTargets: new Set(prev.uniqueTargets).add(nextAttack.target_ip), 
          affectedRegions: new Set(prev.affectedRegions).add(srcCountry).add(tgtCountry) 
        }));

        setLiveVectors(prev => ({ ...prev, [vectorType]: (prev[vectorType] || 0) + 1 }));
        setOriginCounts(prev => ({ ...prev, [srcCountry]: (prev[srcCountry] || 0) + 1 }));
        setTargetCounts(prev => ({ ...prev, [tgtCountry]: (prev[tgtCountry] || 0) + 1 }));

        setActiveArcs(prev => { const next = [...prev, newArc]; return next.length > 12 ? next.slice(next.length - 12) : next; });
        setActiveRings(prev => { const next = [...prev, newRingSource, newRingTarget]; return next.length > 12 ? next.slice(next.length - 12) : next; });
        setTickerEvents(prev => { const next = [{...newArc, time: timeStr, type: vectorType}, ...prev]; return next.length > 15 ? next.slice(0, 15) : next; });
        
        if (globeEl.current && speedRef.current === 1) {
          const currentPov = globeEl.current.pointOfView();
          globeEl.current.pointOfView({ lat: nextAttack.target_geo.lat, lng: nextAttack.target_geo.lon, altitude: currentPov.altitude }, 1000);
        }

        currentIndex.current = (currentIndex.current + 1) % validData.length;
        lastFireTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [data]);

  useEffect(() => { if (globeEl.current) globeEl.current.controls().autoRotate = !isPaused; }, [isPaused]);

  const topOriginsList = Object.entries(originCounts).filter(([c]) => c !== "UNCLASSIFIED").sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topTargetsList = Object.entries(targetCounts).filter(([c]) => c !== "UNCLASSIFIED").sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  const threatLevel = playbackSpeed === 5 ? { label: "CRITICAL (ACCELERATED)", color: "text-red-500", border: "border-red-500/50" } 
    : liveStats.totalProcessed > 100 ? { label: "ELEVATED", color: "text-orange-400", border: "border-orange-500/50" } 
    : { label: "MONITORING", color: "text-green-500", border: "border-green-500/50" };

  // Pre-define the array mapping for the legend so it renders in a logical order
  const vectorLegendItems = [
    "malware", "phish", "credential", "ddos", "apt", "data", "recon", "unknown"
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#050505] relative">
      
      {/* COMMAND BAR */}
      <div className="h-12 border-b border-green-900/40 bg-black/80 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4 text-green-500 font-bold tracking-widest text-sm">
          <Activity className="h-4 w-4" /> THREAT MATRIX
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowStatsModal(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded transition-all">
            <BarChart2 className="h-3 w-3" /> Full Report
          </button>
          <button onClick={exportScreenshot} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-green-400 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded transition-all">
            <Download className="h-3 w-3" /> Export PNG
          </button>
          <button onClick={toggleFullscreen} className="text-green-600 hover:text-green-400 p-1.5 rounded bg-green-900/20 transition-colors mr-2">
            <Maximize className="h-4 w-4" />
          </button>
          <button onClick={cycleSpeed} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-all border ${playbackSpeed === 5 ? "text-red-400 border-red-500/30 bg-red-500/10" : playbackSpeed === 2 ? "text-orange-400 border-orange-500/30 bg-orange-500/10" : "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"}`}>
            <FastForward className="h-3 w-3" /> {playbackSpeed}x Speed
          </button>
          <div className="h-4 w-px bg-green-900/50 mx-2"></div>
          <button onClick={onReset} className="text-green-700 hover:text-red-400 text-[10px] uppercase font-bold tracking-widest border border-green-900/50 px-3 py-1.5 rounded">Close Session</button>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Sidebar */}
        <div className="w-[320px] shrink-0 border-r border-green-900/30 bg-black/80 p-6 flex flex-col space-y-6 z-20 relative">
          <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-green-600 text-[10px] font-bold tracking-widest flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"}`}></span>
                {isPaused ? "PAUSED" : "LIVE INTERCEPT"}
              </h3>
              <button onClick={togglePause} className="p-1 border border-green-900/50 hover:bg-green-900/30 text-green-500 rounded"><Play className="h-3 w-3 hidden" />{isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</button>
            </div>
            {currentAttack ? (
               <div className="text-xs space-y-3">
                  <div><span className="text-gray-600 text-[9px] uppercase tracking-widest">Origin</span><p className="text-red-400 font-bold truncate" title={currentAttack.source}>{currentAttack.source}</p></div>
                  <div><span className="text-gray-600 text-[9px] uppercase tracking-widest">Target</span><p className="text-blue-400 font-bold truncate" title={currentAttack.target}>{currentAttack.target}</p></div>
                  <div>
                    <span className="text-gray-600 text-[9px] uppercase tracking-widest">Vector</span>
                    <p className="font-bold truncate" style={{ color: getVectorStyle(currentAttack.type).color[1] }} title={currentAttack.type}>
                      {currentAttack.type}
                    </p>
                  </div>
               </div>
            ) : <div className="text-green-800 text-xs animate-pulse">Awaiting telemetry...</div>}
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-green-600 text-[10px] font-bold mb-3 uppercase tracking-widest shrink-0">Recent Events</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
              {tickerEvents.map((e, i) => (
                 <div key={i} className="text-[10px] text-gray-400 p-2 border border-green-900/20 bg-green-900/5 rounded-sm">
                   <div className="flex justify-between mb-1"><span className="font-bold truncate max-w-[120px]" title={e.sourceText}>{e.sourceText}</span><span className="text-gray-600">{e.time}</span></div>
                   <div className="truncate text-gray-500" title={e.targetText}><ChevronRight className="inline h-3 w-3 text-green-700 mr-1" />{e.targetText}</div>
                 </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Globe */}
        <div className="flex-1 relative cursor-crosshair">
          
          {/* NEW: FLOATING VECTOR LEGEND */}
          <div className="absolute top-6 left-6 w-[280px] bg-black/60 border border-green-900/40 p-4 rounded-sm backdrop-blur-md pointer-events-none z-10 hidden md:block">
            <h3 className="text-green-600 text-[10px] font-bold uppercase tracking-widest border-b border-green-900/40 pb-2 mb-3 flex items-center gap-2">
              <Info className="h-3 w-3" /> Vector Legend
            </h3>
            <div className="space-y-3">
              {vectorLegendItems.map(type => {
                 const style = getVectorStyle(type);
                 return (
                   <div key={type} className="flex flex-col">
                     <div className="flex items-center gap-2 mb-0.5">
                       <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(to right, ${style.color[0]}, ${style.color[1]})` }}></span>
                       <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">{style.name}</span>
                     </div>
                     <span className="text-[9px] text-gray-500 pl-4">{style.desc}</span>
                   </div>
                 )
              })}
            </div>
          </div>

          <Globe
            ref={globeEl} globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            polygonsData={countriesGeoJSON?.features || []} polygonStrokeColor={() => 'rgba(34, 197, 94, 0.15)'} polygonCapColor={() => 'rgba(0,0,0,0)'} polygonSideColor={() => 'rgba(0,0,0,0)'}
            
            arcsData={activeArcs} 
            arcColor="color" 
            arcsTransitionDuration={1000} 
            arcStroke={1.5}
            
            ringsData={activeRings} 
            ringColor="color" 
            ringMaxRadius={(d: any) => d.isSource ? 1.5 : 4} 
            ringPropagationSpeed={(d: any) => d.isSource ? 1 : 2} 
            ringRepeatPeriod={800}
            
            backgroundColor="rgba(0,0,0,0)" rendererConfig={{ preserveDrawingBuffer: true }} 
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-[300px] shrink-0 border-l border-green-900/30 bg-black/80 p-6 flex flex-col space-y-8 z-20 overflow-y-auto">
          
          <div className={`p-3 border rounded-sm flex items-center gap-3 ${threatLevel.border} bg-black/40`}>
             <ShieldAlert className={`h-5 w-5 ${threatLevel.color}`} />
             <div><div className="text-[9px] text-gray-500 uppercase tracking-widest">System Status</div><div className={`text-xs font-bold tracking-widest ${threatLevel.color}`}>{threatLevel.label}</div></div>
          </div>

          <div className="bg-green-950/10 border border-green-900/40 p-3 rounded-sm text-[10px] text-gray-400">
            <div className="flex items-center gap-2 font-bold text-green-500 mb-2 uppercase tracking-widest">
              <Info className="h-3 w-3" /> Trajectory Guide
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Deep Spot</span>
              <span className="text-gray-500 uppercase tracking-wider">Origin</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300 shadow-[0_0_5px_#fff]"></span> Bright Pulse</span>
              <span className="text-gray-500 uppercase tracking-wider">Target</span>
            </div>
          </div>

          <div>
            <h3 className="text-green-600 text-[10px] font-bold uppercase tracking-widest border-b border-green-900/40 pb-2 mb-3">Live Active Vectors</h3>
            <ul className="space-y-2 text-[11px] text-gray-300">
              {Object.entries(liveVectors).filter(([_, count]) => count > 0).map(([name, count]) => {
                const colors = getVectorStyle(name).color;
                return (
                  <li key={name} className="flex justify-between items-center">
                    <span className="flex items-center gap-2 truncate pr-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(to right, ${colors[0]}, ${colors[1]})` }}></span>
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="text-gray-500 font-bold shrink-0">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          
          <div>
            <h3 className="text-green-600 text-[10px] font-bold uppercase tracking-widest border-b border-green-900/40 pb-2 mb-3">Top Origin Nations</h3>
            <div className="space-y-2 text-[11px] text-gray-300">
              {topOriginsList.map(([c, count]) => (
                <div key={c} className="flex justify-between">{c} <span className="text-gray-500 font-bold">{count}</span></div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FULL PAYLOAD ANALYTICS MODAL */}
      {showStatsModal && fullStats && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl bg-[#050505] border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-full overflow-hidden animate-in zoom-in-95 duration-300">
             
             <div className="flex justify-between items-center p-6 border-b border-cyan-900/40 bg-cyan-950/20 shrink-0">
                <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-3">
                   <BarChart2 className="h-6 w-6" /> Payload Analytics Report
                </h2>
                <button onClick={() => setShowStatsModal(false)} className="text-cyan-600 hover:text-red-400 transition-colors p-2 bg-cyan-950/30 rounded border border-cyan-900/50">
                  <X className="h-6 w-6" />
                </button>
             </div>

             <div className="p-6 overflow-y-auto space-y-8 flex-1 scrollbar-thin scrollbar-thumb-cyan-900/50">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/60 border border-green-900/50 p-6 rounded-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Total Malicious Events</p>
                    <p className="text-4xl font-bold text-green-400">{fullStats.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/60 border border-red-900/50 p-6 rounded-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Unique Attacking IPs</p>
                    <p className="text-4xl font-bold text-red-400">{fullStats.uniqueAttackers.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/60 border border-blue-900/50 p-6 rounded-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Targeted Jurisdictions</p>
                    <p className="text-4xl font-bold text-blue-400">{fullStats.targets.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-cyan-500 text-xs font-bold uppercase tracking-widest border-b border-cyan-900/50 pb-2 mb-4">Vector Distribution</h3>
                    <div className="space-y-4">
                      {fullStats.vectors.filter(([_, count]) => count > 0).map(([vector, count]) => {
                        const percentage = ((count / fullStats.total) * 100).toFixed(1);
                        const colors = getVectorStyle(vector).color;
                        return (
                          <div key={vector}>
                            <div className="flex justify-between text-xs mb-1 text-gray-300">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }}></span>
                                {vector}
                              </span>
                              <span className="text-cyan-400 font-bold">{percentage}% <span className="text-gray-600 font-normal ml-1">({count})</span></span>
                            </div>
                            <div className="w-full bg-cyan-950/30 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: colors[1] }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-red-500 text-xs font-bold uppercase tracking-widest border-b border-red-900/50 pb-2 mb-4">Top Origin Nations</h3>
                    <ul className="space-y-3">
                      {fullStats.origins.map(([country, count], i) => (
                        <li key={country} className="flex justify-between items-center text-xs bg-red-950/10 p-2 border border-red-900/20 rounded-sm">
                          <span className="text-gray-300 flex items-center gap-3"><span className="text-red-900 font-bold w-4">{i+1}.</span> {country}</span>
                          <span className="text-red-400 font-bold">{count.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-blue-500 text-xs font-bold uppercase tracking-widest border-b border-blue-900/50 pb-2 mb-4">Top Target Nations</h3>
                    <ul className="space-y-3">
                      {fullStats.targets.map(([country, count], i) => (
                        <li key={country} className="flex justify-between items-center text-xs bg-blue-950/10 p-2 border border-blue-900/20 rounded-sm">
                          <span className="text-gray-300 flex items-center gap-3"><span className="text-blue-900 font-bold w-4">{i+1}.</span> {country}</span>
                          <span className="text-blue-400 font-bold">{count.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-orange-500 text-xs font-bold uppercase tracking-widest border-b border-orange-900/50 pb-2 mb-4">Critical Risk Indicators (Top Aggressors)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {fullStats.ips.map(([ip, count]) => (
                      <div key={ip} className="bg-orange-950/10 border border-orange-900/30 p-4 rounded-sm text-center">
                        <div className="text-orange-400 font-bold text-sm mb-1">{ip}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">{count} Strikes</div>
                      </div>
                    ))}
                  </div>
                </div>

             </div>
          </div>
        </div>
      )}

    </div>
  );
}
