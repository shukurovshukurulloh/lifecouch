/**
 * Haqiqiy email xizmati (masalan Resend/SendGrid) hali ulanmagan.
 * Hozircha havolani konsolga chiqaramiz — dev muhitida shu yetarli.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  console.log(`[mailer] Parolni tiklash havolasi (${to}): ${resetLink}`);
}

export async function sendHabitReminderEmail(to: string, name: string, habitTitles: string[]): Promise<void> {
  console.log(`[mailer] Eslatma (${to}): Salom ${name}, bugun hali bajarilmagan odatlar: ${habitTitles.join(", ")}`);
}
