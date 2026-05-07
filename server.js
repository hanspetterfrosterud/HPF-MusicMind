// HPF's MusicMind Pro – Backend server
// Kjør: node server.js
// Krev: ANTHROPIC_API_KEY i .env-filen

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer: midlertidig lagring av opplastede lydfiler (maks 50 MB)
const upload = multer({
  storage : multer.memoryStorage(),
  limits  : { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Kun lydfiler er tillatt'));
  }
});

// ── Hjelpefunksjoner ───────────────────────────────────────
const MIME_MAP = {
  'audio/mpeg' : 'audio/mpeg',
  'audio/mp3'  : 'audio/mpeg',
  'audio/wav'  : 'audio/wav',
  'audio/wave' : 'audio/wav',
  'audio/ogg'  : 'audio/ogg',
  'audio/flac' : 'audio/flac',
  'audio/mp4'  : 'audio/mp4',
  'audio/m4a'  : 'audio/mp4',
  'audio/aac'  : 'audio/aac',
  'audio/webm' : 'audio/webm',
  'audio/x-wav': 'audio/wav',
  'audio/x-m4a': 'audio/mp4',
};

const AI_PROMPT = `Du er en ekspert musikk-analytiker og transkriberingsekspert med perfekt gehør og absolutt tonehøyde.

LYTT NØYE til hele denne lydfilen og returner en KOMPLETT musikalsk analyse som GYLDIG JSON.
RETURNER KUN JSON – ingen tekst eller forklaringer rundt.

{
  "title": "sangtittel (gjenkjent fra lydklippet)",
  "artist": "artist (gjenkjent hvis mulig)",
  "key": "toneart f.eks Am, C, F#m, Bb, G",
  "bpm": 120,
  "time_signature": "4/4",
  "capo": 0,
  "genre": "sjanger på norsk",
  "mood": "stemning på norsk",
  "energy": "lav/medium/høy",
  "instruments": ["vokal","gitar","bass","trommer"],
  "structure": ["Intro","Vers 1","Refreng","Outro"],
  "chords": [
    {"name":"Am","type":"Moll","ts":"0:02","bars":2},
    {"name":"F","type":"Dur","ts":"0:08","bars":2},
    {"name":"C","type":"Dur","ts":"0:14","bars":2},
    {"name":"G","type":"Dur","ts":"0:20","bars":2}
  ],
  "chord_progression": "Am–F–C–G (vers) / F–G–Am (refreng)",
  "lyrics": [
    {
      "sec": "Vers 1",
      "lines": [
        {
          "text": "eksakt tekst ord for ord slik det synges i sangen",
          "chords": [{"c":"Am","w":0},{"c":"F","w":4}]
        },
        {
          "text": "neste linje i sangen",
          "chords": [{"c":"C","w":0},{"c":"G","w":3}]
        }
      ]
    },
    {
      "sec": "Refreng",
      "lines": [
        {
          "text": "refreng tekst her",
          "chords": [{"c":"F","w":0},{"c":"G","w":3}]
        }
      ]
    }
  ],
  "guitar_tabs": "Standard tuning (eller Kapo X)\\n\\nFullstendige gitartabs for ALLE akkorder i sangen.\\nInkluder strumming/fingerpicking-mønster og eventuelle riff.\\ne B G D A E strenger.",
  "bass_tabs": "Bass-tuning: E A D G\\n\\nFullstendige bass-tabs for vers og refreng.\\nInkluder bassgang-mønster og walk-ups.\\nG D A E strenger.",
  "analysis": "Detaljert musikalsk analyse på norsk: toneart, modus, akkordprogresjoner, basslinjer, spilleteknikk, arrangering, instrumentering og stemning."
}`;

// ── Ruter ──────────────────────────────────────────────────

