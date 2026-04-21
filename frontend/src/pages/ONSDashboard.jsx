import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Pill, ClipboardList, PackageOpen, FileText, 
  X, Plus, CheckCircle2, AlertTriangle, Calculator, Search, Edit2, PlusCircle 
} from 'lucide-react';

export default function ONSDashboard() {
  const [activeTab, setActiveTab] = useState('master'); 
  
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  
  const getLocalToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [onsForm, setOnsForm] = useState({
    log_date: getLocalToday(),
    ons_criteria: 'Nutritional',
    nutritional: '', // Will auto-fill when modal opens
    scoops: 1,
    frequency: 3,
    unit_cost: 0
  });

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    fetchONSPatients();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/ons/inventory');
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  };

  const [isEditMode, setIsEditMode] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);
  const [editingInvId, setEditingInvId] = useState(null);
  
  const initialInvForm = {
    criteria: 'Tube Feeding', nutritional_name: '', total_scoops: 0, scoops_left: 0, 
    total_grams: 0, cost_per_scoop: 0, cost_per_gram: 0, total_unit_cost: 0
  };
  const [invForm, setInvForm] = useState(initialInvForm);

  const openInvModal = (item = null) => {
    if (item) {
      setEditingInvId(item.id);
      setInvForm(item);
    } else {
      setEditingInvId(null);
      setInvForm(initialInvForm);
    }
    setShowInvModal(true);
  };

  const handleSaveInventory = async () => {
    try {
      if (editingInvId) {
        await axios.put(`http://localhost:5000/api/ons/inventory/edit/${editingInvId}`, invForm);
      } else {
        await axios.post('http://localhost:5000/api/ons/inventory/add', invForm);
      }
      setShowInvModal(false);
      fetchInventory(); 
    } catch (err) {
      alert("Failed to save inventory item.");
    }
  };

  const fetchONSPatients = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/ons/patients');
      setPatients(res.data);
    } catch (err) {
      console.error("Failed to fetch ONS patients:", err);
    }
  };

  const openPatientLedger = async (patient) => {
    setSelectedPatient(patient);
    try {
      const res = await axios.get(`http://localhost:5000/api/ons/history/${patient.hospital_number}`);
      setPatientHistory(res.data);
      
      // AUTO-FILL dropdown with the first item in inventory when opening modal
      if (inventory.length > 0) {
        setOnsForm({ 
          ...onsForm, 
          log_date: getLocalToday(), 
          nutritional: inventory[0].nutritional_name,
          unit_cost: inventory[0].cost_per_scoop,
          scoops: 1, 
          frequency: 3 
        });
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const closePatientLedger = () => {
    setSelectedPatient(null);
    setPatientHistory([]);
  };

  const handleSaveEntry = async () => {
    const selectedInvItem = inventory.find(inv => inv.nutritional_name === onsForm.nutritional);
    const totalToConsume = onsForm.scoops * onsForm.frequency;
    
    if (selectedInvItem && totalToConsume > selectedInvItem.scoops_left) {
      alert(`Insufficient stock!`);
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/ons/add-entry', {
        hospital_number: selectedPatient.hospital_number,
        ward: selectedPatient.ward, // Send ward so prep board can filter it!
        ...onsForm
      });
      
      const res = await axios.get(`http://localhost:5000/api/ons/history/${selectedPatient.hospital_number}`);
      setPatientHistory(res.data);
      
      fetchInventory(); 
      fetchPrepTasks(); // <--- CRITICAL: Refresh the board after saving
      alert("Entry saved and added to Prep Board!");
    } catch (err) {
      alert("Failed to save entry.");
    }
  };

  const previewTotalScoops = onsForm.scoops * onsForm.frequency;
  const previewTotalAmount = previewTotalScoops * onsForm.unit_cost;

  // Locate the currently selected inventory item to display its stock levels
  const selectedInvItem = inventory.find(item => item.nutritional_name === onsForm.nutritional);

  const getLatestEditTime = () => {
    if (!inventory || inventory.length === 0) return "Fetching data...";
    const latestDate = new Date(Math.max(...inventory.map(item => new Date(item.last_edited))));
    return latestDate.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Initialize from LocalStorage or use default
  const [selectedWard, setSelectedWard] = useState(localStorage.getItem('ons_pref_ward') || 'All');
  const [prepTasks, setPrepTasks] = useState([]);

  // Save to LocalStorage whenever the filter changes
  useEffect(() => {
    localStorage.setItem('ons_pref_ward', selectedWard);
  }, [selectedWard]);

  // Fetch prep tasks
  const fetchPrepTasks = async () => {
    const res = await axios.get('http://localhost:5000/api/ons/prep-tasks');
    setPrepTasks(res.data);
  };

  useEffect(() => {
    fetchPrepTasks();
  }, []);

  const [prepFilter, setPrepFilter] = useState('pending');

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Pill size={32} color="rgb(61, 146, 95)" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e293b' }}>ONS & Enteral Management</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          <button onClick={() => setActiveTab('master')} style={activeTab === 'master' ? activeTabBtn : inactiveTabBtn}>
            <ClipboardList size={18}/> Patient Master List
          </button>
          <button onClick={() => setActiveTab('prep')} style={activeTab === 'prep' ? activeTabBtn : inactiveTabBtn}>
            <CheckCircle2 size={18}/> Preparation Board
          </button>
          <button onClick={() => setActiveTab('inventory')} style={activeTab === 'inventory' ? activeTabBtn : inactiveTabBtn}>
            <PackageOpen size={18}/> Stock Inventory
          </button>
        </div>
      </header>

      {/* --- TAB 1: PATIENT MASTER LIST --- */}
      {activeTab === 'master' && (
        <div style={cardStyle}>
          <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="rgb(61, 146, 95)"/>
            <span style={{ color: 'rgb(21, 128, 61)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Showing only patients with diets: Tube Feeding, Liquid, and Palatable
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={thStyle}>Ward / Room</th>
                <th style={thStyle}>Surname</th>
                <th style={thStyle}>First Name</th>
                <th style={thStyle}>Hospital Number</th>
                <th style={thStyle}>Prescribed Diet</th>
                <th style={thStyle}>Billing & Tracking</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? patients.map(p => (
                <tr key={p.hospital_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}><span style={{fontWeight: 'bold'}}>{p.ward}</span> <br/><span style={{fontSize: '0.8rem', color: '#64748b'}}>{p.room_number || 'No Room Assigned'}</span></td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{p.surname}</td>
                  <td style={tdStyle}>{p.first_name}</td>
                  <td style={tdStyle}>#{p.hospital_number}</td>
                  <td style={tdStyle}><span style={badgeStyle}>{p.kind_of_diet}</span></td>
                  <td style={tdStyle}>
                    <button onClick={() => openPatientLedger(p)} style={btnPrimary}>
                      <FileText size={14} /> Open ONS Ledger
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No active ONS patients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 2: PREPARATION BOARD (Conceptual Preview) --- */}
      {activeTab === 'prep' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* FILTERS & TOGGLE */}
          <div style={{ ...cardStyle, padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={formGroup}>
                <label style={labelStyle}>Ward</label>
                <select style={{ ...inputStyle, width: '160px' }} value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                  <option value="All">All Wards</option>
                  <option value="ICU">ICU</option>
                  <option value="MEDICAL 1">Medical 1</option>
                  <option value="SURGERY">Surgery</option>
                </select>
              </div>

              {/* VIEW TOGGLE */}
              <div style={formGroup}>
                <label style={labelStyle}>Status View</label>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                  <button 
                    onClick={() => setPrepFilter('pending')}
                    style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: prepFilter === 'pending' ? 'white' : 'transparent', color: prepFilter === 'pending' ? 'rgb(61, 146, 95)' : '#64748b', boxShadow: prepFilter === 'pending' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                  >
                    To-Do
                  </button>
                  <button 
                    onClick={() => setPrepFilter('completed')}
                    style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: prepFilter === 'completed' ? 'white' : 'transparent', color: prepFilter === 'completed' ? 'rgb(61, 146, 95)' : '#64748b', boxShadow: prepFilter === 'completed' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                  >
                    Prepared
                  </button>
                </div>
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'right' }}>
              Showing <strong>{prepFilter === 'pending' ? 'Unprepared' : 'Dispatched'}</strong> items
            </div>
          </div>

          {/* PREP CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {prepTasks
              .filter(t => (selectedWard === 'All' || t.ward === selectedWard))
              .filter(t => (prepFilter === 'pending' ? !t.dispatch_time : !!t.dispatch_time))
              .map(task => (
                <div key={task.id} style={{ 
                  ...cardStyle, 
                  borderLeft: `5px solid ${task.dispatch_time ? '#10b981' : '#f59e0b'}`,
                  opacity: task.dispatch_time ? 0.8 : 1
                }}>
                  <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#1e293b' }}>{task.surname}, {task.first_name}</strong>
                    {task.dispatch_time && <CheckCircle2 size={18} color="#10b981" />}
                  </div>
                  <div style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                      <span style={{ color: '#64748b' }}>Item:</span> <strong>{task.nutritional}</strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
                      <span style={{ color: '#64748b' }}>Qty:</span> <strong>{task.scoops} Scoops</strong>
                    </div>
                    
                    {task.dispatch_time ? (
                      <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', color: '#15803d', textAlign: 'center', border: '1px solid #dcfce7' }}>
                        Prepared at: <strong>{new Date(task.dispatch_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                      </div>
                    ) : (
                      <button 
    onClick={async () => {
      try {
        await axios.patch(`http://localhost:5000/api/ons/mark-prepared/${task.id}`);
        // We must fetch both to keep stock and UI in sync
        await fetchPrepTasks(); 
        await fetchInventory(); 
      } catch (err) {
        alert("Error updating status");
      }
    }}
    style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}
  >
    Mark Prepared
  </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* EMPTY STATE */}
          {prepTasks.filter(t => (selectedWard === 'All' || t.ward === selectedWard)).filter(t => (prepFilter === 'pending' ? !t.dispatch_time : !!t.dispatch_time)).length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
              <p>No {prepFilter} items found for this ward.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: INVENTORY --- */}
      {activeTab === 'inventory' && (
        <div style={cardStyle}>
          
          {/* HEADER SECTION */}
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>Stock Inventory</h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Last Edited: <strong>{getLatestEditTime()}</strong>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  style={{...inputStyle, paddingLeft: '35px', width: '220px'}}
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                />
              </div>
              <button onClick={() => openInvModal()} style={btnPrimary}>
                <PlusCircle size={16} /> Add Item
              </button>
            </div>
          </div>

          {/* TABLE SECTION */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={thStyle}>Criteria</th>
                <th style={thStyle}>Nutritional Product</th>
                <th style={thStyle}>Total Scoops</th>
                <th style={thStyle}>Scoops Left</th>
                <th style={thStyle}>Grams Left</th>
                <th style={thStyle}>Cost / Scoop</th>
                <th style={thStyle}>Cost / Gram</th>
                <th style={thStyle}>Total Cost</th>
                {isEditMode && <th style={{...thStyle, textAlign: 'center'}}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {inventory
                .filter(item => item.nutritional_name?.toLowerCase().includes(inventorySearch.toLowerCase()))
                .map(item => {
                  // Calculate percentage left to automatically color-code the stock!
                  const percentLeft = (item.scoops_left / item.total_scoops) * 100;
                  const stockColor = percentLeft <= 20 ? '#ef4444' : percentLeft <= 50 ? '#f59e0b' : 'rgb(61, 146, 95)';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <span style={{...badgeStyle, backgroundColor: '#f1f5f9', color: '#475569'}}>{item.criteria}</span>
                      </td>
                      <td style={{...tdStyle, fontWeight: 'bold', color: '#1e293b'}}>{item.nutritional_name}</td>
                      <td style={{...tdStyle, color: '#64748b'}}>{item.total_scoops}</td>
                      <td style={{...tdStyle, fontWeight: 'bold', color: stockColor, fontSize: '1.05rem'}}>
                        {Number(item.scoops_left).toFixed(1)}
                      </td>
                      <td style={{...tdStyle, color: '#64748b'}}>{Number(item.total_grams).toFixed(1)}g</td>
                      <td style={tdStyle}>₱{Number(item.cost_per_scoop).toFixed(2)}</td>
                      <td style={{...tdStyle, color: '#94a3b8'}}>₱{Number(item.cost_per_gram).toFixed(2)}</td>
                      <td style={{...tdStyle, fontWeight: 'bold'}}>₱{Number(item.total_unit_cost).toFixed(2)}</td>
                      {isEditMode && (
                        <td style={{...tdStyle, textAlign: 'center'}}>
                          <button onClick={() => openInvModal(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                            <Edit2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              {inventory.length === 0 && (
                <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No inventory items found.</td></tr>
              )}
            </tbody>
          </table>

          {/* FOOTER SECTION */}
          <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isEditMode ? '#fee2e2' : 'white', color: isEditMode ? '#ef4444' : '#475569', border: `1px solid ${isEditMode ? '#fca5a5' : '#cbd5e1'}` }}
            >
              <Edit2 size={16} /> {isEditMode ? "Done Editing" : "Edit Inventory"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT INVENTORY ITEM */}
      {/* ========================================== */}
      {showInvModal && (
        <div style={modalOverlay}>
          <div style={{...modalContent, maxWidth: '600px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>{editingInvId ? "Edit Item" : "Add New Item"}</h2>
              <X onClick={() => setShowInvModal(false)} cursor="pointer" color="#64748b" size={24} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div style={formGroup}>
                <label style={labelStyle}>Criteria</label>
                <select style={inputStyle} value={invForm.criteria} onChange={e => setInvForm({...invForm, criteria: e.target.value})}>
                  <option>Tube Feeding</option>
                  <option>Palatable</option>
                  <option>Bed Side</option>
                  <option>Nutritional</option>
                </select>
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Nutritional Name</label>
                <input type="text" style={inputStyle} value={invForm.nutritional_name} onChange={e => setInvForm({...invForm, nutritional_name: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Total Scoops</label>
                <input type="number" style={inputStyle} value={invForm.total_scoops} onChange={e => setInvForm({...invForm, total_scoops: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Scoops Left</label>
                <input type="number" style={inputStyle} value={invForm.scoops_left} onChange={e => setInvForm({...invForm, scoops_left: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Total Grams</label>
                <input type="number" style={inputStyle} value={invForm.total_grams} onChange={e => setInvForm({...invForm, total_grams: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Cost per Scoop</label>
                <input type="number" step="0.01" style={inputStyle} value={invForm.cost_per_scoop} onChange={e => setInvForm({...invForm, cost_per_scoop: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Cost per Gram</label>
                <input type="number" step="0.01" style={inputStyle} value={invForm.cost_per_gram} onChange={e => setInvForm({...invForm, cost_per_gram: e.target.value})} />
              </div>
              <div style={formGroup}>
                <label style={labelStyle}>Total Unit Cost</label>
                <input type="number" step="0.01" style={inputStyle} value={invForm.total_unit_cost} onChange={e => setInvForm({...invForm, total_unit_cost: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowInvModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveInventory} style={btnPrimary}>Save Item</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PATIENT ONS LEDGER & BILLING */}
      {/* ========================================== */}
      {selectedPatient && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b' }}>ONS Billing Ledger</h2>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '5px' }}>
                  Patient: <strong style={{color: '#1e293b'}}>{selectedPatient.surname}, {selectedPatient.first_name}</strong> | ID: #{selectedPatient.hospital_number}
                </div>
              </div>
              <X onClick={closePatientLedger} cursor="pointer" color="#64748b" size={24} />
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 15px 0', color: 'rgb(61, 146, 95)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={16}/> Add New Daily Entry
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div style={formGroup}>
                  <label style={labelStyle}>Date</label>
                  <input type="date" style={inputStyle} value={onsForm.log_date} onChange={e => setOnsForm({...onsForm, log_date: e.target.value})} />
                </div>
                <div style={formGroup}>
                  <label style={labelStyle}>Criteria</label>
                  <select style={inputStyle} value={onsForm.ons_criteria} onChange={e => setOnsForm({...onsForm, ons_criteria: e.target.value})}>
                    <option>Tube Feeding</option>
                    <option>Palatable</option>
                    <option>Bed Side</option>
                    <option>Nutritional</option>
                  </select>
                </div>
                
                {/* NEW DYNAMIC DROPDOWN FOR NUTRITIONAL */}
                <div style={formGroup}>
                  <label style={labelStyle}>Nutritional Product</label>
                  <select 
                    style={inputStyle} 
                    value={onsForm.nutritional} 
                    onChange={e => {
                      const selected = inventory.find(inv => inv.nutritional_name === e.target.value);
                      setOnsForm({
                        ...onsForm, 
                        nutritional: e.target.value,
                        unit_cost: selected ? selected.cost_per_scoop : 0 // Auto-fills the cost!
                      });
                    }}
                  >
                    {inventory.length === 0 && <option value="">No stock available</option>}
                    {inventory.map(inv => (
                      <option key={inv.id} value={inv.nutritional_name}>{inv.nutritional_name}</option>
                    ))}
                  </select>
                  {/* STOCK BADGE */}
                  {selectedInvItem && (
                    <div style={{ fontSize: '0.7rem', color: selectedInvItem.scoops_left <= 0 ? 'red' : '#15803d', marginTop: '2px', fontWeight: 'bold' }}>
                      Stock: {selectedInvItem.scoops_left} scoops ({Number(selectedInvItem.total_grams).toFixed(1)}g) left
                    </div>
                  )}
                </div>

                <div style={formGroup}>
                  <label style={labelStyle}>Quantity (Scoops/Cans)</label>
                  <input type="number" step="0.5" style={inputStyle} value={onsForm.scoops} onChange={e => setOnsForm({...onsForm, scoops: e.target.value})} />
                </div>
                <div style={formGroup}>
                  <label style={labelStyle}>Frequency (Times/Day)</label>
                  <input type="number" style={inputStyle} value={onsForm.frequency} onChange={e => setOnsForm({...onsForm, frequency: e.target.value})} />
                </div>
                <div style={formGroup}>
                  <label style={labelStyle}>Unit Cost (₱)</label>
                  <input type="number" step="0.01" style={{...inputStyle, backgroundColor: '#f1f5f9', cursor: 'not-allowed'}} value={onsForm.unit_cost} readOnly title="Auto-filled from inventory" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div><span style={calcLabel}>Total Consumed:</span> <strong style={{ fontSize: '1.1rem' }}>{previewTotalScoops}</strong></div>
                  <div><span style={calcLabel}>Total Amount:</span> <strong style={{ fontSize: '1.1rem', color: '#eab308' }}>₱{previewTotalAmount.toFixed(2)}</strong></div>
                </div>
                <button onClick={handleSaveEntry} style={{...btnPrimary, padding: '10px 20px'}}>Save & Bill</button>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Clearance & Billing History</h4>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: '#f1f5f9' }}>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Criteria</th>
                    <th style={thStyle}>Nutritional</th>
                    <th style={thStyle}>Qty x Freq</th>
                    <th style={thStyle}>Total Consumed</th>
                    <th style={thStyle}>Unit Cost</th>
                    <th style={thStyle}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.length > 0 ? patientHistory.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{new Date(log.log_date).toLocaleDateString()}</td>
                      <td style={tdStyle}>{log.ons_criteria}</td>
                      <td style={tdStyle}><strong>{log.nutritional}</strong></td>
                      <td style={tdStyle}>{log.scoops} x {log.frequency}</td>
                      <td style={{...tdStyle, fontWeight: 'bold'}}>{log.total_scoops}</td>
                      <td style={tdStyle}>₱{Number(log.unit_cost).toFixed(2)}</td>
                      <td style={{...tdStyle, fontWeight: 'bold', color: 'rgb(61, 146, 95)'}}>₱{Number(log.total_amount).toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No billing history for this patient.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// STYLES
const cardStyle = { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' };
const activeTabBtn = { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderBottom: 'none', padding: '12px 20px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'rgb(61, 146, 95)', marginBottom: '-12px' };
const inactiveTabBtn = { display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: '12px 20px', cursor: 'pointer', fontWeight: '600', color: '#64748b' };
const thStyle = { padding: '15px 20px', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' };
const tdStyle = { padding: '15px 20px', color: '#334155' };
const badgeStyle = { backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 'bold' };
const btnPrimary = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.8rem' };
const formGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' };
const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' };
const calcLabel = { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginRight: '8px' };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalContent = { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const invThStyle = { border: '1px solid #000', padding: '10px', color: '#000', fontSize: '0.85rem', fontWeight: 'bold' };
const invTdStyle = { border: '1px solid #000', padding: '10px', color: '#1f2937', fontSize: '0.9rem', height: '40px' };