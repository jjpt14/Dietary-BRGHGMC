import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, ShieldAlert, Activity, Search, Save, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'logs'
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logModuleFilter, setLogModuleFilter] = useState('All');

  const [pendingChanges, setPendingChanges] = useState({});

  const ROLES = ['Unassigned', 'Dietician', 'Food Service Staff', 'Kitchen Staff', 'Special Diet Staff', 'Dietary Staff', 'Section Head', 'IT'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'users' ? 'users' : 'logs';
      const res = await axios.get(`http://localhost:5000/api/admin/${endpoint}`);
      if (activeTab === 'users') setUsers(res.data);
      else setLogs(res.data);
    } catch (err) {
      console.error("Fetch error", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleLocalChange = (userId, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { 
          role: users.find(u => u.id === userId).role, 
          status: users.find(u => u.id === userId).status 
        }),
        [field]: value
      }
    }));
  };

  const handleUpdateUser = async (userId) => {
    const updates = pendingChanges[userId];
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${userId}`, {
        ...updates,
        admin_id: currentUser.id 
      });
      alert("Staff access updated!");
      const nextPending = { ...pendingChanges };
      delete nextPending[userId];
      setPendingChanges(nextPending);
      fetchData(); 
    } catch (err) {
      alert("Update failed.");
    }
  };

  const getModuleBadgeStyle = (module) => {
    let colors = { bg: '#f1f5f9', text: '#475569' };
    if (module === 'Admin Security') colors = { bg: '#fff1f2', text: '#e11d48' };
    if (module === 'Authentication') colors = { bg: '#eff6ff', text: '#2563eb' };
    if (module === 'Food Service') colors = { bg: '#f0fdf4', text: '#166534' };
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '0.7rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      border: `1px solid ${colors.text}20`
    };
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: 'rgb(61, 146, 95)' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#2d3748' }}>Administration</h1>
            <p style={{ margin: '2px 0 0 0', color: '#718096' }}>Manage staff permissions and audit system activity.</p>
          </div>
        </div>
        
        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0px' }}>
          <button 
            onClick={() => setActiveTab('users')} 
            style={activeTab === 'users' ? activeTabStyle : inactiveTabStyle}
          >
            <Users size={18}/> Staff Management
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            style={activeTab === 'logs' ? activeTabStyle : inactiveTabStyle}
          >
            <Activity size={18}/> Audit Logs
          </button>
        </div>
      </header>

      {/* STAFF MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div style={cardStyle}>
          <div style={filterBarContainer}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={18} style={searchIconStyle} />
              <input 
                type="text" 
                placeholder="Search staff name..." 
                style={searchInputStyle}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={thStyle}>Full Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase())).map(user => {
                const isEdited = !!pendingChanges[user.id];
                const currentRole = pendingChanges[user.id]?.role || user.role;
                const currentStatus = pendingChanges[user.id]?.status || user.status;

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                        <div style={{fontWeight: 'bold', color: '#2d3748'}}>{user.full_name}</div>
                        <small style={{color:'#718096', fontSize: '0.75rem'}}>@{user.username}</small>
                    </td>
                    <td style={tdStyle}>
                      <select style={selectStyle} value={currentRole} onChange={e => handleLocalChange(user.id, 'role', e.target.value)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select 
                        style={{
                            ...selectStyle, 
                            color: currentStatus === 'Active' ? '#166534' : currentStatus === 'Pending' ? '#854d0e' : '#991b1b',
                            fontWeight: '600'
                        }} 
                        value={currentStatus} 
                        onChange={e => handleLocalChange(user.id, 'status', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <button 
                        onClick={() => handleUpdateUser(user.id)}
                        disabled={!isEdited}
                        style={{ 
                            ...btnPrimary, 
                            backgroundColor: isEdited ? 'rgb(61, 146, 95)' : '#e2e8f0',
                            color: isEdited ? 'white' : '#94a3b8'
                        }}
                      >
                        {isEdited ? <Save size={16} /> : <CheckCircle2 size={16} />}
                        {isEdited ? "Save Changes" : "No Changes"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div style={cardStyle}>
          <div style={filterBarContainer}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={searchIconStyle} />
              <input 
                type="text" 
                placeholder="Search actions or staff..." 
                style={searchInputStyle}
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
            </div>
            <select 
              style={{ ...selectStyle, width: '220px' }}
              value={logModuleFilter}
              onChange={(e) => setLogModuleFilter(e.target.value)}
            >
              <option value="All">All Modules</option>
              <option value="Authentication">Authentication</option>
              <option value="Admin Security">Admin Security</option>
              <option value="Food Service">Food Service</option>
            </select>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Staff</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .filter(l => (logModuleFilter === 'All' || l.module === logModuleFilter))
                .filter(l => l.action.toLowerCase().includes(logSearch.toLowerCase()) || l.user_name?.toLowerCase().includes(logSearch.toLowerCase()))
                .map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: '#2d3748' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#4a5568' }}>{log.user_name || 'System'}</td>
                  <td style={tdStyle}><span style={getModuleBadgeStyle(log.module)}>{log.module}</span></td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#2d3748' }}>{log.action}</td>
                  <td style={{ ...tdStyle, color: '#718096', fontSize: '0.85rem' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// STYLES
const cardStyle = { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' };

const activeTabStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  background: 'transparent', 
  color: 'rgb(61, 146, 95)', 
  border: 'none', 
  padding: '12px 20px', 
  borderBottom: '3px solid rgb(61, 146, 95)',
  cursor: 'pointer', 
  fontWeight: 'bold',
  fontSize: '0.95rem'
};

const inactiveTabStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  background: 'transparent', 
  color: '#718096', 
  border: 'none', 
  padding: '12px 20px', 
  cursor: 'pointer', 
  fontWeight: '600',
  fontSize: '0.95rem'
};

const filterBarContainer = { 
  display: 'flex', 
  gap: '15px', 
  padding: '20px', 
  backgroundColor: 'white', 
  borderBottom: '1px solid #f1f5f9' 
};

const thStyle = { 
  padding: '15px 20px', 
  color: '#4a5568', 
  fontSize: '0.75rem', 
  fontWeight: 'bold', 
  textTransform: 'uppercase', 
  letterSpacing: '0.05em' 
};

const tdStyle = { padding: '15px 20px', color: '#2d3748', verticalAlign: 'middle' };

const selectStyle = { 
  padding: '8px 12px', 
  borderRadius: '8px', 
  border: '1px solid #e2e8f0', 
  width: '100%', 
  fontSize: '0.9rem',
  backgroundColor: '#f8fafc',
  cursor: 'pointer'
};

const searchInputStyle = { 
  width: '100%', 
  padding: '10px 10px 10px 40px', 
  borderRadius: '8px', 
  border: '1px solid #e2e8f0', 
  outline: 'none', 
  fontSize: '0.9rem',
  backgroundColor: '#f8fafc'
};

const searchIconStyle = { position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' };

const btnPrimary = { 
  border: 'none', 
  padding: '8px 16px', 
  borderRadius: '8px', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  fontWeight: 'bold', 
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all 0.2s'
};