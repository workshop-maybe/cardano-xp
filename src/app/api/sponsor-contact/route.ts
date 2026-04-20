import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "~/env";
import { CONTACT } from "~/config/contact";

const sponsorContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  listingName: z.string().max(200).optional().default(""),
  url: z.string().max(200).optional().default(""),
  message: z.string().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  try {
    if (!env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 503 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const result = sponsorContactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 },
      );
    }

    const { name, email, listingName, url, message } = result.data;

    const bodyParts = [`Name: ${name}`, `Email: ${email}`];
    if (listingName) bodyParts.push(`Listing name: ${listingName}`);
    if (url) bodyParts.push(`URL: ${url}`);
    if (message) bodyParts.push(`\nMessage:\n${message}`);

    const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
      from: CONTACT.fromAddress,
      replyTo: email,
      to: CONTACT.internalEmail,
      subject: "Cardano XP Sponsor Interest",
      text: bodyParts.join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sponsor-contact] Failed to send email:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
