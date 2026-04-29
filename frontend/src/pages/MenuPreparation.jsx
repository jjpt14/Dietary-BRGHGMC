import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, ChefHat, CheckCircle2, Circle, 
  Calendar, LayoutGrid, List, X, Trash2, Edit2, Copy, Printer, Save
} from 'lucide-react';

export default function MenuPreparation() {
  const [menus, setMenus] = useState([]);
  const [events, setEvents] = useState([]);
  const [censusCounts, setCensusCounts] = useState({});
  const [viewMode, setViewMode] = useState('card');
  
  // Inline Editing State
  const [editingMealId, setEditingMealId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Bundle Creation Modal State
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  
  const MEAL_TYPES = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Midnight Snack'];

  // State to track custom fields added DURING THE BUNDLE MODAL SESSION
  const [extraFields, setExtraFields] = useState(
    MEAL_TYPES.reduce((acc, meal) => ({ ...acc, [meal]: [] }), {})
  );

  const dietCategories = [
    "Regular", "Soft", "LSLF", "Diabetic", "HAD", "EDCF", 
    "Low Purine/Renal", "General Liquid", "Clear Liquid"
  ];

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

  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu/events');
      const today = new Date();
      const todayDate = today.getDate();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();

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
    const today = new Date();
    const tD = today.getDate();
    const tM = today.getMonth();
    const tY = today.getFullYear();

    // Find any existing menus for today for this specific diet
    const existingMenus = menus.filter(m => {
      const d = new Date(m.created_at || m.event_date);
      return m.diet_type === diet && d.getDate() === tD && d.getMonth() === tM && d.getFullYear() === tY;
    });

    const loadedMeals = JSON.parse(JSON.stringify(initialBundleMeals));
    const loadedExtraFields = MEAL_TYPES.reduce((acc, meal) => ({ ...acc, [meal]: [] }), {});

    // Pre-fill the form with existing data so they don't have to retype
    existingMenus.forEach(menu => {
      const mealType = menu.meal_type;
      if (MEAL_TYPES.includes(mealType)) {
        loadedMeals[mealType] = {
          id: menu.id, // Keep ID to update instead of insert (if backend handles it)
          protein_dish: menu.protein_dish || '',
          vegetable_dish: menu.vegetable_dish || ''
        };

        const ignoreKeys = ['id', 'meal_type', 'diet_type', 'event_date', 'is_completed', 'completed_time', 'created_at', 'protein_dish', 'vegetable_dish'];
        Object.keys(menu).forEach(key => {
          if (!ignoreKeys.includes(key) && menu[key] && typeof menu[key] === 'string') {
            loadedMeals[mealType][key] = menu[key];
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            // Make sure the extra field appears in the modal
            if (!loadedExtraFields[mealType].find(f => f.id === key)) {
              loadedExtraFields[mealType].push({ id: key, label });
            }
          }
        });
      }
    });

    setBundleForm({
      diet_type: diet,
      date: getLocalToday(),
      meals: loadedMeals
    });
    setExtraFields(loadedExtraFields);
    setShowBundleModal(true);
  };

  const handleAddField = (meal) => {
    const fieldName = window.prompt(`Enter new field name for ${meal} (e.g. Dessert, Carbohydrates):`);
    if (fieldName && fieldName.trim() !== '') {
      const fieldId = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      setExtraFields(prev => {
        const currentMealFields = prev[meal] || [];
        if (!currentMealFields.find(f => f.id === fieldId)) {
          return { ...prev, [meal]: [...currentMealFields, { id: fieldId, label: fieldName }] };
        }
        return prev;
      });
    }
  };

  const handleSaveBundle = async () => {
    try {
      const promises = MEAL_TYPES.map(meal => {
        const data = bundleForm.meals[meal] || {};
        
        // Check if there's actual text data (excluding just having an 'id')
        const hasData = Object.keys(data).some(key => key !== 'id' && data[key] && data[key].trim() !== '');
        
        if (hasData) {
          return axios.post('http://localhost:5000/api/menu/save-menu', {
            meal_type: meal,
            diet_type: bundleForm.diet_type,
            ...data 
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setShowBundleModal(false);
      fetchHistory();
    } catch (err) { alert("Save failed."); }
  };

  // --- INLINE EDITING LOGIC ---
  const handleStartEdit = (meal) => {
    setEditingMealId(meal.id);
    setEditForm({ ...meal });
  };

  const handleCancelEdit = () => {
    setEditingMealId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/menu/${id}`, editForm);
      setEditingMealId(null);
      fetchHistory();
    } catch (err) { 
      console.error("Edit failed", err);
      alert("Failed to save changes. Ensure your backend has a PUT route for /api/menu/:id");
    }
  };

  const handleCloneYesterday = async () => {
    if (!window.confirm("Clone yesterday's menu? This will copy all items from the previous day to today.")) return;
    try {
      const target = new Date();
      target.setDate(target.getDate() - 1);
      const yDate = target.getDate();
      const yMonth = target.getMonth();
      const yYear = target.getFullYear();
      
      const yesterdayMenus = menus.filter(m => {
        const d = new Date(m.event_date || m.created_at);
        return d.getDate() === yDate && d.getMonth() === yMonth && d.getFullYear() === yYear;
      });

      if (yesterdayMenus.length === 0) {
        alert("No menus were found for yesterday to clone.");
        return;
      }

      const todayStr = getLocalToday();
      const promises = yesterdayMenus.map(m => {
        const payload = { ...m };
        delete payload.id;
        delete payload.created_at;
        
        return axios.post('http://localhost:5000/api/menu/save-menu', {
          ...payload,
          event_date: todayStr,
          is_completed: false,
          completed_time: null
        });
      });
      
      await Promise.all(promises);
      await fetchHistory();
      alert(`Successfully cloned ${yesterdayMenus.length} menu items!`);
    } catch (err) { alert("Clone failed."); }
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
      await axios.post('http://localhost:5000/api/menu/save-event', eventForm);
      setShowEventModal(false);
      fetchEvents();
    } catch (err) { alert("Event Save failed"); }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      const timeStr = !currentStatus ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      await axios.patch(`http://localhost:5000/api/menu/status/${id}`, { 
        is_completed: !currentStatus, completed_time: timeStr
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

  // --- DATA CONSOLIDATION FOR KITCHEN VIEW ---
  const today = new Date();
  const tD = today.getDate();
  const tM = today.getMonth();
  const tY = today.getFullYear();

  const todaysMenus = menus.filter(m => {
    const d = new Date(m.created_at || m.event_date);
    return d.getDate() === tD && d.getMonth() === tM && d.getFullYear() === tY;
  });

  const groupedMenus = dietCategories.map(diet => {
    const dietMenus = todaysMenus.filter(m => m.diet_type === diet);
    const isDietFullyPrepared = dietMenus.length > 0 && dietMenus.every(m => m.is_completed);
    return { diet, isDietFullyPrepared, count: censusCounts[diet] || 0, dietMenus };
  });

  const generateConsolidatedList = (mealType) => {
    const mealMenus = todaysMenus.filter(m => m.meal_type === mealType);
    if (mealMenus.length === 0) return null;

    const consolidatedItems = {};
    let totalMealPax = 0;

    mealMenus.forEach(menu => {
      const paxForThisDiet = censusCounts[menu.diet_type] || 0;
      if (paxForThisDiet === 0) return; 

      totalMealPax += paxForThisDiet;

      const ignoreFields = ['id', 'meal_type', 'diet_type', 'event_date', 'is_completed', 'completed_time', 'created_at'];
      const fields = Object.keys(menu).filter(k => !ignoreFields.includes(k));

      fields.forEach(key => {
        const dishValue = menu[key];
        if (dishValue && typeof dishValue === 'string' && dishValue.trim() !== '') {
          const normalizedDishName = dishValue.trim().toLowerCase();
          let label = key.replace(/_dish/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          if (label === 'Protein') label = 'Main Protein';
          
          const uniqueKey = `${label}-${normalizedDishName}`;

          if (!consolidatedItems[uniqueKey]) {
            consolidatedItems[uniqueKey] = {
              label: label,
              originalName: dishValue.trim(), 
              totalPax: 0,
              diets: [],
              isCompleted: true, 
              menuIds: [] 
            };
          }

          consolidatedItems[uniqueKey].totalPax += paxForThisDiet;
          consolidatedItems[uniqueKey].diets.push(menu.diet_type);
          consolidatedItems[uniqueKey].menuIds.push(menu.id);
          
          if (!menu.is_completed) consolidatedItems[uniqueKey].isCompleted = false;
        }
      });
    });

    return { totalMealPax, items: Object.values(consolidatedItems).sort((a, b) => b.totalPax - a.totalPax) };
  };

  const handleBatchComplete = async (menuIds, currentStatus) => {
    try {
      const timeStr = !currentStatus ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      await Promise.all(menuIds.map(id => 
        axios.patch(`http://localhost:5000/api/menu/status/${id}`, { 
          is_completed: !currentStatus, completed_time: timeStr
        })
      ));
      fetchHistory();
    } catch (err) { console.error("Batch update failed"); }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      <style>
        {`
          @media print {
            body { background-color: white !important; }
            body * { visibility: hidden; }
            .printable-prep-sheet, .printable-prep-sheet * { visibility: visible; }
            .printable-prep-sheet { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            .print-break { page-break-after: always; }
          }
        `}
      </style>

      <header className="no-print" style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ChefHat size={48} color="rgb(61, 146, 95)" />
            <h1 style={{ margin: 0, fontSize: '2.6rem', color: '#1e293b' }}>Kitchen Production Plan</h1>
          </div>
          <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '1.3rem' }}>Real-time requirements for {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button style={btnSecondary} onClick={() => setShowEventModal(true)}><Calendar size={26}/> Schedule Event</button>
          <button style={{...btnSecondary, color: '#0369a1', borderColor: '#bae6fd'}} onClick={handleCloneYesterday}><Copy size={26}/> Sync Previous Day</button>
        </div>
      </header>

      {/* SPECIAL FUNCTIONS SECTION */}
      <h3 className="no-print" style={sectionTitle}>Special Functions</h3>
      <div className="no-print" style={{...cardStyle, marginBottom: '50px', borderTop: '8px solid #f59e0b', padding: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' }}>
          {events.map(event => (
            <div key={event.id} style={{...eventCard, borderLeft: event.is_completed ? '8px solid #10b981' : '8px solid #f59e0b'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '1.5rem', display: 'block' }}>{event.title}</strong>
                  {event.is_completed && event.completed_time && <span style={{...logText, display: 'block', marginTop: '8px'}}>Completed @ {event.completed_time}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={paxBadge}>{event.pax} PAX</span>
                  <button onClick={() => handleDeleteEvent(event.id)} style={{...actionBtn, color: '#ef4444'}}><Trash2 size={24}/></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {event.meal_type && event.meal_type.split(',').map((meal, index) => <span key={index} style={mealBadge}>{meal.trim()}</span>)}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '20px', minHeight: '50px', lineHeight: '1.6' }}>{event.menu_details}</div>
              <button onClick={() => toggleEventComplete(event.id, event.is_completed)} style={event.is_completed ? statusBtnDone : statusBtnEventPending}>
                {event.is_completed ? <CheckCircle2 size={22}/> : <Circle size={22}/>} {event.is_completed ? 'Service Ready' : 'In Prep'}
              </button>
            </div>
          ))}
          {events.length === 0 && <div style={{ color: '#64748b', fontSize: '1.3rem' }}>No special events for today.</div>}
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <h3 style={{...sectionTitle, marginBottom: 0}}>Dietary Production Board</h3>
        
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '12px', padding: '6px', gap: '5px' }}>
          <button style={viewMode === 'card' ? toggleBtnActive : toggleBtnInactive} onClick={() => setViewMode('card')}><LayoutGrid size={22} /> Dietician View</button>
          <button style={viewMode === 'list' ? toggleBtnActive : toggleBtnInactive} onClick={() => setViewMode('list')}><List size={22} /> Kitchen Prep View</button>
          {viewMode === 'list' && (
             <button style={{...toggleBtnInactive, backgroundColor: 'white', color: '#0f172a', border: '2px solid #cbd5e1', marginLeft: '10px'}} onClick={() => window.print()}><Printer size={22} /> Print Sheets</button>
          )}
        </div>
      </div>

      {/* ============================== */}
      {/* DIETICIAN CARD VIEW            */}
      {/* ============================== */}
      {viewMode === 'card' && (
        <div className="no-print" style={gridDisplay}>
          {groupedMenus.map(group => (
            <div key={group.diet} style={{...dietCard, border: group.isDietFullyPrepared ? '4px solid #10b981' : '2px solid #cbd5e1'}}>
              <div style={{...dietCardHeader, backgroundColor: group.isDietFullyPrepared ? '#f0fdf4' : '#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}><span style={dietBadgeStyle(group.diet)}>{group.diet}</span></div>
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                  <div style={qtyHighlight}>{group.count} <small style={{fontSize: '1rem', marginLeft: '6px'}}>PAX</small></div>
                  <button onClick={() => handleOpenBundle(group.diet)} style={addBundleBtn}><Plus size={28}/></button>
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
                        <div style={{...menuItemBox, borderLeft: meal.is_completed ? '8px solid #10b981' : '8px solid #cbd5e1'}}>
                          
                          {/* INLINE EDIT MODE */}
                          {editingMealId === meal.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                              {Object.keys(meal).map(key => {
                                  const ignore = ['id', 'meal_type', 'diet_type', 'event_date', 'is_completed', 'completed_time', 'created_at'];
                                  if (!ignore.includes(key) && typeof meal[key] === 'string') {
                                      const label = key.replace(/_dish/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                      return (
                                        <div key={key}>
                                          <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#475569' }}>{label}:</label>
                                          <input style={{...inputStyle, padding: '10px'}} value={editForm[key] || ''} onChange={e => setEditForm({...editForm, [key]: e.target.value})} />
                                        </div>
                                      );
                                  }
                                  return null;
                              })}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => handleSaveEdit(meal.id)} style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}><Save size={18}/> Save</button>
                                <button onClick={handleCancelEdit} style={{ flex: 1, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ width: '80%' }}>
                                  {Object.keys(meal).map(key => {
                                      const ignore = ['id', 'meal_type', 'diet_type', 'event_date', 'is_completed', 'completed_time', 'created_at'];
                                      if (!ignore.includes(key) && meal[key] && typeof meal[key] === 'string') {
                                          const label = key.replace(/_dish/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                          return <div key={key} style={{fontSize:'1.2rem', marginTop: '4px'}}><strong>{label === 'Protein' ? 'Main Protein' : label}:</strong> {meal[key]}</div>
                                      }
                                      return null;
                                  })}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <button onClick={() => handleStartEdit(meal)} style={{...actionBtn, color: '#3b82f6'}}><Edit2 size={22}/></button>
                                  <button onClick={() => handleDeleteMenu(meal.id)} style={{...actionBtn, color: '#ef4444'}}><Trash2 size={22}/></button>
                                </div>
                              </div>
                              <button onClick={() => toggleComplete(meal.id, meal.is_completed)} style={meal.is_completed ? statusBtnDone : statusBtnPending}>
                                 {meal.is_completed ? 'Ready' : 'Mark Ready'}
                              </button>
                            </>
                          )}
                        </div>
                      ) : <div style={noMenuPlaceholder}>-</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================== */}
      {/* KITCHEN CONSOLIDATED VIEW         */}
      {/* ================================== */}
      {viewMode === 'list' && (
        <div className="printable-prep-sheet" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {MEAL_TYPES.map(mealType => {
            const consolidatedData = generateConsolidatedList(mealType);
            if (!consolidatedData || consolidatedData.items.length === 0) return null;
            return (
              <div key={mealType} className="print-break" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #1e293b', paddingBottom: '15px', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '2.2rem', color: '#0f172a', fontWeight: '900' }}>{mealType.toUpperCase()}</h4>
                  <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '10px 20px', borderRadius: '12px', fontSize: '1.4rem', fontWeight: 'bold' }}>Total Trays: {consolidatedData.totalMealPax}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '1.3rem', borderBottom: '3px solid #cbd5e1' }}>
                      <th style={{ padding: '20px 10px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '20px 10px', textAlign: 'left' }}>Dish Name</th>
                      <th style={{ padding: '20px 10px', textAlign: 'center' }}>Total PAX</th>
                      <th className="no-print" style={{ padding: '20px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: item.isCompleted ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '20px 10px', fontSize: '1.4rem', fontWeight: 'bold', color: '#64748b' }}>{item.label}</td>
                        <td style={{ padding: '20px 10px' }}>
                          <div style={{ fontWeight: '900', fontSize: '1.7rem' }}>{item.originalName}</div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{item.diets.map((d, i) => <span key={i} style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>{d}</span>)}</div>
                        </td>
                        <td style={{ padding: '20px 10px', textAlign: 'center' }}><span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{item.totalPax}</span></td>
                        <td className="no-print" style={{ padding: '20px 10px' }}>
                          <button onClick={() => handleBatchComplete(item.menuIds, item.isCompleted)} style={item.isCompleted ? statusBtnDone : statusBtnPending}>{item.isCompleted ? 'Batch Ready' : 'Mark Batch Ready'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FOR BUNDLE MENU */}
      {showBundleModal && (
        <div className="no-print" style={modalOverlay}>
          <div style={{...modalContent, width: '900px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'25px', borderBottom: '3px solid #e2e8f0', paddingBottom: '20px'}}>
              <h3 style={{ margin: 0, fontSize: '1.6rem' }}><span style={dietBadgeStyle(bundleForm.diet_type)}>{bundleForm.diet_type}</span> Daily Plan</h3>
              <X onClick={() => setShowBundleModal(false)} cursor="pointer" color="#64748b" size={32} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '15px' }}>
              {MEAL_TYPES.map(meal => (
                <div key={meal} style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', border: '2px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0', fontSize: '1.4rem' }}>{meal}</h4>
                    <button onClick={() => handleAddField(meal)} style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}><Plus size={18} /> Add Field</button>
                  </div>
                  <div style={formGroup}>
                    <input style={inputStyle} placeholder="Main Protein" value={bundleForm.meals[meal].protein_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], protein_dish: e.target.value}}})} />
                    <input style={inputStyle} placeholder="Vegetable" value={bundleForm.meals[meal].vegetable_dish} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...bundleForm.meals[meal], vegetable_dish: e.target.value}}})} />
                    {extraFields[meal]?.map(f => (
                      <input key={f.id} style={inputStyle} placeholder={f.label} value={bundleForm.meals[meal]?.[f.id] || ''} onChange={e => setBundleForm({...bundleForm, meals: {...bundleForm.meals, [meal]: {...(bundleForm.meals[meal] || {}), [f.id]: e.target.value}}})} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button style={{...btnPrimary, marginTop: '25px', width: '100%', justifyContent: 'center'}} onClick={handleSaveBundle}>Save Full Day Plan</button>
          </div>
        </div>
      )}

      {/* MODAL FOR EVENT */}
      {showEventModal && (
        <div className="no-print" style={modalOverlay}>
          <div style={{...modalContent, width: '700px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'25px', borderBottom: '3px solid #e2e8f0', paddingBottom: '20px'}}><h3 style={{ margin: 0, fontSize: '1.6rem' }}>Schedule Event</h3><X onClick={() => setShowEventModal(false)} cursor="pointer" color="#64748b" size={32} /></div>
            <div style={formGroup}><label style={labelStyle}>Event Name</label><input style={inputStyle} value={eventForm.event_name} onChange={e => setEventForm({...eventForm, event_name: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Date</label><input style={inputStyle} type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Pax</label><input style={inputStyle} type="number" value={eventForm.pax} onChange={e => setEventForm({...eventForm, pax: e.target.value})}/></div>
            <div style={formGroup}><label style={labelStyle}>Details</label><textarea style={{...inputStyle, minHeight: '120px'}} value={eventForm.menu_details} onChange={e => setEventForm({...eventForm, menu_details: e.target.value})}/></div>
            <button style={{...btnPrimary, marginTop: '25px', width: '100%', justifyContent: 'center'}} onClick={handleSaveEvent}>Save Event</button>
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
  return { backgroundColor: style.bg, color: style.text, padding: '10px 18px', borderRadius: '10px', fontSize: '1.15rem', fontWeight: 'bold', border: `3px solid ${style.border}`, textTransform: 'uppercase' };
};

const toggleBtnActive = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' };
const toggleBtnInactive = { backgroundColor: 'transparent', color: '#475569', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' };
const actionBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '6px' };
const addBundleBtn = { background: 'rgb(61, 146, 95)', color: 'white', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' };
const modalOverlay = { position:'fixed', inset: 0, backgroundColor:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent = { background:'white', padding:'40px', borderRadius:'20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };
const formGroup = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' };
const labelStyle = { fontSize: '1.2rem', fontWeight: 'bold', color: '#334155' };
const inputStyle = { padding:'16px', borderRadius:'10px', border:'2px solid #cbd5e1', width: '100%', fontSize: '1.25rem', boxSizing: 'border-box' };
const logText = { fontSize: '1rem', color: '#10b981', fontWeight: 'bold' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '45px', alignItems: 'center' };
const sectionTitle = { fontSize: '1.4rem', color: '#475569', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '0.5px' };
const cardStyle = { backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' };
const gridDisplay = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '35px' };
const dietCard = { background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' };
const dietCardHeader = { padding: '25px', borderBottom: '3px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' };
const dietCardBody = { padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const mealSection = { display: 'flex', flexDirection: 'column', gap: '10px' };
const mealLabel = { fontSize: '1.1rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const qtyHighlight = { background: '#1e293b', color: 'white', padding: '8px 16px', borderRadius: '10px', fontSize: '1.3rem', fontWeight: 'bold' };
const menuItemBox = { padding: '20px', borderRadius: '12px', border: '3px solid #e2e8f0', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fafafa' };
const eventCard = { background: 'white', padding: '25px', borderRadius: '16px', border: '3px solid #e2e8f0' };
const paxBadge = { background: '#fef3c7', color: '#92400e', padding: '8px 16px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold' };
const statusBtnPending = { background: '#f8fafc', color: '#475569', border: '3px solid #cbd5e1', padding: '14px', borderRadius: '10px', fontSize: '1.15rem', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px', width: '100%' };
const statusBtnDone = { background: '#dcfce7', color: '#15803d', border: '3px solid #bbf7d0', padding: '14px', borderRadius: '10px', fontSize: '1.15rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' };
const statusBtnEventPending = { background: '#fffbeb', color: '#b45309', border: '3px solid #fde68a', padding: '14px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' };
const noMenuPlaceholder = { padding: '25px', border: '3px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' };
const btnPrimary = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '16px 28px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' };
const btnSecondary = { backgroundColor: 'white', color: '#334155', border: '3px solid #cbd5e1', padding: '14px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' };
const mealBadge = { background: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold' };