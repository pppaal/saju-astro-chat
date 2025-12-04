// src/components/destiny-map/DestinyVisualizer.tsx

'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import styles from './DestinyVisualizer.module.css';

import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';

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

interface DestinyVisualizerProps {
  result: CombinedResult;
}

const auraColors: { [key: string]: number } = { Wood: 0x4caf50, Fire: 0xf44336, Earth: 0xffeb3b, Metal: 0x9e9e9e, Water: 0x2196f3 };
const auraHex: { [key: string]: string } = { Wood: '#4caf50', Fire: '#f44336', Earth: '#ffeb3b', Metal: '#9e9e9e', Water: '#2196f3' };

export const DestinyVisualizer: React.FC<DestinyVisualizerProps> = ({ result }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  const sajuData = result.saju as SajuData;
  const astrologyData = result.astrology as AstrologyData;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!mountRef.current || !sajuData?.facts || !astrologyData?.facts) return;

    const container = mountRef.current;
    const currentThree = threeRef.current;

    const fiveElements = sajuData.facts.fiveElements ?? { Wood: 0.2, Fire: 0.2, Earth: 0.2, Metal: 0.2, Water: 0.2 };
    const dominantElement = Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Earth';
    const colorValue = auraColors[dominantElement];
    const auraColor = new THREE.Color(colorValue);

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

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.2, 0.6, 0.4);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    currentThree.composer = composer;

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      starVertices.push(THREE.MathUtils.randFloatSpread(200));
      starVertices.push(THREE.MathUtils.randFloatSpread(200));
      starVertices.push(THREE.MathUtils.randFloatSpread(200));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05, transparent: true, opacity: 0.5 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

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

    const nodes: THREE.Mesh[] = [];
    const planetList = astrologyData.facts.planets.map((p: AstrologyPlanet) => ({ name: p.name, type: 'Planet' }));
    const elementList = Object.keys(fiveElements).map(e => ({ name: e, type: 'Element' }));
    const tenGodList = Object.keys(sajuData.facts.tenGods ?? {}).map(tg => ({ name: tg, type: 'TenGod' }));

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

    let index = 0;
    groups.forEach(grp => {
      grp.list.forEach((item: DestinyNodeItem) => {
        const angle = (index / (planetList.length + elementList.length + tenGodList.length)) * Math.PI * 2 + (Math.random() * 0.2);
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

    currentThree.raycaster = new THREE.Raycaster();
    currentThree.mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      if (!currentThree.mouse || !renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      currentThree.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      currentThree.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
    };

    const onMouseDown = () => { if (mountRef.current) mountRef.current.style.cursor = 'grabbing'; };
    const onMouseUp = () => { if (mountRef.current) mountRef.current.style.cursor = 'grab'; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);

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

    const handleResize = () => {
      if (!container || !currentThree.camera || !currentThree.renderer || !currentThree.composer) return;
      const { clientWidth, clientHeight } = container;
      currentThree.camera.aspect = clientWidth / clientHeight;
      currentThree.camera.updateProjectionMatrix();
      currentThree.renderer.setSize(clientWidth, clientHeight);
      currentThree.composer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

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
  }, [result, sajuData, astrologyData, tooltip.x, tooltip.y, prefersReducedMotion]);

  const currentYear = new Date().getFullYear();
  const daeun = sajuData?.unse?.daeun ?? [];
  const fiveElements = sajuData?.facts?.fiveElements ?? {};
  const dominantElement = Object.keys(fiveElements).length > 0 ? Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0][0] : 'Earth';
  const activeColor = auraHex[dominantElement] || '#ffeb3b';

  if (prefersReducedMotion) {
    return (
      <div className={styles.fallback}>
        <div className={styles.fallbackRow}>
          <span className={styles.chip}>Dominant element: {dominantElement}</span>
          <span className={styles.chip}>Planets: {astrologyData?.facts?.planets?.length ?? 0}</span>
        </div>
        <div className={styles.fallbackRow}>
          {(astrologyData?.facts?.planets || []).slice(0, 8).map((p) => (
            <span key={p.name} className={styles.chip}>{p.name}</span>
          ))}
        </div>
        {daeun.length > 0 && (
          <div>
            <strong>Current cycles</strong>
            <div className={styles.fallbackRow}>
              {daeun.slice(0, 4).map((d) => (
                <span key={d.startYear} className={styles.chip}>
                  {d.ganji} {d.startYear}-{d.endYear}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 8, width: "100%", background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)` }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={mountRef} className={styles.mount} />

      <div className={styles.timeline}>
        {daeun.slice(0, 8).map((d: DaeunCycle, index: number) => {
          const isCurrent = currentYear >= d.startYear && currentYear <= d.endYear;
          const nodeStyle: React.CSSProperties = {
            border: isCurrent ? `1.5px solid ${activeColor}` : undefined,
            backgroundColor: isCurrent ? `color-mix(in srgb, ${activeColor} 20%, rgba(30,30,30,0.6))` as any : undefined,
            transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
          };
          return (
            <div key={index} className={styles.timelineNode} style={nodeStyle}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{d.ganji}</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{d.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>{d.startYear}-{d.endYear}</div>
            </div>
          );
        })}
      </div>

      {tooltip.visible && (
        <div
          className={styles.tooltip}
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, opacity: tooltip.visible ? 1 : 0 }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};
