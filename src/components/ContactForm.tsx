import { useState, type FormEvent } from "react";
import { content } from "../content";

/**
 * A short contact form with no backend: sending opens the visitor's mail app
 * with the message filled in. Swap `onSubmit` for a form service (Formspree,
 * a serverless function) if you want messages delivered directly.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `Hello from ${data.get("name") || "your portfolio"}`;
    const body = `${data.get("message")}\n\n${data.get("name")} (${data.get("email")})`;
    window.location.href = `mailto:${content.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        <span>Name / お名前</span>
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="contact-form__wide">
        <span>Message</span>
        <textarea name="message" rows={4} required />
      </label>
      <button type="submit" className="btn btn--solid">{sent ? "Opening your mail app…" : "Send message ↗"}</button>
    </form>
  );
}
