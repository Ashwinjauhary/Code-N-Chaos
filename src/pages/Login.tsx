import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import Layout from '../components/Layout';

export default function Login() {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setParticipant } = useParticipant();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !rollNumber.trim() || !email.trim() || !phoneNumber.trim() || !className.trim() || !section.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      // Try to fetch existing participant
      const { data: existing, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('roll_number', rollNumber.trim().toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setParticipant({
          id: existing.id,
          name: existing.name,
          roll_number: existing.roll_number,
          email: existing.email,
          phone_number: existing.phone_number,
          class: existing.class,
          section: existing.section,
        });
        navigate('/lobby');
        return;
      }

      // Create new participant
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({
          name: name.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          email: email.trim(),
          phone_number: phoneNumber.trim(),
          class: className.trim(),
          section: section.trim().toUpperCase(),
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This roll number is already registered. Please try again.');
        } else {
          throw insertError;
        }
        return;
      }

      setParticipant({
        id: newParticipant.id,
        name: newParticipant.name,
        roll_number: newParticipant.roll_number,
        email: newParticipant.email,
        phone_number: newParticipant.phone_number,
        class: newParticipant.class,
        section: newParticipant.section,
      });
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="login-page">
        <div className="login-bg-effects">
          <div className="bg-orb orb-1" />
          <div className="bg-orb orb-2" />
          <div className="bg-orb orb-3" />
        </div>

        <motion.div
          className="login-container"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="login-left-pane">
            <div className="login-header">
              <motion.div
              className="login-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              ⚡
            </motion.div>
            <p className="login-club">The Codester Club x The Logix Club Organizes</p>
            <h1 className="login-title">
              Code <span className="highlight">N</span> Chaos
            </h1>
            <p className="login-subtitle">The Ultimate Tech Quest — Round 2</p>
            </div>
            
            <div className="login-footer">
              <p>Tech Gaming Arena • 3 Games • Live Leaderboard</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Enter your full name"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="roll-number">Roll Number</label>
              <input
                id="roll-number"
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your roll number"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone-number">Phone Number</label>
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                placeholder="Enter your phone number"
                autoComplete="tel"
                disabled={loading}
              />
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="class-name">Class / Course</label>
                <input
                  id="class-name"
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value.toUpperCase())}
                  placeholder="e.g. B.Tech CS"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="section">Section</label>
                <input
                  id="section"
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <motion.div
                className="form-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="login-btn"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Logging in...
                </span>
              ) : (
                'Enter Arena'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
