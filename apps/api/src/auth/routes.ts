import crypto from "node:crypto";
import type { Prisma, Role } from "@prisma/client";
import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendPasswordResetEmail } from "../mailer.js";
import { toPublicUser } from "../users/serialize.js";
import { getGoogleClient } from "./googleClient.js";
import { hashPassword, verifyPassword } from "./hash.js";
import {
  generateRefreshToken,
  hashToken,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  signAccessToken,
} from "./tokens.js";

export const authRouter = Router();

/** `$transaction` ichidan tashqariga chiqarib, register/google handler'larda 400'ga aylantiriladi. */
class InviteCodeError extends Error {}

/**
 * Taklifnoma kodini tekshiradi va "ishlatilgan" deb belgilaydi (register va
 * google handler'lari ikkalasi ham ishlatadi). `usedById: null` shartini
 * `updateMany` ichida ham tekshiramiz — shu bilan ikkita parallel so'rov bir
 * xil kodni ikki marta ishlata olmaydi (poyga holati yo'q).
 */
async function consumeInviteCode(tx: Prisma.TransactionClient, code: string): Promise<void> {
  const { count } = await tx.inviteCode.updateMany({
    where: { code, usedById: null },
    data: { usedAt: new Date() },
  });
  if (count === 0) {
    throw new InviteCodeError();
  }
}

const isProd = env.nodeEnv === "production";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 soat

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: REFRESH_COOKIE_PATH,
  });
}

async function issueSession(res: Response, userId: string, role: Role): Promise<string> {
  const accessToken = signAccessToken({ sub: userId, role });
  const { token, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  setRefreshCookie(res, token);
  return accessToken;
}

/** Frontend ro'yxatdan o'tish formasida taklifnoma-kod maydonini ko'rsatish kerakmi, shundan biladi. */
authRouter.get("/beta-status", (_req, res) => {
  res.json({ inviteRequired: env.betaInviteRequired });
});

const registerSchema = z.object({
  email: z.string().email("Email formati noto'g'ri"),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
  name: z.string().min(1, "Ism kiritilishi shart"),
  inviteCode: z.string().trim().min(1).optional(),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { email, password, name, inviteCode } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Bu email bilan foydalanuvchi allaqachon mavjud" });
      return;
    }

    if (env.betaInviteRequired && !inviteCode) {
      res.status(400).json({ error: "Ro'yxatdan o'tish uchun taklifnoma kodi kerak" });
      return;
    }

    const passwordHash = await hashPassword(password);
    try {
      const user = await prisma.$transaction(async (tx) => {
        if (env.betaInviteRequired && inviteCode) {
          await consumeInviteCode(tx, inviteCode);
        }

        const created = await tx.user.create({ data: { email, passwordHash, name } });
        if (env.betaInviteRequired && inviteCode) {
          await tx.inviteCode.update({ where: { code: inviteCode }, data: { usedById: created.id } });
        }
        // Har bir foydalanuvchi FREE obuna bilan boshlaydi (billing/service.ts'dagi
        // ensureSubscription buni lazily ham yaratadi, lekin bu yerda ham qilib qo'yish
        // "har bir userda Subscription bor" invariantini soddalashtiradi).
        await tx.subscription.create({ data: { userId: created.id } });
        return created;
      });

      const accessToken = await issueSession(res, user.id, user.role);
      res.status(201).json({ accessToken, user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof InviteCodeError) {
        res.status(400).json({ error: "Taklifnoma kodi yaroqsiz yoki allaqachon ishlatilgan" });
        return;
      }
      throw err;
    }
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email yoki parol noto'g'ri formatda" });
      return;
    }
    const { email, password } = parsed.data;

    // passwordHash null bo'lishi mumkin — Google orqali yaratilgan hisobda parol yo'q
    // (bunday hisob faqat /auth/google orqali kiradi). Xato xabari baribir bir xil,
    // hisob mavjudligi/turi oshkor qilinmaydi.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Email yoki parol noto'g'ri" });
      return;
    }

    const accessToken = await issueSession(res, user.id, user.role);
    res.json({ accessToken, user: toPublicUser(user) });
  }),
);

