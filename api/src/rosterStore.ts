import fs from "fs";
import path from "path";

export type StoredDayOverride = {
  date: string;
  phonicsId?: string;
  sentence?: string;
  verbIds?: string[];
  storyScene?: number;
  prepIds?: string[];
  note?: string;
  manual?: boolean;
};

type Disk = {
  overrides: Record<string, StoredDayOverride>;
};

const DATA_PATH = path.resolve(__dirname, "../data/roster.json");

const g = globalThis as unknown as { __britbeeRoster?: Disk; __britbeeRosterLoaded?: boolean };

function empty(): Disk {
  return { overrides: {} };
}

function loadDisk(): Disk {
  if (g.__britbeeRosterLoaded && g.__britbeeRoster) return g.__britbeeRoster;
  try {
    if (fs.existsSync(DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
      g.__britbeeRoster = parsed?.overrides ? parsed : empty();
    } else {
      g.__britbeeRoster = empty();
    }
  } catch {
    g.__britbeeRoster = empty();
  }
  g.__britbeeRosterLoaded = true;
  return g.__britbeeRoster!;
}

function saveDisk() {
  const disk = loadDisk();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(disk, null, 2));
}

function inMonth(date: string, month: string) {
  return date.startsWith(`${month}-`);
}

export function getOverridesForMonth(month: string) {
  const disk = loadDisk();
  return Object.values(disk.overrides)
    .filter((row) => inMonth(row.date, month))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getOverride(date: string) {
  return loadDisk().overrides[date] || null;
}

export function setDayOverride(row: StoredDayOverride) {
  const disk = loadDisk();
  const prev = disk.overrides[row.date] || { date: row.date };
  disk.overrides[row.date] = { ...prev, ...row, date: row.date };
  saveDisk();
  return disk.overrides[row.date];
}

export function setMonthOverrides(month: string, rows: StoredDayOverride[]) {
  const disk = loadDisk();
  for (const key of Object.keys(disk.overrides)) {
    if (inMonth(key, month)) delete disk.overrides[key];
  }
  for (const row of rows) {
    if (!inMonth(row.date, month)) continue;
    disk.overrides[row.date] = { ...row, date: row.date };
  }
  saveDisk();
  return getOverridesForMonth(month);
}

export function clearMonthOverrides(month: string) {
  const disk = loadDisk();
  for (const key of Object.keys(disk.overrides)) {
    if (inMonth(key, month)) delete disk.overrides[key];
  }
  saveDisk();
}
