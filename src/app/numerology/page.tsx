"use client";

import React, { useState } from "react";
import {
  getLifePathNumber,
  getBirthdayNumber,
  getNameNumber,
  getPersonalYearNumber,
} from "../../lib/numerology/numerology";

export default function NumerologyPage() {
  // state 정의
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString()); // 문자열 관리
  const [results, setResults] = useState<any>(null);

  const handleCalculate = () => {
    if (!birthdate) {
      alert("Please enter your birthdate.");
      return;
    }

    const date = new Date(birthdate);
    const lifePath = getLifePathNumber(date);
    const birthdayNum = getBirthdayNumber(date);
    const nameNum = name ? getNameNumber(name) : null;
    const personalYear = getPersonalYearNumber(date, parseInt(year)); // 여기서만 parseInt

    setResults({
      lifePath,
      birthdayNum,
      nameNum,
      personalYear,
    });
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <>
      <style jsx>{`
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
          max-width: 700px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.35);
          padding: 2rem;
          border-radius: 16px;
          backdrop-filter: blur(8px);
        }

        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border-radius: 8px;
          border: 1px solid #aaa;
          background: #000;
          color: white;
          font-size: 1rem;
        }

        .calc-button {
          background: linear-gradient(135deg, #ff7b5f, #ffd166);
          color: #000;
          font-weight: bold;
          font-size: 1.1rem;
          padding: 12px 36px;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          display: block;
          margin: 1rem auto 0 auto;
          transition: transform 0.2s ease;
        }

        .calc-button:hover {
          transform: scale(1.05);
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid white;
          color: white;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 8px;
        }
      `}</style>

      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          background: "#0c0a1a",
          color: "white",
          position: "relative",
        }}
      >
        {/* Back button */}
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>

        {/* Title */}
        <h1 className="title">Numerology Insights</h1>

        {/* Input box */}
        <div className="form-container">
          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />

          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="input"
          />
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Year for Personal Year calculation
          </label>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)} // 문자열로 저장
            className="input"
            placeholder="Enter year for Personal Year (ex: 2025)"
          />

          <button className="calc-button" onClick={handleCalculate}>
            Calculate Numbers
          </button>

          {results && (
            <div style={{ marginTop: "1.5rem", lineHeight: "1.8" }}>
              <p>
                <strong>Life Path Number: </strong> {results.lifePath}
              </p>
              <p>
                <strong>Birthday Number: </strong> {results.birthdayNum}
              </p>
              {results.nameNum && (
                <p>
                  <strong>Name Number: </strong> {results.nameNum}
                </p>
              )}
              <p>
                <strong>Personal Year: </strong> {results.personalYear}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}