import React from 'react';
import { DAY_MASTERS, GEOKGUKS } from '../constants';
import { Particles } from './Particles';

interface InputScreenProps {
  styles: Record<string, string>;
  birthDate: string;
  setBirthDate: (value: string) => void;
  birthTime: string;
  setBirthTime: (value: string) => void;
  dayMaster: string;
  setDayMaster: (value: string) => void;
  geokguk: string;
  setGeokguk: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function InputScreen({
  styles,
  birthDate,
  setBirthDate,
  birthTime,
  setBirthTime,
  dayMaster,
  setDayMaster,
  geokguk,
  setGeokguk,
  onBack,
  onSubmit,
}: InputScreenProps) {
  return (
    <div className={styles.container}>
      <Particles styles={styles} count={20} />

      <button className={styles.backBtn} onClick={onBack}>
        ← 뒤로
      </button>

      <div className={styles.inputContent}>
        <div className={styles.inputHeader}>
          <span className={styles.inputIcon}>🔮</span>
          <h2>운명 정보 입력</h2>
          <p>당신의 사주 정보를 입력해주세요</p>
        </div>

        <div className={styles.inputForm}>
          <div className={styles.formGroup}>
            <label>생년월일</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>태어난 시간 (선택)</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className={styles.timeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>일간 (日干) <span className={styles.required}>*</span></label>
            <div className={styles.dayMasterGrid}>
              {DAY_MASTERS.map((dm) => (
                <button
                  key={dm}
                  className={`${styles.dayMasterBtn} ${dayMaster === dm ? styles.selected : ''}`}
                  onClick={() => setDayMaster(dm)}
                >
                  <span className={styles.dmIcon}>
                    {dm === '목' ? '🌳' : dm === '화' ? '🔥' : dm === '토' ? '🏔️' : dm === '금' ? '⚔️' : '💧'}
                  </span>
                  <span className={styles.dmLabel}>{dm}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>격국 (選擇)</label>
            <select
              value={geokguk}
              onChange={(e) => setGeokguk(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">선택 안함</option>
              {GEOKGUKS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <button
            className={styles.analyzeBtn}
            onClick={onSubmit}
            disabled={!dayMaster}
          >
            <span>🌌</span>
            <span>매트릭스 분석 시작</span>
          </button>
        </div>
      </div>
    </div>
  );
}
