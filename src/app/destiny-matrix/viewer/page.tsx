// src/app/destiny-matrix/viewer/page.tsx
// Destiny Fusion Matrix™ Viewer Page

import { Metadata } from 'next';
import MatrixViewer from './MatrixViewer';

export const metadata: Metadata = {
  title: 'Destiny Fusion Matrix™ Viewer',
  description: '10개 레이어 매트릭스 데이터 시각화',
};

export default function MatrixViewerPage() {
  return (
    <main className="matrix-viewer-page">
      <MatrixViewer />
    </main>
  );
}
