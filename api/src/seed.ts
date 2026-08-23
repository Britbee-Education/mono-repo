import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "./db";
import { memoryDb } from "./memory";
import { users, hashPassword } from "./users";

async function seed() {
  const passwordHash = await hashPassword("password123");

  if (memoryDb.enabled) {
    await memoryDb.seedDefaults(passwordHash);
    console.log("Seeded memory DB demo users (password123)");
    process.exit(0);
  }

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/britbee";
  await connectDb(uri);

  const seeds = [
    {
      email: "parent@britbee.test",
      name: "Priya Sharma",
      role: "parent" as const,
      phone: "919876543210",
      child: {
        childName: "Arjun Sharma",
        dateOfBirth: "12/08/2017",
        level: "beginner" as const,
        goal: "Speak confidently",
      },
    },
    {
      email: "learner@britbee.test",
      name: "Arjun",
      role: "learner" as const,
      child: { childName: "Arjun", level: "beginner" as const, goal: "Speak confidently" },
    },
    { email: "guide@britbee.test", name: "Mentor Maya", role: "guide" as const },
  ];

  for (const s of seeds) {
    await users.upsertSeed(s.email, { ...s, passwordHash });
    console.log(`seeded ${s.role}: ${s.email} / password123`);
  }
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
