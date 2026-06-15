import { createElement } from "react";
import { render } from "@react-email/render";
import { PasswordResetEmail } from "../templates/password-reset.js";
import { sendEmail } from "./send.js";

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
): Promise<void> {
  const element = createElement(PasswordResetEmail, { firstName, resetUrl });
  const html = await render(element);
  await sendEmail(to, "Promjena lozinke — eCommerce HR", html, {
    templateName: "password-reset",
  });
}
