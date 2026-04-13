import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PatientList() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    // API Call to your Node.js backend on Port 5000
    axios.get('http://localhost:5000/api/patients')
      .then(res => setPatients(res.data))
      .catch(err => console.error("Database connection error:", err));
  }, []);

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
      overflow: 'hidden' 
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #edf2f7' }}>
          <tr>
            <th style={{ padding: '15px 20px', color: '#4a5568', fontSize: '0.85rem' }}>WARD / Hospital #</th>
            <th style={{ padding: '15px 20px', color: '#4a5568', fontSize: '0.85rem' }}>Patient Name</th>
            <th style={{ padding: '15px 20px', color: '#4a5568', fontSize: '0.85rem' }}>Prescribed Diet</th>
            <th style={{ padding: '15px 20px', color: '#4a5568', fontSize: '0.85rem' }}>Age / Religion</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.hospital_number} style={{ borderBottom: '1px solid #edf2f7' }}>
              <td style={{ padding: '15px 20px' }}>
                <div style={{ fontWeight: 'bold', color: 'rgb(61, 146, 95)' }}>{p.ward}</div>
                <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>#{p.hospital_number}</div>
              </td>
              <td style={{ fontWeight: '600', color: '#2d3748' }}>{p.surname}, {p.first_name}</td>
              <td>
                <span style={{ 
                  backgroundColor: 'rgba(61, 146, 95, 0.1)', 
                  color: 'rgb(61, 146, 95)', 
                  padding: '5px 14px', 
                  borderRadius: '20px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {p.kind_of_diet || 'Regular'}
                </span>
              </td>
              <td style={{ color: '#718096', fontSize: '0.9rem' }}>{p.age} / {p.religion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}