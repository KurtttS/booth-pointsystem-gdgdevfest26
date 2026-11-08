// utils/eventLogos.js - Dynamic Google logo color palette and event themes
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const redFramePath = fs.existsSync(path.join(projectRoot, 'public', 'assets', 'aistudio', 'Frame_3_3199d404.png'))
  ? path.join(projectRoot, 'public', 'assets', 'aistudio', 'Frame_3_3199d404.png')
  : path.join(projectRoot, 'public', 'IMG', 'event-professional-red.png');

const greenFramePath = fs.existsSync(path.join(projectRoot, 'public', 'assets', 'aistudio', 'Frame_4_b83932ab.png'))
  ? path.join(projectRoot, 'public', 'assets', 'aistudio', 'Frame_4_b83932ab.png')
  : path.join(projectRoot, 'public', 'IMG', 'event-student-green.png');

const blueIconPath = path.join(projectRoot, 'public', 'IMG', 'event-blue.png');
const yellowIconPath = path.join(projectRoot, 'public', 'IMG', 'event-yellow.png');
const purpleIconPath = path.join(projectRoot, 'public', 'IMG', 'event-purple.png');
const tealIconPath = path.join(projectRoot, 'public', 'IMG', 'event-teal.png');

const colorsConfigFile = path.join(projectRoot, 'config', 'event_colors.json');

/**
 * Google logo color palette specification:
 * - Green: #237539 (Matching Student Dev Day green PNG)
 * - Red: #e84432 (Matching Professional Dev Day red PNG)
 * - Blue: #1a73e8 (Google Blue)
 * - Yellow: #f9ab00 (Google Yellow/Amber, with high-contrast text color #b06000)
 */
export const GOOGLE_PALETTE = {
  green: {
    key: 'green',
    name: 'Google Green',
    hex: '#237539',
    rgb: [35, 117, 57],
    fontColor: '#237539',
    border: '#237539',
    glow: 'rgba(35, 117, 57, 0.42)',
    logoUrl: '/assets/aistudio/Frame_4_b83932ab.png',
    fallbackLogo: '/IMG/event-student-green.png',
    filePath: greenFramePath,
    tag: 'STUDENT DEV DAY'
  },
  red: {
    key: 'red',
    name: 'Google Red',
    hex: '#e84432',
    rgb: [232, 68, 50],
    fontColor: '#e84432',
    border: '#e84432',
    glow: 'rgba(232, 68, 50, 0.42)',
    logoUrl: '/assets/aistudio/Frame_3_3199d404.png',
    fallbackLogo: '/IMG/event-professional-red.png',
    filePath: redFramePath,
    tag: 'PROFESSIONAL DEV DAY'
  },
  blue: {
    key: 'blue',
    name: 'Google Blue',
    hex: '#1a73e8',
    rgb: [26, 115, 232],
    fontColor: '#1a73e8',
    border: '#1a73e8',
    glow: 'rgba(26, 115, 232, 0.42)',
    logoUrl: '/IMG/event-blue.png',
    fallbackLogo: '/IMG/event-blue.png',
    filePath: blueIconPath,
    tag: 'TECH SUMMIT'
  },
  yellow: {
    key: 'yellow',
    name: 'Google Yellow',
    hex: '#f9ab00',
    rgb: [249, 171, 0],
    fontColor: '#b06000', // high contrast for clear readability on white card
    border: '#f9ab00',
    glow: 'rgba(249, 171, 0, 0.42)',
    logoUrl: '/IMG/event-yellow.png',
    fallbackLogo: '/IMG/event-yellow.png',
    filePath: yellowIconPath,
    tag: 'INNOVATION DAY'
  },
  purple: {
    key: 'purple',
    name: 'Google Purple',
    hex: '#7c3aed',
    rgb: [124, 58, 237],
    fontColor: '#7c3aed',
    border: '#7c3aed',
    glow: 'rgba(124, 58, 237, 0.42)',
    logoUrl: '/IMG/event-purple.png',
    fallbackLogo: '/IMG/event-purple.png',
    filePath: purpleIconPath,
    tag: 'COMMUNITY TRACK'
  },
  teal: {
    key: 'teal',
    name: 'Google Teal',
    hex: '#0d9488',
    rgb: [13, 148, 136],
    fontColor: '#0d9488',
    border: '#0d9488',
    glow: 'rgba(13, 148, 136, 0.42)',
    logoUrl: '/IMG/event-teal.png',
    fallbackLogo: '/IMG/event-teal.png',
    filePath: tealIconPath,
    tag: 'SPECIAL TRACK'
  }
};

export const EVENT_PALETTE = [
  { id: 1, name: 'Google Green', hex: GOOGLE_PALETTE.green.hex, rgb: GOOGLE_PALETTE.green.rgb },
  { id: 2, name: 'Google Red', hex: GOOGLE_PALETTE.red.hex, rgb: GOOGLE_PALETTE.red.rgb },
  { id: 3, name: 'Google Blue', hex: GOOGLE_PALETTE.blue.hex, rgb: GOOGLE_PALETTE.blue.rgb },
  { id: 4, name: 'Google Yellow', hex: GOOGLE_PALETTE.yellow.hex, rgb: GOOGLE_PALETTE.yellow.rgb },
  { id: 5, name: 'Google Purple', hex: GOOGLE_PALETTE.purple.hex, rgb: GOOGLE_PALETTE.purple.rgb },
  { id: 6, name: 'Google Teal', hex: GOOGLE_PALETTE.teal.hex, rgb: GOOGLE_PALETTE.teal.rgb }
];

/**
 * Load persistent color assignments from config/event_colors.json
 */
