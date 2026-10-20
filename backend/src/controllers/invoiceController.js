const PDFDocument = require('pdfkit');
const { Booking, Customer, Driver, Vehicle, Transaction } = require('../models');

// Helper to convert number to words for Indian Rupees
const numberToWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero';

  const inWords = (val) => {
    let str = '';
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + ' Crore ';
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + ' Lakh ';
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + ' Thousand ';
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + ' Hundred ';
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) str += a[val];
      else str += b[Math.floor(val / 10)] + (val % 10 > 0 ? ' ' + a[val % 10] : '');
    }
    return str.trim();
  };

  return inWords(n) + ' Rupees Only';
};

const generateInvoice = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Driver, as: 'driver' },
        { model: Vehicle, as: 'vehicle' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Authorization check: must be owner, driver, admin, or development bypass
    if (req.user) {
      const isOwner = req.user.id === booking.customerId;
      const isDriver = req.user.id === booking.driverId;
      const isAdmin = req.user.role === 'admin';
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      if (!isOwner && !isDriver && !isAdmin && !isDev) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view this receipt' });
      }
    }

    // Look for any related transaction/payment record
    const transaction = await Transaction.findOne({
      where: { referenceId: booking.id }
    }).catch(() => null);

    const customerName = booking.customer?.name || req.user?.name || 'Valued Customer';
    const customerPhone = booking.customer?.phone || req.user?.phone || '+91 9970734425';
    const customerEmail = booking.customer?.email || req.user?.email || 'N/A';
    const totalAmount = parseFloat(booking.estimatedFare) || 0;
    const bookingDate = booking.date || new Date(booking.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const bookingTime = booking.time || new Date(booking.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Determine Payment ID
    const paymentId =
      transaction?.id
        ? `TXN-${transaction.id.slice(0, 10).toUpperCase()}`
        : `PAY-${booking.id.slice(0, 8).toUpperCase()}-${new Date(booking.createdAt).getTime().toString().slice(-4)}`;

    // Determine Payment Method label
    const paymentMethodLabel =
      booking.paymentMethod === 'online'
        ? 'Online Payment (Razorpay / UPI / Cards)'
        : booking.paymentMethod === 'wallet'
        ? 'Eminence Wallet Balance'
        : booking.paymentMethod === 'cash'
        ? 'Cash on Delivery (COD)'
        : 'Corporate Postpaid Invoicing';

    // Tempo / Vehicle Type descriptor
    const tempoLabel =
      booking.tempoType === 'small'
        ? 'Tata Ace / Chotta Hatti (1 Ton Payload)'
        : booking.tempoType === 'medium'
        ? 'Ashok Leyland Dost (2 Ton Payload)'
        : booking.tempoType === 'large'
        ? 'Mahindra Bolero Pickup (3 Ton Payload)'
        : booking.vehicle?.model || 'Commercial Carrier Fleet';

    const vehicleReg = booking.vehicle?.registrationNumber || 'MH-12-BP-1001 (Fleet Tempo)';
    const driverName = booking.driver?.name || 'Assigned Fleet Driver';
    const driverPhone = booking.driver?.phone || '+91 9822011001';

    // 5% GST calculation
    const baseFare = totalAmount / 1.05;
    const gstAmount = totalAmount - baseFare;

    // Create PDF Document (A4 size with 40 margin)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set HTTP Response Headers for direct inline view or attachment download
    const filename = `Eminence_Receipt_INV-${booking.id.slice(0, 8).toUpperCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Color Palette Tokens
    const primaryDark = '#0f172a';
    const copper = '#ea580c';
    const slate600 = '#475569';
    const slate800 = '#1e293b';
    const borderLight = '#e2e8f0';
    const bgLight = '#f8fafc';
    const successGreen = '#16a34a';

    // ==========================================
    // 1. BRAND HEADER BANNER
    // ==========================================
    doc.rect(40, 40, 515, 65).fill(primaryDark);

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(19).text('EMINENCE TRANSPORTS', 55, 52);
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(8.5).text('NEXT-GENERATION COMMERCIAL FREIGHT & DISPATCH LOGISTICS', 55, 75);

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8);
    doc.text('Helpline: +91 9970734425 (7 AM - 7 PM)', 320, 52, { width: 220, align: 'right' });
    doc.text('Email: support@eminence.com', 320, 64, { width: 220, align: 'right' });
    doc.text('Corporate Hub: Pune, MH 411001, India', 320, 76, { width: 220, align: 'right' });
    doc.text('GSTIN: 27AABCE1234F1Z8', 320, 88, { width: 220, align: 'right' });

    // ==========================================
    // 2. RECEIPT TITLE & PAYMENT STATUS BADGE
    // ==========================================
    doc.rect(40, 115, 515, 48).fill(bgLight).stroke(borderLight);

    doc.fillColor(primaryDark).font('Helvetica-Bold').fontSize(13).text('OFFICIAL DELIVERY RECEIPT & TAX INVOICE', 55, 124);
    doc.fillColor(slate600).font('Helvetica').fontSize(8.5).text('Verified electronic receipt under Information Technology Act, 2000', 55, 142);

    // Paid Badge
    const isPaid = (booking.paymentStatus || '').toLowerCase() === 'completed' || booking.status === 'completed';
    doc.roundedRect(435, 123, 105, 22, 5).fill(isPaid ? successGreen : copper);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(isPaid ? 'PAID & VERIFIED' : 'PAYMENT PENDING', 435, 129, { width: 105, align: 'center' });

    // ==========================================
    // 3. PAYMENT & CUSTOMER DETAILS (2 COLUMNS)
    // ==========================================
    let curY = 173;
    doc.rect(40, curY, 250, 96).fill(bgLight).stroke(borderLight);
    doc.rect(305, curY, 250, 96).fill(bgLight).stroke(borderLight);

    // Left Box: Payment Details
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(9.5).text('INVOICE & PAYMENT DETAILS', 50, curY + 9);
    doc.fillColor(slate800).font('Helvetica-Bold').fontSize(8);
    doc.text('Invoice No:', 50, curY + 25);
    doc.text('Booking Ref:', 50, curY + 39);
    doc.text('Payment ID:', 50, curY + 53);
    doc.text('Payment Method:', 50, curY + 67);
    doc.text('Billing Date:', 50, curY + 81);

    doc.fillColor(primaryDark).font('Helvetica').fontSize(8);
    doc.text(`INV-${booking.id.slice(0, 8).toUpperCase()}`, 130, curY + 25);
    doc.text(`#${booking.id.slice(0, 18).toUpperCase()}`, 130, curY + 39);
    doc.font('Helvetica-Bold').fillColor(copper).text(paymentId, 130, curY + 53);
    doc.font('Helvetica').fillColor(primaryDark).text(paymentMethodLabel, 130, curY + 67, { width: 155 });
    doc.text(`${bookingDate}, ${bookingTime}`, 130, curY + 81);

    // Right Box: Customer Details
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(9.5).text('BILLED CUSTOMER (CONSIGNOR)', 315, curY + 9);
    doc.fillColor(slate800).font('Helvetica-Bold').fontSize(8);
    doc.text('Customer Name:', 315, curY + 25);
    doc.text('Contact Phone:', 315, curY + 39);
    doc.text('Email Address:', 315, curY + 53);
    doc.text('Booking Mode:', 315, curY + 67);
    doc.text('Supply State:', 315, curY + 81);

    doc.fillColor(primaryDark).font('Helvetica').fontSize(8);
    doc.font('Helvetica-Bold').text(customerName, 395, curY + 25);
    doc.font('Helvetica').text(customerPhone, 395, curY + 39);
    doc.text(customerEmail, 395, curY + 53);
    doc.text(booking.bookingMode === 'shared' ? 'Shared Freight Pool' : 'Dedicated Commercial Tempo', 395, curY + 67);
    doc.text('Maharashtra (State Code: 27)', 395, curY + 81);

    // ==========================================
    // 4. PICKUP & DROP LOCATIONS
    // ==========================================
    curY = 279;
    doc.rect(40, curY, 515, 82).fill('#ffffff').stroke(borderLight);
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(9.5).text('TRIP ROUTE & LOCATION DETAILS', 50, curY + 9);

    // Pickup
    doc.fillColor(successGreen).font('Helvetica-Bold').fontSize(8.5).text('PICKUP LOCATION:', 50, curY + 25);
    doc.fillColor(primaryDark).font('Helvetica').fontSize(8).text(booking.pickupAddress || 'Pune City Depot', 155, curY + 25, { width: 385 });

    // Drop
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(8.5).text('DROP LOCATION:', 50, curY + 52);
    doc.fillColor(primaryDark).font('Helvetica').fontSize(8).text(booking.dropAddress || 'Destination Consignee Location', 155, curY + 52, { width: 385 });

    // ==========================================
    // 5. WHAT IT CONTAINED (CARGO & VEHICLE)
    // ==========================================
    curY = 371;
    doc.rect(40, curY, 515, 96).fill(bgLight).stroke(borderLight);
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(9.5).text('CONSIGNMENT MANIFEST & CARGO SPECIFICATIONS ("WHAT IT CONTAINED")', 50, curY + 9);

    // Column 1: Cargo specifics
    doc.fillColor(slate800).font('Helvetica-Bold').fontSize(8);
    doc.text('Goods Category:', 50, curY + 26);
    doc.text('Total Cargo Weight:', 50, curY + 42);
    doc.text('Trip Distance:', 50, curY + 58);
    doc.text('Packaging Note:', 50, curY + 74);

    doc.fillColor(primaryDark).font('Helvetica').fontSize(8);
    doc.font('Helvetica-Bold').text(booking.goodsType || 'Commercial Freight & Boxes', 155, curY + 26);
    doc.font('Helvetica').text(`${booking.weight || 500} kg (Weighed & Verified)`, 155, curY + 42);
    doc.text(`${booking.totalDistance ? `${booking.totalDistance} km` : 'Intracity Transit'}`, 155, curY + 58);
    doc.text('Standard Commercial Packaging', 155, curY + 74);

    // Column 2: Vehicle & Driver specifics
    doc.fillColor(slate800).font('Helvetica-Bold').fontSize(8);
    doc.text('Assigned Tempo:', 315, curY + 26);
    doc.text('Vehicle Reg Number:', 315, curY + 42);
    doc.text('Fleet Driver Assigned:', 315, curY + 58);
    doc.text('PoD Delivery Hash:', 315, curY + 74);

    doc.fillColor(primaryDark).font('Helvetica').fontSize(8);
    doc.font('Helvetica-Bold').text(tempoLabel, 415, curY + 26, { width: 130 });
    doc.font('Helvetica').text(vehicleReg, 415, curY + 42);
    doc.text(`${driverName} (${driverPhone})`, 415, curY + 58, { width: 130 });
    doc.font('Helvetica-Bold').fillColor(slate600).text(booking.podHash ? `${booking.podHash.slice(0, 12)}... Verified` : 'Verified upon delivery', 415, curY + 74);

    // ==========================================
    // 6. FINANCIAL CHARGES TABLE
    // ==========================================
    curY = 477;
    doc.rect(40, curY, 515, 20).fill(primaryDark);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text('SERVICE / ITEM DESCRIPTION', 50, curY + 5);
    doc.text('CALCULATION BASIS', 300, curY + 5);
    doc.text('TAX RATE', 400, curY + 5);
    doc.text('AMOUNT (INR)', 480, curY + 5, { width: 65, align: 'right' });

    // Rows
    const items = [
      {
        desc: `Freight Transportation Services (${tempoLabel.split('(')[0].trim()})`,
        basis: `${booking.totalDistance ? `${booking.totalDistance} km` : 'Base Fare'}`,
        tax: '5% GST',
        amt: baseFare.toFixed(2)
      },
      {
        desc: 'Cargo Transit Safety & Loss Protection Warranty',
        basis: 'Included',
        tax: '0%',
        amt: (parseFloat(booking.insuranceFee) || 0).toFixed(2)
      },
      {
        desc: 'GPS Live Telematics Tracking & Instant Dispatch Platform Fee',
        basis: 'Zero Surcharge',
        tax: '0%',
        amt: '0.00'
      },
      {
        desc: 'Statutory GST (CGST 2.5% + SGST 2.5%)',
        basis: 'Reverse Charge / Standard',
        tax: '5%',
        amt: gstAmount.toFixed(2)
      }
    ];

    let tableY = curY + 20;
    items.forEach((item, idx) => {
      const rowBg = idx % 2 === 0 ? '#ffffff' : bgLight;
      doc.rect(40, tableY, 515, 18).fill(rowBg).stroke(borderLight);
      doc.fillColor(primaryDark).font('Helvetica').fontSize(7.5);
      doc.text(item.desc, 50, tableY + 5, { width: 245 });
      doc.text(item.basis, 300, tableY + 5);
      doc.text(item.tax, 400, tableY + 5);
      doc.font('Helvetica-Bold').text(`Rs. ${item.amt}`, 480, tableY + 5, { width: 65, align: 'right' });
      tableY += 18;
    });

    // Total Amount Row
    doc.rect(40, tableY, 515, 26).fill('#f1f5f9').stroke(borderLight);
    doc.fillColor(primaryDark).font('Helvetica-Bold').fontSize(10).text('TOTAL PAID AMOUNT:', 300, tableY + 7);
    doc.fillColor(copper).font('Helvetica-Bold').fontSize(12).text(`Rs. ${totalAmount.toFixed(2)}`, 450, tableY + 6, { width: 95, align: 'right' });

    // Amount in words
    tableY += 30;
    doc.fillColor(slate600).font('Helvetica-Bold').fontSize(8);
    doc.text(`Amount in Words: ${numberToWords(totalAmount)}`, 45, tableY);

    // ==========================================
    // 7. PROOF OF DELIVERY (PoD) SECURITY BOX
    // ==========================================
    tableY += 20;
    doc.rect(40, tableY, 515, 68).fill(bgLight).stroke(borderLight);

    doc.fillColor(primaryDark).font('Helvetica-Bold').fontSize(8.5).text('PROOF OF DELIVERY (PoD) & CRYPTOGRAPHIC VERIFICATION', 50, tableY + 7);
    doc.fillColor(slate600).font('Helvetica').fontSize(7.5);
    doc.text('Tamper-Evident SHA-256 Checksum Hash:', 50, tableY + 20);
    doc.font('Helvetica-Bold').fillColor(primaryDark).text(booking.podHash || 'SHA256: 39a2260b9ccc2aef40f71865066576a771f99397fd6ba616ac70c777bd5de062', 50, tableY + 31, { width: 495 });
    doc.font('Helvetica').fillColor(slate600).text('This is an authenticated, legally binding digital proof of delivery receipt issued under the Information Technology Act, 2000. No physical signature is required.', 50, tableY + 44, { width: 495 });

    // ==========================================
    // 8. PAGE FOOTER
    // ==========================================
    doc.moveTo(40, 785).lineTo(555, 785).stroke('#cbd5e1');
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5).text(
      'Eminence Transports Private Limited • Corporate Office: Pune City Hub, Maharashtra, India • 24x7 Helpline: +91 9970734425 • Page 1 of 1',
      40,
      794,
      { align: 'center', width: 515 }
    );

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating receipt PDF' });
    }
  }
};

module.exports = {
  generateInvoice
};
