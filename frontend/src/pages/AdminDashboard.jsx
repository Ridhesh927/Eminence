import { useState } from 'react';

import { useSelector } from 'react-redux';
import { 
  BarChart3, Users, Truck, FileText, Settings, 
  ShieldAlert, Activity, MessageSquare, UserCheck, Tag
} from 'lucide-react';

import OverviewTab from '../components/admin/OverviewTab';
import TelematicsTab from '../components/admin/TelematicsTab';
import UsersTab from '../components/admin/UsersTab';
import DriversTab from '../components/admin/DriversTab';
import AppointWorkTab from '../components/admin/AppointWorkTab';
import VehiclesTab from '../components/admin/VehiclesTab';
import ContractsTab from '../components/admin/ContractsTab';
import AnalyticsTab from '../components/admin/AnalyticsTab';
import ChatInbox from '../components/admin/ChatInbox';
import SettingsTab from '../components/admin/SettingsTab';
import PromoCodesTab from '../components/admin/PromoCodesTab';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { token } = useSelector((state) => state.auth);

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen bg-loft-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 bg-loft-900 border border-loft-800 rounded-2xl p-4">
            <div className="mb-8 px-4 py-2">
              <h2 className="text-xl font-bold text-loft-50 font-serif">Admin Control</h2>
              <p className="text-xs text-moss-500 font-bold uppercase tracking-wider">Superadmin</p>
            </div>
            
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'telematics', label: 'Fleet Telematics', icon: Activity },
                { id: 'users', label: 'Manage Users', icon: Users },
                { id: 'drivers', label: 'Manage Drivers', icon: ShieldAlert },
                { id: 'dispatch', label: 'Appoint Work', icon: UserCheck },
                { id: 'vehicles', label: 'Manage Vehicles', icon: Truck },
                { id: 'contracts', label: 'Contracts', icon: FileText },
                { id: 'promocodes', label: 'Promo Codes', icon: Tag },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'chat', label: 'Support Inbox', icon: MessageSquare },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-copper-500 text-white' 
                      : 'text-loft-300 hover:text-loft-50 hover:bg-loft-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'telematics' && <TelematicsTab activeTab={activeTab} token={token} />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'drivers' && <DriversTab />}
          {activeTab === 'dispatch' && <AppointWorkTab />}
          {activeTab === 'vehicles' && <VehiclesTab />}
          {activeTab === 'contracts' && <ContractsTab />}
          {activeTab === 'promocodes' && <PromoCodesTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'chat' && <ChatInbox activeTab={activeTab} token={token} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
