import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-700">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and
            use of Knot and its related services (the &quot;Service&quot;). By
            creating an account or using the Service, you agree to be bound by
            these Terms.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              1. Eligibility and accounts
            </h2>
            <p>
              You must be legally able to enter into a binding contract and comply
              with all applicable laws to use the Service. You are responsible for
              maintaining the confidentiality of your account credentials and for
              all activity that occurs under your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              2. The Knot service
            </h2>
            <p>
              Knot helps connect travelers who may want to share rides and split
              costs. We do not provide transportation services and are not a
              transportation carrier. Any ride you take is a separate arrangement
              between you and other participants or third-party providers (such as
              Uber or Lyft).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              3. User responsibilities
            </h2>
            <p>When using the Service, you agree to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Provide accurate and up-to-date information</li>
              <li>
                Treat other users with respect and comply with any applicable
                codes of conduct
              </li>
              <li>
                Comply with all laws and regulations, including traffic and safety
                rules
              </li>
              <li>
                Not use the Service for any unlawful, harmful, or abusive purpose
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              4. Safety and interactions with other users
            </h2>
            <p>
              We provide features to help promote trust and safety, but we cannot
              guarantee the conduct of any user. You are solely responsible for
              your interactions with others and for evaluating whether, when, and
              how to meet or share rides.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              5. Disclaimers and limitation of liability
            </h2>
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis, without warranties of any kind, whether
              express or implied. To the fullest extent permitted by law, we
              disclaim all warranties and will not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out
              of or related to your use of the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              6. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service at any time,
              including if we reasonably believe you have violated these Terms or
              pose a risk to other users. You may stop using the Service at any
              time and may request that we delete your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              7. Changes to these Terms
            </h2>
            <p>
              We may update these Terms from time to time. If we make material
              changes, we will notify you by updating the &quot;Last updated&quot;
              date and, where appropriate, by providing additional notice in the
              app. Your continued use of the Service after changes take effect
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              8. Contact
            </h2>
            <p>
              If you have questions about these Terms, you can contact us at{" "}
              <a
                href="mailto:support@knotapp.com"
                className="font-medium text-blue-600 hover:underline"
              >
                support@knotapp.com
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-zinc-500">
            This document is a product-oriented summary and does not constitute
            legal advice. Please work with qualified legal counsel to finalize
            Terms appropriate for your jurisdiction and business.
          </p>

          <div className="mt-6 text-sm">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

