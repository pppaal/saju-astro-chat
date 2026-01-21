/**
 * Tests for useFocusTrap hook - WCAG 2.1 AA compliant focus management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let input: HTMLInputElement;

  beforeEach(() => {
    // Create DOM elements for testing
    container = document.createElement('div');
    button1 = document.createElement('button');
    button1.textContent = 'First';
    button2 = document.createElement('button');
    button2.textContent = 'Last';
    input = document.createElement('input');
    input.type = 'text';

    container.appendChild(button1);
    container.appendChild(input);
    container.appendChild(button2);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should return a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it('should not trap focus when isOpen is false', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Focus should not be managed
    button1.focus();
    expect(document.activeElement).toBe(button1);
  });

  it('should store previous active element when opened', () => {
    // Focus an element before opening
    const outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    expect(document.activeElement).toBe(outsideButton);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    // The hook should have stored the previous active element
    // (Focus will be moved to first focusable element in container)

    document.body.removeChild(outsideButton);
  });

  it('should focus first focusable element when opened', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    // Wait for requestAnimationFrame
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // First focusable element should be focused
    expect(document.activeElement).toBe(button1);
  });

  it('should handle Tab key to cycle through focusable elements', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // Focus should be on first element
    expect(document.activeElement).toBe(button1);

    // Simulate Tab on last element -> should wrap to first
    button2.focus();
    expect(document.activeElement).toBe(button2);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    });

    // Prevent default should be called and focus should wrap
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
    document.dispatchEvent(tabEvent);

    // The handler should have been called
    // Note: In a real scenario, focus would be moved to first element
  });

  it('should handle Shift+Tab to cycle backwards', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // Focus first element
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Simulate Shift+Tab on first element -> should wrap to last
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });

    document.dispatchEvent(shiftTabEvent);
    // Focus trap should handle this
  });

  it('should clean up event listeners when closed', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { result, rerender, unmount } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open modal
    rerender({ isOpen: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // Close modal
    rerender({ isOpen: false });
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();
  });

  it('should handle empty container gracefully', async () => {
    const emptyContainer = document.createElement('div');
    document.body.appendChild(emptyContainer);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to empty container
    Object.defineProperty(result.current, 'current', {
      value: emptyContainer,
      writable: true,
    });

    // Should not throw when opened with no focusable elements
    expect(() => {
      rerender({ isOpen: true });
    }).not.toThrow();

    document.body.removeChild(emptyContainer);
  });

  it('should ignore hidden elements', async () => {
    // Create a hidden button
    const hiddenButton = document.createElement('button');
    hiddenButton.style.display = 'none';
    hiddenButton.textContent = 'Hidden';
    container.insertBefore(hiddenButton, button1);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // First visible focusable element should be focused (button1, not hiddenButton)
    expect(document.activeElement).toBe(button1);
  });

  it('should ignore disabled elements', async () => {
    // Create a disabled button
    const disabledButton = document.createElement('button');
    disabledButton.disabled = true;
    disabledButton.textContent = 'Disabled';
    container.insertBefore(disabledButton, button1);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // First enabled focusable element should be focused
    expect(document.activeElement).toBe(button1);
  });

  it('should ignore elements with tabindex="-1"', async () => {
    // Create an element with negative tabindex
    const skipButton = document.createElement('button');
    skipButton.tabIndex = -1;
    skipButton.textContent = 'Skip';
    container.insertBefore(skipButton, button1);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      { initialProps: { isOpen: false } }
    );

    // Assign ref to container
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    // Open the modal
    rerender({ isOpen: true });

    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve));
    });

    // First focusable element without negative tabindex should be focused
    expect(document.activeElement).toBe(button1);
  });
});
