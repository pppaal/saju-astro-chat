// src/components/DestinyVisualizer.tsx

'use client'; // 이 컴포넌트는 클라이언트 측에서 렌더링되어야 합니다.

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 💡 FIX: astrologyengine.ts의 CombinedResult 타입이 any를 포함하므로,
// 이 컴포넌트에서 사용할 데이터의 구조를 명확하게 정의합니다.
// 이렇게 하면 'unknown' 타입 오류를 근본적으로 해결할 수 있습니다.

interface SajuFacts {
  fiveElements: { [key: string]: number };
  tenGods: { [key: string]: any };
}

interface DaeunCycle {
  ganji: string;
  name: string;
  startYear: number;
  endYear: number;
}

interface SajuData {
  facts: SajuFacts;
  unse: {
    daeun: DaeunCycle[];
  };
}

interface AstrologyPlanet {
  name: string;
}

interface AstrologyFacts {
  planets: AstrologyPlanet[];
}

interface AstrologyData {
  facts: AstrologyFacts;
}

// astrologyengine.ts 에서 정의한 타입을 가져옵니다.
// 실제로는 내부의 any 타입 때문에 아래에서 정의한 타입을 사용합니다.
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

interface DestinyVisualizerProps {
  result: CombinedResult;
}

// 1. 컴포넌트 외부 또는 별도 파일에 스타일 정의
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '500px',
    backgroundColor: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'grab',
  },
  mountPoint: {
    width: '100%',
    height: '100%',
  },
  timelineHud: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    padding: '12px 0',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
    fontFamily: 'Pretendard, sans-serif',
    flexWrap: 'wrap',
    gap: '8px',
    pointerEvents: 'none',
  },
  timelineNode: {
    flex: '0 1 85px',
    padding: '6px',
    textAlign: 'center',
    border: '1px solid #444',
    borderRadius: '8px',
    background: 'rgba(30,30,30,0.6)',
    color: '#eee',
    fontSize: '12px',
    transition: 'all 0.3s ease',
    pointerEvents: 'auto',
  },
  tooltip: {
    position: 'fixed',
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(5px)',
    border: '1px solid #555',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    pointerEvents: 'none',
    transform: 'translate(-50%, -120%)',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    transition: 'opacity 0.2s ease',
  }
};


