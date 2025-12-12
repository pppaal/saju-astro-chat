'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './pricing.module.css';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  icon: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: PlanFeature[];
  buttonStyle: 'free' | 'basic' | 'premium';
  featured?: boolean;
}

const plans: Record<string, Plan[]> = {
  ko: [
    {
      id: 'free',
      icon: '✨',
      name: '무료 체험',
      description: '기본 기능을 무료로 체험해보세요',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { text: '매일 3회 운세 상담', included: true },
        { text: '기본 사주/별자리 분석', included: true },
        { text: '꿈 해몽 1회/일', included: true },
        { text: '커뮤니티 접근', included: true },
        { text: '심층 상담 기능', included: false },
        { text: '궁합 분석', included: false },
        { text: '광고 제거', included: false },
      ],
      buttonStyle: 'free',
    },
    {
      id: 'basic',
      icon: '🌙',
      name: '베이직',
      description: '더 많은 상담과 분석 기능',
      monthlyPrice: 4900,
      annualPrice: 39000,
      features: [
        { text: '매일 20회 운세 상담', included: true },
        { text: '상세 사주/별자리 분석', included: true },
        { text: '꿈 해몽 무제한', included: true },
        { text: '궁합 분석 5회/월', included: true },
        { text: '심층 상담 기능', included: true },
        { text: '광고 제거', included: true },
        { text: '우선 응답', included: false },
      ],
      buttonStyle: 'basic',
    },
    {
      id: 'premium',
      icon: '🌟',
      name: '프리미엄',
      description: '모든 기능을 무제한으로',
      monthlyPrice: 9900,
      annualPrice: 79000,
      features: [
        { text: '무제한 운세 상담', included: true },
        { text: '심층 사주/별자리 분석', included: true },
        { text: '꿈 해몽 무제한', included: true },
        { text: '궁합 분석 무제한', included: true },
        { text: '1:1 전문 상담 지원', included: true },
        { text: '광고 제거', included: true },
        { text: '우선 응답 및 신기능 조기 접근', included: true },
      ],
      buttonStyle: 'premium',
      featured: true,
    },
  ],
  en: [
    {
      id: 'free',
      icon: '✨',
      name: 'Free Trial',
      description: 'Try basic features for free',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { text: '3 daily fortune readings', included: true },
        { text: 'Basic Saju/Astrology analysis', included: true },
        { text: '1 dream interpretation/day', included: true },
        { text: 'Community access', included: true },
        { text: 'In-depth consultation', included: false },
        { text: 'Compatibility analysis', included: false },
        { text: 'Ad-free experience', included: false },
      ],
      buttonStyle: 'free',
    },
    {
      id: 'basic',
      icon: '🌙',
      name: 'Basic',
      description: 'More consultations and analysis',
      monthlyPrice: 4.99,
      annualPrice: 39.99,
      features: [
        { text: '20 daily fortune readings', included: true },
        { text: 'Detailed Saju/Astrology analysis', included: true },
        { text: 'Unlimited dream interpretation', included: true },
        { text: '5 compatibility analyses/month', included: true },
        { text: 'In-depth consultation', included: true },
        { text: 'Ad-free experience', included: true },
        { text: 'Priority response', included: false },
      ],
      buttonStyle: 'basic',
    },
    {
      id: 'premium',
      icon: '🌟',
      name: 'Premium',
      description: 'Unlimited access to all features',
      monthlyPrice: 9.99,
      annualPrice: 79.99,
      features: [
        { text: 'Unlimited fortune readings', included: true },
        { text: 'Deep Saju/Astrology analysis', included: true },
        { text: 'Unlimited dream interpretation', included: true },
        { text: 'Unlimited compatibility analysis', included: true },
        { text: '1:1 expert consultation support', included: true },
        { text: 'Ad-free experience', included: true },
        { text: 'Priority response & early access', included: true },
      ],
      buttonStyle: 'premium',
      featured: true,
    },
  ],
  zh: [
    {
      id: 'free',
      icon: '✨',
      name: '免费体验',
      description: '免费体验基本功能',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { text: '每日3次运势咨询', included: true },
        { text: '基本四柱/星座分析', included: true },
        { text: '每日1次解梦', included: true },
        { text: '社区访问', included: true },
        { text: '深度咨询功能', included: false },
        { text: '配对分析', included: false },
        { text: '去除广告', included: false },
      ],
      buttonStyle: 'free',
    },
    {
      id: 'basic',
      icon: '🌙',
      name: '基础版',
      description: '更多咨询和分析功能',
      monthlyPrice: 35,
      annualPrice: 280,
      features: [
        { text: '每日20次运势咨询', included: true },
        { text: '详细四柱/星座分析', included: true },
        { text: '无限解梦', included: true },
        { text: '每月5次配对分析', included: true },
        { text: '深度咨询功能', included: true },
        { text: '去除广告', included: true },
        { text: '优先响应', included: false },
      ],
      buttonStyle: 'basic',
    },
    {
      id: 'premium',
      icon: '🌟',
      name: '高级版',
      description: '无限使用所有功能',
      monthlyPrice: 68,
      annualPrice: 548,
      features: [
        { text: '无限运势咨询', included: true },
        { text: '深度四柱/星座分析', included: true },
        { text: '无限解梦', included: true },
        { text: '无限配对分析', included: true },
        { text: '1对1专家咨询支持', included: true },
        { text: '去除广告', included: true },
        { text: '优先响应及新功能早期体验', included: true },
      ],
      buttonStyle: 'premium',
      featured: true,
    },
  ],
};

