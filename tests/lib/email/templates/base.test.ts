import { describe, it, expect } from 'vitest';
import { wrapInBaseTemplate } from '@/lib/email/templates/base';

describe('wrapInBaseTemplate', () => {
  it('should return valid HTML document', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '<p>Hello</p>' });
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html lang="en">');
    expect(result).toContain('</html>');
  });

  it('should include content in the body', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '<p>Test content here</p>' });
    expect(result).toContain('<p>Test content here</p>');
  });

  it('should set lang attribute to ko for Korean locale', () => {
    const result = wrapInBaseTemplate({ locale: 'ko', content: '' });
    expect(result).toContain('<html lang="ko">');
  });

  it('should set lang attribute to en for English locale', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('<html lang="en">');
  });

  it('should include Korean tagline for ko locale', () => {
    const result = wrapInBaseTemplate({ locale: 'ko', content: '' });
    expect(result).toContain('당신의 운명을 안내합니다');
  });

  it('should include English tagline for en locale', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('Your Destiny Guide');
  });

  it('should include Korean footer for ko locale', () => {
    const result = wrapInBaseTemplate({ locale: 'ko', content: '' });
    expect(result).toContain('이 이메일은 DestinyPal에서 발송되었습니다.');
    expect(result).toContain('더 이상 이메일을 받고 싶지 않으시면 계정 설정에서 알림을 해제하세요.');
  });

  it('should include English footer for en locale', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('This email was sent by DestinyPal.');
    expect(result).toContain('To unsubscribe, update your notification settings in your account.');
  });

  it('should include preheader when provided', () => {
    const result = wrapInBaseTemplate({
      locale: 'en',
      content: '',
      preheader: 'Check out your horoscope!',
    });
    expect(result).toContain('Check out your horoscope!');
    expect(result).toContain('display:none;max-height:0;overflow:hidden;mso-hide:all');
  });

  it('should not include preheader span when not provided', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).not.toContain('mso-hide:all');
  });

  it('should include DestinyPal logo text', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('<h1 class="logo">DestinyPal</h1>');
  });

  it('should include destinypal.me link', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('href="https://destinypal.me"');
  });

  it('should include CSS styles', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('<style>');
    expect(result).toContain('.wrapper');
    expect(result).toContain('.container');
    expect(result).toContain('.header');
    expect(result).toContain('.footer');
  });

  it('should include viewport meta tag', () => {
    const result = wrapInBaseTemplate({ locale: 'en', content: '' });
    expect(result).toContain('name="viewport"');
    expect(result).toContain('width=device-width, initial-scale=1.0');
  });
});