export function loadColorAssignments() {
  try {
    if (fs.existsSync(colorsConfigFile)) {
      const raw = fs.readFileSync(colorsConfigFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[EventLogos] Error reading event_colors.json:', err);
  }
  return { '1': 'green', '2': 'red' };
}

/**
 * Save persistent color assignments to config/event_colors.json
 */
export function saveColorAssignment(eventId, colorKey) {
  try {
    const data = loadColorAssignments();
    data[eventId.toString()] = colorKey;
    fs.writeFileSync(colorsConfigFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[EventLogos] Error writing event_colors.json:', err);
  }
}

/**
 * Remove color assignment when event is deleted
 */
export function releaseEventColor(eventId) {
  try {
    const data = loadColorAssignments();
    delete data[eventId.toString()];
    fs.writeFileSync(colorsConfigFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[EventLogos] Error releasing event color:', err);
  }
}

/**
 * Assign an unused unique color from the Google palette to a new event
 */
export function assignUniqueColorForEvent(eventId, eventName = '', existingEvents = []) {
  const idStr = (eventId !== undefined && eventId !== null) ? eventId.toString() : '1';
  const numId = parseInt(idStr, 10) || 1;
  const nameLower = (eventName || '').toString().toLowerCase();

  // 1. Fixed Google Colors for baseline events
  if (nameLower.includes('student') || numId === 1) {
    saveColorAssignment(idStr, 'green');
    return 'green';
  }
  if (nameLower.includes('professional') || numId === 2) {
    saveColorAssignment(idStr, 'red');
    return 'red';
  }

  // 2. Check if already assigned
  const assignments = loadColorAssignments();
  if (assignments[idStr] && GOOGLE_PALETTE[assignments[idStr]]) {
    return assignments[idStr];
  }

  // 3. Find unique unused color from Google palette (blue, yellow, green, red)
  const googlePaletteOrder = ['blue', 'yellow', 'green', 'red'];
  const extendedPaletteOrder = ['purple', 'teal'];

  const usedColors = new Set();
  // Always include baseline used colors
  usedColors.add('green');
  usedColors.add('red');

  if (Array.isArray(existingEvents) && existingEvents.length > 0) {
    for (const ev of existingEvents) {
      if (!ev || ev.id.toString() === idStr) continue;
      const evName = (ev.event_name || '').toLowerCase();
      if (evName.includes('student') || ev.id === 1) usedColors.add('green');
      else if (evName.includes('professional') || ev.id === 2) usedColors.add('red');
      else if (assignments[ev.id.toString()]) usedColors.add(assignments[ev.id.toString()]);
    }
  } else {
    for (const [keyId, col] of Object.entries(assignments)) {
      if (keyId !== idStr) usedColors.add(col);
    }
  }

  // Pick first unused color from Google Palette
  let chosen = googlePaletteOrder.find(col => !usedColors.has(col));
  if (!chosen) {
    chosen = extendedPaletteOrder.find(col => !usedColors.has(col));
  }
  if (!chosen) {
    chosen = googlePaletteOrder[(numId - 1) % googlePaletteOrder.length];
  }

  saveColorAssignment(idStr, chosen);
  return chosen;
}

/**
 * Returns complete theme object for an event (color, fontColor, glow, logoUrl, etc.)
 */
export function getEventTheme(eventId, eventName = '', existingEvents = []) {
  const idStr = (eventId !== undefined && eventId !== null) ? eventId.toString() : '1';
  const numId = parseInt(idStr, 10) || 1;
  const nameLower = (eventName || '').toString().toLowerCase();

  let colorKey = 'green';
  if (nameLower.includes('student') || numId === 1) {
    colorKey = 'green';
  } else if (nameLower.includes('professional') || numId === 2) {
    colorKey = 'red';
  } else {
    const assignments = loadColorAssignments();
    if (assignments[idStr] && GOOGLE_PALETTE[assignments[idStr]]) {
      colorKey = assignments[idStr];
    } else {
      colorKey = assignUniqueColorForEvent(numId, eventName, existingEvents);
    }
  }

  const theme = GOOGLE_PALETTE[colorKey] || GOOGLE_PALETTE.green;
  return {
    ...theme,
    eventId: numId
  };
}

export function getEventColor(eventId) {
  const theme = getEventTheme(eventId);
  return theme.hex;
}

export function getEventRgb(eventId) {
  const theme = getEventTheme(eventId);
  return theme.rgb;
}

/**
 * Generates or reads PNG buffer for event
 */
export function createEventLogoBuffer(eventId) {
  const theme = getEventTheme(eventId);
  if (theme.filePath && fs.existsSync(theme.filePath)) {
    return fs.readFileSync(theme.filePath);
  }
  if (theme.fallbackLogo) {
    const fallbackPath = path.join(projectRoot, 'public', theme.fallbackLogo);
    if (fs.existsSync(fallbackPath)) {
      return fs.readFileSync(fallbackPath);
    }
  }
  // Fallback to green frame
  return fs.readFileSync(greenFramePath);
}

/**
 * Ensure event logo PNG file exists in public/IMG/event-logo-{id}.png
 */
export function ensureEventLogoPng(eventId, overwrite = false) {
  const outPath = path.join(projectRoot, 'public', 'IMG', `event-logo-${eventId}.png`);
  if (!fs.existsSync(outPath) || overwrite) {
    const buf = createEventLogoBuffer(eventId);
    fs.writeFileSync(outPath, buf);
  }
  return `/IMG/event-logo-${eventId}.png`;
}

/**
 * Initialize event logos on server startup
 */
export function initAllEventLogos() {
  try {
    for (let id = 1; id <= 6; id++) {
      ensureEventLogoPng(id, true);
    }
    console.log('[EventLogos] Initialized event logos with Google logo color palette');
  } catch (err) {
    console.error('[EventLogos] Failed to initialize event logos:', err);
  }
}