const faqs: Record<string, { question: string; answer: string }[]> = {
  ko: [
    {
      question: '무료 체험에서 유료로 전환하면 어떻게 되나요?',
      answer: '언제든지 업그레이드할 수 있으며, 즉시 모든 프리미엄 기능을 사용할 수 있습니다. 첫 달은 50% 할인 혜택이 적용됩니다.',
    },
    {
      question: '환불이 가능한가요?',
      answer: '네, 구독 후 7일 이내에 100% 환불이 가능합니다. 만족하지 않으시면 언제든 환불 요청해주세요.',
    },
    {
      question: '연간 구독의 장점은 무엇인가요?',
      answer: '연간 구독 시 2개월 무료 혜택을 받으실 수 있습니다. 월 결제 대비 약 17%를 절약하실 수 있어요.',
    },
    {
      question: '상담 횟수는 어떻게 계산되나요?',
      answer: 'AI와의 대화 1회를 1회 상담으로 계산합니다. 하나의 대화 세션에서는 여러 메시지를 주고받으실 수 있습니다.',
    },
  ],
  en: [
    {
      question: 'What happens when I upgrade from free to paid?',
      answer: 'You can upgrade anytime and immediately access all premium features. Your first month includes a 50% discount.',
    },
    {
      question: 'Can I get a refund?',
      answer: "Yes, we offer a 100% refund within 7 days of subscription. If you're not satisfied, request a refund anytime.",
    },
    {
      question: 'What are the benefits of annual subscription?',
      answer: 'With annual subscription, you get 2 months free. This saves you approximately 17% compared to monthly billing.',
    },
    {
      question: 'How are consultation counts calculated?',
      answer: 'Each conversation with AI counts as 1 consultation. You can exchange multiple messages within a single conversation session.',
    },
  ],
  zh: [
    {
      question: '从免费升级到付费后会怎样？',
      answer: '您可以随时升级并立即使用所有高级功能。首月享受50%折扣优惠。',
    },
    {
      question: '可以退款吗？',
      answer: '是的，订阅后7天内可以100%退款。如果您不满意，随时可以申请退款。',
    },
    {
      question: '年度订阅有什么优势？',
      answer: '年度订阅可享受2个月免费优惠，与月付相比可节省约17%。',
    },
    {
      question: '咨询次数如何计算？',
      answer: '与AI的每次对话计为1次咨询。在单个对话会话中可以交换多条消息。',
    },
  ],
};

const currencySymbols: Record<string, string> = {
  ko: '₩',
  en: '$',
  zh: '¥',
};

const periodLabels: Record<string, { monthly: string; annual: string }> = {
  ko: { monthly: '/월', annual: '/년' },
  en: { monthly: '/mo', annual: '/yr' },
  zh: { monthly: '/月', annual: '/年' },
};

const buttonLabels: Record<string, Record<string, string>> = {
  ko: { free: '무료로 시작하기', basic: '베이직 시작하기', premium: '프리미엄 시작하기' },
  en: { free: 'Start Free', basic: 'Get Basic', premium: 'Go Premium' },
  zh: { free: '免费开始', basic: '开始基础版', premium: '升级高级版' },
};

const uiLabels: Record<string, Record<string, string>> = {
  ko: {
    title: '나에게 맞는 플랜 선택',
    subtitle: '운세, 사주, 별자리 분석으로 더 나은 삶의 방향을 찾아보세요',
    monthly: '월간',
    annual: '연간',
    save: '2개월 무료',
    popular: '인기',
    faqTitle: '자주 묻는 질문',
    guaranteeTitle: '7일 환불 보장',
    guaranteeText: '서비스가 마음에 들지 않으시면 7일 이내 100% 환불해 드립니다. 위험 부담 없이 체험해보세요.',
  },
  en: {
    title: 'Choose Your Plan',
    subtitle: 'Find better life direction with fortune, Saju, and astrology analysis',
    monthly: 'Monthly',
    annual: 'Annual',
    save: '2 Months Free',
    popular: 'Popular',
    faqTitle: 'Frequently Asked Questions',
    guaranteeTitle: '7-Day Money Back Guarantee',
    guaranteeText: "If you're not satisfied with our service, we'll refund 100% within 7 days. Try risk-free.",
  },
  zh: {
    title: '选择您的计划',
    subtitle: '通过运势、四柱和星座分析找到更好的人生方向',
    monthly: '月付',
    annual: '年付',
    save: '赠送2个月',
    popular: '热门',
    faqTitle: '常见问题',
    guaranteeTitle: '7天退款保证',
    guaranteeText: '如果您对我们的服务不满意，7天内100%退款。无风险体验。',
  },
};

