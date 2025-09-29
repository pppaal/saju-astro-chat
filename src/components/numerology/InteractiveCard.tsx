// components/InteractiveCard.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  title: string;
  value: number | string;
  shortDescription: string;
  longDescription: string; // 상세 설명을 위한 props 추가
}

export default function InteractiveCard({ title, value, shortDescription, longDescription }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      layout // 레이아웃 변경 시 부드러운 애니메이션
      onClick={() => setIsOpen(!isOpen)}
      style={cardStyle}
      whileHover={{ scale: 1.03, boxShadow: "0px 10px 30px rgba(255, 209, 102, 0.2)" }}
      transition={{ layout: { duration: 0.3, type: "spring" } }}
    >
      <motion.span layout="position" style={valueStyle}>{value}</motion.span>
      <motion.h3 layout="position" style={titleStyle}>{title}</motion.h3>
      <motion.p layout="position" style={descriptionStyle}>{shortDescription}</motion.p>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '1rem' }}
          >
            <p style={descriptionStyle}>{longDescription}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 간단한 스타일링
const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '1.5rem',
  textAlign: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
};

const valueStyle: React.CSSProperties = { fontSize: '3rem', fontWeight: 'bold', color: '#ffd166', display: 'block' };
const titleStyle: React.CSSProperties = { margin: '0.5rem 0', fontSize: '1.1rem' };
const descriptionStyle: React.CSSProperties = { fontSize: '0.9rem', color: '#ccc', lineHeight: 1.5, margin: 0 };