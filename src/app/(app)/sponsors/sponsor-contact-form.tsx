"use client";

import { useRef } from "react";
import { AndamioButton } from "~/components/andamio/andamio-button";

export function SponsorContactForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const listingNameRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = nameRef.current?.value ?? "";
    const listingName = listingNameRef.current?.value ?? "";
    const url = urlRef.current?.value ?? "";
    const message = messageRef.current?.value ?? "";

    const subject = encodeURIComponent("Cardano XP Sponsor Interest");
    const bodyParts = [`Name: ${name}`];
    if (listingName) bodyParts.push(`Listing name: ${listingName}`);
    if (url) bodyParts.push(`URL: ${url}`);
    if (message) bodyParts.push(`\nMessage:\n${message}`);
    const body = encodeURIComponent(bodyParts.join("\n"));

    window.location.href = `mailto:james@andamio.io?subject=${subject}&body=${body}`;
  }

  const inputClassName =
    "w-full bg-card border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="sponsor-name" className="text-sm font-medium text-foreground">
          Your name <span className="text-muted-foreground">*</span>
        </label>
        <input
          ref={nameRef}
          id="sponsor-name"
          type="text"
          required
          placeholder="Your name"
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="sponsor-listing-name" className="text-sm font-medium text-foreground">
          Preferred listing name
        </label>
        <input
          ref={listingNameRef}
          id="sponsor-listing-name"
          type="text"
          placeholder="How you'd like to appear on this page"
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="sponsor-url" className="text-sm font-medium text-foreground">
          URL <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          ref={urlRef}
          id="sponsor-url"
          type="url"
          placeholder="https://your-project.com"
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="sponsor-message" className="text-sm font-medium text-foreground">
          Message <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          ref={messageRef}
          id="sponsor-message"
          rows={3}
          placeholder="Anything you'd like us to know"
          className={inputClassName}
        />
      </div>

      <AndamioButton type="submit">Send via email</AndamioButton>
    </form>
  );
}