export default function PricingPage() {
  const { locale } = useI18n();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const lang = ['ko', 'en', 'zh'].includes(locale) ? locale : 'en';
  const currentPlans = plans[lang] || plans.en;
  const currentFaqs = faqs[lang] || faqs.en;
  const currency = currencySymbols[lang] || '$';
  const period = periodLabels[lang] || periodLabels.en;
  const buttons = buttonLabels[lang] || buttonLabels.en;
  const ui = uiLabels[lang] || uiLabels.en;

  const formatPrice = (price: number) => {
    if (price === 0) return lang === 'ko' ? '무료' : lang === 'zh' ? '免费' : 'Free';
    if (lang === 'ko') return price.toLocaleString('ko-KR');
    if (lang === 'zh') return price.toLocaleString('zh-CN');
    return price.toFixed(2);
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.monthlyPrice === 0) return formatPrice(0);
    if (isAnnual) {
      const monthlyEquivalent = plan.annualPrice / 12;
      return formatPrice(Math.round(monthlyEquivalent * 100) / 100);
    }
    return formatPrice(plan.monthlyPrice);
  };

  async function handleSelectPlan(planId: string) {
    if (planId === 'free') {
      window.location.href = '/destiny-map';
      return;
    }

    const productId = isAnnual ? `${planId}-annual` : `${planId}-monthly`;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'An error occurred');
      }
    } catch {
      alert('Payment service temporarily unavailable');
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ui.title}</h1>
        <p className={styles.subtitle}>{ui.subtitle}</p>
      </header>

      <div className={styles.billingToggle}>
        <span
          className={`${styles.billingOption} ${!isAnnual ? styles.active : ''}`}
          onClick={() => setIsAnnual(false)}
        >
          {ui.monthly}
        </span>
        <div
          className={`${styles.toggleSwitch} ${isAnnual ? styles.annual : ''}`}
          onClick={() => setIsAnnual(!isAnnual)}
        >
          <div className={styles.toggleKnob} />
        </div>
        <span
          className={`${styles.billingOption} ${isAnnual ? styles.active : ''}`}
          onClick={() => setIsAnnual(true)}
        >
          {ui.annual}
          <span className={styles.saveBadge}>{ui.save}</span>
        </span>
      </div>

      <div className={styles.plansGrid}>
        {currentPlans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.featured ? styles.featured : ''}`}
          >
            {plan.featured && (
              <div className={styles.popularBadge}>{ui.popular}</div>
            )}
            <div className={`${styles.planIcon} ${styles[plan.buttonStyle]}`}>
              {plan.icon}
            </div>
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planDescription}>{plan.description}</p>

            <div className={styles.priceContainer}>
              {plan.monthlyPrice > 0 && (
                <span className={styles.currency}>{currency}</span>
              )}
              <span className={styles.price}>{getDisplayPrice(plan)}</span>
              {plan.monthlyPrice > 0 && (
                <span className={styles.period}>{period.monthly}</span>
              )}
              {isAnnual && plan.monthlyPrice > 0 && (
                <span className={styles.originalPrice}>
                  {currency}{formatPrice(plan.monthlyPrice)}
                </span>
              )}
            </div>

            <ul className={styles.featuresList}>
              {plan.features.map((feature, idx) => (
                <li key={idx} className={styles.feature}>
                  <span className={`${styles.featureIcon} ${feature.included ? styles.included : styles.excluded}`}>
                    {feature.included ? '✓' : '×'}
                  </span>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>

            <button
              className={`${styles.selectButton} ${styles[plan.buttonStyle]}`}
              onClick={() => handleSelectPlan(plan.id)}
            >
              {buttons[plan.id]}
            </button>
          </div>
        ))}
      </div>

      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>{ui.faqTitle}</h2>
        {currentFaqs.map((faq, idx) => (
          <div key={idx} className={styles.faqItem}>
            <button
              className={styles.faqQuestion}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            >
              {faq.question}
              <span className={`${styles.faqArrow} ${openFaq === idx ? styles.open : ''}`}>
                ▼
              </span>
            </button>
            {openFaq === idx && (
              <div className={styles.faqAnswer}>{faq.answer}</div>
            )}
          </div>
        ))}
      </section>

      <div className={styles.guaranteeSection}>
        <div className={styles.guaranteeIcon}>🛡️</div>
        <h3 className={styles.guaranteeTitle}>{ui.guaranteeTitle}</h3>
        <p className={styles.guaranteeText}>{ui.guaranteeText}</p>
      </div>
    </div>
  );
}
