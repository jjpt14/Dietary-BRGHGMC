import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, MapPin, User } from 'lucide-react';

export default function FoodService() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentMeal = "Lunch"; // This can be made dynamic based on time

  useEffect(() => {
    // Fetching the patient list from your Node backend (Port 5000)
    axios.get('http://localhost:5000/api/patients')
      .then(res => {
        setPatients(res.data);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching patients:", err));
  }, []);

  const handleServe = (hospitalNumber) => {
    // API call to update delivery status in PostgreSQL
    axios.post('http://localhost:5000/api/serve-patient', { 
      hospitalNumber, 
      mealType: currentMeal 
    })
    .then(() => {
      // Instant UI update for the tablet user
      setPatients(prev => prev.map(p => 
        p.hospital_number === hospitalNumber ? { ...p, status: 'Served' } : p
      ));
    });
  };

  const isLate = () => {
  const hour = new Date().getHours();
  if (currentMeal === "Breakfast" && hour >= 8) return true;
  if (currentMeal === "Lunch" && hour >= 13) return true;
  if (currentMeal === "Dinner" && hour >= 19) return true;
  return false;
};

  if (loading) return <div style={{ padding: '20px' }}>Loading Patient Census...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '25px' 
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#1a202c', margin: 0 }}>Meal Delivery</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Current Session: <strong>{currentMeal}</strong></p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          backgroundColor: 'white', 
          padding: '10px 15px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <Clock size={18} color="rgb(61, 146, 95)" />
          <span style={{ fontWeight: 'bold', color: '#334155' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* Tablet-Friendly List Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {patients.map((p) => (
          <div key={p.hospital_number} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: `10px solid ${p.status === 'Served' ? '#cbd5e1' : 'rgb(61, 146, 95)'}`,
            transition: 'transform 0.1s active'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <MapPin size={16} color="#64748b" />
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'rgb(61, 146, 95)' }}>
                  {p.ward} - Bed {p.bed_no || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                <User size={16} color="#64748b" />
                <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{p.surname}, {p.first_name}</span>
              </div>
              <div style={{ 
                marginTop: '12px', 
                display: 'inline-block',
                backgroundColor: 'rgba(61, 146, 95, 0.1)', 
                color: 'rgb(61, 146, 95)', 
                padding: '6px 12px', 
                borderRadius: '6px', 
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {p.kind_of_diet}
              </div>
            </div>

            {/* ACTION AREA */}
            <div>
              {p.status === 'Served' ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  color: '#94a3b8',
                  gap: '4px'
                }}>
                  <CheckCircle size={32} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>SERVED</span>
                </div>
              ) : (
                <button 
                  onClick={() => handleServe(p.hospital_number)}
                  style={{
                    backgroundColor: 'rgb(231, 171, 56)', // Secondary Color
                    color: 'white',
                    border: 'none',
                    padding: '18px 30px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(231, 171, 56, 0.3)',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  MARK SERVED
                </button>
                
              )
              }
              <button 
  onClick={() => handleServe(p.hospital_number)}
  style={{
    backgroundColor: isLate() ? '#e53e3e' : 'rgb(231, 171, 56)', // Red if late, Yellow if on time
    color: 'white',
    // ... rest of your styles
  }}
>
  {isLate() ? 'MARK LATE' : 'MARK SERVED'}
</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}