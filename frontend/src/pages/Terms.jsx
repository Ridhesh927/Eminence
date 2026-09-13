import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Printer, ArrowLeft, CheckCircle2, Clock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_TERMS = {
  version: 'v1.0',
  effectiveDate: 'September 1, 2026',
  title: 'EMINENCE Logistics Platform - Terms & Conditions',
  summary: 'These Terms and Conditions constitute a legally binding agreement between you (User, Consignor, Shipper, or Driver) and EMINENCE Logistics Technologies Inc. By accessing our platform via web, mobile application, or API, you acknowledge and agree to comply with all terms herein.',
  sections: [
    {
      id: 'carrier-liability',
      title: '1. Carrier Liability & Cargo Declaration',
      content: 'Consignors and shippers must accurately declare consignment contents, declared value, weight, and special handling instructions. EMINENCE provides transit tracking and intermediary brokerage; carriers and drivers maintain statutory road carriage liability. Hazardous, illicit, flammable, explosive, or undeclared perishable materials are strictly prohibited. EMINENCE disclaims liability for undeclared or improperly packaged cargo.'
    },
    {
      id: 'cancellation-demurrage',
      title: '2. Booking, Cancellation & Demurrage',
      content: 'Bookings cancelled within 30 minutes of scheduled pickup incur zero cancellation fees. Cancellations made after driver assignment or arrival at the pickup location may be subject to a nominal mobilization fee. Standard free loading and unloading window is 60 minutes per stop, after which standardized demurrage and waiting fees of ₹300/hour apply.'
    },
    {
      id: 'telematics-privacy',
      title: '3. Telematics, Geolocation & Data Privacy',
      content: 'Real-time GPS tracking and geofencing are activated during active trips to provide transit visibility, safety verification, and proof of delivery. Personal and corporate data is encrypted and handled in strict compliance with applicable data protection legislation (including the Digital Personal Data Protection Act). Geolocation data is retained only for trip fulfillment, dispute resolution, and auditing purposes.'
    },
    {
      id: 'driver-conduct',
      title: '4. Driver & Fleet Partner Code of Conduct',
      content: 'All drivers must hold valid commercial driving licenses, vehicle fitness certificates, and transit insurance. Zero tolerance is enforced for impaired driving, reckless operation, harassment, or unauthorized route deviations. Digital Proof of Delivery (e-POD) with consignee OTP or cryptographic signature is mandatory upon drop-off.'
    },
    {
      id: 'billing-compliance',
      title: '5. Billing, Tax Invoices & Dispute Resolution',
      content: 'All tariffs, toll charges, waiting fees, and applicable GST are detailed in automated digital invoices. Business accounts operating under approved postpaid credit lines agree to settle invoices within agreed net payment terms (e.g., Net 15/30). Disputed charges must be raised within 7 calendar days of trip completion via the support desk.'
    },
    {
      id: 'consent-audit',
      title: '6. Consent Audit Trail & Amendments',
      content: 'EMINENCE stores cryptographic timestamps, IP addresses, user agents, and version stamps whenever users accept or re-accept Terms & Conditions. In the event of material amendments to these terms, registered users will be notified via email or in-app modal prompt prior to continued service utilization.'
    }
  ]
};

const Terms = () => {
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [activeSection, setActiveSection] = useState('carrier-liability');

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/auth/terms`);
        const data = await res.json();
        if (data.success && data.terms) {
          setTerms((prev) => ({
            ...prev,
            version: data.terms.version || prev.version,
            effectiveDate: data.terms.effectiveDate || prev.effectiveDate,
            sections: data.terms.sections?.length ? data.terms.sections : prev.sections
          }));
        }
      } catch {
        // Use default terms
      }
    };

    fetchTerms();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-loft-950 text-loft-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-copper-500 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-loft-400 hover:text-copper-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-loft-900 border border-loft-700 text-xs font-medium text-loft-200 hover:text-white hover:border-copper-500 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Terms
          </button>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 md:p-10 border border-loft-800 bg-gradient-to-b from-loft-900/90 to-loft-950/90 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64 text-copper-500" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-copper-500/15 text-copper-400 border border-copper-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Version {terms.version}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-loft-400">
                <Clock className="w-3.5 h-3.5" />
                Effective: {terms.effectiveDate}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-loft-400">
                <Globe className="w-3.5 h-3.5" />
                Global & Regional Logistics
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Terms & Conditions of Service
            </h1>

            <p className="text-loft-300 text-base leading-relaxed">
              {terms.summary}
            </p>
          </div>
        </motion.div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents Sidebar */}
          <div className="lg:col-span-1 space-y-2 sticky top-24 self-start hidden lg:block">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-loft-400 px-3 pb-2">
              Clauses & Sections
            </h3>
            <nav className="space-y-1">
              {terms.sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`block text-xs py-2 px-3 rounded-lg transition-colors leading-snug ${
                    activeSection === sec.id
                      ? 'bg-copper-500/20 text-copper-400 font-medium border-l-2 border-copper-500'
                      : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/60'
                  }`}
                >
                  {sec.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Clauses List */}
          <div className="lg:col-span-3 space-y-6">
            {terms.sections.map((sec) => (
              <motion.section
                key={sec.id}
                id={sec.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card p-6 md:p-8 border border-loft-800/80 bg-loft-900/40 hover:border-loft-700 transition-all space-y-3"
              >
                <h2 className="text-xl font-serif font-bold text-white flex items-center gap-3">
                  <FileText className="w-5 h-5 text-copper-400 flex-shrink-0" />
                  {sec.title}
                </h2>
                <p className="text-loft-200 text-sm leading-relaxed whitespace-pre-line pl-8">
                  {sec.content}
                </p>
              </motion.section>
            ))}

            {/* Questions & Contact Box */}
            <div className="p-6 rounded-2xl border border-copper-500/30 bg-copper-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-copper-400" />
                  Legal & Compliance Inquiries
                </h4>
                <p className="text-xs text-loft-300 mt-1">
                  Have questions about contracts, carrier liabilities, or data handling?
                </p>
              </div>
              <a
                href="mailto:legal@eminence-logistics.com"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-copper-500 hover:bg-copper-600 text-white transition-colors"
              >
                Contact Legal Desk
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
