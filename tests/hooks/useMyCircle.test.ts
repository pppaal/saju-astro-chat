import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMyCircle } from '@/hooks/useMyCircle';

// Mock fetch
global.fetch = vi.fn();

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useMyCircle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty circle people', () => {
    const { result } = renderHook(() => useMyCircle('unauthenticated'));

    expect(result.current.circlePeople).toEqual([]);
    expect(result.current.showCircleDropdown).toBeNull();
  });

  it('should not fetch when user is not authenticated', () => {
    renderHook(() => useMyCircle('unauthenticated'));

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should fetch circle people when authenticated', async () => {
    const mockPeople = [
      {
        id: '1',
        name: 'John Doe',
        birthDate: '1990-01-01',
        relation: 'friend',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ people: mockPeople }),
    });

    const { result } = renderHook(() => useMyCircle('authenticated'));

    await waitFor(() => {
      expect(result.current.circlePeople).toEqual(mockPeople);
    });

    expect(fetch).toHaveBeenCalledWith('/api/me/circle', expect.objectContaining({ cache: 'no-store' }));
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMyCircle('authenticated'));

    await waitFor(() => {
      expect(result.current.circlePeople).toEqual([]);
    });
  });

  it('should handle empty response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useMyCircle('authenticated'));

    await waitFor(() => {
      expect(result.current.circlePeople).toEqual([]);
    });
  });

  it('should set showCircleDropdown', () => {
    const { result } = renderHook(() => useMyCircle('unauthenticated'));

    act(() => {
      result.current.setShowCircleDropdown(2);
    });

    expect(result.current.showCircleDropdown).toBe(2);
  });

  it('should close dropdown when clicking outside', () => {
    const { result } = renderHook(() => useMyCircle('unauthenticated'));

    act(() => {
      result.current.setShowCircleDropdown(1);
    });

    expect(result.current.showCircleDropdown).toBe(1);

    // Simulate click outside
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: document.createElement('div'),
      enumerable: true,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(result.current.showCircleDropdown).toBeNull();
  });

  it('should not close dropdown when clicking inside', () => {
    const { result } = renderHook(() => useMyCircle('unauthenticated'));

    act(() => {
      result.current.setShowCircleDropdown(1);
    });

    // Create element with the data attribute
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-circle-dropdown', 'true');
    document.body.appendChild(wrapper);

    const insideElement = document.createElement('button');
    wrapper.appendChild(insideElement);

    // Simulate click inside
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: insideElement,
      enumerable: true,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(result.current.showCircleDropdown).toBe(1);

    document.body.removeChild(wrapper);
  });

  it('should cleanup event listener on unmount', () => {
    const { result, unmount } = renderHook(() => useMyCircle('unauthenticated'));

    act(() => {
      result.current.setShowCircleDropdown(1);
    });

    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should refetch when status changes to authenticated', async () => {
    const mockPeople = [
      { id: '1', name: 'Jane', relation: 'partner' },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ people: mockPeople }),
    });

    const { rerender } = renderHook(
      ({ status }) => useMyCircle(status),
      { initialProps: { status: 'loading' as const } }
    );

    expect(fetch).not.toHaveBeenCalled();

    rerender({ status: 'authenticated' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/me/circle', expect.objectContaining({ cache: 'no-store' }));
    });
  });
});
