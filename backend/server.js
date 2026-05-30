const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const geoip = require('geoip-lite'); // Local IP database

const app = express();
// Using port 5000 so it doesn't conflict with Next.js on 3000
const PORT = process.env.PORT || 5000; 

// Middleware
app.use(cors()); // Allow Next.js frontend
app.use(express.json({ limit: '50mb' })); // Support large JSON payloads
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer to hold the uploaded file in memory temporarily
const upload = multer({ storage: multer.memoryStorage() });

// --- ENDPOINT 1: The Main CSV Upload & Geocoding Pipeline ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file provided.' });
        }

        // Convert the uploaded file buffer into a readable string
        const csvString = req.file.buffer.toString('utf8');
        
        // Basic CSV Parsing (Split by new line)
        const lines = csvString.split('\n').filter(line => line.trim() !== '');
        
        // Assume the first row is headers: e.g., source_ip, target_ip, port
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const sourceIpIndex = headers.indexOf('source_ip');
        const targetIpIndex = headers.indexOf('target_ip');

        if (sourceIpIndex === -1) {
            return res.status(400).json({ error: 'CSV must contain a source_ip column.' });
        }

        // Parse rows and geocode immediately
        const mapData = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(col => col.trim());
            const sourceIp = row[sourceIpIndex];
            const targetIp = targetIpIndex !== -1 ? row[targetIpIndex] : null;

            // Use geoip-lite to get coordinates!
            const geoSource = geoip.lookup(sourceIp);
            const geoTarget = targetIp ? geoip.lookup(targetIp) : null;

            mapData.push({
                source_ip: sourceIp,
                source_geo: geoSource ? {
                    country: geoSource.country,
                    city: geoSource.city,
                    lat: geoSource.ll[0], // geoip-lite provides [latitude, longitude]
                    lon: geoSource.ll[1]
                } : null,
                target_ip: targetIp,
                target_geo: geoTarget ? {
                    country: geoTarget.country,
                    city: geoTarget.city,
                    lat: geoTarget.ll[0],
                    lon: geoTarget.ll[1]
                } : null,
                raw_data: row // Keep raw data for the frontend table/metadata
            });
        }

        console.log(`Success! Parsed and geocoded ${mapData.length} records from ${req.file.originalname}`);

        // Send the enriched, map-ready data back to React
        res.status(200).json({
            message: "Logs processed and geocoded successfully",
            total_records: mapData.length,
            data: mapData
        });

    } catch (error) {
        console.error('Upload Pipeline Error:', error.message);
        res.status(500).json({ error: 'Failed to process the CSV file' });
    }
});

// --- ENDPOINT 2: Your Standalone Geocoding Route ---
// Useful if you later want to build a feature where users can type in a single IP on the dashboard
app.post('/api/geocode', (req, res) => {
    try {
        const ips = req.body; // Expects an Array of IPs

        if (!Array.isArray(ips)) {
            return res.status(400).json({ error: 'Payload must be an array of IP addresses.' });
        }

        const results = ips.map(ip => {
            const geo = geoip.lookup(ip);
            return {
                query: ip,
                countryCode: geo ? geo.country : null,
                city: geo ? geo.city : null,
                coordinates: geo ? geo.ll : null
            };
        });

        res.json(results);
    } catch (error) {
        console.error('Geocoding Error:', error.message);
        res.status(500).json({ error: 'Failed to process IP addresses' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend API running securely on http://localhost:${PORT}`);
});
