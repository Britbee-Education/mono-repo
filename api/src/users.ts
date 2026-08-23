import bcrypt from "bcryptjs";
import { memoryDb, type MemUser } from "./memory";
import { User, type UserDoc } from "./models/User";

export type AppUser = {
  _id: string;
  email?: string;
  passwordHash?: string;
  name: string;
  phone?: string;
  role: string;
  googleId?: string;
  appleId?: string;
  facebookId?: string;
  child?: MemUser["child"];
  children?: MemUser["children"];
  activeChildIndex?: number;
  parentSettings?: MemUser["parentSettings"];
  save?: () => Promise<void>;
};

function fromMongo(u: UserDoc): AppUser {
  const activeIdx = Number((u as any).activeChildIndex) || 0;
  const activeChild = (u as any).child || (Array.isArray((u as any).children) ? (u as any).children[activeIdx] : undefined);
  return {
    _id: String(u._id),
    email: u.email || undefined,
    passwordHash: u.passwordHash || undefined,
    name: u.name,
    phone: u.phone || undefined,
    role: u.role,
    googleId: u.googleId || undefined,
    appleId: u.appleId || undefined,
    facebookId: u.facebookId || undefined,
    child: activeChild || undefined,
    children: Array.isArray((u as any).children) ? ((u as any).children as any) : undefined,
    activeChildIndex: activeIdx,
    parentSettings: (u as any).parentSettings || undefined,
    save: async () => {
      await u.save();
    },
  };
}

export const users = {
  async findByEmail(email: string) {
    if (memoryDb.enabled) return memoryDb.findByEmail(email);
    const u = await User.findOne({ email: email.toLowerCase() });
    return u ? fromMongo(u) : null;
  },
  async findByPhone(phone: string) {
    if (memoryDb.enabled) return memoryDb.findByPhone(phone);
    const u = await User.findOne({ phone });
    return u ? fromMongo(u) : null;
  },
  async findById(id: string) {
    if (memoryDb.enabled) return memoryDb.findById(id);
    const u = await User.findById(id);
    return u ? fromMongo(u) : null;
  },
  async listByRoles(roles: string[]) {
    if (memoryDb.enabled) return memoryDb.listByRoles(roles);
    const docs = await User.find({ role: { $in: roles } });
    return docs.map(fromMongo);
  },
  async findOne(query: Record<string, unknown>) {
    if (memoryDb.enabled) return memoryDb.findOne(query as any);
    const u = await User.findOne(query);
    return u ? fromMongo(u) : null;
  },
  async update(id: string, patch: Partial<Omit<AppUser, "_id" | "save">>) {
    if (memoryDb.enabled) {
      const u = await memoryDb.findById(id);
      if (!u) return null;
      Object.assign(u, patch);
      memoryDb.persist();
      return u;
    }
    const u = await User.findByIdAndUpdate(id, patch, { new: true });
    return u ? fromMongo(u) : null;
  },
  async create(data: Omit<AppUser, "_id" | "save">) {
    if (memoryDb.enabled) {
      return memoryDb.create(data as any);
    }
    const u = await User.create(data);
    return fromMongo(u);
  },
  async upsertSeed(email: string, data: Omit<AppUser, "_id" | "save" | "email"> & { passwordHash: string }) {
    if (memoryDb.enabled) {
      return memoryDb.upsertByEmail(email, { ...data, email } as any);
    }
    return User.findOneAndUpdate({ email }, { ...data, email }, { upsert: true, new: true });
  },
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