// Hoved-API: analyser lydfil med Claude
app.post('/api/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Ingen lydfil mottatt' });
    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY mangler i .env' });

    const mediaType = MIME_MAP[req.file.mimetype] || 'audio/mpeg';
    const base64    = req.file.buffer.toString('base64');

    console.log(`Analyserer: ${req.file.originalname} (${(req.file.size/1024/1024).toFixed(1)} MB, ${mediaType})`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : {
        'Content-Type'      : 'application/json',
        'x-api-key'         : process.env.ANTHROPIC_API_KEY,
        'anthropic-version' : '2023-06-01',
      },
      body: JSON.stringify({
        model      : 'claude-opus-4-6',
        max_tokens : 4000,
        messages   : [{
          role   : 'user',
          content: [
            { type: 'text', text: AI_PROMPT },
            { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API feil:', response.status, err);
      return res.status(response.status).json({ error: `API feil ${response.status}: ${err.slice(0,200)}` });
    }

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw  = data.content?.[0]?.text || '';
    const m    = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'AI returnerte ikke gyldig JSON', raw: raw.slice(0,300) });

    const result = JSON.parse(m[0]);
    console.log(`Ferdig: ${result.title} i ${result.key}, ${result.bpm} BPM`);
    res.json(result);

  } catch (err) {
    console.error('Serverfeil:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI-analyse basert på tekst (fallback når lydfil feiler)
app.post('/api/analyze-text', async (req, res) => {
  try {
    const { title, artist, key, bpm, genre, notes } = req.body;
    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY mangler i .env' });

    const prompt = `Du er en ekspert musikk-analytiker. Generer en KOMPLETT musikalsk analyse for denne sangen.

Sang: "${title || 'Ukjent'}"
Artist: "${artist || 'Ukjent'}"
${key   ? 'Toneart: ' + key   : ''}
${bpm   ? 'BPM: '    + bpm   : ''}
${genre ? 'Genre: '  + genre  : ''}
${notes ? 'Info: '   + notes  : ''}

Returner KUN gyldig JSON med feltene:
title, artist, key, bpm, time_signature, capo, genre, mood, energy,
instruments, structure, chords (med name,type,ts,bars), chord_progression,
lyrics (med sec og lines med text og chords [{c,w}]),
guitar_tabs (fullstendige tabs med e B G D A E strenger),
bass_tabs (fullstendige bass-tabs med G D A E strenger),
analysis (detaljert på norsk).`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : {
        'Content-Type'      : 'application/json',
        'x-api-key'         : process.env.ANTHROPIC_API_KEY,
        'anthropic-version' : '2023-06-01',
      },
      body: JSON.stringify({
        model      : 'claude-sonnet-4-20250514',
        max_tokens : 3000,
        messages   : [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw  = data.content?.[0]?.text || '';
    const m    = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Ingen JSON i svar' });
    res.json(JSON.parse(m[0]));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI akkord-progresjon-forslag
app.post('/api/suggest-progression', async (req, res) => {
  try {
    const { key, bpm, genre } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : {
        'Content-Type'      : 'application/json',
        'x-api-key'         : process.env.ANTHROPIC_API_KEY,
        'anthropic-version' : '2023-06-01',
      },
      body: JSON.stringify({
        model      : 'claude-sonnet-4-20250514',
        max_tokens : 300,
        messages   : [{
          role   : 'user',
          content: `Foreslå 4 akkord-progresjoner for sang i ${key}, ${bpm} BPM${genre ? ', '+genre : ''}.
Format: AKKORDER | Norsk beskrivelse
Eksempel: Am F C G | Klassisk pop-progresjon`
        }]
      })
    });
    const data = await response.json();
    res.json({ text: data.content?.[0]?.text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend for alle andre ruter
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵 HPF's MusicMind Pro kjører på http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY)
    console.warn('⚠️  ADVARSEL: ANTHROPIC_API_KEY er ikke satt i .env\n');
  else
    console.log('✅  API-nøkkel funnet\n');
});
