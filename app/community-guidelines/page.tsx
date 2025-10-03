"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import React from "react";
import {
  ArrowLeft,
  Users,
  Shield,
  MessageCircle,
  AlertTriangle,
  Flag,
  Ban,
  Star,
  Heart,
  Mail,
} from "lucide-react";

// Fade-in helper consistent with other legal pages
interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
}
const FadeIn: React.FC<FadeInProps> = ({
  delay = 0,
  className = "",
  children,
  ...rest
}) => (
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

const nav = [
  { id: "overview", label: "Overview" },
  { id: "be-kind", label: "Be Kind & Respectful" },
  { id: "safety", label: "Safety First" },
  { id: "prohibited", label: "Prohibited Content" },
  { id: "messaging", label: "Messaging Etiquette" },
  { id: "profiles", label: "Profile Standards" },
  { id: "report", label: "Report & Moderation" },
  { id: "consequences", label: "Consequences" },
  { id: "appeals", label: "Appeals" },
  { id: "contact", label: "Contact" },
];

export default function CommunityGuidelinesPage() {
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
          <span className="text-xs text-gray-500">
            Last Updated: {updatedAt}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Community{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                Guidelines
              </span>
            </h1>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
              Fiorell is a community for meaningful connections. To keep
              everyone safe and respected, please follow these guidelines when
              using the app.
            </p>
          </FadeIn>

          {/* Quick nav */}
          <FadeIn delay={0.05} className="mb-12">
            <div className="flex flex-wrap gap-3 justify-center">
              {nav.map((i) => (
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
            <FadeIn
              id="overview"
              delay={0.1}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Users} title="1. Overview" />
              <p className="text-gray-600 leading-relaxed">
                Our goal is to foster authentic, respectful interactions. These
                guidelines apply to all parts of the Service: profile content,
                photos, interests, messages, and community interactions.
              </p>
            </FadeIn>

            {/* Be Kind & Respectful */}
            <FadeIn
              id="be-kind"
              delay={0.15}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Heart} title="2. Be Kind & Respectful" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  Treat others with courtesy. Disagreements happen—keep it
                  civil.
                </li>
                <li>
                  No hate speech, harassment, bullying, or discriminatory
                  behavior.
                </li>
                <li>
                  Respect boundaries. If someone isn’t interested, move on
                  graciously.
                </li>
              </ul>
            </FadeIn>

            {/* Safety */}
            <FadeIn
              id="safety"
              delay={0.2}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Shield} title="3. Safety First" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  Do not share others’ private information without consent (no
                  doxxing).
                </li>
                <li>
                  Avoid sending or requesting sensitive data (financial
                  information, passwords).
                </li>
                <li>
                  Be cautious meeting in person—tell a friend, meet in public,
                  and trust your instincts.
                </li>
              </ul>
            </FadeIn>

            {/* Prohibited Content */}
            <FadeIn
              id="prohibited"
              delay={0.25}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Ban} title="4. Prohibited Content" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Illegal activity, threats, or incitement of violence.</li>
                <li>Explicit sexual content, exploitation, or solicitation.</li>
                <li>
                  Spam, scams, pyramid schemes, or commercial advertising
                  without permission.
                </li>
                <li>Malware, phishing, or attempts to circumvent security.</li>
              </ul>
            </FadeIn>

            {/* Messaging Etiquette */}
            <FadeIn
              id="messaging"
              delay={0.3}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={MessageCircle}
                title="5. Messaging Etiquette"
              />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  Avoid repeated messaging if someone doesn’t respond—no
                  spamming.
                </li>
                <li>Use respectful language; avoid slurs or abusive terms.</li>
                <li>Do not send unsolicited explicit images or content.</li>
              </ul>
            </FadeIn>

            {/* Profile Standards */}
            <FadeIn
              id="profiles"
              delay={0.35}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Star} title="6. Profile Standards" />
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  Use clear, authentic photos. No impersonation or stolen
                  images.
                </li>
                <li>
                  Keep bios accurate; misleading or deceptive information is not
                  allowed.
                </li>
                <li>
                  We may verify profiles; failure to pass verification can limit
                  features.
                </li>
              </ul>
            </FadeIn>

            {/* Report & Moderation */}
            <FadeIn
              id="report"
              delay={0.4}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Flag} title="7. Report & Moderation" />
              <p className="text-gray-600 leading-relaxed mb-3">
                Help keep the community safe by reporting problematic behavior
                or content.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  Use in-app report tools where available, or contact support
                  below.
                </li>
                <li>
                  Our team reviews reports and may take action per our Terms of
                  Service.
                </li>
                <li>
                  False reports or abuse of reporting tools may result in
                  restrictions.
                </li>
              </ul>
            </FadeIn>

            {/* Consequences */}
            <FadeIn
              id="consequences"
              delay={0.45}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader
                icon={AlertTriangle}
                title="8. Consequences for Violations"
              />
              <p className="text-gray-600 leading-relaxed">
                Violations may result in content removal, feature limits,
                temporary suspensions, or permanent account bans. The specific
                action depends on severity, prior history, and risk to the
                community.
              </p>
            </FadeIn>

            {/* Appeals */}
            <FadeIn
              id="appeals"
              delay={0.5}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Shield} title="9. Appeals" />
              <p className="text-gray-600 leading-relaxed">
                If you believe an enforcement action was a mistake, you can
                appeal by contacting support with relevant context and evidence.
                We will review and respond as appropriate.
              </p>
            </FadeIn>

            {/* Contact */}
            <FadeIn
              id="contact"
              delay={0.55}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <SectionHeader icon={Mail} title="10. Contact" />
              <p className="text-gray-600 leading-relaxed">
                Questions or concerns about these Guidelines? Email{" "}
                <a
                  href="mailto:support@fiorell.app"
                  className="text-pink-600 hover:underline"
                >
                  support@fiorell.app
                </a>
                .
              </p>
            </FadeIn>
          </div>

          {/* Footer CTA */}
          <FadeIn delay={0.6} className="mt-20 text-center">
            <div className="text-sm text-gray-500">
              Also see our{" "}
              <Link href="/terms" className="text-pink-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-pink-600 hover:underline">
                Privacy Policy
              </Link>
              .
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
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
        {title}
      </h2>
    </div>
  );
}
