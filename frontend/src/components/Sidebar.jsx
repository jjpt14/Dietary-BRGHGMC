import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  UtensilsCrossed, 
  Pill, 
  Settings,
  LogOut,
  UserCircle
} from 'lucide-react';

// Added onLogout prop in case your main App.jsx needs to know when they log out
export default function Sidebar({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the currently logged-in user from local storage
  const userString = localStorage.getItem('hospital_user');
  const currentUser = userString ? JSON.parse(userString) : { full_name: 'Staff', role: 'User' };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Patient List', path: '/patient-list', icon: <Users size={20} /> },
    { name: 'Food Service', path: '/food-service', icon: <Truck size={20} /> },
    { name: 'Menu Preparation', path: '/menu-prep', icon: <UtensilsCrossed size={20} /> },
    { name: 'ONS & Enteral', path: '/ons-dashboard', icon: <Pill size={20} /> },
    { name: 'Admin', path: '/admin', icon: <Settings size={20} /> },
  ];

  const handleLogout = () => {
    // 1. Wipe the security tokens
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_user');
    
    // 2. If you passed an onLogout function from App.jsx, trigger it
    if (onLogout) onLogout();

    // 3. Kick them back to the login page
    navigate('/');
  };

  return (
    <div style={{
      width: '260px',
      backgroundColor: 'rgb(61, 146, 95)', 
      color: 'white',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0'
    }}>
      {/* HEADER */}
      <div style={{ padding: '0 25px 30px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>BRGHGMC</h2>
        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Dietary Management</span>
      </div>

      {/* NAVIGATION LINKS */}
      <nav style={{ marginTop: '20px', flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '15px 25px',
              textDecoration: 'none',
              color: 'white',
              backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderLeft: location.pathname === item.path ? '4px solid white' : '4px solid transparent',
              transition: '0.2s'
            }}
          >
            {item.icon}
            <span style={{ fontWeight: location.pathname === item.path ? 'bold' : 'normal' }}>
              {item.name}
            </span>
          </Link>
        ))}
      </nav>

      {/* FOOTER: USER PROFILE & LOGOUT */}
      <div style={{ padding: '20px 25px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <UserCircle size={32} opacity={0.8} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{currentUser.full_name}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{currentUser.role}</div>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(220, 38, 38, 0.8)', // Subdued red for logout
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgb(220, 38, 38)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.8)'}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

    </div>
  );
}