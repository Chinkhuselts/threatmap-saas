"use client";

import { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";

export default function ThreatMap({ data }: { data: any[] }) {
  const globeEl = useRef<any>();
  const [arcsData, setArcsData] = useState<any[]>([]);

  useEffect(() => {
    // Filter and map the data from your Node.js backend into the format the globe expects
    const arcs = data
      .filter((row) => row.source_geo && row.target_geo) // Only map if we have both coordinates
      .map((row) => ({
        startLat: row.source_geo.lat,
        startLng: row.source_geo.lon,
        endLat: row.target_geo.lat,
        endLng: row.target_geo.lon,
        color: ["#ff0000", "#ff8800"], // Red to Orange gradient for threats
        label: `${row.source_ip} -> ${row.target_ip}`
      }));

    setArcsData(arcs);

    // Auto-rotate the globe slowly
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 1.5;
    }
  }, [data]);

  return (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden shadow-2xl mt-8 cursor-grab active:cursor-grabbing relative">
      {/* Fallback texture if the image fails to load */}
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcsTransitionDuration={1000}
        arcStroke={1.5}
        width={800}
        height={600}
        backgroundColor="rgba(0,0,0,0)"
      />

      {/* Overlay UI for the Map */}
      <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700">
        <p className="text-sm font-semibold">Active Threats: {arcsData.length}</p>
      </div>
    </div>
  );
}
