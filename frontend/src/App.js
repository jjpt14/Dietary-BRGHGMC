import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import from your folders
import Sidebar from './components/Sidebar'; 
import DashboardPage from './pages/DashboardPage'; 
import PatientList from './pages/PatientList';
import FoodService from './pages/FoodService';
import MenuPreparation from './pages/MenuPreparation';
import ONSDashboard from './pages/ONSDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';

export default function App() {
  // 1. Set up Security States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Hydrate State on Refresh
  // When the user hits refresh, check if they are already logged in
  useEffect(() => {
    const token = localStorage.getItem('hospital_token');
    const user = localStorage.getItem('hospital_user');
    
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // 3. Login & Logout Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_user');
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading System...</div>;

  // ==========================================
  // UN-AUTHENTICATED VIEW (Locked Out)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          {/* Force all unknown links back to the login page */}
          <Route path="*" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </Router>
    );
  }

  // ==========================================
  // AUTHENTICATED VIEW (App Shell)
  // ==========================================
  
  // Security check: Only let IT and Section Heads into the Admin tab
  const isAdmin = currentUser?.role === 'IT' || currentUser?.role === 'Section Head';

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* SIDEBAR */}
        <Sidebar onLogout={handleLogout} />
        
        <main style={{ flex: 1, marginLeft: '260px', backgroundColor: '#f4f7f6' }}>
          
          {/* HEADER */}
          <header style={{ 
            backgroundColor: 'white', 
            padding: '15px 30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h1 style={{ fontSize: '1.4rem', color: '#333', margin: 0 }}>BRGHGMC Dietary Section</h1>
            <div style={{ fontWeight: '600', color: '#666' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div style={{ padding: '30px' }}>
            <Routes>
              {/* Default redirect to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              
              {/* Standard Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patient-list" element={<PatientList />} />
              <Route path="/food-service" element={<FoodService currentUser={currentUser} />} />
              <Route path="/menu-prep" element={<MenuPreparation />} />
              <Route path="/ons-dashboard" element={<ONSDashboard />} />
              
              {/* PROTECTED ADMIN ROUTE */}
              <Route 
                path="/admin" 
                element={isAdmin ? <AdminDashboard currentUser={currentUser} /> : <Navigate to="/dashboard" />} 
              />

              {/* Catch-all for 404s inside the app */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>

        </main>
      </div>
    </Router>
  );
}