const { Driver } = require('../models');

// Get all drivers
const getAllDrivers = async (_req, res) => {
  try {
    const drivers = await Driver.findAll();
    res.status(200).json({ success: true, drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a driver
const createDriver = async (req, res) => {
  try {
    const { name, phone, email, licenseNumber } = req.body;
    if (!name || !phone || !licenseNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, phone, licenseNumber' });
    }
    const driver = await Driver.create({ name, phone, email, licenseNumber });
    res.status(201).json({ success: true, driver });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'driver' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Drivers can only change their own availability' });
    }
    const driver = await Driver.findByPk(id);
    
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.status === 'on_trip') {
      return res.status(400).json({ success: false, message: 'Cannot change availability while on a trip' });
    }

    // Toggle between active and inactive
    driver.status = driver.status === 'active' ? 'inactive' : 'active';
    await driver.save();

    res.status(200).json({ success: true, status: driver.status, driver });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDriverMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { Booking, Customer, Vehicle } = require('../models');

    // Completed bookings
    const completedBookings = await Booking.findAll({
      where: {
        driverId: id,
        status: 'completed'
      },
      order: [['updatedAt', 'DESC']]
    });

    const totalOrdersCompleted = completedBookings.length;
    const totalEarnings = completedBookings.reduce((sum, b) => {
      const fare = Number(b.estimatedFare) || 0;
      return sum + fare;
    }, 0);

    // Active / Appointed bookings
    const assignedBookings = await Booking.findAll({
      where: {
        driverId: id,
        status: ['driver_assigned', 'arrived', 'in_transit']
      },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type'] }
      ],
      order: [['queuePosition', 'ASC'], ['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      metrics: {
        completedOrders: totalOrdersCompleted,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        activeOrdersCount: assignedBookings.length,
        activeTrip: assignedBookings.length > 0 ? assignedBookings[0] : null,
        queuedTrips: assignedBookings.length > 1 ? assignedBookings.slice(1) : [],
        assignedBookings,
        completedBookings
      }
    });
  } catch (error) {
    console.error('Error fetching driver metrics:', error);
    res.status(500).json({ success: false, message: 'Server error fetching driver metrics' });
  }
};

const generatePayslip = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to payslip' });
    }

    const driver = await Driver.findByPk(id);
    
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const weeklyEarnings = 15000;
    const platformFee = weeklyEarnings * 0.15;
    const tdsTax = weeklyEarnings * 0.01;
    const netPayout = weeklyEarnings - platformFee - tdsTax;

    const payslipData = {
      driverName: driver.name,
      weekEnding: new Date().toISOString().split('T')[0],
      grossEarnings: weeklyEarnings,
      platformFee: parseFloat(platformFee.toFixed(2)),
      tdsTax: parseFloat(tdsTax.toFixed(2)),
      netPayout: parseFloat(netPayout.toFixed(2)),
      pdfUrl: `https://eminence.com/api/drivers/${id}/payslip/download`
    };

    res.status(200).json({ success: true, payslip: payslipData });
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'admin' && String(req.user?.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to payslip' });
    }
    const driver = await Driver.findByPk(id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    
    const weeklyEarnings = 15000;
    const platformFee = weeklyEarnings * 0.15;
    const tdsTax = weeklyEarnings * 0.01;
    const netPayout = weeklyEarnings - platformFee - tdsTax;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-disposition', `attachment; filename=payslip_${id}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fillColor('#444444').fontSize(20).text('EMINENCE TRANSPORTS', 50, 57);
    doc.fontSize(10).text('123 Main Street', 200, 50, { align: 'right' });
    doc.text('Pune, MH 411001', 200, 65, { align: 'right' });
    doc.moveDown();

    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    doc.fontSize(14).text('DRIVER PAYSLIP', 50, 130);
    doc.fontSize(10).text(`Driver: ${driver.name}`, 50, 150);
    doc.text(`Week Ending: ${new Date().toISOString().split('T')[0]}`, 50, 165);
    doc.moveDown();

    doc.moveTo(50, 220).lineTo(550, 220).stroke();
    doc.font('Helvetica-Bold').text('Description', 50, 230).text('Amount', 450, 230, { width: 100, align: 'right' });
    doc.moveTo(50, 250).lineTo(550, 250).stroke();

    doc.font('Helvetica').text('Gross Earnings', 50, 270).text(`Rs. ${weeklyEarnings.toFixed(2)}`, 450, 270, { width: 100, align: 'right' });
    doc.text('Platform Fee (15%)', 50, 290).text(`- Rs. ${platformFee.toFixed(2)}`, 450, 290, { width: 100, align: 'right' });
    doc.text('TDS Tax (1%)', 50, 310).text(`- Rs. ${tdsTax.toFixed(2)}`, 450, 310, { width: 100, align: 'right' });

    doc.moveTo(50, 340).lineTo(550, 340).stroke();
    doc.font('Helvetica-Bold').text('Net Payout:', 350, 360).text(`Rs. ${netPayout.toFixed(2)}`, 450, 360, { width: 100, align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error downloading payslip:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { lat, lng, speed } = req.body;
    const driverId = req.user.id;
    if (lat && lng) {
      await Driver.update({ currentLat: lat, currentLng: lng }, { where: { id: driverId } });
      try {
        const { getIo } = require('../socket');
        const { Booking } = require('../models');
        const io = getIo();
        const activeBookings = await Booking.findAll({
          where: {
            driverId,
            status: ['driver_assigned', 'arrived', 'in_transit']
          },
          attributes: ['id']
        });
        activeBookings.forEach((b) => {
          io.to(`trip_${b.id}`).emit('trip:location_update', {
            bookingId: b.id,
            lat: Number(lat),
            lng: Number(lng),
            speed: speed !== undefined ? Number(speed) : 35,
            timestamp: new Date().toISOString()
          });
        });
      } catch (socketErr) {
        // Socket may not be initialized in isolated tests
      }
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDriverQueue = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to driver queue' });
    }

    const { Booking, Customer, Vehicle } = require('../models');

    const activeTrips = await Booking.findAll({
      where: {
        driverId: id,
        status: ['driver_assigned', 'arrived', 'in_transit']
      },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type', 'model', 'fuelType'] }
      ],
      order: [['queuePosition', 'ASC'], ['createdAt', 'ASC']]
    });

    const activeTrip = activeTrips.length > 0 ? activeTrips[0] : null;
    const queuedTrips = activeTrips.length > 1 ? activeTrips.slice(1) : [];

    res.status(200).json({
      success: true,
      queue: {
        totalInQueue: activeTrips.length,
        activeTrip,
        queuedTrips,
        allTrips: activeTrips
      }
    });
  } catch (error) {
    console.error('Error fetching driver queue:', error);
    res.status(500).json({ success: false, message: 'Server error fetching driver queue' });
  }
};

const activateQueuedTrip = async (req, res) => {
  try {
    const { id, bookingId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { Booking } = require('../models');

    const targetBooking = await Booking.findOne({
      where: { id: bookingId, driverId: id, status: ['driver_assigned', 'arrived', 'in_transit'] }
    });

    if (!targetBooking) {
      return res.status(404).json({ success: false, message: 'Trip not found in driver queue' });
    }

    // Reorder queue: place targetBooking at position 1 and increment the rest
    const allQueue = await Booking.findAll({
      where: { driverId: id, status: ['driver_assigned', 'arrived', 'in_transit'] },
      order: [['queuePosition', 'ASC'], ['createdAt', 'ASC']]
    });

    targetBooking.queuePosition = 1;
    await targetBooking.save();

    let curPos = 2;
    for (const b of allQueue) {
      if (b.id !== bookingId) {
        b.queuePosition = curPos++;
        await b.save();
      }
    }

    res.status(200).json({ success: true, message: 'Trip activated to front of delivery queue' });
  } catch (error) {
    console.error('Error activating queued trip:', error);
    res.status(500).json({ success: false, message: 'Server error activating queued trip' });
  }
};

module.exports = {
  getDriverQueue,
  activateQueuedTrip,
  getAllDrivers,
  createDriver,
  toggleAvailability,
  getDriverMetrics,
  generatePayslip,
  downloadPayslip,
  updateLocation
};