const googleLoginSchema = z.object({
  credential: z.string().min(1),
  inviteCode: z.string().trim().min(1).optional(),
});

/**
 * Google Identity Services'dan kelgan ID token (`credential`) orqali kirish/ro'yxatdan
 * o'tish. `googleId` bo'yicha mavjud hisob topilsa shu bilan kiradi; topilmasa email
 * bo'yicha mavjud (parol bilan ro'yxatdan o'tgan) hisobga bog'lanadi (Google
 * `email_verified` kafolat bergani uchun xavfsiz); ikkalasi ham topilmasa — yangi
 * hisob yaratiladi. Beta-reliz yoqilganda YANGI hisob yaratish ham taklifnoma kod
 * talab qiladi (aks holda bu yo'l /auth/register'dagi cheklovni chetlab o'tgan bo'lardi);
 * mavjud hisobga bog'lash uchun kod shart emas.
 */
authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const parsed = googleLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const client = getGoogleClient();
    if (!client) {
      res.status(501).json({ error: "Google orqali kirish hozircha sozlanmagan" });
      return;
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: parsed.data.credential, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      payload = undefined;
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      res.status(401).json({ error: "Google tokeni yaroqsiz yoki email tasdiqlanmagan" });
      return;
    }
    const googlePayload = payload;

    try {
      const user = await prisma.$transaction(async (tx) => {
        const byGoogleId = await tx.user.findUnique({ where: { googleId: googlePayload.sub } });
        if (byGoogleId) {
          return byGoogleId;
        }

        const byEmail = await tx.user.findUnique({ where: { email: googlePayload.email! } });
        if (byEmail) {
          return tx.user.update({ where: { id: byEmail.id }, data: { googleId: googlePayload.sub } });
        }

        if (env.betaInviteRequired) {
          if (!parsed.data.inviteCode) {
            throw new InviteCodeError();
          }
          await consumeInviteCode(tx, parsed.data.inviteCode);
        }

        const created = await tx.user.create({
          data: {
            email: googlePayload.email!,
            name: googlePayload.name ?? googlePayload.email!.split("@")[0],
            googleId: googlePayload.sub,
            avatarUrl: googlePayload.picture ?? null,
          },
        });
        if (env.betaInviteRequired && parsed.data.inviteCode) {
          await tx.inviteCode.update({ where: { code: parsed.data.inviteCode }, data: { usedById: created.id } });
        }
        await tx.subscription.create({ data: { userId: created.id } });
        return created;
      });

      const accessToken = await issueSession(res, user.id, user.role);
      res.json({ accessToken, user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof InviteCodeError) {
        res.status(400).json({ error: "Taklifnoma kodi yaroqsiz yoki allaqachon ishlatilgan" });
        return;
      }
      throw err;
    }
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "Refresh token topilmadi, qaytadan kiring" });
      return;
    }

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      res.status(401).json({ error: "Sessiya muddati tugagan, qaytadan kiring" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      res.status(401).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    // Rotatsiya: har yangilashda eski refresh token bekor qilinadi.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await issueSession(res, user.id, user.role);
    res.json({ accessToken, user: toPublicUser(user) });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.status(204).send();
  }),
);

const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email formati noto'g'ri" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // Email ro'yxatdan o'tganmi yo'qmi — bu bilan oshkor qilmaslik uchun javob har doim bir xil.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const resetLink = `${env.webOrigin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }

    res.json({ message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi" });
  }),
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
});

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      res.status(400).json({ error: "Havola yaroqsiz yoki muddati o'tgan" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ message: "Parol muvaffaqiyatli yangilandi, qaytadan kiring" });
  }),
);
