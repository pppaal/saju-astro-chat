"use client";

import React, { useState } from "react";
// Import the Numerology class instead of individual functions
import { Numerology, CoreNumerologyProfile } from "../../lib/numerology/numerology"; 

// A simple component for displaying each result card
function ResultCard({ title, value, description }: { title: string, value: any, description: string }) {
  return (
    <div className="result-card">
      <span className="result-value">{value}</span>
      <h3 className="result-title">{title}</h3>
      <p className="result-description">{description}</p>
    </div>
  );
}

export default function NumerologyPage() {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  // Use a state for the full result profile object
  const [profile, setProfile] = useState<CoreNumerologyProfile | null>(null);

  const handleCalculate = () => {
    if (!birthdate) {
      alert("Please enter your birthdate.");
      return;
    }
    if (!name) {
      alert("Please enter your full name for a complete reading.");
      return;
    }

    // Use the Numerology class for a cleaner, all-in-one calculation
    const date = new Date(`${birthdate}T00:00:00Z`); // Use ISO format with Z for UTC
    const person = new Numerology(name, date);
    const coreProfile = person.getCoreProfile();
    
    setProfile(coreProfile);
  };

  const handleBack = () => {
    // A more robust way to handle navigation in Next.js is using the router
    // For simplicity, we'll keep window.history, but consider using useRouter
    window.history.back();
  };

  return (
    <>
      <style jsx>{`
        /* --- Base Styles --- */
        .numerology-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          background: #0c0a1a;
          color: white;
          position: relative;
        }
        .title {
          font-family: "Cinzel", serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #ffd166;
          text-align: center;
          text-shadow: 0 0 10px rgba(255, 209, 102, 0.8),
            0 0 20px rgba(255, 209, 102, 0.6);
          margin-bottom: 2rem;
        }
        .form-container {
          max-width: 500px; /* Made it a bit more compact */
          width: 100%;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.35);
          padding: 2.5rem; /* More padding */
          border-radius: 16px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* --- Form Elements --- */
        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          color: #ccc;
          font-size: 0.9rem;
        }
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem; /* Increased margin */
          border-radius: 8px;
          border: 1px solid #555; /* Darker border */
          background: rgba(0, 0, 0, 0.5); /* More transparent */
          color: white;
          font-size: 1rem;
        }
        .input:focus {
          outline: none;
          border-color: #ffd166;
          box-shadow: 0 0 8px rgba(255, 209, 102, 0.5);
        }

        /* --- Buttons --- */
        .calc-button {
          background: linear-gradient(135deg, #ff7b5f, #ffd166);
          color: #1a1a1a; /* Darker text */
          font-weight: bold;
          font-size: 1.1rem;
          padding: 12px 36px;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          display: block;
          width: 100%; /* Full width */
          margin-top: 1rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .calc-button:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(255, 209, 102, 0.4);
        }
        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 8px;
          backdrop-filter: blur(5px);
          transition: background-color 0.2s ease;
        }
        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* --- Results Display (NEW) --- */
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          width: 100%;
          max-width: 700px;
          margin-top: 3rem;
        }
        .result-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          backdrop-filter: blur(5px);
        }
        .result-value {
          font-size: 3rem;
          font-weight: bold;
          color: #ffd166;
          display: block;
        }
        .result-title {
          margin: 0.5rem 0;
          font-size: 1.1rem;
        }
        .result-description {
          font-size: 0.9rem;
          color: #ccc;
          line-height: 1.5;
        }
      `}</style>

      <main className="numerology-page">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>

        <h1 className="title">Numerology Insights</h1>

        {/* Show input form if no profile is calculated yet */}
        {!profile && (
          <div className="form-container">
            <label className="input-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
            
            <label className="input-label" htmlFor="birthdate">Birthdate</label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="input"
            />

            <button className="calc-button" onClick={handleCalculate}>
              Reveal My Numbers
            </button>
          </div>
        )}

        {/* Show results grid once the profile is calculated */}
        {profile && (
          <div className="results-grid">
            <ResultCard 
              title="Life Path Number" 
              value={profile.lifePathNumber}
              description="Your life's main purpose and the path you will walk."
            />
            <ResultCard 
              title="Expression Number" 
              value={profile.expressionNumber}
              description="Your natural talents, abilities, and potential."
            />
            <ResultCard 
              title="Soul Urge Number" 
              value={profile.soulUrgeNumber}
              description="Your inner self, true desires, and deepest motivations."
            />
            <ResultCard 
              title="Personality Number" 
              value={profile.personalityNumber}
              description="The outer you; the personality you show to the world."
            />
          </div>
        )}
      </main>
    </>
  );
}