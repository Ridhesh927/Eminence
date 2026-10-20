import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import AdminMenuModal from '../../components/AdminMenuModal';

interface BookingItem {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  tempoType: string;
  goodsType: string;
  estimatedFare: number;
  driverId?: string | null;
  queuePosition?: number;
  cancellationReason?: string;
  cancelledBy?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
  createdAt?: string;
}

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: string;
}

export default function DispatchScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'assigned' | 'completed' | 'expired' | 'all'>('pending');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Assignment Modal
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const [bookingsRes, driversRes] = await Promise.allSettled([
        api.get('/api/bookings'),
        api.get('/api/admin/drivers'),
      ]);

      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.bookings) {
        setBookings(bookingsRes.value.data.bookings);
      }

      if (driversRes.status === 'fulfilled' && driversRes.value.data?.drivers) {
        setDrivers(driversRes.value.data.drivers);
      }
    } catch (err) {
      console.error('Error fetching dispatch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenAssignModal = (b: BookingItem) => {
    if (isBookingExpired(b) || b.status === 'cancelled') {
      Alert.alert(
        'Cannot Appoint Driver',
        b.status === 'expired' || isBookingExpired(b)
          ? 'This booking has expired because it remained untouched without driver appointment past deadline.'
          : 'This booking has been cancelled.'
      );
      return;
    }
    setSelectedBooking(b);
    setAssignModalOpen(true);
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedBooking) return;
    setAssigning(true);

    try {
      await api.put(`/api/bookings/${selectedBooking.id}/status`, {
        status: 'driver_assigned',
        driverId,
      });

      Alert.alert('Trip Appointed', 'The driver has been successfully assigned to this booking.');
      setAssignModalOpen(false);
      setSelectedBooking(null);
      fetchData();
    } catch (err: any) {
      console.error('Error appointing driver:', err);
      Alert.alert('Assignment Failed', err.response?.data?.message || 'Could not appoint trip to driver');
    } finally {
      setAssigning(false);
    }
  };

  const handleCompleteBooking = (bookingId: string) => {
    Alert.alert(
      'Complete Trip',
      'Are you sure you want to mark this delivery as completed? This will auto-advance the driver\'s delivery queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          style: 'default',
          onPress: async () => {
            try {
              await api.post(`/api/bookings/${bookingId}/complete`);
              Alert.alert('Trip Completed', 'Booking marked as completed. Driver queue updated.');
              fetchData();
            } catch (err: any) {
              console.error('Error completing trip:', err);
              Alert.alert('Error', err.response?.data?.message || 'Could not complete trip');
            }
          },
        },
      ]
    );
  };

  const isBookingExpired = (b: BookingItem) => {
    if (b.status === 'expired') return true;
    if (b.status === 'cancelled') {
      const reason = (b.cancellationReason || '').toLowerCase();
      if (reason.includes('expire') || reason.includes('untouched') || reason.includes('deadline')) {
        return true;
      }
    }
    return false;
  };

  const isBookingPending = (b: BookingItem) => {
    if (isBookingExpired(b)) return false;
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    return b.status === 'pending' || (!b.driverId && !['driver_assigned', 'accepted', 'arrived', 'picked_up', 'in_transit'].includes(b.status));
  };

  const isBookingActive = (b: BookingItem) => {
    if (isBookingExpired(b)) return false;
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    return !!b.driverId || ['driver_assigned', 'accepted', 'arrived', 'picked_up', 'in_transit'].includes(b.status);
  };

  const isBookingCompleted = (b: BookingItem) => {
    return b.status === 'completed';
  };

  const activeDrivers = drivers.filter((d) => d.status === 'active');
  const pendingBookings = bookings.filter(isBookingPending);
  const assignedBookings = bookings.filter(isBookingActive);
  const completedBookings = bookings.filter(isBookingCompleted);
  const expiredBookings = bookings.filter(isBookingExpired);

  const displayedBookings =
    filter === 'pending'
      ? pendingBookings
      : filter === 'assigned'
      ? assignedBookings
      : filter === 'completed'
      ? completedBookings
      : filter === 'expired'
      ? expiredBookings
      : bookings;

  const driverQueueMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.driverId && !['completed', 'cancelled', 'expired'].includes(b.status)) {
        map[b.driverId] = (map[b.driverId] || 0) + 1;
      }
    });
    return map;
  }, [bookings]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appoint Work</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuTrigger} onPress={() => setIsMenuOpen(true)}>
            <Text style={styles.menuTriggerText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 8 Tempos Limited Fleet Status Card */}
      <View style={styles.fleetBanner}>
        <View style={styles.fleetBannerHeader}>
          <Text style={styles.fleetBannerTitle}>Company Fleet (8 Limited Tempos)</Text>
          <View style={styles.fleetQueueActiveBadge}>
            <Text style={styles.fleetQueueActiveText}>Queue Engine Active</Text>
          </View>
        </View>
        <Text style={styles.fleetBannerModels}>
          • 1x Bolero Pickup (Diesel)  • 1x Dost (Diesel){'\n'}• 4x Tata Ace (1 Petrol, 3 CNG)  • 2x Chotta Hatti (Diesel)
        </Text>
      </View>

      {/* KPI Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiScrollContent}
        style={styles.kpiScroll}
      >
        <TouchableOpacity
          style={[styles.kpiCard, filter === 'pending' && styles.kpiCardActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={styles.kpiLabel}>Pending Work</Text>
          <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{pendingBookings.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiCard, filter === 'assigned' && styles.kpiCardActive]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={styles.kpiLabel}>In Transit</Text>
          <Text style={[styles.kpiValue, { color: '#38bdf8' }]}>{assignedBookings.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiCard, filter === 'completed' && styles.kpiCardActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={styles.kpiLabel}>Completed</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{completedBookings.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiCard, filter === 'expired' && styles.kpiCardActive]}
          onPress={() => setFilter('expired')}
        >
          <Text style={styles.kpiLabel}>Expired Trips</Text>
          <Text style={[styles.kpiValue, { color: '#fb923c' }]}>{expiredBookings.length}</Text>
        </TouchableOpacity>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Active Drivers</Text>
          <Text style={[styles.kpiValue, { color: '#a78bfa' }]}>
            {activeDrivers.length} <Text style={styles.kpiTotal}>/ {drivers.length}</Text>
          </Text>
        </View>
      </ScrollView>

      {/* 5 Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
        style={styles.tabScroll}
      >
        <TouchableOpacity
          style={[styles.tab, filter === 'pending' && styles.tabActivePending]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>
            Pending Dispatch ({pendingBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'assigned' && styles.tabActiveAssigned]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.tabText, filter === 'assigned' && styles.tabTextActive]}>
            Assigned / Transit ({assignedBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'completed' && styles.tabActiveCompleted]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.tabText, filter === 'completed' && styles.tabTextActive]}>
            Completed ({completedBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'expired' && styles.tabActiveExpired]}
          onPress={() => setFilter('expired')}
        >
          <Text style={[styles.tabText, filter === 'expired' && styles.tabTextActive]}>
            Expired ({expiredBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActiveAll]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All Bookings ({bookings.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 40 }} />
        ) : displayedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'pending' ? 'All Bookings Appointed!' : 'No Bookings Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'pending'
                ? 'No pending trips requiring driver appointment right now.'
                : 'Customer ride bookings will appear here.'}
            </Text>
          </View>
        ) : (
          displayedBookings.map((b) => {
            const isExpired = isBookingExpired(b);
            const isCancelled = b.status === 'cancelled' && !isExpired;
            const isCompleted = isBookingCompleted(b);
            const isPending = isBookingPending(b);
            const isAssigned = isBookingActive(b);
            const currentDriver = b.driver || drivers.find((d) => d.id === b.driverId);

            return (
              <View key={b.id} style={[styles.bookingCard, isExpired && styles.bookingCardExpired]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.bookingId}>#{b.id.slice(0, 8)}</Text>
                    {b.driverId && !isCompleted && !isCancelled && !isExpired && (
                      <View
                        style={[
                          styles.queuePosBadge,
                          b.queuePosition === 1 || !b.queuePosition
                            ? styles.queuePosActive
                            : styles.queuePosQueued,
                        ]}
                      >
                        <Text
                          style={[
                            styles.queuePosText,
                            b.queuePosition === 1 || !b.queuePosition
                              ? styles.queuePosActiveText
                              : styles.queuePosQueuedText,
                          ]}
                        >
                          {b.queuePosition === 1 || !b.queuePosition
                            ? '🎯 Active Delivery'
                            : `⏳ Stop #${b.queuePosition} (Queue)`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isExpired
                        ? styles.statusPillExpired
                        : isCancelled
                        ? styles.statusPillCancelled
                        : isCompleted
                        ? styles.statusPillCompleted
                        : isPending
                        ? styles.statusPillPending
                        : styles.statusPillAssigned,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isExpired
                          ? { color: '#fb923c' }
                          : isCancelled
                          ? { color: '#f87171' }
                          : isCompleted
                          ? { color: '#34d399' }
                          : isPending
                          ? { color: '#fbbf24' }
                          : { color: '#38bdf8' },
                      ]}
                    >
                      {isExpired
                        ? 'EXPIRED'
                        : isCancelled
                        ? 'CANCELLED'
                        : isCompleted
                        ? 'COMPLETED'
                        : isPending
                        ? 'PENDING'
                        : b.status ? b.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <Text style={styles.routeDotGreen}>●</Text>
                    <Text style={styles.routeText} numberOfLines={1}>
                      {b.pickupAddress}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Text style={styles.routeDotOrange}>▼</Text>
                    <Text style={[styles.routeText, { color: '#f08b65' }]} numberOfLines={1}>
                      {b.dropAddress || 'Multi-stop delivery'}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailText}>
                    {b.tempoType ? b.tempoType.toUpperCase() : 'STANDARD'} • {b.goodsType || 'Goods'}
                  </Text>
                  <Text style={styles.fareText}>₹{b.estimatedFare || 0}</Text>
                </View>

                {/* Special status banners */}
                {isExpired && (
                  <View style={styles.expiredBanner}>
                    <Text style={styles.expiredBannerTitle}>⚠️ Untouched Expiry Deadline Reached</Text>
                    <Text style={styles.expiredBannerSub}>
                      No driver appointed before validity window. Booking marked expired and fare auto-refunded to customer.
                    </Text>
                  </View>
                )}

                {isCancelled && (
                  <View style={styles.cancelledBanner}>
                    <Text style={styles.cancelledBannerTitle}>✕ Booking Cancelled</Text>
                    <Text style={styles.cancelledBannerSub}>
                      {b.cancellationReason || 'Cancelled before driver dispatch.'}
                    </Text>
                  </View>
                )}

                {/* Driver Info / Action */}
                <View style={styles.cardFooter}>
                  {currentDriver ? (
                    <View style={styles.driverAssignedInfo}>
                      <Text style={styles.driverLabel}>Assigned Driver:</Text>
                      <Text style={styles.driverName}>
                        {currentDriver.name} ({currentDriver.phone})
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.unassignedText, isExpired && { color: '#fb923c' }]}>
                      {isExpired ? 'No driver assigned (Expired)' : isCancelled ? 'No driver assigned (Cancelled)' : 'No driver appointed yet'}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>✓ Delivered & Closed</Text>
                      </View>
                    )}

                    {isExpired && (
                      <View style={styles.expiredActionBadge}>
                        <Text style={styles.expiredActionBadgeText}>Expired (Closed)</Text>
                      </View>
                    )}

                    {isCancelled && (
                      <View style={styles.cancelledActionBadge}>
                        <Text style={styles.cancelledActionBadgeText}>Cancelled</Text>
                      </View>
                    )}

                    {isAssigned && (
                      <>
                        <TouchableOpacity
                          style={styles.adminCompleteBtn}
                          onPress={() => handleCompleteBooking(b.id)}
                        >
                          <Text style={styles.adminCompleteBtnText}>✓ Complete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.appointBtn, styles.reappointBtn]}
                          onPress={() => handleOpenAssignModal(b)}
                        >
                          <Text style={styles.appointBtnText}>Reassign</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {isPending && (
                      <TouchableOpacity
                        style={styles.appointBtn}
                        onPress={() => handleOpenAssignModal(b)}
                      >
                        <Text style={styles.appointBtnText}>Appoint Driver</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Driver Assignment Modal */}
      <Modal
        visible={assignModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appoint Driver</Text>
              <TouchableOpacity onPress={() => setAssignModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.modalBookingSummary}>
                <Text style={styles.modalSummaryText}>
                  Booking #{selectedBooking.id.slice(0, 8)} • ₹{selectedBooking.estimatedFare}
                </Text>
                <Text style={styles.modalSummaryRoute} numberOfLines={1}>
                  {selectedBooking.pickupAddress} → {selectedBooking.dropAddress}
                </Text>
              </View>
            )}

            <Text style={styles.modalSubheading}>Select from Active Fleet Drivers:</Text>

            {assigning ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 30 }} />
            ) : activeDrivers.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: '#a2b2c7', fontSize: 13 }}>
                  No active drivers currently available on duty.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {activeDrivers.map((drv) => {
                  const queuedCount = driverQueueMap[drv.id] || 0;
                  return (
                    <TouchableOpacity
                      key={drv.id}
                      style={styles.driverSelectCard}
                      onPress={() => handleAssignDriver(drv.id)}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.driverSelectName}>{drv.name}</Text>
                          <View
                            style={[
                              styles.drvQueueBadge,
                              queuedCount === 0
                                ? styles.drvQueueAvailable
                                : queuedCount === 1
                                ? styles.drvQueueSingle
                                : styles.drvQueueMultiple,
                            ]}
                          >
                            <Text
                              style={[
                                styles.drvQueueText,
                                queuedCount === 0
                                  ? styles.drvQueueAvailableText
                                  : queuedCount === 1
                                  ? styles.drvQueueSingleText
                                  : styles.drvQueueMultipleText,
                              ]}
                            >
                              {queuedCount === 0
                                ? '🟢 Available (0 in Queue)'
                                : queuedCount === 1
                                ? '🟡 1 in Queue'
                                : `🟠 ${queuedCount} in Queue`}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.driverSelectPhone}>{drv.phone}</Text>
                        <Text style={styles.driverSelectLicense}>
                          License: {drv.licenseNumber}
                          {queuedCount > 0 ? ' • Next in sequence' : ' • Immediate dispatch'}
                        </Text>
                      </View>
                      <Text style={styles.selectArrow}>Assign ›</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setAssignModalOpen(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unified Admin Navigation Menu */}
      <AdminMenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="dispatch"
        onOpenAddDriver={() => router.push('/(admin)/fleet' as any)}
        onOpenAddAdmin={() => router.push('/(admin)/admins' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f141f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#1b2230',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  menuTrigger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#293243',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTriggerText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#293243',
  },
  backBtnText: {
    color: '#c9d3df',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#293243',
  },
  refreshBtnText: {
    color: '#c9d3df',
    fontSize: 16,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#161c27',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1b2230',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  kpiLabel: {
    color: '#a2b2c7',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiTotal: {
    fontSize: 12,
    color: '#748bac',
    fontWeight: '400',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1b2230',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#293243',
  },
  tabActive: {
    backgroundColor: '#f08b65',
  },
  tabText: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  kpiScroll: {
    backgroundColor: '#161c27',
  },
  kpiScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  kpiCardActive: {
    borderColor: '#f08b65',
    backgroundColor: '#232c3d',
  },
  tabScroll: {
    backgroundColor: '#1b2230',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabActivePending: {
    backgroundColor: '#f59e0b',
  },
  tabActiveAssigned: {
    backgroundColor: '#0284c7',
  },
  tabActiveCompleted: {
    backgroundColor: '#059669',
  },
  tabActiveExpired: {
    backgroundColor: '#ea580c',
  },
  tabActiveAll: {
    backgroundColor: '#f08b65',
  },
  bookingCardExpired: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillExpired: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPillCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  expiredBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  expiredBannerTitle: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  expiredBannerSub: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 14,
  },
  cancelledBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  cancelledBannerTitle: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  cancelledBannerSub: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 14,
  },
  expiredActionBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  expiredActionBadgeText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelledActionBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  cancelledActionBadgeText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  completedBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    color: '#10b981',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#a2b2c7',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingId: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPillAssigned: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  routeContainer: {
    marginBottom: 10,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDotGreen: {
    color: '#10b981',
    fontSize: 12,
  },
  routeDotOrange: {
    color: '#f08b65',
    fontSize: 10,
  },
  routeText: {
    color: '#c9d3df',
    fontSize: 13,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#293243',
    marginBottom: 10,
  },
  detailText: {
    color: '#a2b2c7',
    fontSize: 12,
  },
  fareText: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverAssignedInfo: {
    flex: 1,
    marginRight: 10,
  },
  driverLabel: {
    color: '#748bac',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  driverName: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  unassignedText: {
    color: '#f59e0b',
    fontSize: 11,
    fontStyle: 'italic',
  },
  appointBtn: {
    backgroundColor: '#f08b65',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  reappointBtn: {
    backgroundColor: '#2563eb',
  },
  appointBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1b2230',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3b475d',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#f4f6f8',
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseText: {
    color: '#a2b2c7',
    fontSize: 16,
    fontWeight: '700',
    padding: 4,
  },
  modalBookingSummary: {
    backgroundColor: '#161c27',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalSummaryText: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSummaryRoute: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
  },
  modalSubheading: {
    color: '#c9d3df',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  driverSelectCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#293243',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  driverSelectName: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  driverSelectPhone: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 1,
  },
  driverSelectLicense: {
    color: '#748bac',
    fontSize: 11,
    marginTop: 1,
  },
  selectArrow: {
    color: '#f08b65',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#293243',
  },
  modalCancelText: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
  },
  fleetBanner: {
    backgroundColor: '#1b2230',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(240, 139, 101, 0.3)',
  },
  fleetBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fleetBannerTitle: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  fleetQueueActiveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fleetQueueActiveText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
  },
  fleetBannerModels: {
    color: '#a2b2c7',
    fontSize: 11,
    lineHeight: 16,
  },
  queuePosBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  queuePosActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  queuePosQueued: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  queuePosText: {
    fontSize: 10,
    fontWeight: '700',
  },
  queuePosActiveText: {
    color: '#22c55e',
  },
  queuePosQueuedText: {
    color: '#f59e0b',
  },
  drvQueueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  drvQueueAvailable: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  drvQueueSingle: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  drvQueueMultiple: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  drvQueueText: {
    fontSize: 10,
    fontWeight: '700',
  },
  drvQueueAvailableText: {
    color: '#22c55e',
  },
  drvQueueSingleText: {
    color: '#f59e0b',
  },
  drvQueueMultipleText: {
    color: '#fb923c',
  },
  adminCompleteBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  adminCompleteBtnText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
});
