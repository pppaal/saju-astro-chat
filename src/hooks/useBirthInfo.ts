import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { UserProfile, GuestBirthInfo } from '@/lib/dream/types';
import { logger } from '@/lib/logger';

export function useBirthInfo(locale: string) {
  const { status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestBirthInfo, setGuestBirthInfo] = useState<GuestBirthInfo | null>(null);

  // Form state
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('12:00');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthCity, setBirthCity] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [showCityInput, setShowCityInput] = useState(false);

  // Loading state
  const [loadingProfileBtn, setLoadingProfileBtn] = useState(false);
  const [profileLoadedMsg, setProfileLoadedMsg] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const hasBirthInfo = Boolean(userProfile?.birthDate || guestBirthInfo?.birthDate);

  const loadProfile = useCallback(async () => {
    if (status !== 'authenticated') {return;}

    setLoadingProfileBtn(true);
    setProfileLoadError(null);

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setProfileLoadError(locale === 'ko' ? '프로필을 불러올 수 없습니다' : 'Failed to load profile');
        setLoadingProfileBtn(false);
        return;
      }

      const { user } = await res.json();

      if (!user || !user.birthDate) {
        setProfileLoadError(locale === 'ko'
          ? '저장된 프로필이 없습니다. My Journey에서 먼저 정보를 저장해주세요.'
          : 'No saved profile. Please save your info in My Journey first.');
        setLoadingProfileBtn(false);
        return;
      }

      // Set form fields from DB data
      if (user.birthDate) {setBirthDate(user.birthDate);}
      if (user.birthTime) {
        setBirthTime(user.birthTime);
        setShowTimeInput(true);
      }
      if (user.gender) {setGender(user.gender);}
      if (user.birthCity) {
        setBirthCity(user.birthCity);
        setShowCityInput(true);
      }
      setUserProfile({
        birthDate: user.birthDate,
        birthTime: user.birthTime,
        birthCity: user.birthCity,
        gender: user.gender,
        latitude: user.latitude,
        longitude: user.longitude,
        timezone: user.tzId,
      });
      setProfileLoadedMsg(true);
    } catch (err) {
      logger.error('Failed to load profile:', err);
      setProfileLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed');
    } finally {
      setLoadingProfileBtn(false);
    }
  }, [status, locale]);

  const saveBirthInfo = useCallback(async () => {
    if (!birthDate) {return false;}

    const birthInfo: GuestBirthInfo = {
      birthDate,
      birthTime: showTimeInput ? birthTime : '12:00',
      gender,
      birthCity: showCityInput ? birthCity : undefined,
    };

    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/user/update-birth-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(birthInfo),
        });

        if (res.ok) {
          setUserProfile({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime,
            gender: birthInfo.gender,
            birthCity: birthInfo.birthCity,
          });
        }
      } catch (err) {
        logger.error('Failed to save birth info:', err);
      }
    } else {
      setGuestBirthInfo(birthInfo);
    }

    return true;
  }, [birthDate, birthTime, gender, birthCity, showTimeInput, showCityInput, status]);

  const resetBirthInfo = useCallback(() => {
    setGuestBirthInfo(null);
    setUserProfile(null);
    setProfileLoadedMsg(false);
    setProfileLoadError(null);
  }, []);

  const skipBirthInfo = useCallback(() => {
    setGuestBirthInfo(null);
  }, []);

  return {
    // State
    userProfile,
    guestBirthInfo,
    hasBirthInfo,

    // Form state
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    gender,
    setGender,
    birthCity,
    setBirthCity,
    showTimeInput,
    setShowTimeInput,
    showCityInput,
    setShowCityInput,

    // Loading state
    loadingProfileBtn,
    profileLoadedMsg,
    profileLoadError,

    // Actions
    loadProfile,
    saveBirthInfo,
    resetBirthInfo,
    skipBirthInfo,
  };
}
