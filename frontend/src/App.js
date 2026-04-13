import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import from your new folders
import Sidebar from './components/Sidebar'; 
import DashboardPage from './pages/DashboardPage'; 
import PatientList from './pages/PatientList';
import FoodService from './pages/FoodService';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        
        <main style={{ flex: 1, marginLeft: '260px', backgroundColor: '#f4f7f6' }}>
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

          <div style={{ padding: '30px' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patient-list" element={<PatientList />} />
              <Route path="/food-service" element={<FoodService />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}