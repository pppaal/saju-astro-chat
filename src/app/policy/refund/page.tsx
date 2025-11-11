"use client";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";

type Locale = "en" | "ko" | "zh" | "ar" | "es";
type Section = { title: string; body: string };

function asLocale(l: string): Locale {
  const list: Locale[] = ["en", "ko", "zh", "ar", "es"];
  return (list as readonly string[]).includes(l) ? (l as Locale) : "en";
}

// Payment Service Provider
const PSP_NAME = "Stripe";

const refundsData: Record<
  Locale,
  { title: string; effective: string; sections: Section[]; footer: string }
> = {
  en: {
    title: "Refunds and Billing Policy",
    effective: "Effective date: 2025-01-01",
    sections: [
      {
        title: "1. Pricing and Payment",
        body: `Prices and billing cycles are shown at checkout. Payments are processed by ${PSP_NAME}; we do not store full card numbers.`,
      },
      {
        title: "2. Subscriptions and Auto‑renewal",
        body: "Subscriptions renew automatically until canceled. Cancel at least 24 hours before the next renewal.",
      },
      {
        title: "3. Withdrawal and Refunds",
        body: "Digital content is non‑refundable once delivery starts. Full refund is provided only for duplicate or erroneous charges, or if the failure is attributable to us.",
      },
      {
        title: "4. Price Changes",
        body: "We may change prices with at least 30 days’ notice. Changes apply from the next renewal.",
      },
      {
        title: "5. Taxes and Fees",
        body: "Statutory taxes are included or shown separately at checkout.",
      },
      { title: "6. Contact", body: "Email: rheeco88@gmail.com" },
    ],
    footer: "Addendum: Effective 2025-01-01",
  },
  ko: {
    title: "환불 및 결제 정책",
    effective: "시행일: 2025-01-01",
    sections: [
      {
        title: "1. 요금 및 결제",
        body: `가격과 과금 주기는 결제 화면에 표시됩니다. 결제는 ${PSP_NAME}를 통해 처리되며 카드 전체번호는 저장하지 않습니다.`,
      },
      {
        title: "2. 구독·자동갱신",
        body: "해지 전까지 자동 갱신됩니다. 다음 갱신일 24시간 전까지 해지하세요.",
      },
      {
        title: "3. 청약철회·환불",
        body: "디지털 콘텐츠 제공 개시 후에는 환불되지 않습니다. 중복/오류 결제 또는 회사 귀책 사유가 있는 경우에만 전액 환불합니다.",
      },
      {
        title: "4. 가격 변경",
        body: "가격 변경 시 최소 30일 전에 공지하며, 변경 가격은 다음 갱신일부터 적용됩니다.",
      },
      {
        title: "5. 세금 및 수수료",
        body: "법정 세금은 가격에 포함되거나 결제 시 별도 표기합니다.",
      },
      { title: "6. 문의", body: "이메일: rheeco88@gmail.com" },
    ],
    footer: "부칙: 2025-01-01 시행",
  },
  zh: {
    title: "退款与结算政策",
    effective: "生效日期：2025-01-01",
    sections: [
      {
        title: "1. 价格与支付",
        body: `价格与计费周期在结算页显示。由 ${PSP_NAME} 处理；我们不存完整卡号。`,
      },
      {
        title: "2. 订阅与自动续费",
        body: "订阅在取消前自动续费。建议在下次续费前24小时取消。",
      },
      {
        title: "3. 撤销与退款",
        body: "数字内容一经开始提供即不予退款。仅对重复/错误扣费或因我方原因予以全额退款。",
      },
      {
        title: "4. 价格变更",
        body: "变更将至少提前30日通知，自下一次续费起生效。",
      },
      {
        title: "5. 税费",
        body: "法定税费包含于价格或在结算时另行标注。",
      },
      { title: "6. 联系", body: "邮箱：rheeco88@gmail.com" },
    ],
    footer: "附则：自 2025-01-01 起生效",
  },
  ar: {
    title: "سياسة الاسترداد والفوترة",
    effective: "تاريخ السريان: 2025-01-01",
    sections: [
      {
        title: "1. التسعير والدفع",
        body: `تُعرض الأسعار ودورات الفوترة في صفحة الدفع. تتم المعالجة عبر ${PSP_NAME}؛ لا نخزن رقم البطاقة الكامل.`,
      },
      {
        title: "2. الاشتراكات والتجديد التلقائي",
        body: "تتجدد الاشتراكات تلقائياً حتى الإلغاء. يُفضّل الإلغاء قبل 24 ساعة من التجديد.",
      },
      {
        title: "3. السحب والاسترداد",
        body: "المحتوى الرقمي غير قابل للاسترداد بعد بدء تقديمه. نرد كامل المبلغ فقط عند السحب المكرر/الخاطئ أو إذا كان الخطأ من جانبنا.",
      },
      {
        title: "4. تغييرات الأسعار",
        body: "نعلن عن التغييرات قبل 30 يوماً على الأقل وتطبق من التجديد التالي.",
      },
      {
        title: "5. الضرائب والرسوم",
        body: "تُضمّن الضرائب القانونية في السعر أو تُعرض بشكل منفصل.",
      },
      { title: "6. التواصل", body: "البريد: rheeco88@gmail.com" },
    ],
    footer: "ملحق: سريان من 2025-01-01",
  },
  es: {
    title: "Política de reembolsos y facturación",
    effective: "Fecha de vigencia: 2025-01-01",
    sections: [
      {
        title: "1. Precios y pago",
        body: `Los precios y ciclos se muestran en la compra. Procesa ${PSP_NAME}; no almacenamos el número completo de tarjeta.`,
      },
      {
        title: "2. Suscripciones y renovación",
        body: "Se renuevan automáticamente hasta cancelar. Cancela 24 h antes de la siguiente renovación.",
      },
      {
        title: "3. Desistimiento y reembolsos",
        body: "El contenido digital no es reembolsable una vez iniciado. Reembolso íntegro solo por cargos duplicados/erróneos o por causa nuestra.",
      },
      {
        title: "4. Cambios de precio",
        body: "Aviso con al menos 30 días. Aplica desde la siguiente renovación.",
      },
      {
        title: "5. Impuestos y tasas",
        body: "Impuestos legales incluidos o mostrados aparte.",
      },
      { title: "6. Contacto", body: "Correo: rheeco88@gmail.com" },
    ],
    footer: "Anexo: Vigente desde 2025-01-01",
  },
};

function SectionView({ s }: { s: Section }) {
  return (
    <section style={{ margin: "16px 0" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 8px 0", color: "#c5a6ff" }}>
        {s.title}
      </h2>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
          fontFamily: "inherit",
        }}
      >
        {s.body}
      </pre>
    </section>
  );
}

export default function RefundsPage() {
  const { locale } = useI18n();
  const L = refundsData[asLocale(locale)];
  return (
    <>
      <BackButton /> 
      <div
        style={{
          maxWidth: 900,
          margin: "80px auto",
          padding: 24,
          background: "rgba(25,25,35,0.4)",
          borderRadius: 16,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#e0e0ff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>{L.title}</h1>
        <p style={{ opacity: 0.8, marginTop: 6 }}>{L.effective}</p>
        {L.sections.map((s: Section, i: number) => (
          <SectionView key={`${s.title}-${i}`} s={s} />
        ))}
        <p style={{ opacity: 0.8, marginTop: 16 }}>{L.footer}</p>
      </div>
    </>
  );
}