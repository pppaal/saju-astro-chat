"use client";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";

type Locale = "en" | "ko" | "zh" | "ar" | "es";
type Section = { title: string; body: string };

function asLocale(l: string): Locale {
  const list: Locale[] = ["en", "ko", "zh", "ar", "es"];
  return (list as readonly string[]).includes(l) ? (l as Locale) : "en";
}

const termsData: Record<
  Locale,
  { title: string; effective: string; sections: Section[]; footer: string }
> = {
  en: {
    title: "Terms of Service",
    effective: "Effective date: 2025-01-01",
    sections: [
      { title: "1. Purpose", body: "These Terms govern the use of the service (“Service”) provided by [Company]." },
      { title: "2. Definitions", body: "- Member: a user who agrees to these Terms\n- Content: any information provided in or uploaded to the Service\n- Paid service: features or subscriptions requiring payment" },
      { title: "3. Posting and Changes", body: "We may amend these Terms within applicable laws, with notice at least 7 days prior (30 days for material changes)." },
      { title: "4. Account and Security", body: "Provide accurate information and keep your account secure. Notify us of suspected misuse." },
      { title: "5. Service Provision/Change/Stop", body: "We strive for stable service. We may change or discontinue the Service with prior notice." },
      { title: "6. User Obligations", body: "Comply with laws and policies. Do not infringe rights, abuse automation, or bypass security." },
      { title: "7. Content Rights", body: "You retain your content. You grant us a worldwide, royalty‑free license for operation, improvement, and promotion." },
      { title: "8. Paid Services and Billing", body: "Prices, billing cycles, and refunds follow the checkout and Refund Policy. Subscriptions auto‑renew until canceled." },
      { title: "9. Withdrawal and Refunds", body: "Digital content may be non‑refundable after delivery. See Refund Policy." },
      { title: "10. Disclaimer and Limitation", body: "No liability for force majeure. Our liability (if any) is limited to fees paid over last 3 months; no indirect damages where permitted." },
      { title: "11. Third‑party Services", body: "OAuth, payment, and analytics may apply their own terms/policies." },
      { title: "12. Termination", body: "You may delete your account anytime. We may restrict or terminate for violations." },
      { title: "13. Governing Law and Venue", body: "Governing law: Republic of Korea. Venue: Seoul Central District Court, unless mandatory consumer laws apply." },
      { title: "14. Contact", body: "Email: rheeco88@gmail.com\nAddress: [Address]" },
    ],
    footer: "Addendum: Effective 2025-01-01",
  },
  ko: {
    title: "이용약관",
    effective: "시행일: 2025-01-01",
    sections: [
      { title: "1. 목적", body: "[회사]가 제공하는 서비스(이하 “서비스”)의 이용 조건과 권리·의무를 규정합니다." },
      { title: "2. 정의", body: "- 회원: 약관에 동의하고 서비스를 이용하는 자\n- 콘텐츠: 서비스에서 제공되거나 업로드된 모든 정보\n- 유료서비스: 결제가 필요한 기능 또는 구독" },
      { title: "3. 게시 및 변경", body: "관련 법령 범위 내 개정 가능하며, 시행 7일 전(중요 변경 30일 전) 공지합니다." },
      { title: "4. 계정 및 보안", body: "정확한 정보를 제공하고, 계정 보안은 회원의 책임입니다. 부정 사용이 의심되면 즉시 알려주세요." },
      { title: "5. 제공·변경·중단", body: "안정적 제공을 위해 노력하며, 변경 또는 중단 시 사전 공지합니다." },
      { title: "6. 이용자 의무", body: "법령·정책 준수. 타인 권리 침해, 자동화 남용, 보안 우회 금지." },
      { title: "7. 콘텐츠 권리", body: "권리는 원칙적으로 회원에게 있습니다. 운영·개선·홍보 목적 범위 내 전 세계적, 무상 이용권을 회사에 허여합니다." },
      { title: "8. 유료서비스·결제", body: "가격·과금 주기·환불 규정은 결제 화면 및 환불정책을 따릅니다. 구독은 해지 전까지 자동 갱신." },
      { title: "9. 청약철회·환불", body: "디지털 특성상 제공 개시 후 환불이 제한될 수 있습니다. 자세한 내용은 환불정책 참조." },
      { title: "10. 면책·책임 제한", body: "불가항력 면책. 회사 과실 시 최근 3개월 이용대금 한도 내 배상, 간접손해 제외(법 허용 범위)." },
      { title: "11. 제3자 서비스", body: "OAuth/결제/분석 등 제3자 약관·정책이 적용될 수 있습니다." },
      { title: "12. 해지", body: "회원은 언제든 계정 삭제 가능. 위반 시 제한 또는 해지할 수 있습니다." },
      { title: "13. 준거법·관할", body: "대한민국 법, 관할은 서울중앙지방법원(강행규정 우선 적용 가능)." },
      { title: "14. 문의처", body: "이메일: rheeco88@gmail.com\n주소: [주소]" },
    ],
    footer: "부칙: 2025-01-01 시행",
  },
  zh: {
    title: "服务条款",
    effective: "生效日期：2025-01-01",
    sections: [
      { title: "1. 目的", body: "本条款规范[公司]所提供服务的使用。" },
      { title: "2. 定义", body: "- 会员：同意条款并使用服务者\n- 内容：服务内提供或上传的任何信息\n- 付费服务：需要支付的功能或订阅" },
      { title: "3. 公示与变更", body: "在法律允许范围内可修改，至少提前7日（重大变更30日）通知。" },
      { title: "4. 账户与安全", body: "提供准确信息并妥善保管账户。如怀疑被滥用，请立即通知我们。" },
      { title: "5. 提供/变更/中止", body: "我们将尽力提供稳定服务，变更或中止将事先通知。" },
      { title: "6. 用户义务", body: "遵守法律与政策。不侵权、不滥用自动化工具、不绕过安全。" },
      { title: "7. 内容权利", body: "用户保留内容权利，并授予我们出于运营/改进/宣传之全球免费许可。" },
      { title: "8. 付费与结算", body: "价格、结算、退款依结算页面与退款政策；订阅在取消前自动续费。" },
      { title: "9. 撤销与退款", body: "数字内容提供后可能无法退款。详见退款政策。" },
      { title: "10. 免责与责任限制", body: "不可抗力免责；责任限于最近3个月费用；在法律允许范围内不承担间接损失。" },
      { title: "11. 第三方服务", body: "OAuth/支付/分析等适用其各自条款与政策。" },
      { title: "12. 终止", body: "用户可随时注销账号；违规可限制或终止。" },
      { title: "13. 法律与管辖", body: "适用大韩民国法律；首尔中央地方法院为专属管辖（强制性消费者法优先）。" },
      { title: "14. 联系方式", body: "邮箱：rheeco88@gmail.com\n地址：[地址]" },
    ],
    footer: "附则：自 2025-01-01 起生效",
  },
  ar: {
    title: "شروط الخدمة",
    effective: "تاريخ السريان: 2025-01-01",
    sections: [
      { title: "1. الغرض", body: "تحكم هذه الشروط استخدام الخدمة المقدمة من [الشركة]." },
      { title: "2. التعاريف", body: "- العضو: من يوافق على الشروط ويستخدم الخدمة\n- المحتوى: أي معلومات مقدمة أو مرفوعة داخل الخدمة\n- الخدمة المدفوعة: ميزات أو اشتراكات تتطلب دفعاً" },
      { title: "3. النشر والتغييرات", body: "قد نقوم بتعديل الشروط ضمن القوانين المعمول بها مع إشعار مسبق لا يقل عن 7 أيام (30 يوماً للتغييرات الجوهرية)." },
      { title: "4. الحساب والأمان", body: "قدّم معلومات دقيقة واحفظ حسابك. أبلغنا فوراً عند الاشتباه بإساءة استخدام." },
      { title: "5. تقديم/تغيير/إيقاف الخدمة", body: "نسعى لتقديم خدمة مستقرة وقد نغير أو نوقف الخدمة مع إشعار مسبق." },
      { title: "6. التزامات المستخدم", body: "الالتزام بالقوانين والسياسات. حظر انتهاك الحقوق أو إساءة الأتمتة أو تجاوز الأمان." },
      { title: "7. حقوق المحتوى", body: "تحتفظ بحقوقك وتمنحنا ترخيصاً عالمياً مجانياً لأغراض التشغيل والتحسين والترويج." },
      { title: "8. الخدمات المدفوعة والفوترة", body: "الأسعار والدفع والاسترداد وفق صفحة الدفع وسياسة الاسترداد. الاشتراكات تتجدد تلقائياً حتى الإلغاء." },
      { title: "9. السحب والاسترداد", body: "قد لا يُسترد المحتوى الرقمي بعد تقديمه. راجع سياسة الاسترداد." },
      { title: "10. إخلاء المسؤولية وتحديدها", body: "لا مسؤولية عن القوة القاهرة. حدود المسؤولية حتى رسوم آخر 3 أشهر؛ لا أضرار غير مباشرة حيث يسمح القانون." },
      { title: "11. خدمات الطرف الثالث", body: "قد تنطبق شروط وسياسات مزودي OAuth/الدفع/التحليلات." },
      { title: "12. الإنهاء", body: "يمكنك حذف الحساب في أي وقت. قد نقيد أو ننهي عند المخالفة." },
      { title: "13. القانون والاختصاص", body: "قانون جمهورية كوريا والاختصاص لمحكمة سيول المركزية ما لم تنطبق قوانين المستهلك الإلزامية." },
      { title: "14. جهة الاتصال", body: "البريد: rheeco88@gmail.com\nالعنوان: [العنوان]" },
    ],
    footer: "ملحق: سريان من 2025-01-01",
  },
  es: {
    title: "Términos del servicio",
    effective: "Fecha de vigencia: 2025-01-01",
    sections: [
      { title: "1. Propósito", body: "Estos Términos rigen el uso del servicio proporcionado por [Compañía]." },
      { title: "2. Definiciones", body: "- Miembro: usuario que acepta los Términos\n- Contenido: información en o cargada al Servicio\n- Servicio de pago: funciones o suscripciones de pago" },
      { title: "3. Publicación y cambios", body: "Podemos modificar los Términos con aviso al menos 7 días antes (30 días para cambios materiales)." },
      { title: "4. Cuenta y seguridad", body: "Proporciona información precisa y protege tu cuenta. Notifícanos de uso indebido." },
      { title: "5. Prestación/cambio/suspensión", body: "Nos esforzamos por la estabilidad. Podemos cambiar o suspender con aviso previo." },
      { title: "6. Obligaciones del usuario", body: "Cumple leyes y políticas. Sin infracciones, abuso de automatización ni evasión de seguridad." },
      { title: "7. Derechos sobre el contenido", body: "Conservas tus derechos y nos otorgas una licencia mundial y gratuita para operar, mejorar y promocionar." },
      { title: "8. Servicios de pago y facturación", body: "Precios, ciclos y reembolsos según la compra y la Política de reembolsos. Renovación automática hasta cancelar." },
      { title: "9. Desistimiento y reembolsos", body: "Puede que no haya reembolso tras la entrega digital. Consulta la Política de reembolsos." },
      { title: "10. Exención y limitación", body: "No responsables por fuerza mayor. Límite: tarifas de últimos 3 meses; sin daños indirectos donde lo permita la ley." },
      { title: "11. Servicios de terceros", body: "Pueden aplicar términos/políticas de OAuth/pago/analítica." },
      { title: "12. Terminación", body: "Puedes borrar tu cuenta en cualquier momento. Podemos restringir o terminar por infracciones." },
      { title: "13. Ley y jurisdicción", body: "Ley de Corea del Sur; jurisdicción: Tribunal Central de Seúl, salvo leyes obligatorias del consumidor." },
      { title: "14. Contacto", body: "Correo: rheeco88@gmail.com\nDirección: [Dirección]" },
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