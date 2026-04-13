import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CreditCard, User, Utensils, 
  FileText, Package, Users, Activity, LogOut 
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        margin: '4px 12px',
        borderRadius: '8px',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        transition: '0.2s ease',
        cursor: 'pointer'
      }}>
        {/* Secondary Color R231 G171 B56 for the active icon */}
        <Icon size={20} color={isActive ? 'rgb(231, 171, 56)' : 'white'} />
        <span style={{ 
          color: 'white', 
          fontSize: '0.95rem', 
          fontWeight: isActive ? '600' : '400' 
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
};

export default function Sidebar() {
  return (
    <aside style={{ 
      width: '260px', 
      backgroundColor: 'rgb(61, 146, 95)', // Main Color R61 G146 B95
      height: '100vh',
      display: 'flex', 
      flexDirection: 'column',
      position: 'fixed'
    }}>
      <div style={{ padding: '30px 20px', textAlign: 'center', color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>BRGHGMC</h2>
        <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>DIETARY SECTION</div>
      </div>

      <nav style={{ flex: 1, marginTop: '10px' }}>
        <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarItem to="/charging" icon={CreditCard} label="Charging" />
        <SidebarItem to="/profiling" icon={User} label="Patient Profiling" />
        <SidebarItem to="/food-service" icon={Utensils} label="Food Service" />
        <SidebarItem to="/reports" icon={FileText} label="Reports" />
        <SidebarItem to="/inventory" icon={Package} label="Inventory" />
        <SidebarItem to="/users" icon={Users} label="Users" />
        <SidebarItem icon={Activity} label="Logs" />
      </nav>

      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', opacity: 0.8, cursor: 'pointer', padding: '10px 20px' }}>
          <LogOut size={18} /> <span>Sign Out</span>
        </div>
      </div>
    </aside>
  );
}