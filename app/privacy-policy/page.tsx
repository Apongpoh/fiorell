"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import React from "react";
import {
  ArrowLeft,
  Shield,
  Lock,
  Globe2,
  Cookie,
  Database,
  UserCheck,
  Server,
  Activity,
  Bell,
  RefreshCw,
  Mail,
} from "lucide-react";

// FadeIn helper (mirrors terms page style)
interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
}
const FadeIn: React.FC<FadeInProps> = ({ delay = 0, className = "", children, ...rest }) => (
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

const updatedAt = "October 3, 2025";

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "data-we-collect", label: "Data We Collect" },
  { id: "use-of-data", label: "How We Use Data" },
  { id: "legal-bases", label: "Legal Bases" },
  { id: "cookies", label: "Cookies" },
  { id: "sharing", label: "Sharing" },
  { id: "international", label: "International" },
  { id: "retention", label: "Retention" },
  { id: "rights", label: "Your Rights" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-pink-100/40 backdrop-blur-sm bg-white/70">
        <div className="flex items-center space-x-4 max-w-5xl mx-auto">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Home</span>
          </Link>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">Last Updated: {updatedAt}</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Policy</span>
            </h1>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
              Your privacy matters. This Privacy Policy explains what data we collect, how we use it, and the rights you have regarding your personal information when using Fiorell.
            </p>
          </FadeIn>

          {/* Quick Navigation */}
          <FadeIn delay={0.05} className="mb-12">
            <div className="flex flex-wrap gap-3 justify-center">
              {navItems.map((i) => (
                <a
                  key={i.id}
                  href={`#${i.id}`}
                  className="px-4 py-2 rounded-full bg-white shadow-sm text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 border border-gray-100 transition-colors"
                >
                  {i.label}
                </a>
              ))}
            </div>
          </FadeIn>

          <div className="space-y-14">
            {/* Overview */}
            <FadeIn id="overview" delay={0.1} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Shield} title="1. Overview" />
              <p className="text-gray-600 leading-relaxed">
                This Privacy Policy applies to the Fiorell platform (the "Service"). By creating an account or using the Service you acknowledge the practices described here. If you disagree with this Policy, please discontinue use.
              </p>
            </FadeIn>

            {/* Data We Collect */}
            <FadeIn id="data-we-collect" delay={0.15} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Database} title="2. Data We Collect" />
              <p className="text-gray-600 leading-relaxed mb-4 font-medium">A. Information You Provide</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
                <li>Account details (name, email, age, gender, location, biography, interests).</li>
                <li>Photos, media uploads, and profile preferences.</li>
                <li>Messages and interactions with other users.</li>
                <li>Subscription & transactional data (via payment processors).</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4 font-medium">B. Automatically Collected</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
                <li>Device & usage data (app version, browser, OS, timestamps).</li>
                <li>Log data (IP address, user actions, error diagnostics).</li>
                <li>Approximate location (from IP or user-provided city).</li>
                <li>Cookies and similar technologies (see Cookies section).</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4 font-medium">C. From Third Parties</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Verification or anti-fraud providers.</li>
                <li>App Store / Play Store purchase confirmations.</li>
                <li>Analytics & security vendors.</li>
              </ul>
            </FadeIn>

            {/* Use of Data */}
            <FadeIn id="use-of-data" delay={0.2} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Activity} title="3. How We Use Data" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide, personalize, and improve the Service & match relevance.</li>
                <li>Enable messaging, interactions, and social discovery.</li>
                <li>Process subscriptions, purchases, and manage billing.</li>
                <li>Detect, prevent, and respond to fraud, abuse, or safety risks.</li>
                <li>Send important notices (security alerts, account updates).</li>
                <li>Conduct analytics and product research.</li>
                <li>Comply with legal obligations & enforce Terms.</li>
              </ul>
            </FadeIn>

            {/* Legal Bases */}
            <FadeIn id="legal-bases" delay={0.25} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={UserCheck} title="4. Legal Bases (EEA/UK/Similar Jurisdictions)" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Consent (e.g., certain optional profile data, marketing).</li>
                <li>Contract (providing the Service you request).</li>
                <li>Legitimate interests (improving safety, preventing abuse, product development) balanced with your rights.</li>
                <li>Legal obligations (tax, accounting, compliance).</li>
                <li>Protection of vital interests or public interest when required.</li>
              </ul>
            </FadeIn>

            {/* Cookies */}
            <FadeIn id="cookies" delay={0.3} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Cookie} title="5. Cookies & Tracking" />
              <p className="text-gray-600 leading-relaxed mb-4">
                We use essential cookies for authentication and core functionality. We may also use performance and preference cookies to remember settings and improve stability. Where required, we seek consent for non-essential cookies.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You can adjust browser settings to refuse or delete cookies; some features may not function properly without them.
              </p>
            </FadeIn>

            {/* Sharing */}
            <FadeIn id="sharing" delay={0.35} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Server} title="6. Sharing & Disclosure" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>With other users (public/profile info and matches you engage with).</li>
                <li>Service providers (hosting, analytics, content moderation, payment processing) under contractual safeguards.</li>
                <li>For legal compliance (lawful requests, enforcement of rights, preventing harm).</li>
                <li>During business transfers (merger, acquisition, restructuring) with appropriate safeguards.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                We do not sell personal data. We may share aggregated or de-identified data that cannot reasonably identify you.
              </p>
            </FadeIn>

            {/* International */}
            <FadeIn id="international" delay={0.4} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Globe2} title="7. International Transfers" />
              <p className="text-gray-600 leading-relaxed">
                Your data may be processed in countries outside your jurisdiction, including where our infrastructure or vendors operate. We implement safeguards (e.g., Standard Contractual Clauses) where applicable to protect transferred data.
              </p>
            </FadeIn>

            {/* Retention */}
            <FadeIn id="retention" delay={0.45} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={RefreshCw} title="8. Data Retention" />
              <p className="text-gray-600 leading-relaxed mb-4">
                We retain personal data only as long as necessary for the purposes outlined in this Policy (e.g., account life cycle, legal obligations, dispute resolution). Inactive accounts may be archived or anonymized after a defined dormancy period.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You may request deletion; certain data (transactional, security logs) may be retained as required by law or legitimate interests.
              </p>
            </FadeIn>

            {/* Rights */}
            <FadeIn id="rights" delay={0.5} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Lock} title="9. Your Rights" />
              <p className="text-gray-600 leading-relaxed mb-4">
                Depending on your location, you may have rights to access, correct, delete, restrict, or object to processing; to portability; and to withdraw consent. You also have the right to lodge a complaint with a supervisory authority.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Access & export your profile data.</li>
                <li>Update inaccurate details via profile settings.</li>
                <li>Delete photos, interests, or your entire account.</li>
                <li>Control notifications and certain tracking mechanisms.</li>
                <li>Withdraw consent where processing is based on consent.</li>
              </ul>
            </FadeIn>

            {/* Security */}
            <FadeIn id="security" delay={0.55} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Shield} title="10. Security Measures" />
              <p className="text-gray-600 leading-relaxed">
                We use safeguards such as encryption in transit, access controls, monitoring, and layered infrastructure security. No system is perfectly secure; users should exercise caution in sharing sensitive information.
              </p>
            </FadeIn>

            {/* Children */}
            <FadeIn id="children" delay={0.6} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Bell} title="11. Children & Age Limits" />
              <p className="text-gray-600 leading-relaxed">
                The Service is not directed to individuals under 18. We do not knowingly collect data from minors. If we learn a minor has provided personal data, we will take steps to delete it. Report concerns to support promptly.
              </p>
            </FadeIn>

            {/* Changes */}
            <FadeIn id="changes" delay={0.65} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Mail} title="12. Changes to this Policy" />
              <p className="text-gray-600 leading-relaxed">
                We may update this Policy periodically. Material changes will be notified via in-app notice or email. Continued use after changes take effect constitutes acceptance of the revised Policy.
              </p>
            </FadeIn>

            {/* Contact */}
            <FadeIn id="contact" delay={0.7} className="bg-white rounded-2xl p-8 shadow-sm">
              <SectionHeader icon={Mail} title="13. Contact" />
              <p className="text-gray-600 leading-relaxed mb-4">
                Questions or requests? Email us at <a href="mailto:privacy@fiorell.app" className="text-pink-600 hover:underline">privacy@fiorell.app</a>.
              </p>
              <p className="text-gray-600 leading-relaxed">
                For data subject rights, include: (a) account email, (b) request type, and (c) country/region of residence.
              </p>
            </FadeIn>
          </div>

          {/* CTA */}
          <FadeIn delay={0.75} className="mt-20 text-center">
            <Link href="/signup" className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all">
              Create Your Account
            </Link>
            <div className="mt-4 text-sm text-gray-500">
              Also see our {" "}
              <Link href="/terms" className="text-pink-600 hover:underline">Terms of Service</Link>.
            </div>
          </FadeIn>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 px-6 mt-16 bg-white/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto text-center text-gray-600 text-sm">
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
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h2>
    </div>
  );
}
