import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Utensils, PieChart, Activity, 
  CalendarDays, ClipboardList, TrendingUp
} from 'lucide-react';

// Reusable Statistics Card Component
const StatCard = ({ title, icon: Icon, children }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      color: '#1e293b',
      padding: '15px 20px',
      fontWeight: 'bold',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      {Icon && <Icon size={20} color="rgb(61, 146, 95)" />}
      <span>{title}</span>
    </div>
    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  </div>
);

export default function Dashboard() {
  // Raw Data States
  const [rawPatients, setRawPatients] = useState([]);
  const [rawMenus, setRawMenus] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  
  // UI States
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', 'week', 'month', 'year'
  const [loading, setLoading] = useState(true);

  // Processed Data States
  const [censusData, setCensusData] = useState({});
  const [dietData, setDietData] = useState({});
  const [totalPatients, setTotalPatients] = useState(0);
  const [mealsToPrepare, setMealsToPrepare] = useState(0);
  
  const [menuMetrics, setMenuMetrics] = useState({ total: 0, completed: 0, percent: 0 });
  const [eventMetrics, setEventMetrics] = useState({ total: 0, completed: 0, percent: 0 });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!loading) processMetrics();
  }, [timeFilter, rawPatients, rawMenus, rawEvents, loading]);

  const fetchAllData = async () => {
    try {
      const [patientsRes, menusRes, eventsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/patients'),
        axios.get('http://localhost:5000/api/menu/history'),
        axios.get('http://localhost:5000/api/menu/events')
      ]);

      setRawPatients(patientsRes.data);
      setRawMenus(menusRes.data);
      setRawEvents(eventsRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setLoading(false);
    }
  };

  const isWithinRange = (dateString, filter) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    
    if (filter === 'today') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }
    if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      return d >= startOfWeek;
    }
    if (filter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (filter === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return false;
  };

  const processMetrics = () => {
    // 1. Process Census & Wards (Always Real-Time Current Census)
    let grandTotal = 0;
    let solidDietCount = 0;
    const groupedWards = {};
    const groupedDiets = {};

    rawPatients.forEach(p => {
      // Exclude Discharged/Served if necessary, assuming /api/patients is active census
      grandTotal += 1;
      
      // Ward processing
      const ward = p.ward || 'Unassigned';
      if (!groupedWards[ward]) groupedWards[ward] = { total: 0, regular: 0, therapeutic: 0 };
      groupedWards[ward].total += 1;
      if (p.kind_of_diet === 'Regular Diet' || p.kind_of_diet === 'Regular') {
        groupedWards[ward].regular += 1;
      } else {
        groupedWards[ward].therapeutic += 1;
      }

      // Diet processing
      const diet = p.kind_of_diet || 'Unspecified';
      groupedDiets[diet] = (groupedDiets[diet] || 0) + 1;

      // Count solid diets for meal prep calculation (excludes Tube Feeding/Liquids)
      const isLiquidOrTF = ['tube feeding', 'clear liquid', 'palatable'].some(d => diet.toLowerCase().includes(d));
      if (!isLiquidOrTF && !p.npo_status) {
        solidDietCount += 1;
      }
    });

    setCensusData(groupedWards);
    setDietData(groupedDiets);
    setTotalPatients(grandTotal);

    // Assuming 6 meal/snack cycles per solid-diet patient per day
    setMealsToPrepare(solidDietCount * 6);

    // 2. Process Kitchen Production (Filtered by Time Range)
    const validDiets = ["Regular", "Soft", "LSLF", "Diabetic", "HAD", "EDCF", "Low Purine/Renal", "General Liquid", "Clear Liquid", "Regular Diet", "Soft Diet", "Diabetic Diet"];
    
    const filteredMenus = rawMenus.filter(m => 
      isWithinRange(m.event_date || m.created_at, timeFilter) && 
      validDiets.includes(m.diet_type)
    );
    const completedMenus = filteredMenus.filter(m => m.is_completed).length;
    const menuPercent = filteredMenus.length > 0 ? Math.round((completedMenus / filteredMenus.length) * 100) : 0;
    setMenuMetrics({ total: filteredMenus.length, completed: completedMenus, percent: menuPercent });

    // 3. Process Special Events (Filtered by Time Range)
    const filteredEvents = rawEvents.filter(e => isWithinRange(e.event_date, timeFilter));
    const completedEvents = filteredEvents.filter(e => e.is_completed).length;
    const eventPercent = filteredEvents.length > 0 ? Math.round((completedEvents / filteredEvents.length) * 100) : 0;
    setEventMetrics({ total: filteredEvents.length, completed: completedEvents, percent: eventPercent });
  };

  const overallPercent = menuMetrics.total > 0 ? menuMetrics.percent : 0;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in', padding: '30px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER & TIME FILTER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#1e293b', margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={28} color="rgb(61, 146, 95)" /> Dashboard Analytics
          </h1>
          <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Comprehensive overview of facility operations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '8px 15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
          <CalendarDays size={18} color="#64748b" />
          <strong style={{ fontSize: '0.9rem', color: '#334155' }}>Production Range:</strong>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </header>

      {/* QUICK STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Active Census</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', lineHeight: '1.2' }}>{totalPatients}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Meals to Prepare (Today)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', lineHeight: '1.2' }}>{mealsToPrepare}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Based on 6-meal cycle</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Production Rate ({timeFilter})</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: overallPercent === 100 ? '#10b981' : '#1e293b', lineHeight: '1.2' }}>{overallPercent}%</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #8b5cf6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Special Events ({timeFilter})</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', lineHeight: '1.2' }}>{eventMetrics.total}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        
        {/* DYNAMIC CENSUS BY AREA */}
        <StatCard title="Census by Ward" icon={Users}>
          {Object.keys(censusData).length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px 8px' }}>Ward / Area</th>
                    <th>Regular</th>
                    <th>Therapeutic</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(censusData).map(([ward, stats]) => (
                    <tr key={ward} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#1e293b' }}>{ward}</td>
                      <td style={{ color: '#475569' }}>{stats.regular}</td>
                      <td style={{ color: '#f59e0b', fontWeight: '600' }}>{stats.therapeutic}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'rgb(61, 146, 95)' }}>{stats.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', margin: 'auto' }}>No active patients.</div>
          )}
        </StatCard>

        {/* DIET DISTRIBUTION */}
        <StatCard title="Diet Distribution Breakdown" icon={PieChart}>
           {Object.keys(dietData).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
              {Object.entries(dietData)
                .sort((a, b) => b[1] - a[1]) // Sort highest to lowest
                .map(([diet, count]) => {
                  const percent = Math.round((count / totalPatients) * 100);
                  return (
                    <div key={diet} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '40%' }}>
                        <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>{diet}</span>
                      </div>
                      <div style={{ flex: 1, margin: '0 15px' }}>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'rgb(61, 146, 95)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', width: '15%', textAlign: 'right' }}>
                        {count} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>({percent}%)</span>
                      </div>
                    </div>
                  );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', margin: 'auto' }}>No dietary data available.</div>
          )}
        </StatCard>

        {/* TIME RANGE PRODUCTION COMPLETION */}
        <StatCard title={`Production Status (${timeFilter.toUpperCase()})`} icon={ClipboardList}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', justifyContent: 'center', flex: 1 }}>
            
            {/* MASTER MENUS PROGRESS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>Patient Master Menus</span>
                <span style={{ fontWeight: '900', fontSize: '1.1rem', color: menuMetrics.percent === 100 ? 'rgb(61, 146, 95)' : 'rgb(231, 171, 56)' }}>
                  {menuMetrics.percent}%
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '12px' }}>
                {menuMetrics.completed} of {menuMetrics.total} records completed
              </div>
              <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${menuMetrics.percent}%`, height: '100%', background: menuMetrics.percent === 100 ? 'rgb(61, 146, 95)' : 'rgb(231, 171, 56)', borderRadius: '6px', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>

            {/* SPECIAL EVENTS PROGRESS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>Special Functions</span>
                <span style={{ fontWeight: '900', fontSize: '1.1rem', color: eventMetrics.percent === 100 ? 'rgb(61, 146, 95)' : '#e53e3e' }}>
                  {eventMetrics.percent}%
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '12px' }}>
                {eventMetrics.completed} of {eventMetrics.total} events serviced
              </div>
              <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${eventMetrics.percent}%`, height: '100%', background: eventMetrics.percent === 100 ? 'rgb(61, 146, 95)' : '#e53e3e', borderRadius: '6px', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>

          </div>
        </StatCard>

      </div>
    </div>
  );
}