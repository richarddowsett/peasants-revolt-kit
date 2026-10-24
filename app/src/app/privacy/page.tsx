'use client';

import React from 'react';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import { ShieldCheck, Cookie, ArrowLeft, Mail, ExternalLink, Info } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StoreHeader cartItemCount={0} onOpenCart={() => {}} />

      <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(82,94,62)] hover:text-[rgb(68,78,50)] transition"
          >
            <ArrowLeft size={16} /> Back to Store
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 text-[rgb(82,94,62)] mb-2">
            <ShieldCheck size={28} />
            <span className="text-xs font-black uppercase tracking-wider bg-[rgb(242,245,236)] text-[rgb(82,94,62)] px-3 py-1 rounded-full">
              UK Compliance Notice
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Privacy & Cookies Policy
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Peasants Revolt Running Club is committed to protecting your privacy and complying with UK data protection legislation, including the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018 (DPA 2018), and the Privacy and Electronic Communications Regulations (PECR).
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Last updated: October 2026
          </p>
        </div>

        {/* Quick Summary Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 text-emerald-950">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-emerald-900 mb-1">
                At a Glance: Does this site use cookies?
              </h2>
              <ul className="text-xs space-y-1.5 text-emerald-800 list-disc list-inside">
                <li>
                  <strong>No tracking or advertising cookies:</strong> We do not use third-party analytics (like Google Analytics), advertising beacons, or social media tracking pixels.
                </li>
                <li>
                  <strong>Strictly necessary storage only:</strong> We use local browser storage (IndexedDB) via Firebase Authentication solely to keep you securely signed in to your member account.
                </li>
                <li>
                  <strong>No consent banner required:</strong> Under UK PECR Regulation 6(4)(b), strictly necessary authentication tokens are exempt from consent pop-ups.
                </li>
                <li>
                  <strong>Secure payments:</strong> Payments are transacted directly with Monzo Bank. We never see or store your payment card numbers.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8 text-slate-800 leading-relaxed text-sm">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">1</span>
              About Us & Data Controller
            </h2>
            <p className="text-xs text-slate-600">
              The data controller for this website and member store is <strong>Peasants Revolt Running Club</strong> (&quot;PRRC&quot;, &quot;we&quot;, &quot;us&quot;). We operate this store exclusively for our club members and runners in the United Kingdom to order official club kits, apparel, and running equipment.
            </p>
          </section>

          {/* Section 2 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">2</span>
              Cookies and Local Device Storage (PECR Notice)
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Under Regulation 6 of the Privacy and Electronic Communications Regulations 2003 (PECR), rules governing cookies apply to any technology that stores or accesses information on your computer or mobile device. This includes HTTP cookies, LocalStorage, SessionStorage, and IndexedDB.
            </p>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-4">
              <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Cookie size={16} className="text-[rgb(82,94,62)]" />
                Technologies Used on This Store:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="pb-2 font-bold">Name / Key</th>
                      <th className="pb-2 font-bold">Type</th>
                      <th className="pb-2 font-bold">Category</th>
                      <th className="pb-2 font-bold">Purpose & Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 text-slate-700">
                    <tr>
                      <td className="py-2.5 font-mono text-[11px] text-slate-900">firebase:authUser:*</td>
                      <td className="py-2.5">IndexedDB</td>
                      <td className="py-2.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Strictly Necessary
                        </span>
                      </td>
                      <td className="py-2.5">
                        Maintains your authenticated session so you do not have to sign in on every page refresh while browsing or placing kit orders.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-[11px] text-slate-900">admin_authenticated</td>
                      <td className="py-2.5">SessionStorage</td>
                      <td className="py-2.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Strictly Necessary
                        </span>
                      </td>
                      <td className="py-2.5">
                        Maintains active session state for club kit coordinators in the private admin dashboard. Cleared when tab closes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              <strong>Strictly Necessary Exemption:</strong> Because these authentication tokens are solely used to deliver the specific service you requested (logging in and purchasing kit), they qualify under PECR Regulation 6(4)(b) as strictly necessary and do not require prior opt-in consent.
            </p>
          </section>

          {/* Section 3 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">3</span>
              Personal Data We Collect & Lawful Basis
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              Under UK GDPR Article 6, we process personal data under two lawful bases: <strong>Contract Performance</strong> (to fulfill your apparel orders) and <strong>Legitimate Interests</strong> (to manage club membership benefits).
            </p>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Account Registration:</strong> When you register as a club member, we collect your first name, last name, and email address.
              </li>
              <li>
                <strong>Orders & Fulfillment:</strong> When ordering kit, we store the items, sizes, quantities, order reference ID, delivery instructions, and timestamps.
              </li>
              <li>
                <strong>No Unnecessary Profiling:</strong> We do not engage in automated decision-making or behavioral profiling.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">4</span>
              Payment Processing via Monzo
            </h2>
            <p className="text-xs text-slate-600">
              Payments are facilitated directly through Monzo Bank using official Monzo payment requests. We do not process or store debit cards, credit cards, or banking credentials on our servers. Your payment interaction is governed by Monzo&apos;s Privacy Notice.
            </p>
          </section>

          {/* Section 5 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">5</span>
              Third-Party Processors & Data Security
            </h2>
            <p className="text-xs text-slate-600 mb-2">
              We work with trusted technical partners to deliver this service:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Google Cloud / Firebase:</strong> Secure database and authentication hosting located in EU/UK regions under standard contractual clauses.
              </li>
              <li>
                <strong>Kit Manufacturers:</strong> Order size and quantity details (without unnecessary personal data) are shared solely to manufacture club apparel.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">6</span>
              Your Statutory Rights Under UK GDPR
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              As a UK resident, you have statutory rights under the UK GDPR and the Data Protection Act 2018:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong>Right to Access:</strong> Request a copy of the personal information we hold about you.
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong>Right to Rectification:</strong> Request correction of inaccurate personal data.
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong>Right to Erasure:</strong> Request deletion of your account and personal details (&quot;right to be forgotten&quot;).
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong>Right to Restrict Processing:</strong> Request temporary or permanent limitation of processing.
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">7</span>
              Contact Us & Regulatory Authority
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              To exercise any of your data rights or if you have questions regarding this policy, please contact our kit coordinator team:
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">Peasants Revolt Running Club — Kit Committee</p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> kit@peasants.store
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              If you believe your data has been handled improperly, you have the right to lodge a complaint with the UK supervisory authority: The Information Commissioner&apos;s Office (ICO) at{' '}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(82,94,62)] font-semibold underline hover:text-[rgb(68,78,50)] inline-flex items-center gap-0.5"
              >
                ico.org.uk <ExternalLink size={11} />
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
