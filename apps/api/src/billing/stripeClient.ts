import Stripe from "stripe";
import { env } from "../env.js";

let client: Stripe | null = null;

/** STRIPE_SECRET_KEY topilmasa `null` qaytaradi — chaqiruvchi tomon stub oqimga o'tishi kerak. */
export function getStripeClient(): Stripe | null {
  if (!env.stripeSecretKey) {
    return null;
  }
  if (!client) {
    client = new Stripe(env.stripeSecretKey, { apiVersion: "2024-06-20" });
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.stripeSecretKey);
}
