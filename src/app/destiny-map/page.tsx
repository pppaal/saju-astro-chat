'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DestinyMapPage() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [city, setCity] = useState('Seoul');
  const [gender, setGender] = useState('Male');
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ name, birthDate, birthTime, city, gender });
    router.push(`/destiny-map/result?${params.toString()}`);
  };

  return (
    <div className="wrapper">
      <main className="page" style={{ position: 'relative' }}>
        
        <button
          onClick={() => router.back()}
          className="back-btn"
          style={{ position: 'absolute', top: 24, left: 24, zIndex: 20 }}
          aria-label="뒤로가기"
        >
          ←
        </button>
   

        <section className="card">
          <h1 className="title">Destiny Map</h1>
          <p className="subtitle">Provide your birth details to begin.</p>

          <form onSubmit={onSubmit} className="form">
            <div className="field">
              <label className="label">Name</label>
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid2">
              <div className="field">
                <label className="label">Birth Date</label>
                <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Birth Time</label>
                <input className="input" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
              </div>
            </div>

            <div className="grid2">
              <div className="field">
                <label className="label">Birth City (English)</label>
                <input className="input" placeholder="Seoul" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Gender</label>
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <button className="primary" type="submit">Analyze</button>
          </form>
        </section>
      </main>
    </div>
  );
}