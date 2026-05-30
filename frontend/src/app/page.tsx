"use client";

import { useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, X, Terminal, ArrowRight, Zap, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";

const ThreatMap = dynamic(() => import("@/components/ThreatMap"), { ssr: false });

const generateDemoData = () => {
  const vectors = ["DDoS / Flood", "Brute Force", "SQL Injection", "Malware", "Port Scan"];
  const data = [];
  for (let i = 0; i < 500; i++) {
    data.push({
      source_ip: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.x.x`,
      target_ip: `10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      raw_data: ["", "", "", vectors[Math.floor(Math.random() * vectors.length)]],
      source_geo: { lat: (Math.random() * 140) - 70, lon: (Math.random() * 360) - 180, country: ["CN", "RU", "US", "BR", "IR"][Math.floor(Math.random()*5)] },
      target_geo: { lat: (Math.random() * 80) - 40, lon: (Math.random() * 360) - 180, country: ["US", "GB", "DE", "FR", "JP"][Math.floor(Math.random()*5)] }
    });
  }
  return data;
};

export default function Home() {
  const [step, setStep] = useState<"drop" | "map" | "loading" | "dashboard">("drop");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapData, setMapData] = useState<any[] | null>(null);
  
  // Mapper State
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [schemaMap, setSchemaMap] = useState({ source_ip: "", target_ip: "", attack_type: "", timestamp: "" });

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) return alert("Requires .csv format");
    setFile(selectedFile);
    
    try {
      // Extract headers from the first 1000 bytes
      const text = await selectedFile.slice(0, 1000).text();
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
      setFileHeaders(headers);
      setStep("map");
    } catch (e) {
      alert("Failed to parse CSV headers. Check file encoding.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFile(e.target.files[0]); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    if (!file) return;
    setStep("loading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(schemaMap)); 

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Server error`);
      const parsedData = await response.json();
      setMapData(parsedData.data);
      setStep("dashboard");
    } catch (error) {
      alert("CONNECTION ERROR: Verify Node.js backend link.");
      setStep("drop");
    }
  };

  const handleDemoLoad = () => {
    setStep("loading");
    setTimeout(() => { setMapData(generateDemoData()); setStep("dashboard"); }, 2500); 
  };

  const resetApp = () => { setFile(null); setMapData(null); setStep("drop"); setSchemaMap({ source_ip: "", target_ip: "", attack_type: "", timestamp: "" }); };
  const isMappingValid = schemaMap.source_ip !== "" && schemaMap.target_ip !== "";

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-green-500 font-mono selection:bg-green-900 relative">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className={`z-10 flex flex-col items-center ${step === "dashboard" ? 'w-full h-screen p-0' : 'w-full max-w-4xl py-12 px-4 mt-8'}`}>
        
        {step === "dashboard" && mapData ? (
          <div className="w-full h-full flex flex-col animate-in fade-in duration-700 bg-black">
            <ThreatMap data={mapData} onReset={resetApp} />
          </div>
        ) : step === "loading" ? (
          <div className="w-full flex flex-col items-center justify-center mt-32 animate-in fade-in">
            <Terminal className="h-16 w-16 text-green-500 animate-pulse mb-8" />
            <h2 className="text-2xl font-bold tracking-widest text-green-400 mb-6 uppercase">Compiling Report Data...</h2>
            <div className="w-full max-w-xl h-2 bg-green-900/30 rounded-full overflow-hidden mb-4"><div className="h-full bg-green-500 w-full animate-[progress_2s_ease-in-out_infinite]"></div></div>
          </div>
        ) : step === "map" ? (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold tracking-widest text-green-400 mb-2 uppercase">Schema Mapping</h1>
            <p className="text-sm text-green-700 mb-10">Map your firewall export columns to the Threat Matrix schema.</p>
            
            <div className="w-full bg-black/60 border border-green-900/50 rounded-lg p-8 backdrop-blur-sm shadow-[0_0_30px_rgba(34,197,94,0.05)]">
              <div className="grid grid-cols-1 gap-6 mb-8">
                {[
                  { key: "source_ip", label: "Source IP", req: true },
                  { key: "target_ip", label: "Target IP", req: true },
                  { key: "attack_type", label: "Attack Type", req: false },
                  { key: "timestamp", label: "Timestamp", req: false }
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between border-b border-green-900/30 pb-4">
                    <span className="text-green-400 font-bold uppercase tracking-widest text-sm">
                      {field.label} {field.req ? <span className="text-red-500 ml-1">*</span> : <span className="text-green-900 text-[10px] ml-2">(OPT)</span>}
                    </span>
                    <select 
                      className="bg-green-950/30 border border-green-700/50 text-green-300 text-xs p-2 rounded outline-none focus:border-green-400 w-64 uppercase cursor-pointer"
                      value={schemaMap[field.key as keyof typeof schemaMap]}
                      onChange={(e) => setSchemaMap({...schemaMap, [field.key]: e.target.value})}
                    >
                      <option value="">-- SELECT COLUMN --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleUpload} 
                disabled={!isMappingValid}
                className={`w-full flex items-center justify-center gap-2 px-8 py-4 text-sm font-black tracking-widest uppercase rounded-sm transition-all
                  ${isMappingValid 
                    ? "border border-green-500 bg-green-500 text-black hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] cursor-pointer" 
                    : "border border-green-900 bg-green-950/30 text-green-800 cursor-not-allowed"}`}
              >
                Launch Visualization <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-4xl font-bold tracking-widest text-green-400 mb-12 uppercase drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">Threat Matrix Initialize</h1>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`flex flex-col w-full items-center justify-center rounded-lg border-2 border-dashed px-6 py-20 bg-black/60 backdrop-blur-sm transition-all duration-300 ${isDragging ? "border-green-400 bg-green-900/10 shadow-[0_0_30px_rgba(34,197,94,0.2)]" : "border-green-900/60 hover:border-green-500/80"}`}>
              <UploadCloud className="h-16 w-16 mb-6 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
              <div className="text-center mb-8 space-y-2">
                <p className="text-[11px] text-green-400/80 uppercase tracking-widest font-bold">REQUIRED SCHEMA: source_ip <span className="mx-1 text-green-800">·</span> target_ip</p>
                <p className="text-[10px] text-green-700 uppercase tracking-widest">MAX SIZE: 50MB <span className="mx-2">|</span> FORMAT: .CSV</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label htmlFor="file-upload" className="cursor-pointer border border-green-500 bg-green-950/50 px-8 py-3 text-sm font-bold tracking-widest text-green-400 hover:bg-green-500 hover:text-black transition-all uppercase rounded-sm">
                  Select Payload File
                  <input id="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                </label>
                <span className="text-green-900 text-xs font-bold">OR</span>
                <button onClick={handleDemoLoad} className="px-8 py-3 text-sm font-bold tracking-widest border border-green-900/60 text-green-600 hover:text-green-400 hover:border-green-500/50 hover:bg-green-900/20 transition-all uppercase rounded-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Load Demo Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
