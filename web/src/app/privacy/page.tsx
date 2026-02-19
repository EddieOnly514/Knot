import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-700">
          <p>
            This Privacy Policy explains how Knot (&quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) collects, uses, and shares information about you when you use
            our website and services (collectively, the &quot;Service&quot;).
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              1. Information we collect
            </h2>
            <p>
              We collect information that you provide directly to us, such as when
              you create an account, update your profile, post a ride, or
              communicate with other users. This may include:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Contact details like your name, email, and phone number</li>
              <li>Profile information such as school, photo, and bio</li>
              <li>Ride details including pickup and dropoff locations and time windows</li>
              <li>Messages and other content you send through the Service</li>
            </ul>
            <p>
              We also automatically collect certain technical information, such as
              device identifiers, IP address, and usage data about how you interact
              with the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              2. How we use your information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Match you with relevant riders and ride posts</li>
              <li>Facilitate messaging and other interactions between users</li>
              <li>Monitor safety, prevent abuse, and enforce our Terms of Service</li>
              <li>Communicate with you about updates, security, and support</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              3. How we share information
            </h2>
            <p>
              We share information with other users as needed to provide the
              Service, for example when you post a ride or match with another
              rider. We may also share information with trusted service providers
              who help us operate the Service (such as hosting, analytics, and
              communication tools), subject to appropriate safeguards.
            </p>
            <p>
              We may disclose information if we believe it is required by law, to
              protect our rights or the safety of users, or in connection with a
              merger, acquisition, or other corporate transaction.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              4. Data retention and security
            </h2>
            <p>
              We retain your information for as long as your account is active or
              as needed to provide the Service, comply with legal obligations, and
              resolve disputes. We use reasonable safeguards to protect your
              information, but no system can be completely secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              5. Your choices
            </h2>
            <p>
              You can access and update certain account and profile information at
              any time from within the app. You may also request that we delete
              your account, subject to any legal or operational requirements to
              retain certain data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              6. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will notify you by updating the &quot;Last
              updated&quot; date and, where appropriate, by providing additional
              notice in the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">
              7. Contact us
            </h2>
            <p>
              If you have questions about this Privacy Policy or how we handle your
              data, you can contact us at{" "}
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
            This summary is for product and UX purposes only and does not
            constitute legal advice. Please consult with legal counsel to ensure
            this policy meets your specific requirements.
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

