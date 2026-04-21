import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, ShieldCheck, Mail } from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ full_name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        // Handle Login
        const res = await axios.post('http://localhost:5000/api/auth/login', {
          username: formData.username,
          password: formData.password
        });
        
        // Save token & user data to localStorage
        localStorage.setItem('hospital_token', res.data.token);
        localStorage.setItem('hospital_user', JSON.stringify(res.data.user));
        
        // Tell the main App that we are logged in!
        onLoginSuccess(res.data.user);

      } else {
        // Handle Registration
        const res = await axios.post('http://localhost:5000/api/auth/register', formData);
        setMessage(res.data.message);
        setFormData({ full_name: '', username: '', password: '' });
        setIsLogin(true); // Switch back to login page
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error occurred.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <div style={{ backgroundColor: 'rgb(61, 146, 95)', padding: '15px', borderRadius: '50%' }}>
              <ShieldCheck color="white" size={40} />
            </div>
          </div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem' }}>BRGHGMC Dietary</h2>
          <p style={{ color: '#64748b', marginTop: '5px' }}>
            {isLogin ? 'Sign in to your account' : 'Request staff access'}
          </p>
        </div>

        {error && <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #fecaca' }}>{error}</div>}
        {message && <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>{message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input type="text" placeholder="Full Name (e.g. Juan Dela Cruz)" required style={inputStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input type="text" placeholder="Username" required style={inputStyle} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input type="password" placeholder="Password" required style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" style={{ backgroundColor: 'rgb(61, 146, 95)', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }}>
            {isLogin ? 'Secure Login' : 'Submit Request'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem' }}>
          <span style={{ color: '#64748b' }}>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'rgb(61, 146, 95)', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
            {isLogin ? 'Register Here' : 'Log In'}
          </button>
        </div>

      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };