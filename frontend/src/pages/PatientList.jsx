import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, RefreshCw, Users, Activity, Trash2, Search, Filter, FileText, X, CheckCircle2, Clock, Coffee, Pill } from 'lucide-react';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [mockCount, setMockCount] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [wardFilter, setWardFilter] = useState('All Wards');
  const [dietFilter, setDietFilter] = useState('All Diets');

  useEffect(() => {
    fetchPatients();
  }, []);

  // Handle Filtering Logic
  useEffect(() => {
    let result = patients;
    if (searchTerm) {
      result = result.filter(p => 
        p.surname.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.hospital_number.includes(searchTerm)
      );
    }
    if (wardFilter !== 'All Wards') {
      result = result.filter(p => p.ward === wardFilter);
    }
    if (dietFilter !== 'All Diets') {
      result = result.filter(p => p.kind_of_diet === dietFilter);
    }
    setFilteredPatients(result);
  }, [patients, searchTerm, wardFilter, dietFilter]);

  const fetchPatients = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.get('http://localhost:5000/api/patients');
      setPatients(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const generateMockPatients = async () => {
    const firstNames = ["Juan", "Maria", "Jose", "Ana", "Antonio", "Elena", "Ramon", "Liza"];
    const surnames = ["Dela Cruz", "Rizal", "Santos", "Luna", "Aquino", "Perez", "Bautista"];
    const diets = ["Regular", "Soft", "LSLF", "Diabetic", "HAD", "EDCF", "Low Purine/Renal", "General Liquid", "Clear Liquid", "Tube Feeding", "Palatable"];
    const wards = ["ACE", "ICU", "ASU", "MEDICAL 1", "MEDICAL 2", "SURGERY", "OB", "PEDIA 1", "PEDIA 2", "NICU", "PICU", "EREID", "Custodial"];
    const possibleAllergies = ["None", "None", "None", "Seafood", "Peanuts", "Dairy", "Gluten"];
    const remarksList = ["Needs assistance feeding", "Fall risk", "Check BP before meals", ""];
    
    const count = parseInt(mockCount) || 1;
    const mockData = Array.from({ length: count }).map(() => ({
      hospital_number: `2026-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
      surname: surnames[Math.floor(Math.random() * surnames.length)],
      ward: wards[Math.floor(Math.random() * wards.length)],
      room_number: `${Math.floor(100 + Math.random() * 400)}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      age: Math.floor(20 + Math.random() * 70),
      religion: "Catholic",
      kind_of_diet: diets[Math.floor(Math.random() * diets.length)],
      allergies: possibleAllergies[Math.floor(Math.random() * possibleAllergies.length)],
      npo_status: Math.random() > 0.85, 
      remarks: remarksList[Math.floor(Math.random() * remarksList.length)]
    }));

    try {
      await axios.post('http://localhost:5000/api/patients/add-mock', { patients: mockData });
      await fetchPatients();
    } catch (err) {
      alert("Failed to save mock patients.");
    }
  };

  const clearAllPatients = async () => {
    if (!window.confirm("PERMANENT ACTION: Wipe entire census?")) return;
    try {
      await axios.delete('http://localhost:5000/api/patients/clear-all');
      setPatients([]);
    } catch (err) {
      console.error("Clear Error:", err);
    }
  };

  const wardOptions = ['All Wards', ...new Set(patients.map(p => p.ward))];
  const dietOptions = ['All Diets', ...new Set(patients.map(p => p.kind_of_diet))];

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const openProfile = async (patient) => {
    setSelectedPatient(patient);
    setProfileLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/patients/${patient.hospital_number}/profile`);
      setPatientProfile(res.data);
    } catch (err) {
      console.error("Failed to load profile", err);
    }
    setProfileLoading(false);
  };
  
  const closeProfile = () => {
    setSelectedPatient(null);
    setPatientProfile(null);
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SUMMARY CARDS */}
      <div style={summaryRow}>
        <div style={statCard}>
          <div style={iconBox}><Users size={20} color="rgb(61, 146, 95)" /></div>
          <div>
            <div style={statLabel}>Total Census</div>
            <div style={statValue}>{patients.length}</div>
          </div>
        </div>
        <div style={statCard}>
          <div style={{...iconBox, backgroundColor: '#eff6ff'}}><Activity size={20} color="#2563eb" /></div>
          <div>
            <div style={statLabel}>Matching Filter</div>
            <div style={statValue}>{filteredPatients.length}</div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div style={filterContainer}>
        <div style={searchWrapper}>
          <Search size={18} style={searchIcon} />
          <input 
            type="text" 
            placeholder="Search by Name or Hospital ID..." 
            style={searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={selectWrapper}>
            <Filter size={14} style={filterIcon} />
            <select style={selectInput} value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
              {wardOptions.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          
          <div style={selectWrapper}>
            <Filter size={14} style={filterIcon} />
            <select style={selectInput} value={dietFilter} onChange={(e) => setDietFilter(e.target.value)}>
              {dietOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ACTIONS TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={qtyInputWrapper}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>QTY:</span>
            <input type="number" value={mockCount} onChange={(e) => setMockCount(e.target.value)} style={qtyInput}/>
          </div>
          <button onClick={generateMockPatients} style={btnPrimary}><UserPlus size={16} /> Add Mock</button>
          <button onClick={fetchPatients} style={btnSecondary} disabled={isSyncing}><RefreshCw size={16} /> Sync</button>
          <button onClick={clearAllPatients} style={btnDanger}><Trash2 size={16} /></button>
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div style={tableWrapper}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={tableHead}>
            <tr>
              <th style={thStyle}>Ward / ID</th>
              <th style={thStyle}>Patient Name</th>
              <th style={thStyle}>Diet Type</th>
              <th style={thStyle}>Alerts & Profile</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => (
                <tr key={p.hospital_number} style={{...tableRow, backgroundColor: p.npo_status ? '#fff1f2' : 'white'}}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: 'rgb(61, 146, 95)' }}>{p.ward}</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>Room: {p.room_number || 'TBA'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>#{p.hospital_number}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.surname}, {p.first_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{p.age} yrs • {p.religion}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={dietBadge(p.kind_of_diet)}>{p.kind_of_diet || 'Regular Diet'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                      {p.npo_status && <span style={npoBadge}>NPO</span>}
                      {p.allergies && p.allergies !== 'None' && <span style={allergyBadge}>Allergy: {p.allergies}</span>}
                      {p.remarks && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>* {p.remarks}</div>}
                      
                      <button onClick={() => openProfile(p)} style={btnProfile}>
                        <FileText size={14} /> View History
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={emptyStateTd}>No results match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================= */}
      {/* PROFESSIONAL PATIENT PROFILE MODAL */}
      {/* ======================================= */}
      {selectedPatient && (
        <div style={modalOverlay} onClick={closeProfile}>
          <div style={profileModalContent} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={modalHeader}>
              <div>
                <div style={{ color: '#dcfce7', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '5px' }}>
                  PATIENT RECORD • {selectedPatient.hospital_number}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'white' }}>{selectedPatient.surname}, {selectedPatient.first_name}</h2>
                <div style={{ color: '#bbf7d0', fontSize: '0.9rem', marginTop: '5px' }}>
                  {selectedPatient.ward} — Room {selectedPatient.room_number} • {selectedPatient.age} yrs
                </div>
              </div>
              <button onClick={closeProfile} style={closeBtn}><X size={24} /></button>
            </div>

           <div style={{ padding: '30px' }}>
              {profileLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading patient history...</div>
              ) : patientProfile ? (
                <>
                  {/* ======================================= */}
                  {/* RESTORED: VITALS & DEMOGRAPHICS GRID    */}
                  {/* ======================================= */}
                  <div style={vitalsGrid}>
                    <div style={vitalBlock}><span style={vitalLabel}>Age</span><span style={vitalValue}>{selectedPatient.age} yrs</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Birth Date</span><span style={vitalValue}>{patientProfile.birth_date || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Sex</span><span style={vitalValue}>{patientProfile.sex || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Height</span><span style={vitalValue}>{patientProfile.height || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Weight</span><span style={vitalValue}>{patientProfile.weight || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>BP</span><span style={vitalValue}>{patientProfile.bp || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Temp</span><span style={vitalValue}>{patientProfile.temp || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Pulse</span><span style={vitalValue}>{patientProfile.pulse || '--'}</span></div>
                    <div style={vitalBlock}><span style={vitalLabel}>Resp</span><span style={vitalValue}>{patientProfile.resp || '--'}</span></div>
                  </div>

                  {/* MEAL DELIVERY HISTORY */}
                  <div style={{ marginBottom: '30px' }}>
                    <div style={sectionHeader}>
                      <Coffee size={18} /> Meals Delivered
                    </div>
                    {patientProfile.meal_history && patientProfile.meal_history.length > 0 ? (
                      <table style={profileTable}>
                        <thead>
                          <tr>
                            <th style={profileTh}>Date & Time</th>
                            <th style={profileTh}>Meal Type</th>
                            <th style={profileTh}>Delivered By</th>
                            <th style={profileTh}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientProfile.meal_history.map((meal, idx) => (
                            <tr key={idx}>
                              <td style={profileTd}>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{new Date(meal.serve_time).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(meal.serve_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                              <td style={{...profileTd, fontWeight: '500'}}>{meal.meal_type}</td>
                              <td style={profileTd}>{meal.delivered_by || 'Unknown'}</td>
                              <td style={profileTd}>
                                <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  Served {meal.delivery_remark === 'Late Delivery' ? '(Late)' : ''}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={emptyHistoryCard}>No recorded meals delivered yet.</div>
                    )}
                  </div>

                  {/* ONS / TUBE FEEDING HISTORY */}
                  <div>
                    <div style={{...sectionHeader, color: '#3b82f6', borderBottomColor: '#bfdbfe'}}>
                      <Pill size={18} /> ONS & Tube Feeding History
                    </div>
                    {patientProfile.ons_history && patientProfile.ons_history.length > 0 ? (
                      <table style={profileTable}>
                        <thead>
                          <tr>
                            <th style={profileTh}>Date & Time</th>
                            <th style={profileTh}>Formula Prescribed</th>
                            <th style={profileTh}>Prepared By</th>
                            <th style={profileTh}>Volume / Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientProfile.ons_history.map((ons, idx) => (
                            <tr key={idx}>
                              <td style={profileTd}>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{new Date(ons.dispatch_time || ons.created_at).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(ons.dispatch_time || ons.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                              <td style={{...profileTd, fontWeight: 'bold', color: '#2563eb'}}>{ons.formula_name}</td>
                              <td style={profileTd}>{ons.prepared_by || 'Unknown'}</td>
                              <td style={{...profileTd, color: '#64748b'}}>{ons.volume || 'N/A'} {ons.remarks ? `— ${ons.remarks}` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={emptyHistoryCard}>No recorded ONS or Tube Feeding history.</div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Failed to load data.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= STYLES =================
const filterContainer = { display: 'flex', justifyContent: 'space-between', backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', gap: '20px' };
const searchWrapper = { position: 'relative', flex: 1 };
const searchIcon = { position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' };
const searchInput = { width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#f8fafc' };
const selectWrapper = { position: 'relative' };
const filterIcon = { position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' };
const selectInput = { padding: '10px 10px 10px 30px', borderRadius: '8px', border: '1px solid #e2e8f0', appearance: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', minWidth: '150px' };

const summaryRow = { display: 'flex', gap: '20px', marginBottom: '20px' };
const statCard = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', flex: 1, display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const iconBox = { backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px' };
const statLabel = { fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' };
const statValue = { fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' };

const qtyInputWrapper = { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const qtyInput = { width: '40px', border: 'none', outline: 'none', fontWeight: 'bold', textAlign: 'center' };

const tableWrapper = { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' };
const tableHead = { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const thStyle = { padding: '15px 20px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tableRow = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '15px 20px', verticalAlign: 'top' };
const emptyStateTd = { textAlign: 'center', padding: '40px', color: '#94a3b8' };

const btnPrimary = { backgroundColor: 'rgb(61, 146, 95)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.85rem' };
const btnSecondary = { backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 'bold', fontSize: '0.85rem' };
const btnDanger = { backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: '#e11d48' };
const btnProfile = { marginTop: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontWeight: 'bold', transition: 'all 0.2s' };

const dietBadge = (diet) => {
  // Map exact colors from the dietary matrix reference
  const dietColors = {
    'Regular':          { bg: '#FFFFFF', text: '#000000', border: '#cbd5e1' },
    'Soft':             { bg: '#FDE69D', text: '#000000', border: '#F8CBAD' },
    'LSLF':             { bg: '#CD5C5C', text: '#000000', border: '#B52A2A' },
    'Diabetic':         { bg: '#FF99FF', text: '#000000', border: '#E066E0' },
    'HAD':              { bg: '#7030A0', text: '#FFFFFF', border: '#4C1B73' },
    'EDCF':             { bg: '#4A86E8', text: '#FFFFFF', border: '#2B5AA5' },
    'Low Purine/Renal': { bg: '#6AA84F', text: '#000000', border: '#38761D' },
    'General Liquid':   { bg: '#E69138', text: '#000000', border: '#B45F06' },
    'Clear Liquid':     { bg: '#F9CB9C', text: '#000000', border: '#F6A869' },
    'Tube Feeding':     { bg: '#FFFF00', text: '#000000', border: '#F1C232' },
    'Palatable':        { bg: '#F1C232', text: '#000000', border: '#BF9000' }
  };

  // Fallback to a neutral gray if the diet type isn't in the list
  const style = dietColors[diet] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return {
    backgroundColor: style.bg,
    color: style.text,
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    border: `1px solid ${style.border}`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'inline-block',
    textAlign: 'center',
    minWidth: '80px' // Keeps badges relatively uniform in size
  };
};
const npoBadge = { backgroundColor: '#fff1f2', color: '#e11d48', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #fecaca' };
const allergyBadge = { backgroundColor: '#fefce8', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #fef08a' };

// MODAL STYLES
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const profileModalContent = { backgroundColor: '#f8fafc', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' };
const modalHeader = { backgroundColor: 'rgb(61, 146, 95)', padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const closeBtn = { background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 };
const sectionHeader = { display: 'flex', alignItems: 'center', gap: '8px', color: 'rgb(61, 146, 95)', fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 15px 0', borderBottom: '2px solid #bbf7d0', paddingBottom: '8px' };
const profileTable = { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const profileTh = { backgroundColor: '#f1f5f9', padding: '12px 15px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const profileTd = { borderBottom: '1px solid #f1f5f9', padding: '12px 15px', fontSize: '0.85rem', color: '#334155' };
const emptyHistoryCard = { backgroundColor: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '25px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' };


const vitalsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '15px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const vitalBlock = { display: 'flex', flexDirection: 'column', gap: '4px' };
const vitalLabel = { fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const vitalValue = { fontSize: '1.1rem', color: '#1e293b', fontWeight: '700' };