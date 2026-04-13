import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Reusable Statistics Card Component
const StatCard = ({ title, children }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    height: '100%'
  }}>
    <div style={{
      backgroundColor: 'rgb(61, 146, 95)', // Main Green
      color: 'white',
      padding: '15px 20px',
      fontWeight: 'bold',
      fontSize: '1rem',
      display: 'flex',
      justifyContent: 'space-between'
    }}>
      <span>{title}</span>
    </div>
    <div style={{ padding: '20px' }}>
      {children}
    </div>
  </div>
);

export default function Dashboard() {
  const [census, setCensus] = useState([]);
  const [completion, setCompletion] = useState({ breakfast: '88%', ace: '0%' });

  useEffect(() => {
    // Replace with your Node backend call on Port 5000
    // axios.get('http://localhost:5000/api/dashboard/stats').then(res => setCensus(res.data));
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#1a202c', margin: 0, fontSize: '1.8rem' }}>Dashboard Overview</h1>
        <p style={{ color: '#718096', margin: '5px 0 0 0' }}>Real-time census and delivery metrics</p>
      </header>

      {/* Grid Layout for Tablet (2 Columns) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '25px' 
      }}>
        
        {/* Census by Area (Patterned after Image 3) */}
        <StatCard title="Census by Area (March 11, 2026)">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                <th style={{ padding: '12px 8px' }}>Area</th>
                <th>Meal Distribution</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>ACE</td>
                <td>Regular</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'rgb(61, 146, 95)' }}>17</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 8px' }}></td>
                <td>Therapeutic</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>10</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 8px' }}></td>
                <td>Special</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>5</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #f1f5f9' }}>
                <td colSpan="2" style={{ padding: '12px 8px', fontWeight: 'bold' }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'rgb(231, 171, 56)' }}>32</td>
              </tr>
            </tfoot>
          </table>
        </StatCard>

        {/* Delivery Completion (Patterned after Image 3) */}
        <StatCard title="Delivery Completion">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'rgb(231, 171, 56)' }}>88%</div>
              <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>Breakfast Success Rate</div>
            </div>
            
            <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>ACE GAC (Event)</span>
                <span style={{ fontWeight: 'bold', color: '#e53e3e' }}>0%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#edf2f7', borderRadius: '4px' }}>
                <div style={{ width: '0%', height: '100%', background: '#e53e3e', borderRadius: '4px' }}></div>
              </div>
            </div>

            <div style={{ paddingTop: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Main Wards</span>
                <span style={{ fontWeight: 'bold', color: 'rgb(61, 146, 95)' }}>88%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#edf2f7', borderRadius: '4px' }}>
                <div style={{ width: '88%', height: '100%', background: 'rgb(61, 146, 95)', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </StatCard>

      </div>
    </div>
  );
}