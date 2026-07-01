// netlify/functions/participation.js
// Reads the public Google Sheet (Form responses) as CSV and returns parsed JSON.
// No API key needed — sheet is shared "anyone with link can view".

const SHEET_ID = "1InF_nDOxL3ZlRsiHhnJ6cMazQhAG1e1A4BbPCst3cc4";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Minimal CSV parser that handles quoted fields with commas/newlines
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1);
}

// Rough country extraction from "City and Country" free-text field
const COUNTRY_ALIASES = {
  "usa": "USA", "united states": "USA", "us": "USA", "america": "USA",
  "india": "India", "italy": "Italy", "ethiopia": "Ethiopia", "ghana": "Ghana",
  "nepal": "Nepal", "indonesia": "Indonesia", "australia": "Australia",
  "ireland": "Ireland", "south africa": "South Africa", "rwanda": "Rwanda",
  "sierra leone": "Sierra Leone", "panama": "Panama", "bhutan": "Bhutan",
  "kenya": "Kenya", "nigeria": "Nigeria", "uganda": "Uganda", "tanzania": "Tanzania",
  "canada": "Canada", "uk": "United Kingdom", "united kingdom": "United Kingdom",
  "philippines": "Philippines", "pakistan": "Pakistan", "bangladesh": "Bangladesh",
  "mexico": "Mexico", "brazil": "Brazil", "uae": "UAE", "singapore": "Singapore",
};

function extractCountry(cityCountryStr) {
  if (!cityCountryStr) return null;
  const lower = cityCountryStr.toLowerCase();
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }
  // fallback: take text after last comma
  const parts = cityCountryStr.split(",").map(s => s.trim());
  return parts.length > 1 ? parts[parts.length - 1] : cityCountryStr.trim();
}

function extractCity(cityCountryStr) {
  if (!cityCountryStr) return "";
  const parts = cityCountryStr.split(",").map(s => s.trim());
  return parts[0] || "";
}

exports.handler = async function () {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return json({ count: 0, entries: [], byCountry: {} });
    }

    const header = rows[0];
    const dataRows = rows.slice(1).filter(r => r.some(c => c && c.trim()));

    // Column indices based on known form field order
    const idx = {
      timestamp: 0,
      name: 1,
      email: 2,
      institute: 3,
      cityCountry: 4,
      specialty: 5,
      contribution: 6,
      patientStories: 7,
      media: 8,
      phone: 9,
    };

    const entries = dataRows.map((r) => {
      const cityCountry = (r[idx.cityCountry] || "").trim();
      return {
        timestamp: (r[idx.timestamp] || "").trim(),
        name: (r[idx.name] || "").trim(),
        institute: (r[idx.institute] || "").trim(),
        city: extractCity(cityCountry),
        country: extractCountry(cityCountry),
        specialty: (r[idx.specialty] || "").trim(),
        contribution: (r[idx.contribution] || "").trim(),
      };
    }).filter(e => e.name); // skip blank rows

    // Group by country for map overlay
    const byCountry = {};
    entries.forEach((e) => {
      if (!e.country) return;
      if (!byCountry[e.country]) byCountry[e.country] = [];
      byCountry[e.country].push(e);
    });

    return json({
      count: entries.length,
      entries: entries.slice(-200), // cap payload size
      byCountry,
      updatedAt: Date.now(),
    });
  } catch (err) {
    return json({ error: String(err), count: 0, entries: [], byCountry: {} }, 500);
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15", // light caching, still near-live
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
