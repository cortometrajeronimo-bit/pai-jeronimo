import nodemailer from "nodemailer";

function crearTransporte() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export type AttachmentEmail = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function enviarEmailConAdjunto(opts: {
  to: string;
  subject: string;
  html: string;
  attachments: AttachmentEmail[];
}): Promise<void> {
  const transporte = crearTransporte();
  await transporte.sendMail({
    from: `"P.A.I. · JERÓNIMO" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? "application/pdf",
    })),
  });
}
