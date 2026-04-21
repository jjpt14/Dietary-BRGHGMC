import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, ChefHat, CheckCircle2, Circle, 
  Calendar, LayoutGrid, List, X, Trash2, Edit2, Copy
} from 'lucide-react';

export default function MenuPreparation() {
  const [menus, setMenus] = useState([]);
  const [events, setEvents] = useState([]);
  const [censusCounts, setCensusCounts] = useState({});
  const [viewMode, setViewMode] = useState('card');
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  

  const dietCategories = [
    "Regular", "Soft", "LSLF", "Diabetic", "HAD", "EDCF", 
    "Low Purine/Renal", "General Liquid", "Clear Liquid"
  ];

  const MEAL_TYPES = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Midnight Snack'];

  // Helper to get local YYYY-MM-DD
  const getLocalToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const initialBundleMeals = MEAL_TYPES.reduce((acc, meal) => {
    acc[meal] = { protein_dish: '', vegetable_dish: '' };
    return acc;
  }, {});

  const [bundleForm, setBundleForm] = useState({
    diet_type: 'Regular',
    date: getLocalToday(),
    meals: JSON.parse(JSON.stringify(initialBundleMeals))
  });

  const [eventForm, setEventForm] = useState({
    event_name: '', pax: 0, meal_type: '', menu_details: '', date: getLocalToday()
  });

  useEffect(() => { 
    fetchHistory();
    fetchCensus();
    fetchEvents();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu/history');
      setMenus(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCensus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patients');
      const counts = res.data.reduce((acc, p) => {
        if (p.npo_status) return acc;
        const diet = p.kind_of_diet || 'Regular';
        acc[diet] = (acc[diet] || 0) + 1;
        return acc;
      }, {});
      setCensusCounts(counts);
    } catch (err) { console.error("Census Error:", err); }
  };

  // FETCH: Now with Timezone-Safe Logic
  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu/events');
      
      const today = new Date();
      const todayDate = today.getDate();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();

      // Filter by comparing local date parts, ignoring the UTC T16:00:00Z shift
      const todaysEvents = res.data.filter(e => {
        if (!e.event_date) return false;
        const d = new Date(e.event_date);
        return (
          d.getDate() === todayDate &&
          d.getMonth() === todayMonth &&
          d.getFullYear() === todayYear
        );
      });

      setEvents(todaysEvents);
    } catch (err) { console.error("Event Fetch Error:", err); }
  };

  const handleOpenBundle = (diet) => {
    setBundleForm({
      diet_type: diet,
      date: getLocalToday(),
      meals: JSON.parse(JSON.stringify(initialBundleMeals))
    });
    setShowBundleModal(true);
  };

  const handleSaveBundle = async () => {
    try {
      const promises = MEAL_TYPES.map(meal => {
        const data = bundleForm.meals[meal];
        if (data.protein_dish.trim() || data.vegetable_dish.trim()) {
          return axios.post('http://localhost:5000/api/menu/save-menu', {
            meal_type: meal,
            diet_type: bundleForm.diet_type,
            protein_dish: data.protein_dish,
            vegetable_dish: data.vegetable_dish
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setShowBundleModal(false);
      fetchHistory();
    } catch (err) { alert("Save failed."); }
  };

  const handleCloneYesterday = async () => {
    if (!window.confirm("Clone yesterday's menu? This will copy all items from the previous day to today.")) return;
    
    try {
      // 1. Calculate Yesterday's date parts locally
      const target = new Date();
      target.setDate(target.getDate() - 1);
      const yDate = target.getDate();
      const yMonth = target.getMonth();
      const yYear = target.getFullYear();
      
      // 2. Filter from the menus state
      const yesterdayMenus = menus.filter(m => {
        // We check both created_at (timestamp) and event_date (date string)
        const d = new Date(m.event_date || m.created_at);
        return (
          d.getDate() === yDate &&
          d.getMonth() === yMonth &&
          d.getFullYear() === yYear
        );
      });

      if (yesterdayMenus.length === 0) {
        alert("No menus were found for yesterday to clone.");
        return;
      }

      // 3. Prepare the POST requests
      // We explicitly set the event_date to Today so they show up in the current view
      const todayStr = getLocalToday();

      const promises = yesterdayMenus.map(m => 
        axios.post('http://localhost:5000/api/menu/save-menu', {
          meal_type: m.meal_type,
          diet_type: m.diet_type,
          protein_dish: m.protein_dish,
          vegetable_dish: m.vegetable_dish,
          event_date: todayStr, // CRITICAL: Force the date to Today
          // Reset completion status for the new day
          is_completed: false,
          completed_time: null
        })
      );
      
      await Promise.all(promises);
      
      // 4. Refresh the UI
      await fetchHistory();
      alert(`Successfully cloned ${yesterdayMenus.length} menu items!`);
    } catch (err) { 
      console.error("Clone Error:", err);
      alert("Clone failed. Check console for details."); 
    }
  };

  const handleDeleteMenu = async (id) => {
    if (window.confirm("Delete this menu?")) {
      try {
        await axios.delete(`http://localhost:5000/api/menu/${id}`);
        fetchHistory();
      } catch (err) { console.error("Delete failed"); }
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Delete this event?")) {
      try {
        await axios.delete(`http://localhost:5000/api/menu/event/${id}`);
        fetchEvents();
      } catch (err) { console.error("Event delete failed"); }
    }
  };

  const handleSaveEvent = async () => {
    try {
      const payload = {
        ...eventForm,
        event_name: eventForm.event_name,
        date: eventForm.date // Correctly sends "2026-04-18" string
      };
      await axios.post('http://localhost:5000/api/menu/save-event', payload);
      setShowEventModal(false);
      fetchEvents();
    } catch (err) { alert("Event Save failed"); }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      const timeStr = !currentStatus ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      await axios.patch(`http://localhost:5000/api/menu/status/${id}`, { 
        is_completed: !currentStatus,
        completed_time: timeStr
      });
      fetchHistory();
    } catch (err) { console.error("Update failed"); }
  };

  const toggleEventComplete = async (id, currentStatus) => {
    try {
      const timeStr = !currentStatus ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      await axios.patch(`http://localhost:5000/api/menu/event-status/${id}`, { 
        is_completed: !currentStatus, completed_time: timeStr
      });
      fetchEvents();
    } catch (err) { alert(`Update Failed`); }
  };

  // Filtering Logic
  const today = new Date();
  const tD = today.getDate();
  const tM = today.getMonth();
  const tY = today.getFullYear();

  const groupedMenus = dietCategories.map(diet => {
    const dietMenus = menus.filter(m => {
      const d = new Date(m.created_at || m.event_date);
      return m.diet_type === diet && d.getDate() === tD && d.getMonth() === tM && d.getFullYear() === tY;
    });
    const isDietFullyPrepared = dietMenus.length > 0 && dietMenus.every(m => m.is_completed);
    return { diet, isDietFullyPrepared, count: censusCounts[diet] || 0, dietMenus };
  });

  

  return (
    <div style={{ padding: '30px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <header style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ChefHat size={40} color="rgb(61, 146, 95)" />
            <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#1e293b' }}>Kitchen Production Plan</h1>
          </div>
          <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '1.1rem' }}>Real-time requirements for {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={btnSecondary} onClick={() => setShowEventModal(true)}><Calendar size={22}/> Schedule Event</button>
          <button style={{...btnSecondary, color: '#0369a1', borderColor: '#bae6fd'}} onClick={handleCloneYesterday}><Copy size={22}/> Sync Previous Day</button>
        </div>
      </header>

      {/* SPECIAL FUNCTIONS SECTION */}
      <h3 style={sectionTitle}>Special Functions</h3>
      <div style={{...cardStyle, marginBottom: '40px', borderTop: '6px solid #f59e0b', padding: '25px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {events.map(event => (
            <div key={event.id} style={{...eventCard, borderLeft: event.is_completed ? '6px solid #10b981' : '6px solid #f59e0b'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '1.3rem', display: 'block' }}>{event.title}</strong>
                  {event.is_completed && event.completed_time && <span style={{...logText, display: 'block', marginTop: '6px'}}>Completed @ {event.completed_time}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={paxBadge}>{event.pax} PAX</span>
                  <button onClick={() => handleDeleteEvent(event.id)} style={actionBtn}><Trash2 size={20} color="#ef4444"/></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {event.meal_type && event.meal_type.split(',').map((meal, index) => <span key={index} style={mealBadge}>{meal.trim()}</span>)}
              </div>
              <div style={{ fontSize: '1.05rem', color: '#475569', marginBottom: '16px', minHeight: '40px', lineHeight: '1.5' }}>{event.menu_details}</div>
              <button onClick={() => toggleEventComplete(event.id, event.is_completed)} style={event.is_completed ? statusBtnDone : statusBtnEventPending}>
                {event.is_completed ? <CheckCircle2 size={18}/> : <Circle size={18}/>} {event.is_completed ? 'Service Ready' : 'In Prep'}
              </button>
            </div>
          ))}
          {events.length === 0 && <div style={{ color: '#64748b', fontSize: '1.1rem' }}>No special events for today.</div>}
        </div>
      </div>

      <h3 style={sectionTitle}>Dietary Production Board</h3>
      <div style={gridDisplay}>
        {groupedMenus.map(group => (
          <div key={group.diet} style={{...dietCard, border: group.isDietFullyPrepared ? '3px solid #10b981' : '1px solid #cbd5e1'}}>
            <div style={{...dietCardHeader, backgroundColor: group.isDietFullyPrepared ? '#f0fdf4' : '#f8fafc'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <span style={dietBadgeStyle(group.diet)}>{group.diet}</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={qtyHighlight}>{group.count} <small style={{fontSize: '0.85rem', marginLeft: '4px'}}>PAX</small></div>
                <button onClick={() => handleOpenBundle(group.diet)} style={addBundleBtn}><Plus size={24}/></button>
              </div>
            </div>
            <div style={dietCardBody}>
              {MEAL_TYPES.map(type => {
                const meal = group.dietMenus.find(m => m.meal_type === type);
                return (
                  <div key={type} style={mealSection}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                       <div style={mealLabel}>{type}</div>
                       {meal?.is_completed && <span style={logText}>Done @ {meal.completed_time}</span>}
                    </div>
                    {meal ? (
                      <div style={{...menuItemBox, borderLeft: meal.is_completed ? '6px solid #10b981' : '6px solid #cbd5e1'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ width: '85%' }}>
                            <div style={{fontWeight:'700', fontSize:'1.15rem', color: '#0f172a', marginBottom: '4px'}}>{meal.protein_dish || '-'}</div>
                            <div style={{fontSize:'1rem', color:'#475569'}}>{meal.vegetable_dish}</div>
                          </div>
                          <button onClick={() => handleDeleteMenu(meal.id)} style={actionBtn}><Trash2 size={20} color="#ef4444"/></button>
                        </div>
                        <button onClick={() => toggleComplete(meal.id, meal.is_completed)} style={meal.is_completed ? statusBtnDone : statusBtnPending}>
                           {meal.is_completed ? 'Ready' : 'Mark Ready'}
                        </button>
                      </div>
                    ) : <div style={noMenuPlaceholder}>-</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FOR BUNDLE MENU */}
      {showBundleModal && (
        <div style={modalOverlay}>
          <div style={{...modalContent, width: '700px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px'}}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={dietBadgeStyle(bundleForm.diet_type)}>{bundleForm.diet_type}</span> Daily Plan
              </h3>
              <X onClick={() => setShowBundleModal(false)} cursor="pointer" color="#64748b" size={28} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
              {MEAL_TYPES.map(meal => (
                <div key={meal} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1e293b' }}>{meal}</h4>
                  <div style={formGroup}>
                    <input style={inputStyle} placeholder="Protein Dish" value={bundleForm.meals[meal].protein_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], protein_dish: e.target.value}}})} />
                    <input style={inputStyle} placeholder="Vegetable Dish" value={bundleForm.meals[meal].vegetable_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], vegetable_dish: e.target.value}}})} />
                  </div>
                </div>
              ))}
            </div>
            <button style={{...btnPrimary, marginTop: '20px', justifyContent: 'center', width: '100%'}} onClick={handleSaveBundle}>Save Full Day Plan</button>
          </div>
        </div>
      )}

      {/* MODAL FOR EVENT */}
      {showEventModal && (
        <div style={modalOverlay}>
          <div style={{...modalContent, width: '600px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px'}}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Schedule Special Function</h3>
              <X onClick={() => setShowEventModal(false)} cursor="pointer" color="#64748b" size={28} />
            </div>
            <div style={formGroup}><label style={labelStyle}>Event Name</label><input style={inputStyle} value={eventForm.event_name} onChange={e => setEventForm({...eventForm, event_name: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Date</label><input style={inputStyle} type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}/></div>
            <div style={formGroup}>
              <label style={labelStyle}>Meal Times</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {MEAL_TYPES.map(meal => (
                  <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', cursor: 'pointer' }}>
                    <input type="checkbox" style={{width: '20px', height: '20px'}} checked={eventForm.meal_type.includes(meal)} onChange={(e) => {
                        let current = eventForm.meal_type ? eventForm.meal_type.split(', ') : [];
                        if (e.target.checked) current.push(meal); else current = current.filter(m => m !== meal);
                        setEventForm({...eventForm, meal_type: current.join(', ')});
                      }}/> {meal}
                  </label>
                ))}
              </div>
            </div>
            <div style={formGroup}><label style={labelStyle}>Pax</label><input style={inputStyle} type="number" value={eventForm.pax} onChange={e => setEventForm({...eventForm, pax: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Details</label><textarea style={{...inputStyle, minHeight: '100px'}} value={eventForm.menu_details} onChange={e => setEventForm({...eventForm, menu_details: e.target.value})}/></div>
            <button style={{...btnPrimary, marginTop: '20px', justifyContent: 'center', width: '100%'}} onClick={handleSaveEvent}>Save Event</button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES 
const dietBadgeStyle = (diet) => {
  const dietColors = {
    'Regular': { bg: '#FFFFFF', text: '#000000', border: '#cbd5e1' },
    'Soft': { bg: '#FDE69D', text: '#000000', border: '#F8CBAD' },
    'LSLF': { bg: '#CD5C5C', text: '#FFFFFF', border: '#B52A2A' },
    'Diabetic': { bg: '#FF99FF', text: '#000000', border: '#E066E0' },
    'HAD': { bg: '#7030A0', text: '#FFFFFF', border: '#4C1B73' },
    'EDCF': { bg: '#4A86E8', text: '#FFFFFF', border: '#2B5AA5' },
    'Low Purine/Renal': { bg: '#6AA84F', text: '#FFFFFF', border: '#38761D' },
    'General Liquid': { bg: '#E69138', text: '#FFFFFF', border: '#B45F06' },
    'Clear Liquid': { bg: '#F9CB9C', text: '#000000', border: '#F6A869' }
  };
  const style = dietColors[diet] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  return { backgroundColor: style.bg, color: style.text, padding: '6px 14px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', border: `2px solid ${style.border}`, textTransform: 'uppercase' };
};

const actionBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' };
const addBundleBtn = { background: 'rgb(61, 146, 95)', color: 'white', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' };
const modalOverlay = { position:'fixed', inset: 0, backgroundColor:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent = { background:'white', padding:'30px', borderRadius:'16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const formGroup = { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' };
const labelStyle = { fontSize: '1.05rem', fontWeight: '600', color: '#334155' };
const inputStyle = { padding:'12px', borderRadius:'8px', border:'2px solid #cbd5e1', width: '100%', fontSize: '1rem', boxSizing: 'border-box' };
const logText = { fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '35px', alignItems: 'center' };
const sectionTitle = { fontSize: '1.2rem', color: '#475569', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '0.5px' };
const cardStyle = { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const gridDisplay = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' };
const dietCard = { background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const dietCardHeader = { padding: '20px', borderBottom: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' };
const dietCardBody = { padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const mealSection = { display: 'flex', flexDirection: 'column', gap: '8px' };
const mealLabel = { fontSize: '0.9rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const qtyHighlight = { background: '#1e293b', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold' };
const menuItemBox = { padding: '15px', borderRadius: '10px', border: '2px solid #e2e8f0', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fafafa' };
const eventCard = { background: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e2e8f0' };
const paxBadge = { background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' };
const statusBtnPending = { background: '#f8fafc', color: '#475569', border: '2px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', width: '100%' };
const statusBtnDone = { background: '#dcfce7', color: '#15803d', border: '2px solid #bbf7d0', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' };
const statusBtnEventPending = { background: '#fffbeb', color: '#b45309', border: '2px solid #fde68a', padding: '10px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%' };
const noMenuPlaceholder = { padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '10px', color: '#94a3b8', fontSize: '1rem', textAlign: 'center', fontWeight: '500', backgroundColor: '#f8fafc' };
const btnPrimary = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' };
const btnSecondary = { backgroundColor: 'white', color: '#334155', border: '2px solid #cbd5e1', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' };
const mealBadge = { background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' };