import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, CheckCircle, ExternalLink, ScrollText, CheckCircle2, AlertTriangle, Scale, Clock, Shield } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

const DEFAULT_TERMS = {
  version: 'v1.0',
  effectiveDate: 'September 2026',
  sections: [
    {
      id: 'carrier-liability',
      title: '1. Carrier Liability & Cargo Declaration',
      content: 'Consignors and shippers must accurately declare consignment contents, declared value, weight, and special handling instructions. EMINENCE provides transit tracking and intermediary brokerage; carriers and drivers maintain statutory road carriage liability. Hazardous, illicit, or undeclared perishable materials are strictly prohibited.'
    },
    {
      id: 'cancellation-demurrage',
      title: '2. Booking, Cancellation & Demurrage',
      content: 'Bookings cancelled within 30 minutes of scheduled pickup incur zero cancellation fees. Cancellations made after driver assignment or arrival at the pickup location may be subject to a nominal mobilization fee. Standard free loading and unloading window is 60 minutes per stop, after which standardized demurrage and waiting fees apply.'
    },
    {
      id: 'telematics-privacy',
      title: '3. Telematics, Geolocation & Data Privacy',
      content: 'Real-time GPS tracking and geofencing are activated during active trips to provide transit visibility, safety verification, and proof of delivery. Personal and corporate data is encrypted and handled in strict compliance with applicable data protection laws.'
    },
    {
      id: 'driver-conduct',
      title: '4. Driver & Fleet Code of Conduct',
      content: 'All drivers must hold valid commercial driving licenses, vehicle fitness certificates, and transit insurance. Zero tolerance is enforced for impaired driving, reckless operation, or unauthorized route deviations. Digital Proof of Delivery (e-POD) with consignee OTP or signature is mandatory upon drop-off.'
    },
    {
      id: 'billing-compliance',
      title: '5. Billing, Tax Invoices & Dispute Resolution',
      content: 'All tariffs, toll charges, waiting fees, and applicable GST are detailed in automated digital invoices. Business accounts under postpaid credit agree to settle invoices within agreed net payment terms. Disputed charges must be raised within 7 calendar days of trip completion via the support desk.'
    }
  ]
};

const TermsModal = ({ isOpen, onClose, onAccept, showAcceptButton = true }) => {
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [hasScrolledBottom, setHasScrolledBottom] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTerms = async () => {
      try {
        const res = await api.get('/api/auth/terms');
        const data = res.data;
        if (data.success && data.terms) {
          setTerms(data.terms);
        }
      } catch {
        // Fallback to DEFAULT_TERMS if network fails
      }
    };

    fetchTerms();
  }, [isOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setHasScrolledBottom(true);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-loft-900 border border-loft-700/70 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-loft-800 bg-loft-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-copper-500/15 border border-copper-500/30 flex items-center justify-center text-copper-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-loft-50">
                  Terms & Conditions
                </h3>
                <div className="flex items-center gap-2 text-xs text-loft-400">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-copper-500/10 text-copper-400 font-mono">
                    Version {terms.version || 'v1.0'}
                  </span>
                  <span>•</span>
                  <span>Effective {terms.effectiveDate || 'September 2026'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-loft-400 hover:text-loft-100 hover:bg-loft-800/60 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Terms Content */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-loft-200 leading-relaxed font-sans"
          >
            <div className="p-4 rounded-xl bg-loft-950/50 border border-loft-800/80 text-xs text-loft-300">
              <p>
                Please review these Terms & Conditions carefully. By registering, signing in, or continuing to use
                the EMINENCE Logistics Platform across Web or Mobile applications, you consent to all clauses detailed below.
              </p>
            </div>

            {(terms.sections || DEFAULT_TERMS.sections).map((sec, idx) => (
              <div key={sec.id || idx} className="space-y-2 border-b border-loft-800/40 pb-5 last:border-b-0">
                <h4 className="font-semibold text-loft-50 text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-copper-400" />
                  {sec.title}
                </h4>
                <p className="text-loft-300 text-sm leading-relaxed pl-6">
                  {sec.content}
                </p>
              </div>
            ))}

            <div className="pt-2 text-xs text-loft-400 flex items-center justify-between">
              <span>Need a permanent legal copy?</span>
              <Link
                to="/terms"
                target="_blank"
                className="text-copper-400 hover:text-copper-300 inline-flex items-center gap-1 font-medium"
              >
                Open Full Legal Document <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-loft-800 bg-loft-950/60 flex items-center justify-between gap-4">
            <div className="text-xs text-loft-400">
              {hasScrolledBottom ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Reviewed all clauses
                </span>
              ) : (
                <span>Scroll to read all terms</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl text-loft-300 hover:text-loft-100 hover:bg-loft-800 transition-colors"
              >
                Close
              </button>

              {showAcceptButton && onAccept && (
                <button
                  type="button"
                  onClick={() => {
                    onAccept();
                    onClose();
                  }}
                  className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept & Continue
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TermsModal;
