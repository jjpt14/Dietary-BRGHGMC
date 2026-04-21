import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Info, Filter, Utensils, Printer, FileText, 
  LayoutList, CheckCircle2, Clock, Pill, AlertCircle, 
  Calendar, Star, ClipboardList
} from 'lucide-react';

export default function FoodService({ currentUser }) {
  // Tabs: 'meals', 'ons', 'events', 'completed', 'cards'
  const [activeTab, setActiveTab] = useState('meals'); 

  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [events, setEvents] = useState([]); 
  const [menus, setMenus] = useState([]);
  const [onsTasks, setOnsTasks] = useState([]); // <-- ONS State added here
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [wardFilter, setWardFilter] = useState('All');
  const [dietFilter, setDietFilter] = useState('All');
  const [cardMeal, setCardMeal] = useState('');

  // Time & Session Logic
  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 10) return "Breakfast";
    if (hour >= 10 && hour < 11) return "AM Snack";
    if (hour >= 11 && hour < 15) return "Lunch"; 
    if (hour >= 15 && hour < 17) return "PM Snack";
    if (hour >= 17 && hour < 21) return "Dinner";
    if (hour >= 21 || hour < 5) return "Midnight Snack";
    
    return "Breakfast"; 
  };

  const getMealTimeRange = (meal) => {
    switch(meal) {
      case "Breakfast": return "06:00 AM - 09:00 AM";
      case "AM Snack":  return "10:00 AM - 10:30 AM";
      case "Lunch":     return "11:00 AM - 02:00 PM";
      case "PM Snack":  return "03:00 PM - 03:30 PM";
      case "Dinner":    return "05:00 PM - 08:00 PM";
      case "Midnight Snack": return "09:00 PM - 10:00 PM";
      default: return "Flexible";
    }
  };

  const checkIsLate = (meal) => {
    const hour = new Date().getHours();
    if (meal === 'Breakfast' && hour >= 9) return true;
    if (meal === 'Lunch' && hour >= 14) return true;
    if (meal === 'Dinner' && hour >= 20) return true;
    return false;
  };

  const currentMeal = getCurrentMeal();
  const timeRange = getMealTimeRange(currentMeal);
  const isLate = checkIsLate(currentMeal);

  // Fetching Functions declared before useEffect
  const fetchPatients = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patients');
      setPatients(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu/events');
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todaysEvents = res.data.filter(e => {
        if (!e.event_date) return false;
        return e.event_date.split('T')[0] === todayStr;
      });
      setEvents(todaysEvents);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu/history');
      setMenus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOnsTasks = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/ons/prep-tasks');
      setOnsTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch ONS tasks:", err);
    }
  };

  useEffect(() => { 
    fetchPatients(); 
    fetchEvents(); 
    fetchMenus(); 
    fetchOnsTasks(); // <-- ONS fetch integrated here
    setCardMeal(getCurrentMeal());
  }, []);

  useEffect(() => {
    if (activeTab === 'completed') {
      const servedPatients = patients.filter(p => p.status === 'Served');
      
      const dispatchedEvents = events.filter(e => e.is_dispatched).map(e => ({
        hospital_number: `EVT-${e.id}`,
        name: e.title,
        ward: 'Special Function',
        room_number: `${e.pax} PAX`,
        kind_of_diet: 'Event Menu',
        status: 'Served',
        serve_time: e.dispatched_at || e.updated_at,
        delivered_by: e.delivered_by,
        isEvent: true 
      }));

      // NEW: Map the completed ONS tasks so they match the standard format
      const servedOns = onsTasks.filter(t => t.served_time).map(t => ({
        hospital_number: `ONS-${t.id}`,
        name: `${t.surname}, ${t.first_name}`,
        ward: t.ward,
        room_number: t.room_number || '',
        kind_of_diet: `${t.nutritional} (${t.scoops} Scoops)`,
        status: 'Served',
        serve_time: t.served_time,
        delivered_by: 'Dietary Staff', 
        isEvent: false,
        isOns: true // Flag to identify it in the UI
      }));

      // Merge all 3 types of completed items and sort by newest first
      const merged = [...servedPatients, ...dispatchedEvents, ...servedOns].sort((a, b) => 
        new Date(b.serve_time) - new Date(a.serve_time)
      );

      setFilteredPatients(merged.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      return;
    }

    let result = patients;
    
    // Apply Filters (Search, Ward, Diet)
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.hospital_number.includes(searchTerm));
    }
    if (wardFilter !== 'All') {
      result = result.filter(p => p.ward === wardFilter);
    }
    if (dietFilter !== 'All') {
      result = result.filter(p => p.kind_of_diet === dietFilter);
    }

    if (activeTab === 'meals' || activeTab === 'cards') {
      result = result.filter(p => (activeTab === 'cards' || p.status !== 'Served') && !['tube feeding', 'liquid', 'palatable'].some(d => p.kind_of_diet.toLowerCase().includes(d)));
    }

    setFilteredPatients(result);
  }, [searchTerm, wardFilter, dietFilter, patients, events, onsTasks, activeTab]); 

  const handleAction = async (hospitalNumber, actionType) => {
    try {
      const currentStaff = currentUser?.full_name || "System Staff";
      await axios.post('http://localhost:5000/api/serve-patient', { 
        hospitalNumber, mealType: currentMeal, status: actionType, deliveredBy: currentStaff 
      });
      setPatients(prev => prev.map(p => p.hospital_number === hospitalNumber ? { ...p, status: 'Served', delivery_remark: isLate ? 'Late Delivery' : 'On Time', serve_time: new Date().toISOString(), delivered_by: currentStaff } : p));
      setSelectedPatient(null);
    } catch (err) { alert(err.message); }
  };

  const handleEventDelivery = async (eventId) => {
    try {
      const currentStaff = currentUser?.full_name || "System Staff";
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await axios.patch(`http://localhost:5000/api/menu/event-status/${eventId}`, { is_dispatched: true, delivered_by: currentStaff });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_dispatched: true, dispatched_at: new Date().toISOString(), completed_time: timeStr, delivered_by: currentStaff } : e));
    } catch (err) { alert("Error dispatching event."); }
  };

  const wards = ['All', ...new Set(patients.map(p => p.ward))];
  const diets = ['All', ...new Set(patients.map(p => p.kind_of_diet))];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Food Service Census...</div>;

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>
        {`
          @media print { 
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background-color: white !important;
            }
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area {
              position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0;
            }
            .no-print { display: none !important; } 
            .diet-card-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 15px !important; }
            .diet-card { border: 1px solid #000 !important; page-break-inside: avoid; background-color: white !important; }
          }
        `}
      </style>

      <header className="no-print" style={{ marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: '#2d3748', margin: '0', fontSize: '1.8rem' }}>Food Service & Dispatch</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Real-time meal distribution and logs.</p>
          </div>
          <div style={tipsContainer}>
            <div style={{ color: '#166534', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={16} /> Session: {currentMeal.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>Window: {timeRange}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('meals')} style={activeTab === 'meals' ? activeTabStyle : inactiveTabStyle}><Utensils size={18} /> Meals</button>
          <button onClick={() => setActiveTab('ons')} style={activeTab === 'ons' ? activeTabStyle : inactiveTabStyle}><Pill size={18} /> ONS & TF</button>
          <button onClick={() => setActiveTab('events')} style={activeTab === 'events' ? activeEventTabStyle : inactiveTabStyle}><Calendar size={18} /> Special Functions</button>
          <button onClick={() => setActiveTab('completed')} style={activeTab === 'completed' ? activeTabStyle : inactiveTabStyle}><CheckCircle2 size={18} /> Completed History</button>
          <button onClick={() => setActiveTab('cards')} style={activeTab === 'cards' ? activeTabStyle : inactiveTabStyle}><Printer size={18} /> Print Diet Cards</button>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="no-print" style={filterBarContainer}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search style={searchIconStyle} size={18} />
          <input style={searchFieldStyle} placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        {/* Only show Ward/Diet filters for relevant tabs */}
        {['meals', 'ons', 'cards'].includes(activeTab) && (
          <div style={{ display: 'flex', gap: '10px', flex: '1 1 400px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
              {wards.map(w => <option key={w} value={w}>{w === 'All' ? 'All Wards' : w}</option>)}
            </select>
            <select style={selectStyle} value={dietFilter} onChange={(e) => setDietFilter(e.target.value)}>
              {diets.map(d => <option key={d} value={d}>{d === 'All' ? 'All Diets' : d}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* TABS CONTENT */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* 1. MEALS TAB */}
        {activeTab === 'meals' && filteredPatients.map(p => (
          <div key={p.hospital_number} onClick={() => setSelectedPatient(p)} style={patientCardStyle(p.status, activeTab)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={avatarStyle}><strong>{p.ward.charAt(0)}</strong></div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{p.ward} - {p.room_number || p.bed_no}</div>
                <div style={{ color: '#64748b' }}>{p.name} | #{p.hospital_number}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <span style={dietBadgeStyle(p.kind_of_diet)}>{p.kind_of_diet}</span>
              <button style={serveActionBtn}>Serve Now</button>
            </div>
          </div>
        ))}

        {/* 2. ONS & TF TAB (Connected to ONS API) */}
        {/* Inside FoodService.jsx -> ONS & TF Tab Mapping */}
{activeTab === 'ons' && onsTasks
  .filter(t => !t.served_time) //
  .filter(t => (wardFilter === 'All' || t.ward === wardFilter))
  .map(task => (
    <div key={task.id} style={patientCardStyle('Pending', 'ons')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{...avatarStyle, backgroundColor: '#f0fdf4'}}>
          <Pill size={20} color="rgb(61, 146, 95)" />
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>
            {task.ward} - {task.nutritional}
          </div>
          <div style={{ color: '#64748b' }}>
            {task.surname}, {task.first_name} | {task.scoops} Scoops
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {/* Updated Badge: Changed from "Prepared by Kitchen" to "READY" */}
        {task.dispatch_time ? (
          <span style={{ 
            backgroundColor: '#dcfce7', 
            color: '#15803d', 
            padding: '4px 10px', 
            borderRadius: '6px', 
            fontSize: '0.75rem', 
            fontWeight: 'bold' 
          }}>
            READY
          </span>
        ) : (
          <span style={{ 
            backgroundColor: '#fffbeb', 
            color: '#b45309', 
            padding: '4px 10px', 
            borderRadius: '6px', 
            fontSize: '0.75rem', 
            fontWeight: 'bold', 
            border: '1px solid #fde68a' 
          }}>
            AWAITING KITCHEN
          </span>
        )}
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            try {
              // Now calling the fixed PostgreSQL endpoint
              await axios.patch(`http://localhost:5000/api/ons/mark-served/${task.id}`);
              fetchOnsTasks(); // Refresh list to remove served item
            } catch (err) {
              console.error("Dispatch Error:", err);
              alert("Failed to mark as served.");
            }
          }} 
          style={{
            ...serveActionBtn, 
            opacity: task.dispatch_time ? 1 : 0.5, 
            cursor: task.dispatch_time ? 'pointer' : 'not-allowed'
          }}
          disabled={!task.dispatch_time} 
        >
          Mark Served
        </button>
      </div>
    </div>
))}
        {/* 3. SPECIAL FUNCTIONS TAB */}
        {activeTab === 'events' && events.map(event => {
          const isDone = event.is_completed === true;
          const isServed = event.is_dispatched === true;
          return (
            <div key={event.id} style={{ ...patientCardStyle('Pending', 'events'), borderLeft: `8px solid ${isServed ? '#cbd5e0' : (isDone ? '#f59e0b' : '#94a3b8')}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ ...avatarStyle, backgroundColor: '#fff7ed' }}><Star size={20} color="#f59e0b" /></div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{event.title} <small style={{ color: '#f59e0b' }}>({event.pax} PAX)</small></div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{event.menu_details}</div>
                </div>
              </div>
              <div>
                {isServed ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#166534', fontWeight: 'bold' }}>EVENT SERVED</div>
                    <div style={{ fontSize: '0.8rem' }}>at {event.completed_time}</div>
                  </div>
                ) : (
                  <button onClick={() => handleEventDelivery(event.id)} disabled={!isDone} style={{ ...serveActionBtn, backgroundColor: isDone ? '#f59e0b' : '#cbd5e1', cursor: isDone ? 'pointer' : 'not-allowed' }}>
                    {isDone ? 'Mark as Served' : 'In Preparation'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* 4. COMPLETED HISTORY (MERGED) */}
        {activeTab === 'completed' && filteredPatients.map(p => (
          <div key={p.hospital_number} style={{ 
            ...patientCardStyle('Served', 'completed'), 
            borderLeft: p.isEvent ? '8px solid #f59e0b' : p.isOns ? '8px solid #3b82f6' : '8px solid #cbd5e0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={avatarStyle}>
                {p.isEvent ? <Star size={18} color="#f59e0b" /> : p.isOns ? <Pill size={18} color="#3b82f6" /> : <strong>{p.ward.charAt(0)}</strong>}
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{p.ward} {p.isEvent ? '' : p.room_number ? `- ${p.room_number}` : ''}</div>
                <div style={{ color: '#64748b' }}>
                  {p.name} 
                  {p.isOns && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{p.kind_of_diet}</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: p.isOns ? '#1d4ed8' : '#166534', fontWeight: 'bold', fontSize: '0.85rem' }}>
                {p.isEvent ? 'EVENT DELIVERED' : p.isOns ? 'ONS DISPATCHED' : 'SERVED'}
              </div>
              <div style={{ fontWeight: 'bold' }}>at {new Date(p.serve_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Staff: {p.delivered_by}</div>
            </div>
          </div>
        ))}
        
        {/* Empty State for Meals/Cards */}
        {filteredPatients.length === 0 && activeTab === 'meals' && (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px' }}>
            No patients match your current search or filters.
          </div>
        )}

        {/* Empty State for ONS */}
        {onsTasks.length === 0 && activeTab === 'ons' && (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px' }}>
            No ONS tasks to dispatch currently.
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 5. PRINT CARDS TAB */}
      {/* ========================================== */}
      {activeTab === 'cards' && (
        <div className="printable-area">
          <div className="no-print" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
               <div>
                 <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>Print Configuration</h2>
                 <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <strong style={{ fontSize: '0.9rem' }}>Meal time on Card:</strong>
                     <select style={selectStyle} value={cardMeal} onChange={(e) => setCardMeal(e.target.value)}>
                       <option value="Breakfast">Breakfast</option>
                       <option value="AM Snack">AM Snack</option>
                       <option value="Lunch">Lunch</option>
                       <option value="PM Snack">PM Snack</option>
                       <option value="Dinner">Dinner</option>
                       <option value="Midnight Snack">Midnight Snack</option>
                     </select>
                   </div>
                   <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/>
                      Showing {filteredPatients.length} cards based on your filters above.
                   </div>
                 </div>
               </div>
               <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', color: '#0f172a', border: '2px solid #0f172a', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                 <Printer size={20} /> Print Cards
               </button>
             </div>
           </div>

           {/* Diet Card Grid for Printing */}
           <div className="diet-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
             {filteredPatients.map(p => {
               // Get exact colors from the matrix mapping
               const currentDietStyle = dietBadgeStyle(p.kind_of_diet);
               const isHighlighted = p.kind_of_diet.toUpperCase() !== 'REGULAR';

               return (
                 <div key={p.hospital_number} className="diet-card" style={{ backgroundColor: 'white', border: '1px solid #000', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                     <div>
                       <div style={{ fontWeight: 'bold' }}>Patient Name:</div>
                       <div>{p.name}</div>
                     </div>
                     <div>
                       <div style={{ fontWeight: 'bold' }}>WARD:</div>
                       <div>{p.ward}</div>
                     </div>
                   </div>

                   <div>
                     <div style={{ fontWeight: 'bold' }}>Date:</div>
                     <div>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                   </div>

                   <div>
                     <div style={{ 
                       fontWeight: 'bold', 
                       fontSize: '1.2rem', 
                       // Apply exact background and text color from the Matrix
                       backgroundColor: isHighlighted ? currentDietStyle.backgroundColor : 'transparent', 
                       color: isHighlighted ? currentDietStyle.color : '#000',
                       display: 'inline-block',
                       padding: isHighlighted ? '2px 8px' : '0',
                       borderRadius: '4px'
                     }}>
                       {p.kind_of_diet.toUpperCase()}
                     </div>
                     <div style={{ fontWeight: 'bold' }}>{cardMeal.toUpperCase()}</div>
                   </div>

                   <div>
                     <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px' }}>Utensils:</div>
                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                       <tbody>
                         <tr>
                           <td style={{ border: '1px solid #000', padding: '4px' }}>6 compartment tray</td>
                           <td style={{ border: '1px solid #000', padding: '4px', width: '30px' }}></td>
                         </tr>
                         <tr>
                           <td style={{ border: '1px solid #000', padding: '4px' }}>6 compartment cover</td>
                           <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                         </tr>
                         <tr>
                           <td style={{ border: '1px solid #000', padding: '4px' }}>Stainless Tray</td>
                           <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                         </tr>
                       </tbody>
                     </table>
                   </div>

                   <div style={{ marginTop: 'auto' }}>
                     <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Checked by:</div>
                     <div style={{ borderBottom: '1px solid #000', width: '150px', height: '20px', marginTop: '10px' }}></div>
                   </div>

                 </div>
               );
             })}
           </div>
        </div>
      )}

      {/* DISPATCH TRAY VERIFICATION MODAL */}
      {selectedPatient && activeTab === 'meals' && (() => {
        const matchingMenu = menus.find(m => 
          m.diet_type === selectedPatient.kind_of_diet && 
          m.meal_type === currentMeal
        );

        return (
          <div style={modalOverlay}>
            <div style={modalContainer}>
              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                  <ClipboardList size={24} color="#334155" />
                  <h2 style={{ margin: 0, color: '#1e293b' }}>Tray Verification</h2>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Patient Details</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{selectedPatient.name}</div>
                  <div style={{ color: '#475569', marginBottom: '10px' }}>{selectedPatient.ward} - {selectedPatient.room_number || selectedPatient.bed_no}</div>
                  <span style={dietBadgeStyle(selectedPatient.kind_of_diet)}>{selectedPatient.kind_of_diet}</span>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                  <div style={{ color: '#166534', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Utensils size={14} /> {currentMeal} Menu Preview
                  </div>
                  
                  {matchingMenu ? (
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>
                        {matchingMenu.protein_dish || 'Standard Diet Items'}
                      </div>
                      <div style={{ color: '#64748b', marginTop: '4px' }}>
                        {matchingMenu.vegetable_dish || 'Standard Sides'}
                      </div>
                      
                      {!matchingMenu.is_completed && (
                        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#b45309', display: 'flex', gap: '6px' }}>
                          <AlertCircle size={14} style={{flexShrink: 0, marginTop: '2px'}}/>
                          Kitchen has not marked this diet as fully prepared yet. Proceed if confirmed.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#b45309', fontStyle: 'italic', fontSize: '0.9rem', display: 'flex', gap: '6px' }}>
                      <AlertCircle size={14} style={{flexShrink: 0, marginTop: '2px'}}/> 
                      No specific menu items are set for {selectedPatient.kind_of_diet} ({currentMeal}). Standard dietary protocol applies.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                  <button onClick={() => setSelectedPatient(null)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white', fontWeight: 'bold', color: '#475569' }}>
                    Cancel
                  </button>
                  <button onClick={() => handleAction(selectedPatient.hospital_number, 'Served')} style={{ flex: 2, padding: '12px', background: 'rgb(61, 146, 95)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} /> Confirm Dispatch
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ================= STYLES =================
const dietBadgeStyle = (diet) => {
  const colors = {
    'Regular': { bg: '#FFFFFF', text: '#000', b: '#cbd5e1' },
    'Soft': { bg: '#FDE69D', text: '#000', b: '#F8CBAD' },
    'LSLF': { bg: '#CD5C5C', text: '#FFF', b: '#B52A2A' },
    'Diabetic': { bg: '#FF99FF', text: '#000', b: '#E066E0' },
    'HAD': { bg: '#7030A0', text: '#FFF', b: '#4C1B73' },
    'EDCF': { bg: '#4A86E8', text: '#FFF', b: '#2B5AA5' },
    'Low Purine/Renal': { bg: '#6AA84F', text: '#FFF', b: '#38761D' },
    'General Liquid': { bg: '#E69138', text: '#FFF', b: '#B45F06' },
    'Clear Liquid': { bg: '#F9CB9C', text: '#000', b: '#F6A869' },
    'Tube Feeding': { bg: '#FFFF00', text: '#000', b: '#F1C232' },
    'Palatable': { bg: '#F1C232', text: '#000', b: '#BF9000' }
  };
  const s = colors[diet] || { bg: '#f1f5f9', text: '#475569', b: '#cbd5e1' };
  return { backgroundColor: s.bg, color: s.text, border: `1px solid ${s.b}`, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' };
};

const activeTabStyle = { background: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
const activeEventTabStyle = { background: '#f59e0b', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
const inactiveTabStyle = { background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const tipsContainer = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 20px', borderRadius: '8px' };

// Added flexWrap and alignItems to prevent overlap
const filterBarContainer = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', marginBottom: '25px', background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const searchFieldStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' };
const searchIconStyle = { position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' };
const selectStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', flex: 1, minWidth: '150px' };

const patientCardStyle = (s, t) => ({ backgroundColor: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: `8px solid ${t === 'completed' ? '#cbd5e0' : 'rgb(61, 146, 95)'}`, cursor: 'pointer' });
const avatarStyle = { backgroundColor: '#f1f5f9', width: '45px', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%' };
const serveActionBtn = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContainer = { backgroundColor: 'white', borderRadius: '12px', width: '450px' };