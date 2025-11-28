"use client";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";

type Locale = "en" | "ko" | "zh" | "ar" | "es";
type Section = { title: string; body: string };

function asLocale(l: string): Locale {
  const list: Locale[] = ["en", "ko", "zh", "ar", "es"];
  return (list as readonly string[]).includes(l) ? (l as Locale) : "en";
}

const OPERATOR_EN = "Operator: Paul Rhee (individual)";
const OPERATOR_KO = "운영자: Paul Rhee(개인)";
const CONTACT_EMAIL = "rheeco88@gmail.com";

const termsData: Record<
  Locale,
  { title: string; effective: string; sections: Section[]; footer: string }
> = {
  en: {
    title: "Terms of Service",
    effective: "Effective date: 2025-01-01",
    sections: [
      { title: "1. Purpose", body: "These Terms govern the use of the service (“Service”) operated by Paul Rhee (individual)." },
      { title: "2. Definitions", body: "- Member: a user who agrees to these Terms\n- Content: any information provided in or uploaded to the Service\n- Paid service: features or subscriptions requiring payment" },
      { title: "3. Posting and Changes", body: "We may amend these Terms within applicable laws, with notice at least 7 days prior (30 days for material changes)." },
      { title: "4. Account and Security", body: "Provide accurate information and keep your account secure. Notify us of suspected misuse." },
      { title: "5. Service Provision/Change/Stop", body: "We strive for stable service. We may change or discontinue the Service with prior notice." },
      { title: "6. User Obligations", body: "Comply with laws and policies. Do not infringe rights, abuse automation, or bypass security." },
      { title: "7. Content Rights", body: "You retain your content and grant us a worldwide, royalty‑free license for operation, improvement, and promotion." },
      { title: "8. Paid Services and Billing", body: "Prices, billing cycles, and refunds follow the checkout and Refund Policy. Subscriptions auto‑renew until canceled. Cancel via Profile → Subscription." },
      { title: "9. Disclaimer", body: "Readings/advice are for entertainment and self‑help only; not medical, legal, or financial advice. You are responsible for your decisions." },
      { title: "10. Liability Limit", body: "No liability for force majeure. Our liability, if any, is limited to fees paid in the last 3 months; no indirect damages where permitted." },
      { title: "11. Third‑party Services", body: "OAuth, payment, calendar, and analytics may apply their own terms/policies." },
      { title: "12. Termination", body: "You may delete your account anytime. We may restrict or terminate for violations." },
      { title: "13. Governing Law and Venue", body: "Governing law: Republic of Korea. Venue: Seoul Central District Court, unless mandatory consumer laws apply." },
      { title: "14. Contact", body: `${OPERATOR_EN}\nEmail: ${CONTACT_EMAIL}\nAddress: Not disclosed (support by email)` },
    ],
    footer: "Addendum: Effective 2025-01-01",
  },
  ko: {
    title: "이용약관",
    effective: "시행일: 2025-01-01",
    sections: [
      { title: "1. 목적", body: "본 약관은 Paul Rhee(개인)가 운영하는 서비스(이하 “서비스”)의 이용 조건과 권리·의무를 규정합니다." },
      { title: "2. 정의", body: "- 회원: 약관에 동의하고 서비스를 이용하는 자\n- 콘텐츠: 서비스에서 제공되거나 업로드된 모든 정보\n- 유료서비스: 결제가 필요한 기능 또는 구독" },
      { title: "3. 게시 및 변경", body: "관련 법령 범위 내 개정 가능하며, 시행 7일 전(중요 변경 30일 전) 공지합니다." },
      { title: "4. 계정 및 보안", body: "정확한 정보를 제공하고, 계정 보안은 회원의 책임입니다. 부정 사용이 의심되면 즉시 알려주세요." },
      { title: "5. 제공·변경·중단", body: "안정적 제공을 위해 노력하며, 변경 또는 중단 시 사전 공지합니다." },
      { title: "6. 이용자 의무", body: "법령·정책 준수. 타인 권리 침해, 자동화 남용, 보안 우회 금지." },
      { title: "7. 콘텐츠 권리", body: "권리는 원칙적으로 회원에게 있습니다. 운영·개선·홍보 목적 범위 내 전 세계적, 무상 이용권을 회사에 허여합니다." },
      { title: "8. 유료서비스·결제", body: "가격·과금 주기·환불은 결제 화면 및 환불정책을 따릅니다. 구독은 해지 전까지 자동 갱신되며, 웹에서 프로필 → 구독 관리에서 즉시 해지할 수 있습니다." },
      { title: "9. 면책", body: "본 서비스의 운세·조언은 오락 및 자기계발을 위한 일반 정보이며, 의료·법률·재정 자문이 아닙니다. 최종 판단과 책임은 회원에게 있습니다." },
      { title: "10. 책임 제한", body: "불가항력 면책. 당사 책임이 인정되는 범위에서 최근 3개월 이용대금 한도 내 배상하며, 간접손해는 법이 허용하는 범위에서 제외됩니다." },
      { title: "11. 제3자 서비스", body: "OAuth/결제/캘린더/분석 등 제3자 약관·정책이 적용될 수 있습니다." },
      { title: "12. 해지", body: "회원은 언제든 계정 삭제 가능하며, 위반 시 서비스 이용을 제한 또는 해지할 수 있습니다." },
      { title: "13. 준거법·관할", body: "대한민국 법을 적용하며, 관할은 서울중앙지방법원(강행규정 우선 적용)." },
      { title: "14. 문의처", body: `${OPERATOR_KO}\n이메일: ${CONTACT_EMAIL}\n주소: 비공개(이메일로 지원)` },
    ],
    footer: "부칙: 2025-01-01 시행",
  },
  zh: {
    title: "服务条款",
    effective: "生效日期：2025-01-01",
    sections: [
      { title: "1. 目的", body: "本条款适用于 Paul Rhee（个人）运营的服务。" },
      { title: "2. 定义", body: "- 会员：同意条款并使用服务者\n- 内容：服务内提供或上传的信息\n- 付费服务：需付费的功能或订阅" },
      { title: "3. 公示与变更", body: "在法律允许范围内修改，至少提前7日（重大变更30日）通知。" },
      { title: "4. 账户与安全", body: "提供准确信息并妥善保管账户；疑似滥用请立即通知。" },
      { title: "5. 提供/变更/中止", body: "我们力求稳定服务；变更或中止将事先通知。" },
      { title: "6. 用户义务", body: "遵守法律与政策；不侵权、不滥用自动化、不绕过安全。" },
      { title: "7. 内容权利", body: "用户保留权利，并授予我们为运营/改进/推广之全球免费许可。" },
      { title: "8. 付费与结算", body: "价格、结算、退款依结算页与退款政策；订阅在取消前自动续费，可在“个人资料 → 订阅”取消。" },
      { title: "9. 免责声明", body: "占卜/建议仅供娱乐与自助，不构成医疗/法律/财务意见。决策由用户自行承担。" },
      { title: "10. 责任限制", body: "不可抗力免责；责任限于最近3个月费用；依法不承担间接损失。" },
      { title: "11. 第三方服务", body: "OAuth/支付/日历/分析等适用其条款与政策。" },
      { title: "12. 终止", body: "用户可随时注销；违规可限制或终止。" },
      { title: "13. 法律与管辖", body: "适用韩国法律；首尔中央地方法院为管辖法院。" },
      { title: "14. 联系方式", body: `运营者：Paul Rhee（个人）\n邮箱：${CONTACT_EMAIL}\n地址：不公开（邮箱支持）` },
    ],
    footer: "附则：自 2025-01-01 起生效",
  },
  ar: {
    title: "شروط الخدمة",
    effective: "تاريخ السريان: 2025-01-01",
    sections: [
      { title: "1. الغرض", body: "تنظم هذه الشروط استخدام الخدمة التي يديرها Paul Rhee (فرد)." },
      { title: "2. التعاريف", body: "- العضو: من يوافق على الشروط\n- المحتوى: أي معلومات داخل الخدمة\n- الخدمة المدفوعة: ميزات/اشتراكات مدفوعة" },
      { title: "3. النشر والتغييرات", body: "تعديلات مع إشعار مسبق 7 أيام (30 يوماً للتغييرات الجوهرية)." },
      { title: "4. الحساب والأمان", body: "قدّم معلومات دقيقة واحم حسابك." },
      { title: "5. تقديم/تغيير/إيقاف", body: "نسعى للاستقرار وقد نغيّر أو نوقف مع إشعار." },
      { title: "6. التزامات المستخدم", body: "الامتثال للقوانين؛ منع انتهاك الحقوق أو إساءة الأتمتة أو تجاوز الأمان." },
      { title: "7. حقوق المحتوى", body: "تحتفظ بالحقوق وتمنحنا ترخيصاً عالمياً مجانياً لأغراض التشغيل/التحسين/الترويج." },
      { title: "8. المدفوعات", body: "الأسعار/الدورات/الاسترداد وفق صفحة الدفع وسياسة الاسترداد؛ يمكن الإلغاء عبر الملف الشخصي → الاشتراك." },
      { title: "9. إخلاء المسؤولية", body: "القراءات/النصائح للترفيه والمساعدة الذاتية فقط وليست نصيحة طبية/قانونية/مالية." },
      { title: "10. تحديد المسؤولية", body: "لا مسؤولية عن القوة القاهرة؛ الحد يساوي رسوم آخر 3 أشهر؛ لا أضرار غير مباشرة حيث يسمح القانون." },
      { title: "11. خدمات الطرف الثالث", body: "قد تنطبق شروط مزودي OAuth/الدفع/التقويم/التحليلات." },
      { title: "12. الإنهاء", body: "يمكن حذف الحساب في أي وقت؛ قد نقيّد أو ننهي عند المخالفة." },
      { title: "13. القانون والاختصاص", body: "قانون كوريا؛ محكمة سيول المركزية." },
      { title: "14. جهة الاتصال", body: `الجهة المشغِّلة: Paul Rhee (فرد)\nالبريد: ${CONTACT_EMAIL}\nالعنوان: غير معلن (الدعم عبر البريد)` },
    ],
    footer: "ملحق: سريان من 2025-01-01",
  },
  es: {
    title: "Términos del servicio",
    effective: "Fecha de vigencia: 2025-01-01",
    sections: [
      { title: "1. Propósito", body: "Estos Términos regulan el servicio operado por Paul Rhee (individual)." },
      { title: "2. Definiciones", body: "- Miembro: usuario que acepta los Términos\n- Contenido: información del Servicio\n- Servicio de pago: funciones/suscripciones de pago" },
      { title: "3. Publicación y cambios", body: "Podemos modificar con aviso previo de 7 días (30 días si es material)." },
      { title: "4. Cuenta y seguridad", body: "Proporciona información precisa y protege tu cuenta." },
      { title: "5. Prestación/cambio/suspensión", body: "Nos reservamos el derecho de cambiar o suspender con aviso." },
      { title: "6. Obligaciones del usuario", body: "Cumple leyes/políticas. Sin infracciones ni evasión de seguridad." },
      { title: "7. Derechos sobre el contenido", body: "Conservas los derechos y nos otorgas una licencia mundial gratuita para operar/mejorar/promocionar." },
      { title: "8. Pagos", body: "Precios/ciclos/reembolsos según la compra y la Política de reembolsos. Cancela en Perfil → Suscripción." },
      { title: "9. Exención", body: "Lecturas/consejos son para entretenimiento/autoayuda; no son asesoría médica/jurídica/financiera." },
      { title: "10. Limitación de responsabilidad", body: "Sin responsabilidad por fuerza mayor; límite: tarifas de últimos 3 meses; sin daños indirectos donde lo permita la ley." },
      { title: "11. Servicios de terceros", body: "Pueden aplicar términos de OAuth/pagos/calendario/análisis." },
      { title: "12. Terminación", body: "Puedes borrar tu cuenta en cualquier momento." },
      { title: "13. Ley y jurisdicción", body: "Ley de Corea; tribunal: Seúl Central." },
      { title: "14. Contacto", body: `Operador: Paul Rhee (individual)\nCorreo: ${CONTACT_EMAIL}\nDirección: No divulgada (soporte por correo)` },
    ],
    footer: "Anexo: Vigente desde 2025-01-01",
  },
};

function SectionView({ s }: { s: Section }) {
  return (
    <section style={{ margin: "16px 0" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 8px 0", color: "#c5a6ff" }}>{s.title}</h2>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "inherit" }}>{s.body}</pre>
    </section>
  );
}

export default function TermsPage() {
  const { locale } = useI18n();
  const L = termsData[asLocale(locale)];
  return (
    <>
      <BackButton />
      <div style={{ maxWidth: 900, margin: "80px auto", padding: 24, background: "rgba(25,25,35,0.4)", borderRadius: 16, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", color: "#e0e0ff" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>{L.title}</h1>
        <p style={{ opacity: 0.8, marginTop: 6 }}>{L.effective}</p>
        {L.sections.map((s: Section, i: number) => <SectionView key={`${s.title}-${i}`} s={s} />)}
        <p style={{ opacity: 0.8, marginTop: 16 }}>{L.footer}</p>
      </div>
    </>
  );
}