export const DestinyVisualizer: React.FC<DestinyVisualizerProps> = ({ result }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

  const threeRef = useRef<{
    scene?: THREE.Scene,
    camera?: THREE.PerspectiveCamera,
    renderer?: THREE.WebGLRenderer,
    composer?: EffectComposer,
    nodes?: THREE.Mesh[],
    raycaster?: THREE.Raycaster,
    mouse?: THREE.Vector2,
    INTERSECTED?: THREE.Object3D | null,
    animationFrameId?: number,
  }>({});

  // 💡 FIX: props로 받은 result의 saju와 astrology를 위에서 정의한 타입으로 단언(cast)합니다.
  // 이렇게 함으로써 TypeScript가 데이터의 구조를 이해하게 됩니다.
  const sajuData = result.saju as SajuData;
  const astrologyData = result.astrology as AstrologyData;

  useEffect(() => {
    // 💡 FIX: 타입 단언을 통해 sajuData와 astrologyData가 null/undefined가 아님을 보장합니다.
    if (!mountRef.current || !sajuData?.facts || !astrologyData?.facts) return;

    const container = mountRef.current;
    const currentThree = threeRef.current;

    // --- ⚙️ 데이터 추출 및 설정 ---
    const fiveElements = sajuData.facts.fiveElements ?? { Wood: 0.2, Fire: 0.2, Earth: 0.2, Metal: 0.2, Water: 0.2 };
    const daeun = Array.isArray(sajuData.unse?.daeun) ? sajuData.unse.daeun : [];
    const dominantElement = Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Earth';
    const auraColors: { [key: string]: number } = { Wood: 0x4caf50, Fire: 0xf44336, Earth: 0xffeb3b, Metal: 0x9e9e9e, Water: 0x2196f3 };
    const auraColor = new THREE.Color(auraColors[dominantElement]);

    // --- 🚀 3D 씬 초기화 ---
    const scene = new THREE.Scene();
    currentThree.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 7;
    currentThree.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    currentThree.renderer = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 10);
    scene.add(pointLight);

    // --- ✨ 후처리 (Bloom 효과) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.2, 0.6, 0.4);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    currentThree.composer = composer;

    // --- 🌌 동적 성운 배경 ---
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        starVertices.push(THREE.MathUtils.randFloatSpread(200)); // x
        starVertices.push(THREE.MathUtils.randFloatSpread(200)); // y
        starVertices.push(THREE.MathUtils.randFloatSpread(200)); // z
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05, transparent: true, opacity: 0.5 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- 🔮 중심 에너지 코어 ---
    const coreGroup = new THREE.Group();
    const matCore = new THREE.MeshStandardMaterial({
        color: auraColor,
        emissive: auraColor,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.6,
        roughness: 0.5,
        metalness: 0.2
    });
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 64, 64), matCore));
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
    scene.add(coreGroup);

    // --- 🪐 운명 노드 생성 ---
    const nodes: THREE.Mesh[] = [];
    const planetList = astrologyData.facts.planets.map((p: AstrologyPlanet) => ({ name: p.name, type: 'Planet' }));
    const elementList = Object.keys(fiveElements).map(e => ({ name: e, type: '오행' }));
    const tenGodList = Object.keys(sajuData.facts.tenGods ?? {}).map(tg => ({ name: tg, type: '십신' }));

    // 💡 FIX: 'item' 매개변수에 타입을 지정하기 위해 노드 아이템 타입을 정의합니다.
    interface DestinyNodeItem { name: string; type: string; }
    interface NodeGroup {
      list: DestinyNodeItem[];
      color: number;
      radius: number;
      size: number;
    }

    const groups: NodeGroup[] = [
        { list: planetList, color: 0xffef62, radius: 3.5, size: 0.15 },
        { list: elementList, color: 0x64b5f6, radius: 2.8, size: 0.12 },
        { list: tenGodList, color: 0xba68c8, radius: 2.1, size: 0.1 }
    ];

    let totalNodes = planetList.length + elementList.length + tenGodList.length;
    let index = 0;
    groups.forEach(grp => {
        // 💡 FIX: 콜백 함수의 'item' 매개변수에 명시적으로 타입을 지정하여 'implicit any' 오류를 해결합니다.
        grp.list.forEach((item: DestinyNodeItem) => {
            const angle = (index / totalNodes) * Math.PI * 2 + (Math.random() * 0.2);
            const yPos = (Math.random() - 0.5) * 2.5;

            const material = new THREE.MeshStandardMaterial({ color: grp.color, emissive: grp.color, emissiveIntensity: 0.3, roughness: 0.4 });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(grp.size, 16, 16), material);
            mesh.position.set(Math.cos(angle) * grp.radius, yPos, Math.sin(angle) * grp.radius);
            mesh.userData = { name: item.name, type: item.type, originalEmissive: material.emissive.getHex() };
            scene.add(mesh);
            nodes.push(mesh);
            index++;
        });
    });
    currentThree.nodes = nodes;

    // --- 🖱️ 인터랙션 설정 ---
    currentThree.raycaster = new THREE.Raycaster();
    currentThree.mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
        if (!currentThree.mouse || !renderer) return;
        const rect = renderer.domElement.getBoundingClientRect();
        currentThree.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        currentThree.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
    };
    
    const onMouseDown = () => { if(mountRef.current) mountRef.current.style.cursor = 'grabbing'; };
    const onMouseUp = () => { if(mountRef.current) mountRef.current.style.cursor = 'grab'; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);

    // --- 🔄 애니메이션 루프 ---
    const animate = () => {
        currentThree.animationFrameId = requestAnimationFrame(animate);
        if (!currentThree.composer) return;
        const time = Date.now() * 0.0005;

        starField.rotation.y = time * 0.05;
        coreGroup.rotation.y += 0.001;
        (coreGroup.children[1] as THREE.Mesh).scale.setScalar(0.9 + Math.sin(time * 2) * 0.1);
        
        if (currentThree.raycaster && currentThree.mouse && currentThree.camera && currentThree.nodes) {
            currentThree.raycaster.setFromCamera(currentThree.mouse, currentThree.camera);
            const intersects = currentThree.raycaster.intersectObjects(currentThree.nodes);

            if (intersects.length > 0) {
                const newIntersected = intersects[0].object;
                if (currentThree.INTERSECTED !== newIntersected) {
                    if (currentThree.INTERSECTED) {
                        (currentThree.INTERSECTED as any).material.emissive.setHex(currentThree.INTERSECTED.userData.originalEmissive);
                        currentThree.INTERSECTED.scale.set(1, 1, 1);
                    }
                    currentThree.INTERSECTED = newIntersected;
                    (currentThree.INTERSECTED as any).material.emissive.setHex(0xffffff);
                    currentThree.INTERSECTED.scale.set(1.5, 1.5, 1.5);

                    setTooltip({
                        visible: true,
                        content: `<strong>${newIntersected.userData.name}</strong> <span style="opacity:0.7;font-size:0.8em;">(${newIntersected.userData.type})</span>`,
                        x: tooltip.x,
                        y: tooltip.y,
                    });
                }
            } else {
                if (currentThree.INTERSECTED) {
                    (currentThree.INTERSECTED as any).material.emissive.setHex(currentThree.INTERSECTED.userData.originalEmissive);
                    currentThree.INTERSECTED.scale.set(1, 1, 1);
                }
                currentThree.INTERSECTED = null;
                setTooltip(prev => ({ ...prev, visible: false }));
            }
        }
        currentThree.composer.render();
    };
    animate();

    // --- 📏 반응형 대응 ---
    const handleResize = () => {
        if (!container || !currentThree.camera || !currentThree.renderer || !currentThree.composer) return;
        const { clientWidth, clientHeight } = container;
        currentThree.camera.aspect = clientWidth / clientHeight;
        currentThree.camera.updateProjectionMatrix();
        currentThree.renderer.setSize(clientWidth, clientHeight);
        currentThree.composer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 🧹 클린업 함수 ---
    return () => {
        if (currentThree.animationFrameId) {
          cancelAnimationFrame(currentThree.animationFrameId);
        }
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mouseup', onMouseUp);

        scene.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else if (object.material) {
                    object.material.dispose();
                }
            }
        });
        starGeometry.dispose();
        starMaterial.dispose();
        
        if (currentThree.renderer) {
            currentThree.renderer.dispose();
        }
        if (container) {
            container.innerHTML = '';
        }
    };
  }, [result, sajuData, astrologyData, tooltip.x, tooltip.y]);

  // --- 🎨 JSX 렌더링 ---
  const currentYear = new Date().getFullYear();
  const daeun = sajuData?.unse?.daeun ?? [];
  const fiveElements = sajuData?.facts?.fiveElements ?? {};
  const dominantElement = Object.keys(fiveElements).length > 0 ? Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0][0] : 'Earth';
  const auraColors: { [key: string]: string } = { Wood: '#4caf50', Fire: '#f44336', Earth: '#ffeb3b', Metal: '#9e9e9e', Water: '#2196f3' };
  const activeColor = auraColors[dominantElement];

  return (
    <div style={styles.container}>
      <div ref={mountRef} style={styles.mountPoint} />
      
      <div style={styles.timelineHud}>
        {/* 💡 FIX: 'd' 매개변수에 위에서 정의한 DaeunCycle 타입을 지정합니다. */}
        {daeun.slice(0, 8).map((d: DaeunCycle, index: number) => {
          const isCurrent = currentYear >= d.startYear && currentYear <= d.endYear;
          const nodeStyle = {
            ...styles.timelineNode,
            border: isCurrent ? `1.5px solid ${activeColor}` : '1px solid #444',
            backgroundColor: isCurrent ? `rgba(from ${activeColor} r g b / 0.2)` : 'rgba(30,30,30,0.6)',
            transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
          };
          return (
            <div key={index} style={nodeStyle}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{d.ganji}</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{d.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>{d.startYear}-{d.endYear}</div>
            </div>
          );
        })}
      </div>

      {tooltip.visible && (
        <div
          style={{ ...styles.tooltip, left: `${tooltip.x}px`, top: `${tooltip.y}px`, opacity: tooltip.visible ? 1 : 0 }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};