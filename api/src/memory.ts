import fs from "fs";
import path from "path";
import type { UserRole } from "@britbee/shared";

export type MemUser = {
  _id: string;
  email: string;
  passwordHash?: string;
  name: string;
  phone?: string;
  role: UserRole;
  googleId?: string;
  appleId?: string;
  facebookId?: string;
  child?: {
    childName?: string;
    dateOfBirth?: string;
    level?: "beginner" | "intermediate" | "advanced";
    goal?: string;
    // Parent/learner child avatars come from Zod where each trait is optional,
    // so keep this as a partial to avoid typing mismatches.
    avatar?: Partial<import("@britbee/shared").BeeLook>;
  };
  children?: MemUser["child"][];
  activeChildIndex?: number;
  parentSettings?: {
    paused?: boolean;
    planId?: "trial" | "monthly" | "yearly";
    planSince?: string;
  };
};

type DiskShape = { nextId: number; users: MemUser[] };

const DATA_PATH = path.resolve(__dirname, "../data/users.json");

const g = globalThis as unknown as {
  __britbeeUsers?: MemUser[];
  __britbeeId?: number;
  __britbeeLoaded?: boolean;
};

function digits10(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as DiskShape;
    g.__britbeeUsers = Array.isArray(parsed.users) ? parsed.users : [];
    g.__britbeeId = Number(parsed.nextId) || 1;
  } catch {
    g.__britbeeUsers = [];
    g.__britbeeId = 1;
  }
  g.__britbeeLoaded = true;
}

function persistToDisk() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const payload: DiskShape = {
    nextId: g.__britbeeId || 1,
    users: g.__britbeeUsers || [],
  };
  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2));
}

function store() {
  if (!g.__britbeeLoaded) loadFromDisk();
  if (!g.__britbeeUsers) g.__britbeeUsers = [];
  if (!g.__britbeeId) g.__britbeeId = 1;
  return g;
}

export const memoryDb = {
  get enabled() {
    return process.env.MEMORY_DB === "1" || process.env.MONGODB_URI === "memory";
  },
  get filePath() {
    return DATA_PATH;
  },
  persist() {
    persistToDisk();
  },
  count() {
    return store().__britbeeUsers!.length;
  },
  async findByEmail(email: string) {
    return store().__britbeeUsers!.find((u) => u.email === email.toLowerCase()) || null;
  },
  async findByPhone(phone: string) {
    const users = store().__britbeeUsers!;
    const exact = users.find((u) => u.phone === phone);
    if (exact) return exact;
    const needle = digits10(phone);
    if (!needle) return null;
    return users.find((u) => digits10(u.phone) === needle) || null;
  },
  async findById(id: string) {
    return store().__britbeeUsers!.find((u) => u._id === id) || null;
  },
  listByRoles(roles: string[]) {
    return store().__britbeeUsers!.filter((u) => roles.includes(u.role));
  },
  async findOne(query: Partial<MemUser> & { $or?: Partial<MemUser>[] }) {
    const users = store().__britbeeUsers!;
    if (query.$or) {
      return (
        users.find((u) =>
          query.$or!.some((q) =>
            Object.entries(q).every(([k, v]) => v != null && (u as any)[k] === v)
          )
        ) || null
      );
    }
    return (
      users.find((u) =>
        Object.entries(query).every(([k, v]) => v != null && (u as any)[k] === v)
      ) || null
    );
  },
  async create(data: Omit<MemUser, "_id">) {
    const s = store();
    const user: MemUser = { ...data, _id: String(s.__britbeeId!++) };
    s.__britbeeUsers!.push(user);
    persistToDisk();
    return user;
  },
  async upsertByEmail(email: string, data: Omit<MemUser, "_id" | "email"> & { email?: string }) {
    const existing = await memoryDb.findByEmail(email);
    if (existing) {
      Object.assign(existing, data, { email: email.toLowerCase() });
      persistToDisk();
      return existing;
    }
    return memoryDb.create({ ...data, email: email.toLowerCase() } as Omit<MemUser, "_id">);
  },
  async seedDefaults(passwordHash: string) {
    store();
    const seeds: Omit<MemUser, "_id">[] = [
      {
        email: "parent@britbee.test",
        name: "Priya Sharma",
        role: "parent",
        phone: "919876543210",
        passwordHash,
        child: {
          childName: "Arjun Sharma",
          dateOfBirth: "12/08/2017",
          level: "beginner",
          goal: "Speak confidently",
        },
        children: [
          {
            childName: "Arjun Sharma",
            dateOfBirth: "12/08/2017",
            level: "beginner",
            goal: "Speak confidently",
          },
        ],
        activeChildIndex: 0,
      },
      {
        email: "learner@britbee.test",
        name: "Arjun",
        role: "learner",
        passwordHash,
        child: { childName: "Arjun", level: "beginner", goal: "Speak confidently" },
        children: [{ childName: "Arjun", level: "beginner", goal: "Speak confidently" }],
        activeChildIndex: 0,
      },
      { email: "guide@britbee.test", name: "Mentor Maya", role: "guide", passwordHash },
    ];
    for (const s of seeds) {
      await memoryDb.upsertByEmail(s.email, s);
    }
  },
};
