"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Info } from "lucide-react";

export default function SafetyCenterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/settings/privacy"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">
              Safety Center
            </span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-600" /> Tips for Safe Dating
            </h2>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-700 space-y-1">
              <li>
                Meet in public places and tell a friend where you&apos;re going.
              </li>
              <li>
                Never share sensitive information like your home address, SSN,
                or banking details.
              </li>
              <li>Use in-app messaging until you&apos;re comfortable.</li>
              <li>
                Trust your instincts. If something feels off, block and report.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Fiorell Community Guidelines
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Respect others. Harassment, hate speech, and illegal activities
              are not tolerated.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Support Resources
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              If you feel unsafe, contact local authorities. For help, visit our
              Support page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
