"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Scale,
  Shield,
  UserCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import React from "react";
import type { HTMLMotionProps } from "framer-motion";

// Lightweight helper for section animation; use Motion's own props to avoid DOM drag type conflicts
type FadeInProps = HTMLMotionProps<"div"> & { delay?: number };
const FadeIn: React.FC<FadeInProps> = ({
  delay = 0,
  className = "",
  children,
  ...rest
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

const updatedAt = "October 3, 2025";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-pink-100/40 backdrop-blur-sm bg-white/70">
        <div className="flex items-center space-x-4 max-w-4xl mx-auto">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Home</span>
          </Link>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">
            Last Updated: {updatedAt}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Terms of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                Service
              </span>
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of the Fiorell platform, apps, APIs, and related services
              (collectively, the &quot;Service&quot;). By creating an account or
              using Fiorell you agree to be bound by these Terms.
            </p>
          </FadeIn>

          {/* Quick Nav */}
          <FadeIn delay={0.05} className="mb-12">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "Eligibility",
                "Accounts",
                "User Content",
                "Safety",
                "Subscriptions",
                "Payments",
                "Termination",
                "Disclaimers",
                "Liability",
                "Disputes",
                "Contact",
              ].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="px-4 py-2 rounded-full bg-white shadow-sm text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 border border-gray-100 transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </FadeIn>

          <div className="space-y-14">
            {/* 1. Eligibility */}
            <FadeIn
              delay={0.1}
              id="eligibility"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={UserCheck} title="1. Eligibility" />
              <p className="text-gray-600 leading-relaxed">
                You must be at least 18 years old to create an account or use
                the Service. By using Fiorell, you represent and warrant that:
                (a) you are legally able to enter into these Terms; (b) you have
                not been convicted of a felony or any offense involving
                violence, harassment, or sexual misconduct; and (c) you are not
                required to register as a sex offender in any jurisdiction.
              </p>
            </FadeIn>

            {/* 2. Accounts */}
            <FadeIn
              delay={0.15}
              id="accounts"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={FileText}
                title="2. Account Registration & Security"
              />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide accurate, current, and complete information.</li>
                <li>
                  You are solely responsible for maintaining the confidentiality
                  of your login credentials.
                </li>
                <li>
                  You may not share your account or create multiple accounts for
                  abusive purposes.
                </li>
                <li>
                  We may suspend or terminate accounts that violate these Terms
                  or harm the community.
                </li>
              </ul>
            </FadeIn>

            {/* 3. User Content */}
            <FadeIn
              delay={0.2}
              id="user-content"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Scale} title="3. User Content & License" />
              <p className="text-gray-600 leading-relaxed mb-4">
                You are responsible for the content (text, images, media,
                profile data, interests, preferences, interactions) you submit
                or display (&quot;User Content&quot;). You grant Fiorell a
                worldwide, non-exclusive, royalty-free, transferable,
                sublicensable license to host, store, display, adapt, and
                distribute your User Content solely for operating and improving
                the Service.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You represent and warrant that you own or have the necessary
                rights to your User Content and that it does not infringe,
                misappropriate, or violate any third-party rights or applicable
                laws.
              </p>
            </FadeIn>

            {/* 4. Safety */}
            <FadeIn
              delay={0.25}
              id="safety"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Shield} title="4. Safety & Acceptable Use" />
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to engage in harmful, harassing, misleading,
                discriminatory, exploitative, or illegal behavior. Prohibited
                activities include (without limitation):
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Impersonation or misrepresentation.</li>
                <li>Soliciting money, scams, fraud, or pyramid schemes.</li>
                <li>Uploading viruses, malware, or malicious code.</li>
                <li>
                  Data scraping, automated account creation, or reverse
                  engineering.
                </li>
                <li>
                  Sharing private or personal data of others without consent
                  (doxxing).
                </li>
                <li>
                  Stalking, threatening, or abusive conduct (online or offline).
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                We reserve the right to investigate and act (including removal,
                suspension, or referral to law enforcement) at our sole
                discretion.
              </p>
            </FadeIn>

            {/* 5. Subscriptions */}
            <FadeIn
              delay={0.3}
              id="subscriptions"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={FileText}
                title="5. Subscriptions & Premium Features"
              />
              <p className="text-gray-600 leading-relaxed mb-4">
                Certain features (e.g., unlimited likes, enhanced visibility,
                advanced filters) may require a paid subscription. Subscription
                details, pricing, renewal frequency, and included benefits will
                be presented at purchase time.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Unless otherwise stated, subscriptions renew automatically until
                canceled. You can manage or cancel via your account settings or
                the platform (App Store/Play Store) where you purchased.
                Cancelation takes effect at the end of the current billing
                cycle; no retroactive refunds are provided except where required
                by law.
              </p>
            </FadeIn>

            {/* 6. Payments */}
            <FadeIn
              delay={0.35}
              id="payments"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={FileText}
                title="6. Payments, Refunds & Trials"
              />
              <p className="text-gray-600 leading-relaxed mb-4">
                You authorize us (and our third-party payment processors) to
                charge your selected payment method for all applicable fees. If
                your payment method fails and you do not update it, we may
                suspend access to paid features.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Promotional trials may convert to paid subscriptions unless
                canceled before the trial ends. Refund requests are evaluated
                under applicable consumer laws and our internal policies.
              </p>
            </FadeIn>

            {/* 7. Termination */}
            <FadeIn
              delay={0.4}
              id="termination"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={AlertTriangle}
                title="7. Suspension & Termination"
              />
              <p className="text-gray-600 leading-relaxed mb-4">
                We may suspend or terminate access if you violate these Terms,
                create risk or legal exposure, or engage in abusive behavior.
                You may delete your account at any time within the app. Certain
                data (e.g., aggregated stats, anonymized analytics) may persist
                after deletion, but personal data will be handled per our
                Privacy Policy.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Sections that by their nature should survive termination (e.g.,
                licenses, disclaimers, dispute provisions) will remain in
                effect.
              </p>
            </FadeIn>

            {/* 8. Disclaimers */}
            <FadeIn
              delay={0.45}
              id="disclaimers"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={FileText} title="8. Disclaimers" />
              <p className="text-gray-600 leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING IMPLIED WARRANTIES OF FITNESS,
                MERCHANTABILITY, AVAILABILITY, NON-INFRINGEMENT, OR TITLE. WE DO
                NOT GUARANTEE ANY PARTICULAR OUTCOME, NUMBER OF MATCHES, OR
                SUCCESS IN FORMING RELATIONSHIPS.
              </p>
            </FadeIn>

            {/* 9. Limitation of Liability */}
            <FadeIn
              delay={0.5}
              id="liability"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Scale} title="9. Limitation of Liability" />
              <p className="text-gray-600 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, Fiorell AND ITS
                AFFILIATES SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY
                LOSS OF DATA, PROFITS, REPUTATION, OR OTHER INTANGIBLES. OUR
                TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR
                RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF: (A) THE
                AMOUNT YOU PAID US IN THE 12 MONTHS PRIOR TO THE CLAIM OR (B)
                USD $50.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Some jurisdictions do not allow certain limitations; in such
                cases, those limitations may not apply to you to the extent
                prohibited.
              </p>
            </FadeIn>

            {/* 10. Dispute Resolution */}
            <FadeIn
              delay={0.55}
              id="disputes"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={Scale}
                title="10. Dispute Resolution & Governing Law"
              />
              <p className="text-gray-600 leading-relaxed mb-4">
                These Terms are governed by the laws of the jurisdiction where
                Fiorell is operated (excluding its conflict of laws rules). You
                agree to attempt informal resolution first. If unresolved,
                disputes shall be handled in the competent courts of that
                jurisdiction unless mandatory arbitration/consumer protections
                apply in your region.
              </p>
              <p className="text-gray-600 leading-relaxed">
                CLASS ACTION WAIVER: You agree that any claims will be brought
                solely on an individual basis and not as part of a class,
                consolidated, or representative action.
              </p>
            </FadeIn>

            {/* 11. Contact */}
            <FadeIn
              delay={0.6}
              id="contact"
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={FileText} title="11. Contact & Notices" />
              <p className="text-gray-600 leading-relaxed mb-4">
                Have questions about these Terms? Contact us at{" "}
                <a
                  href="mailto:support@fiorell.app"
                  className="text-pink-600 hover:underline"
                >
                  support@fiorell.app
                </a>
                .
              </p>
              <p className="text-gray-600 leading-relaxed">
                We may update these Terms periodically. Material changes will be
                communicated via in-app notice or email. Continued use after
                changes take effect constitutes acceptance.
              </p>
            </FadeIn>
          </div>

          {/* Back / CTA */}
          <FadeIn delay={0.65} className="mt-20 text-center">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all"
            >
              Create Your Account
            </Link>
            <div className="mt-4">
              <Link
                href="/privacy-policy"
                className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </FadeIn>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 px-6 mt-16 bg-white/70 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-sm">
          <p>&copy; 2025 Fiorell. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center space-x-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-pink-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
        {title}
      </h2>
    </div>
  );
}
