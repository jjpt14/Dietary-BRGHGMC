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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChefHat size={32} color="rgb(61, 146, 95)" />
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e293b' }}>Kitchen Production Plan</h1>
          </div>
          <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Real-time requirements for {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={btnSecondary} onClick={() => setShowEventModal(true)}><Calendar size={18}/> Schedule Event</button>
          <button style={{...btnSecondary, color: '#0369a1', borderColor: '#bae6fd'}} onClick={handleCloneYesterday}><Copy size={18}/> Sync Previous Day</button>
        </div>
      </header>

      {/* SPECIAL FUNCTIONS SECTION */}
      <h3 style={sectionTitle}>Special Functions</h3>
      <div style={{...cardStyle, marginBottom: '30px', borderTop: '4px solid #f59e0b', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
          {events.map(event => (
            <div key={event.id} style={{...eventCard, borderLeft: event.is_completed ? '4px solid #10b981' : '4px solid #f59e0b'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block' }}>{event.title}</strong>
                  {event.is_completed && event.completed_time && <span style={{...logText, display: 'block', marginTop: '4px'}}>Completed @ {event.completed_time}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={paxBadge}>{event.pax} PAX</span>
                  <button onClick={() => handleDeleteEvent(event.id)} style={actionBtn}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {event.meal_type && event.meal_type.split(',').map((meal, index) => <span key={index} style={mealBadge}>{meal.trim()}</span>)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px', minHeight: '30px' }}>{event.menu_details}</div>
              <button onClick={() => toggleEventComplete(event.id, event.is_completed)} style={event.is_completed ? statusBtnDone : statusBtnEventPending}>
                {event.is_completed ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {event.is_completed ? 'Service Ready' : 'In Prep'}
              </button>
            </div>
          ))}
          {events.length === 0 && <div style={{ color: '#64748b', fontSize: '0.9rem' }}>No special events for today.</div>}
        </div>
      </div>

      <h3 style={sectionTitle}>Dietary Production Board</h3>
      <div style={gridDisplay}>
        {groupedMenus.map(group => (
          <div key={group.diet} style={{...dietCard, border: group.isDietFullyPrepared ? '2px solid #10b981' : '1px solid #e2e8f0'}}>
            <div style={{...dietCardHeader, backgroundColor: group.isDietFullyPrepared ? '#f0fdf4' : '#f8fafc'}}>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={dietBadgeStyle(group.diet)}>{group.diet}</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={qtyHighlight}>{group.count} <small>PAX</small></div>
                <button onClick={() => handleOpenBundle(group.diet)} style={addBundleBtn}><Plus size={16}/></button>
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
                      <div style={{...menuItemBox, borderLeft: meal.is_completed ? '4px solid #10b981' : '4px solid #e2e8f0'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{fontWeight:'600', fontSize:'0.85rem'}}>{meal.protein_dish || '-'}</div>
                            <div style={{fontSize:'0.75rem', color:'#64748b'}}>{meal.vegetable_dish}</div>
                          </div>
                          <button onClick={() => handleDeleteMenu(meal.id)} style={actionBtn}><Trash2 size={14} color="#ef4444"/></button>
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
          <div style={{...modalContent, width: '600px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px'}}>
              <h3 style={{ margin: 0 }}><span style={dietBadgeStyle(bundleForm.diet_type)}>{bundleForm.diet_type}</span> Daily Plan</h3>
              <X onClick={() => setShowBundleModal(false)} cursor="pointer" color="#64748b" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxHeight: '60vh', overflowY: 'auto' }}>
              {MEAL_TYPES.map(meal => (
                <div key={meal} style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>{meal}</h4>
                  <div style={formGroup}>
                    <input style={inputStyle} placeholder="Protein Dish" value={bundleForm.meals[meal].protein_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], protein_dish: e.target.value}}})} />
                    <input style={inputStyle} placeholder="Vegetable Dish" value={bundleForm.meals[meal].vegetable_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], vegetable_dish: e.target.value}}})} />
                  </div>
                </div>
              ))}
            </div>
            <button style={{...btnPrimary, marginTop: '15px', justifyContent: 'center'}} onClick={handleSaveBundle}>Save Full Day Plan</button>
          </div>
        </div>
      )}

      {/* MODAL FOR EVENT */}
      {showEventModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
              <h3 style={{ margin: 0 }}>Schedule Special Function</h3>
              <X onClick={() => setShowEventModal(false)} cursor="pointer" color="#64748b" />
            </div>
            <div style={formGroup}><label style={labelStyle}>Event Name</label><input style={inputStyle} value={eventForm.event_name} onChange={e => setEventForm({...eventForm, event_name: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Date</label><input style={inputStyle} type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}/></div>
            <div style={formGroup}>
              <label style={labelStyle}>Meal Times</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {MEAL_TYPES.map(meal => (
                  <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={eventForm.meal_type.includes(meal)} onChange={(e) => {
                        let current = eventForm.meal_type ? eventForm.meal_type.split(', ') : [];
                        if (e.target.checked) current.push(meal); else current = current.filter(m => m !== meal);
                        setEventForm({...eventForm, meal_type: current.join(', ')});
                      }}/> {meal}
                  </label>
                ))}
              </div>
            </div>
            <div style={formGroup}><label style={labelStyle}>Pax</label><input style={inputStyle} type="number" value={eventForm.pax} onChange={e => setEventForm({...eventForm, pax: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Details</label><textarea style={{...inputStyle, minHeight: '60px'}} value={eventForm.menu_details} onChange={e => setEventForm({...eventForm, menu_details: e.target.value})}/></div>
            <button style={{...btnPrimary, marginTop: '10px', justifyContent: 'center'}} onClick={handleSaveEvent}>Save Event</button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES (Kept exactly as your last version for UI consistency)
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
  return { backgroundColor: style.bg, color: style.text, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${style.border}`, textTransform: 'uppercase' };
};

const actionBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px' };
const addBundleBtn = { background: 'rgb(61, 146, 95)', color: 'white', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' };
const modalOverlay = { position:'fixed', inset: 0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent = { background:'white', padding:'25px', borderRadius:'12px' };
const formGroup = { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' };
const labelStyle = { fontSize: '0.8rem', fontWeight: '600' };
const inputStyle = { padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1', width: '100%' };
const logText = { fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '25px' };
const sectionTitle = { fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' };
const cardStyle = { backgroundColor: 'white', borderRadius: '12px' };
const gridDisplay = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' };
const dietCard = { background: 'white', borderRadius: '12px', overflow: 'hidden' };
const dietCardHeader = { padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' };
const dietCardBody = { padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const mealSection = { display: 'flex', flexDirection: 'column', gap: '5px' };
const mealLabel = { fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' };
const qtyHighlight = { background: '#1e293b', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' };
const menuItemBox = { padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const eventCard = { background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const paxBadge = { background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' };
const statusBtnPending = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '6px', fontSize: '0.65rem', cursor: 'pointer' };
const statusBtnDone = { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold' };
const statusBtnEventPending = { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px', borderRadius: '6px', fontSize: '0.7rem' };
const noMenuPlaceholder = { padding: '10px', border: '1px dashed #e2e8f0', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.7rem', textAlign: 'center' };
const btnPrimary = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const btnSecondary = { backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const mealBadge = { background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem' };