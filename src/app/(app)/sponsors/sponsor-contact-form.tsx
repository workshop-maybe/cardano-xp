"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AndamioButton } from "~/components/andamio/andamio-button";

export function SponsorContactForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const listingNameRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/sponsor-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameRef.current?.value ?? "",
          listingName: listingNameRef.current?.value ?? "",
          url: urlRef.current?.value ?? "",
          message: messageRef.current?.value ?? "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to send message");
      }

      toast.success("Message sent! We'll be in touch.");

      if (nameRef.current) nameRef.current.value = "";
      if (listingNameRef.current) listingNameRef.current.value = "";
      if (urlRef.current) urlRef.current.value = "";
      if (messageRef.current) messageRef.current.value = "";
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error("Unable to send message. Please check your connection and try again.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to send message");
      }
    } finally {
      setIsLoading(false);
    }
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

      <AndamioButton type="submit" isLoading={isLoading}>
        Send message
      </AndamioButton>
    </form>
  );
}
