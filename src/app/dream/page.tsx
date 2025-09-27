"use client";

import React, { useState } from "react";

export default function DreamPage() {
  const [dream, setDream] = useState("");
  const [share, setShare] = useState(false);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  const handleBack = () => {
    window.history.back();
  };

  const handleInterpret = () => {
    if (!dream.trim()) {
      setInterpretation("Please enter your dream first.");
      return;
    }
    setInterpretation("✨ Your dream suggests hidden desires and transformation.");
  };

  return (
    <>
      <style jsx>{`
        .title {
          font-family: 'Cinzel', serif;
          font-size: 3rem;
          font-weight: 700;
          color: #a48fff;
          text-align: center;
          text-shadow: 0 0 10px rgba(164, 143, 255, 0.8),
                       0 0 20px rgba(164, 143, 255, 0.6);
          margin-bottom: 2rem;
        }

        .dream-container {
          max-width: 1000px;
          width: 90%; 
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 2rem;
          backdrop-filter: blur(8px);
        }

        textarea {
          width: 100%;
          height: 300px;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #aaa;
          font-size: 1.1rem;
          line-height: 1.6;
          background: #0d0d0d;
          color: white;
          resize: vertical;
          box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.08);
        }

        .dream-button {
          background: linear-gradient(135deg, #7b2fff, #4a90e2);
          color: #fff;
          font-weight: bold;
          font-size: 1.1rem;
          padding: 14px 36px;
          border: none;
          border-radius: 50px;
          margin-top: 1.5rem;
          cursor: pointer;
          transition: transform 0.2s ease;
          display: block;   /* 가로 가운데 */
          margin-left: auto;
          margin-right: auto;
        }

        .dream-button:hover {
          transform: scale(1.05);
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0,0,0,0.3);
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
        {/* 뒤로가기 버튼 */}
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>

        {/* 제목 */}
        <h1 className="title">Dream Oracle</h1>

        <div className="dream-container">
          <textarea
            placeholder="Enter your dream"
            value={dream}
            onChange={(e) => setDream(e.target.value)}
          />
          <div style={{ marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              id="share"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
            />
            <label htmlFor="share" style={{ marginLeft: "0.5rem" }}>
              Share in the Dreamer Map
            </label>
          </div>

          {/* 버튼은 가운데 */}
          <button className="dream-button" onClick={handleInterpret}>
            Interpret Dream
          </button>

          {interpretation && (
            <p style={{ marginTop: "1.5rem", color: "#ffd700", textAlign: "center" }}>
              {interpretation}
            </p>
          )}
        </div>
      </main>
    </>
  );
}