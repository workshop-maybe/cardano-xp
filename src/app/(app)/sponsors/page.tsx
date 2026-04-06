import Link from "next/link";
import { CopyId } from "~/components/andamio/copy-id";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES } from "~/config/routes";
import sponsors from "~/data/sponsors.json";
import { SponsorContactForm } from "./sponsor-contact-form";

interface Sponsor {
  name: string;
  url: string | null;
  message: string | null;
}

export default function SponsorsPage() {
  const sponsorList = sponsors as Sponsor[];

  return (
    <div className="space-y-16 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          support
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Help Cardano XP{" "}
          <span className="text-secondary">grow.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Back a public good. Every contribution funds XP rewards for
          contributors and keeps the infrastructure running.
        </p>
      </div>

      {/* Why sponsor */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            why sponsor
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            What your support funds
          </h2>
        </div>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Cardano XP pays contributors in ADA and XP tokens for giving
            real feedback on real projects. Sponsors fund the treasury that
            makes this possible — every task reward, every credential mint,
            every server hour.
          </p>
          <p>
            This is infrastructure for contribution. Not speculation, not
            governance theater — just people doing work and getting
            recognized for it, permanently recorded on Cardano.
          </p>
          <p>
            Your support directly increases the number of tasks available
            and the number of people who can participate.
          </p>
        </div>
      </section>

      {/* Donation CTA */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            donate
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Send ADA directly
          </h2>
        </div>
        <div className="border-2 border-secondary/40 bg-secondary/5 rounded-lg p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copy the project wallet address below and send ADA from your
            own wallet. Every transaction is publicly verifiable.
          </p>
          <CopyId
            id={CARDANO_XP.projectWallet.address}
            label="Project wallet address"
            className="text-xs"
          />
          <p className="text-sm text-muted-foreground">
            <Link
              href={PUBLIC_ROUTES.transparency}
              className="text-secondary hover:underline"
            >
              See where funds go &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Contact form */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            get in touch
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Become a listed sponsor
          </h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Want to appear on this page? Let us know your name, how
          you&apos;d like to be listed, and any message for the community.
        </p>
        <SponsorContactForm />
      </section>

      {/* Sponsor list */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            sponsors
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            People who back this project
          </h2>
        </div>
        {sponsorList.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              Be the first sponsor. Your name goes here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sponsorList.map((sponsor, index) => (
              <div
                key={`${index}-${sponsor.name}`}
                className="border border-border rounded-lg p-5 space-y-2"
              >
                <p className="font-medium text-foreground">
                  {sponsor.url &&
                  (sponsor.url.startsWith("https://") ||
                    sponsor.url.startsWith("http://")) ? (
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline"
                    >
                      {sponsor.name}
                    </a>
                  ) : (
                    sponsor.name
                  )}
                </p>
                {sponsor.message && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {sponsor.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer link */}
      <section className="pb-12">
        <div className="border-l-4 border-secondary bg-card border border-border shadow-lg p-4 sm:p-8">
          <p className="text-foreground leading-relaxed">
            Every ADA is tracked. Every token is verified.{" "}
            <Link
              href={PUBLIC_ROUTES.transparency}
              className="text-secondary hover:underline"
            >
              See how funds are used &rarr;
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
