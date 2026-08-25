import { OAuth2Client } from "google-auth-library";
import { env } from "../env.js";

let client: OAuth2Client | null = null;

/** GOOGLE_CLIENT_ID topilmasa `null` qaytaradi — chaqiruvchi tomon 501 bilan javob berishi kerak. */
export function getGoogleClient(): OAuth2Client | null {
  if (!env.googleClientId) {
    return null;
  }
  if (!client) {
    client = new OAuth2Client(env.googleClientId);
  }
  return client;
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.googleClientId);
}
