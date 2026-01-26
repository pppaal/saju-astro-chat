import { describe, it, expect } from 'vitest';
import {
  formatCityName,
  formatCityForDropdown,
  getCityNameInKorean,
  getCountryNameInKorean,
  getCityNameFromKorean,
} from '@/lib/cities/formatter';

describe('cities/formatter', () => {
  describe('formatCityName', () => {
    describe('English locale', () => {
      it('should format city name with country code (short style)', () => {
        expect(formatCityName('Seoul', 'KR')).toBe('Seoul, KR');
        expect(formatCityName('Tokyo', 'JP')).toBe('Tokyo, JP');
        expect(formatCityName('New York', 'US')).toBe('New York, US');
      });

      it('should format city name with country code (full style)', () => {
        expect(formatCityName('Seoul', 'KR', { style: 'full' })).toBe('Seoul, South Korea');
        expect(formatCityName('New York', 'US', { style: 'full' })).toBe('New York, United States');
        expect(formatCityName('London', 'GB', { style: 'full' })).toBe('London, United Kingdom');
      });

      it('should capitalize city names', () => {
        expect(formatCityName('seoul', 'KR')).toBe('Seoul, KR');
        expect(formatCityName('NEW YORK', 'US')).toBe('New York, US');
        expect(formatCityName('los angeles', 'US')).toBe('Los Angeles, US');
      });

      it('should handle city name without country code', () => {
        expect(formatCityName('Seoul')).toBe('Seoul');
        expect(formatCityName('Tokyo')).toBe('Tokyo');
      });

      it('should parse city and country from comma-separated string', () => {
        expect(formatCityName('Seoul, KR')).toBe('Seoul, KR');
        expect(formatCityName('Tokyo, JP')).toBe('Tokyo, JP');
        expect(formatCityName('New York, US')).toBe('New York, US');
      });

      it('should handle unknown country codes', () => {
        expect(formatCityName('Unknown City', 'XX')).toBe('Unknown City, XX');
      });

      it('should use full country name when available and style is full', () => {
        expect(formatCityName('Dubai', 'AE', { style: 'full' })).toBe('Dubai, United Arab Emirates');
        expect(formatCityName('Auckland', 'NZ', { style: 'full' })).toBe('Auckland, New Zealand');
      });

      it('should handle country code case insensitivity', () => {
        expect(formatCityName('Seoul', 'kr')).toBe('Seoul, kr');
        expect(formatCityName('Seoul, kr')).toBe('Seoul, KR');
      });
    });

    describe('Korean locale', () => {
      it('should format known Korean cities in Korean', () => {
        expect(formatCityName('Seoul', 'KR', { locale: 'ko' })).toBe('서울, 한국');
        expect(formatCityName('Busan', 'KR', { locale: 'ko' })).toBe('부산, 한국');
        expect(formatCityName('Incheon', 'KR', { locale: 'ko' })).toBe('인천, 한국');
      });

      it('should format known international cities in Korean', () => {
        expect(formatCityName('Tokyo', 'JP', { locale: 'ko' })).toBe('도쿄, 일본');
        expect(formatCityName('New York', 'US', { locale: 'ko' })).toBe('뉴욕, 미국');
        expect(formatCityName('London', 'GB', { locale: 'ko' })).toBe('런던, 영국');
        expect(formatCityName('Paris', 'FR', { locale: 'ko' })).toBe('파리, 프랑스');
      });

      it('should handle unknown cities with Korean country names', () => {
        expect(formatCityName('Unknown City', 'KR', { locale: 'ko' })).toBe('Unknown City, 한국');
        expect(formatCityName('Unknown City', 'JP', { locale: 'ko' })).toBe('Unknown City, 일본');
      });

      it('should handle city without country code in Korean', () => {
        expect(formatCityName('Seoul', undefined, { locale: 'ko' })).toBe('서울');
        expect(formatCityName('Tokyo', undefined, { locale: 'ko' })).toBe('도쿄');
      });

      it('should capitalize city names before Korean lookup', () => {
        expect(formatCityName('seoul', 'KR', { locale: 'ko' })).toBe('서울, 한국');
        expect(formatCityName('BUSAN', 'KR', { locale: 'ko' })).toBe('부산, 한국');
      });

      it('should parse comma-separated city and country in Korean', () => {
        expect(formatCityName('Seoul, KR', undefined, { locale: 'ko' })).toBe('서울, 한국');
        expect(formatCityName('Tokyo, JP', undefined, { locale: 'ko' })).toBe('도쿄, 일본');
      });

      it('should handle unknown country codes in Korean locale', () => {
        expect(formatCityName('Seoul', 'XX', { locale: 'ko' })).toBe('서울, XX');
      });

      it('should format major Asian cities', () => {
        expect(formatCityName('Beijing', 'CN', { locale: 'ko' })).toBe('베이징, 중국');
        expect(formatCityName('Shanghai', 'CN', { locale: 'ko' })).toBe('상하이, 중국');
        expect(formatCityName('Singapore', 'SG', { locale: 'ko' })).toBe('싱가포르, 싱가포르');
        expect(formatCityName('Bangkok', 'TH', { locale: 'ko' })).toBe('방콕, 태국');
      });

      it('should format European cities', () => {
        expect(formatCityName('Berlin', 'DE', { locale: 'ko' })).toBe('베를린, 독일');
        expect(formatCityName('Madrid', 'ES', { locale: 'ko' })).toBe('마드리드, 스페인');
        expect(formatCityName('Rome', 'IT', { locale: 'ko' })).toBe('로마, 이탈리아');
      });
    });
  });

  describe('formatCityForDropdown', () => {
    describe('English locale', () => {
      it('should format with full country name when available', () => {
        expect(formatCityForDropdown('Seoul', 'KR', 'en')).toBe('Seoul, South Korea');
        expect(formatCityForDropdown('New York', 'US', 'en')).toBe('New York, United States');
        expect(formatCityForDropdown('London', 'GB', 'en')).toBe('London, United Kingdom');
      });

      it('should use country code when full name not available', () => {
        expect(formatCityForDropdown('Tokyo', 'JP', 'en')).toBe('Tokyo, JP');
        expect(formatCityForDropdown('Paris', 'FR', 'en')).toBe('Paris, FR');
      });

      it('should capitalize city names', () => {
        expect(formatCityForDropdown('seoul', 'KR', 'en')).toBe('Seoul, South Korea');
        expect(formatCityForDropdown('NEW YORK', 'US', 'en')).toBe('New York, United States');
      });

      it('should handle lowercase country codes', () => {
        expect(formatCityForDropdown('Seoul', 'kr', 'en')).toBe('Seoul, South Korea');
        expect(formatCityForDropdown('Tokyo', 'jp', 'en')).toBe('Tokyo, JP');
      });

      it('should format cities with full country names', () => {
        expect(formatCityForDropdown('Dubai', 'AE', 'en')).toBe('Dubai, United Arab Emirates');
        expect(formatCityForDropdown('Riyadh', 'SA', 'en')).toBe('Riyadh, Saudi Arabia');
        expect(formatCityForDropdown('Cape Town', 'ZA', 'en')).toBe('Cape Town, South Africa');
      });
    });

    describe('Korean locale', () => {
      it('should format known cities in Korean', () => {
        expect(formatCityForDropdown('Seoul', 'KR', 'ko')).toBe('서울, 한국');
        expect(formatCityForDropdown('Tokyo', 'JP', 'ko')).toBe('도쿄, 일본');
        expect(formatCityForDropdown('New York', 'US', 'ko')).toBe('뉴욕, 미국');
      });

      it('should handle city in Korean + country code when city known but country unknown', () => {
        expect(formatCityForDropdown('Seoul', 'XX', 'ko')).toBe('서울, XX');
        expect(formatCityForDropdown('Tokyo', 'YY', 'ko')).toBe('도쿄, YY');
      });

      it('should handle English city + Korean country when city unknown but country known', () => {
        expect(formatCityForDropdown('Unknown City', 'KR', 'ko')).toBe('Unknown City, 한국');
        expect(formatCityForDropdown('Unknown City', 'JP', 'ko')).toBe('Unknown City, 일본');
      });

      it('should handle unknown city and country', () => {
        expect(formatCityForDropdown('Unknown City', 'XX', 'ko')).toBe('Unknown City, XX');
      });

      it('should capitalize before lookup', () => {
        expect(formatCityForDropdown('seoul', 'KR', 'ko')).toBe('서울, 한국');
        expect(formatCityForDropdown('TOKYO', 'JP', 'ko')).toBe('도쿄, 일본');
      });

      it('should format various Asian cities', () => {
        expect(formatCityForDropdown('Beijing', 'CN', 'ko')).toBe('베이징, 중국');
        expect(formatCityForDropdown('Taipei', 'TW', 'ko')).toBe('타이페이, 대만');
        expect(formatCityForDropdown('Hong Kong', 'HK', 'ko')).toBe('홍콩, 홍콩');
      });
    });

    describe('default locale', () => {
      it('should default to English when no locale specified', () => {
        expect(formatCityForDropdown('Seoul', 'KR')).toBe('Seoul, South Korea');
        expect(formatCityForDropdown('Tokyo', 'JP')).toBe('Tokyo, JP');
      });
    });
  });

  describe('getCityNameInKorean', () => {
    it('should return Korean name for known cities', () => {
      expect(getCityNameInKorean('Seoul')).toBe('서울');
      expect(getCityNameInKorean('Busan')).toBe('부산');
      expect(getCityNameInKorean('Tokyo')).toBe('도쿄');
      expect(getCityNameInKorean('New York')).toBe('뉴욕');
      expect(getCityNameInKorean('London')).toBe('런던');
    });

    it('should return null for unknown cities', () => {
      expect(getCityNameInKorean('Unknown City')).toBeNull();
      expect(getCityNameInKorean('Fake Place')).toBeNull();
    });

    it('should capitalize input before lookup', () => {
      expect(getCityNameInKorean('seoul')).toBe('서울');
      expect(getCityNameInKorean('BUSAN')).toBe('부산');
      expect(getCityNameInKorean('new york')).toBe('뉴욕');
    });

    it('should handle multi-word city names', () => {
      expect(getCityNameInKorean('Los Angeles')).toBe('로스앤젤레스');
      expect(getCityNameInKorean('San Francisco')).toBe('샌프란시스코');
      expect(getCityNameInKorean('Hong Kong')).toBe('홍콩');
    });

    it('should return Korean names for various international cities', () => {
      expect(getCityNameInKorean('Paris')).toBe('파리');
      expect(getCityNameInKorean('Berlin')).toBe('베를린');
      expect(getCityNameInKorean('Madrid')).toBe('마드리드');
      expect(getCityNameInKorean('Rome')).toBe('로마');
      expect(getCityNameInKorean('Sydney')).toBe('시드니');
      expect(getCityNameInKorean('Moscow')).toBe('모스크바');
    });
  });

  describe('getCountryNameInKorean', () => {
    it('should return Korean name for known country codes', () => {
      expect(getCountryNameInKorean('KR')).toBe('한국');
      expect(getCountryNameInKorean('US')).toBe('미국');
      expect(getCountryNameInKorean('JP')).toBe('일본');
      expect(getCountryNameInKorean('CN')).toBe('중국');
      expect(getCountryNameInKorean('GB')).toBe('영국');
    });

    it('should return null for unknown country codes', () => {
      expect(getCountryNameInKorean('XX')).toBeNull();
      expect(getCountryNameInKorean('ZZ')).toBeNull();
    });

    it('should handle lowercase country codes', () => {
      expect(getCountryNameInKorean('kr')).toBe('한국');
      expect(getCountryNameInKorean('us')).toBe('미국');
      expect(getCountryNameInKorean('jp')).toBe('일본');
    });

    it('should return Korean names for various countries', () => {
      expect(getCountryNameInKorean('FR')).toBe('프랑스');
      expect(getCountryNameInKorean('DE')).toBe('독일');
      expect(getCountryNameInKorean('IT')).toBe('이탈리아');
      expect(getCountryNameInKorean('ES')).toBe('스페인');
      expect(getCountryNameInKorean('CA')).toBe('캐나다');
      expect(getCountryNameInKorean('AU')).toBe('호주');
      expect(getCountryNameInKorean('BR')).toBe('브라질');
      expect(getCountryNameInKorean('IN')).toBe('인도');
      expect(getCountryNameInKorean('RU')).toBe('러시아');
      expect(getCountryNameInKorean('TH')).toBe('태국');
    });

    it('should handle Asian country codes', () => {
      expect(getCountryNameInKorean('TW')).toBe('대만');
      expect(getCountryNameInKorean('HK')).toBe('홍콩');
      expect(getCountryNameInKorean('SG')).toBe('싱가포르');
      expect(getCountryNameInKorean('VN')).toBe('베트남');
      expect(getCountryNameInKorean('PH')).toBe('필리핀');
      expect(getCountryNameInKorean('MY')).toBe('말레이시아');
      expect(getCountryNameInKorean('ID')).toBe('인도네시아');
    });
  });

  describe('getCityNameFromKorean', () => {
    it('should return English name for known Korean cities', () => {
      expect(getCityNameFromKorean('서울')).toBe('Seoul');
      expect(getCityNameFromKorean('부산')).toBe('Busan');
      expect(getCityNameFromKorean('도쿄')).toBe('Tokyo');
      expect(getCityNameFromKorean('뉴욕')).toBe('New York');
      expect(getCityNameFromKorean('런던')).toBe('London');
    });

    it('should return null for unknown Korean city names', () => {
      expect(getCityNameFromKorean('알수없는도시')).toBeNull();
      expect(getCityNameFromKorean('존재하지않는곳')).toBeNull();
    });

    it('should handle various Korean city names', () => {
      expect(getCityNameFromKorean('파리')).toBe('Paris');
      expect(getCityNameFromKorean('베를린')).toBe('Berlin');
      expect(getCityNameFromKorean('로마')).toBe('Rome');
      expect(getCityNameFromKorean('마드리드')).toBe('Madrid');
    });

    it('should handle Korean cities in Korea', () => {
      expect(getCityNameFromKorean('인천')).toBe('Incheon');
      expect(getCityNameFromKorean('대구')).toBe('Daegu');
      expect(getCityNameFromKorean('대전')).toBe('Daejeon');
      expect(getCityNameFromKorean('광주')).toBe('Gwangju');
      expect(getCityNameFromKorean('울산')).toBe('Ulsan');
    });

    it('should handle Asian cities', () => {
      expect(getCityNameFromKorean('베이징')).toBe('Beijing');
      expect(getCityNameFromKorean('상하이')).toBe('Shanghai');
      expect(getCityNameFromKorean('타이페이')).toBe('Taipei');
      expect(getCityNameFromKorean('홍콩')).toBe('Hong Kong');
      expect(getCityNameFromKorean('싱가포르')).toBe('Singapore');
      expect(getCityNameFromKorean('방콕')).toBe('Bangkok');
    });

    it('should handle US cities', () => {
      expect(getCityNameFromKorean('로스앤젤레스')).toBe('Los Angeles');
      expect(getCityNameFromKorean('샌프란시스코')).toBe('San Francisco');
      expect(getCityNameFromKorean('시카고')).toBe('Chicago');
      expect(getCityNameFromKorean('시애틀')).toBe('Seattle');
    });

    it('should handle European cities', () => {
      expect(getCityNameFromKorean('암스테르담')).toBe('Amsterdam');
      expect(getCityNameFromKorean('바르셀로나')).toBe('Barcelona');
      expect(getCityNameFromKorean('뮌헨')).toBe('Munich');
      expect(getCityNameFromKorean('빈')).toBe('Vienna');
      expect(getCityNameFromKorean('프라하')).toBe('Prague');
    });

    it('should handle Australian and other cities', () => {
      expect(getCityNameFromKorean('시드니')).toBe('Sydney');
      expect(getCityNameFromKorean('멜버른')).toBe('Melbourne');
      expect(getCityNameFromKorean('모스크바')).toBe('Moscow');
      expect(getCityNameFromKorean('두바이')).toBe('Dubai');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty strings', () => {
      expect(formatCityName('')).toBe('');
      expect(formatCityName('', 'KR')).toBe(', KR');
      expect(getCityNameInKorean('')).toBeNull();
      expect(getCountryNameInKorean('')).toBeNull();
      expect(getCityNameFromKorean('')).toBeNull();
    });

    it('should handle special characters in city names', () => {
      expect(formatCityName("Xi'an", 'CN', { locale: 'ko' })).toBe('시안, 중국');
    });

    it('should handle cities with multiple spaces', () => {
      expect(formatCityName('New  York', 'US')).toContain('New');
    });

    it('should handle mixed case country codes in various functions', () => {
      expect(formatCityForDropdown('Seoul', 'Kr', 'en')).toBe('Seoul, South Korea');
      expect(formatCityForDropdown('Tokyo', 'jP', 'en')).toBe('Tokyo, JP');
      expect(getCountryNameInKorean('uS')).toBe('미국');
    });
  });

  describe('comprehensive city coverage', () => {
    it('should handle major South Korean cities', () => {
      const koreanCities = ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Jeju'];
      koreanCities.forEach(city => {
        expect(getCityNameInKorean(city)).not.toBeNull();
        expect(formatCityName(city, 'KR', { locale: 'ko' })).toContain('한국');
      });
    });

    it('should handle major Japanese cities', () => {
      const japaneseCities = ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka'];
      japaneseCities.forEach(city => {
        expect(getCityNameInKorean(city)).not.toBeNull();
        expect(formatCityName(city, 'JP', { locale: 'ko' })).toContain('일본');
      });
    });

    it('should handle major Chinese cities', () => {
      const chineseCities = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Chongqing'];
      chineseCities.forEach(city => {
        expect(getCityNameInKorean(city)).not.toBeNull();
        expect(formatCityName(city, 'CN', { locale: 'ko' })).toContain('중국');
      });
    });

    it('should handle major US cities', () => {
      const usCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Seattle'];
      usCities.forEach(city => {
        expect(getCityNameInKorean(city)).not.toBeNull();
        expect(formatCityName(city, 'US', { locale: 'ko' })).toContain('미국');
      });
    });

    it('should handle major European cities', () => {
      const europeanCities = ['London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam'];
      europeanCities.forEach(city => {
        expect(getCityNameInKorean(city)).not.toBeNull();
      });
    });
  });
});
