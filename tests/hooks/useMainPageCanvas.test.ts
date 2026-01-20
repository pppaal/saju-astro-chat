import { renderHook } from '@testing-library/react';
import { useMainPageCanvas } from '@/hooks/useMainPageCanvas';
import { useRef } from 'react';

describe('useMainPageCanvas', () => {
  let canvas: HTMLCanvasElement;
  let canvasRef: { current: HTMLCanvasElement };

  beforeEach(() => {
    // Create mock canvas element
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Mock getContext
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
    };
    canvas.getContext = jest.fn(() => ctx as any);

    canvasRef = { current: canvas };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize canvas on mount', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLCanvasElement>(canvas);
      useMainPageCanvas(ref);
      return ref;
    });

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('should set canvas dimensions to window size', () => {
    global.innerWidth = 1024;
    global.innerHeight = 768;

    renderHook(() => {
      const ref = useRef<HTMLCanvasElement>(canvas);
      useMainPageCanvas(ref);
      return ref;
    });

    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLCanvasElement>(canvas);
      useMainPageCanvas(ref);
      return ref;
    });

    const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');
    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });

  it('should handle window resize', () => {
    renderHook(() => {
      const ref = useRef<HTMLCanvasElement>(canvas);
      useMainPageCanvas(ref);
      return ref;
    });

    // Trigger resize event
    global.innerWidth = 1200;
    global.innerHeight = 900;
    window.dispatchEvent(new Event('resize'));

    // Give time for resize handler to execute
    setTimeout(() => {
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
    }, 100);
  });
});
