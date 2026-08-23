import { z } from "zod";

export const UserRoles = ["learner", "parent", "guide", "superadmin"] as const;
export type UserRole = (typeof UserRoles)[number];

export const ChildLevels = ["beginner", "intermediate", "advanced"] as const;
export type ChildLevel = (typeof ChildLevels)[number];

export const BEE_BODIES = ["honey", "gold", "cream", "peach", "pink", "mint", "sky", "lilac"] as const;
export const BEE_STRIPES = ["navy", "ink", "brown", "plum", "teal"] as const;
export const BEE_EYES = ["round", "sparkle", "wink", "hearts", "star"] as const;
export const BEE_GLASSES = ["none", "round", "sun", "heart", "star"] as const;
export const BEE_HATS = ["none", "bow", "cap", "crown", "flower", "puffs", "phones", "halo"] as const;
export const BEE_BLUSH = ["none", "pink", "peach"] as const;
export const BEE_WINGS = ["clear", "sparkle", "rainbow", "gold"] as const;
export const BEE_BACKS = ["navy", "blue", "violet", "green", "red", "yellow", "coral", "teal", "rose", "cream"] as const;

export const beeLookSchema = z.object({
  body: z.enum(BEE_BODIES).optional(),
  stripe: z.enum(BEE_STRIPES).optional(),
  eyes: z.enum(BEE_EYES).optional(),
  glasses: z.enum(BEE_GLASSES).optional(),
  hat: z.enum(BEE_HATS).optional(),
  blush: z.enum(BEE_BLUSH).optional(),
  wings: z.enum(BEE_WINGS).optional(),
  back: z.enum(BEE_BACKS).optional(),
});

export type BeeLook = {
  body: (typeof BEE_BODIES)[number];
  stripe: (typeof BEE_STRIPES)[number];
  eyes: (typeof BEE_EYES)[number];
  glasses: (typeof BEE_GLASSES)[number];
  hat: (typeof BEE_HATS)[number];
  blush: (typeof BEE_BLUSH)[number];
  wings: (typeof BEE_WINGS)[number];
  back: (typeof BEE_BACKS)[number];
};

export function clampBeeLook(raw: unknown): BeeLook | undefined {
  const parsed = beeLookSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const d = parsed.data;
  if (!d.body && !d.stripe && !d.eyes && !d.glasses && !d.hat && !d.blush && !d.wings && !d.back) return undefined;
  return {
    body: d.body || "honey",
    stripe: d.stripe || "navy",
    eyes: d.eyes || "round",
    glasses: d.glasses || "none",
    hat: d.hat || "none",
    blush: d.blush || "pink",
    wings: d.wings || "clear",
    back: d.back || "navy",
  };
}

export const childProfileSchema = z.object({
  childName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  level: z.enum(ChildLevels).optional(),
  goal: z.string().optional(),
  avatar: beeLookSchema.optional(),
});

export type ChildProfile = z.infer<typeof childProfileSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string(),
  role: z.enum(UserRoles),
  phone: z.string().optional(),
  hasPassword: z.boolean().optional(),
  child: childProfileSchema.optional(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const loginSchema = z
  .object({
    email: z.string().min(1).optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(6),
    portal: z.enum(["mobile", "office"]).optional(),
  })
  .refine((d) => Boolean(d.email?.trim() || d.phone?.trim()), {
    message: "Email or phone required",
  });

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["learner", "parent"]).default("parent"),
  child: childProfileSchema.optional(),
});

export const otpPurposeSchema = z.enum(["signup", "reset"]);
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;

export const sendOtpSchema = z.object({
  phone: z.string().min(10),
  purpose: otpPurposeSchema,
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().min(4).max(8),
  purpose: otpPurposeSchema,
  portal: z.enum(["mobile", "office"]).optional(),
  name: z.string().min(1).optional(),
  child: childProfileSchema.optional(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(6).max(72),
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(10),
  resetToken: z.string().min(1),
  password: z.string().min(6).max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export const PORTAL_ROLE: Record<string, UserRole> = {
  mobile: "learner",
  office: "guide",
};
