"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";

type Locale = "en" | "ko" | "zh" | "ar" | "es";
type Section = { title: string; body: string };

function asLocale(l: string): Locale {
  const list: Locale[] = ["en", "ko", "zh", "ar", "es"];
  return (list as readonly string[]).includes(l) ? (l as Locale) : "en";
}

const CONTROLLER_NAME = "Paul Rhee (individual)";
const CONTACT_EMAIL = "rheeco88@gmail.com";

const privacyData: Record<
  Locale,
  { title: string; effective: string; sections: Section[]; footer: string }
> = {
  en: {
    title: "Privacy Policy",
    effective: "Effective date: 2025-01-01",
    sections: [
      { title: "1. Overview", body: "We comply with applicable privacy laws (PIPA, GDPR, CCPA)." },
      {
        title: "2. Data We Collect",
        body:
          "- Sign-up: email, password hash, nickname\n- Social login: profile within consent\n- Usage: logs, IP, cookies, device/browser\n- Billing: identifiers from the payment processor (no full card stored)\n- Service input: birth date/time/place for features",
      },
      { title: "3. How We Collect", body: "Forms, support contact, automatic collection (cookies), payment integrations." },
      {
        title: "4. Purpose of Use",
        body: "Authentication, service delivery, personalized reports, support, notices, statistics, billing, legal compliance.",
      },
      { title: "5. Retention", body: "Account until deletion (legal retention up to 5 years). Logs 2 years. Billing 5 years." },
      {
        title: "6. Sharing/Processors",
        body:
          "No sharing without consent except as required by law. We use processors: Supabase (hosting/DB), Stripe (payments), OpenAI (AI processing), Google (OAuth/Calendar), Resend/SendGrid (email).",
      },
      { title: "7. Overseas Transfer", body: "Data may be transferred to the U.S./other regions where these processors operate. Details are disclosed in service notices." },
      { title: "8. Your Rights", body: `Access, rectify, delete, restrict, withdraw consent. Contact: ${CONTACT_EMAIL}` },
      { title: "9. Cookies", body: "Used for login and analytics. Manage in the browser or Cookie Settings." },
      { title: "10. Security", body: "Encryption, access control, least privilege, monitoring, backup/DR, training." },
      { title: "11. Children", body: "Users under 14 may require guardian consent depending on jurisdiction." },
      { title: "12. Controller/DPO", body: `Controller: ${CONTROLLER_NAME}\nEmail: ${CONTACT_EMAIL}` },
      { title: "13. Notice of Changes", body: "We announce changes at least 7 days prior (30 days for material changes)." },
    ],
    footer: "Addendum: Effective 2025-01-01",
  },
  ko: {
    title: "개인정보처리방침",
    effective: "시행일: 2025-01-01",
    sections: [
      { title: "1. 총칙", body: "개인정보보호법, GDPR, CCPA 등 관련 법령을 준수합니다." },
      {
        title: "2. 수집 항목",
        body:
          "- 가입: 이메일, 비밀번호 해시, 닉네임\n- 소셜: 동의 범위 내 프로필\n- 이용: 로그, IP, 쿠키, 기기/브라우저\n- 결제: 결제대행사 식별자(카드 전체번호 미저장)\n- 서비스 입력: 생년월일/시간/출생지",
      },
      { title: "3. 수집 방법", body: "회원가입·설정, 고객문의, 자동 수집(쿠키), 결제 연동." },
      { title: "4. 이용 목적", body: "인증, 서비스 제공, 맞춤 리포트, 지원, 공지, 통계, 결제, 법령 준수." },
      { title: "5. 보관 기간", body: "계정은 탈퇴 시 파기(법정 보관 최대 5년). 로그 2년. 결제 5년." },
      {
        title: "6. 제3자 제공/처리위탁",
        body:
          "동의 없는 제공은 원칙적으로 없으며, 다음 수탁사를 이용합니다: Supabase(호스팅/DB), Stripe(결제), OpenAI(모델 처리), Google(OAuth/캘린더), Resend/SendGrid(이메일).",
      },
      { title: "7. 국외 이전", body: "수탁사 운영 지역(주로 미국 등)으로 이전될 수 있습니다. 세부는 서비스 내 고지합니다." },
      { title: "8. 이용자 권리", body: `열람·정정·삭제·처리정지·동의철회. 연락: ${CONTACT_EMAIL}` },
      { title: "9. 쿠키", body: "로그인 유지와 분석 목적. 브라우저 또는 쿠키 설정에서 관리." },
      { title: "10. 안전성 확보", body: "암호화, 접근통제, 최소권한, 모니터링, 백업/DR, 교육." },
      { title: "11. 아동", body: "만 14세 미만은 법정대리인 동의가 필요할 수 있습니다." },
      { title: "12. 개인정보 보호책임자", body: `운영자: Paul Rhee(개인)\n이메일: ${CONTACT_EMAIL}` },
      { title: "13. 고지 의무", body: "변경 시 최소 7일 전(중요 변경 30일 전) 공지합니다." },
    ],
    footer: "부칙: 2025-01-01 시행",
  },
  zh: {
    title: "隐私政策",
    effective: "生效日期：2025-01-01",
    sections: [
      { title: "1. 总则", body: "遵守隐私相关法律（PIPA/GDPR/CCPA）。" },
      {
        title: "2. 收集信息",
        body:
          "- 注册：邮箱、密码哈希、昵称\n- 社交登录：同意范围内的资料\n- 使用：日志、IP、Cookies、设备/浏览器\n- 支付：支付方标识（不存完整卡号）\n- 服务输入：生日/时间/出生地",
      },
      { title: "3. 收集方式", body: "表单、客服、自动收集（Cookies）、支付集成。" },
      { title: "4. 使用目的", body: "认证、服务提供、个性化报告、支持、通知、统计、支付、符合法律。" },
      { title: "5. 保存期限", body: "账户删除即销毁（法定最长5年）。日志2年，支付5年。" },
      {
        title: "6. 提供/委托",
        body: "原则上不向第三方提供；受托方：Supabase、Stripe、OpenAI、Google、Resend/SendGrid。",
      },
      { title: "7. 境外传输", body: "可能传输至其服务器所在国家（多为美国等）。" },
      { title: "8. 权利", body: `查阅/更正/删除/限制/撤回同意。联系：${CONTACT_EMAIL}` },
      { title: "9. Cookies", body: "用于登录与分析。可在浏览器或“Cookie 设置”管理。" },
      { title: "10. 安全措施", body: "加密、访问控制、最小权限、监控、备份/容灾、培训。" },
      { title: "11. 儿童", body: "未满14岁可能需监护人同意。" },
      { title: "12. 负责人", body: `负责人：${CONTROLLER_NAME}\n邮箱：${CONTACT_EMAIL}` },
      { title: "13. 变更通知", body: "重大变更提前30日通知，其他变更提前7日。" },
    ],
    footer: "附则：自 2025-01-01 起生效",
  },
  ar: {
    title: "سياسة الخصوصية",
    effective: "تاريخ السريان: 2025-01-01",
    sections: [
      { title: "1. نظرة عامة", body: "نلتزم بقوانين الخصوصية المعمول بها (PIPA/GDPR/CCPA)." },
      {
        title: "2. البيانات المجمعة",
        body:
          "- التسجيل: البريد، تجزئة كلمة المرور، اللقب\n- تسجيل اجتماعي: ضمن نطاق الموافقة\n- الاستخدام: السجلات، IP، الكوكيز، الجهاز/المتصفح\n- الدفع: معرّفات من معالج الدفع (لا نخزن رقم البطاقة الكامل)\n- إدخال الخدمة: تاريخ/وقت/مكان الميلاد",
      },
      { title: "3. طرق الجمع", body: "النماذج، الدعم، الجمع الآلي (كوكيز)، تكاملات الدفع." },
      { title: "4. الغرض", body: "المصادقة، تقديم الخدمة، التقارير المخصصة، الدعم، الإشعارات، الإحصاء، الدفع، الامتثال." },
      { title: "5. مدة الاحتفاظ", body: "الحساب حتى الحذف (حتى 5 سنوات قانونياً). السجلات سنتان. الدفع 5 سنوات." },
      {
        title: "6. المشاركة/المعالِجون",
        body: "لا مشاركة دون موافقة إلا بنص القانون. معالِجون: Supabase وStripe وOpenAI وGoogle وResend/SendGrid.",
      },
      { title: "7. النقل إلى الخارج", body: "قد تُنقل البيانات إلى البلدان التي تعمل فيها هذه الخدمات." },
      { title: "8. حقوقك", body: `الوصول، التصحيح، الحذف، التقييد، سحب الموافقة. البريد: ${CONTACT_EMAIL}` },
      { title: "9. الكوكيز", body: "لتسجيل الدخول والتحليلات. الإدارة عبر المتصفح أو إعدادات الكوكيز." },
      { title: "10. الأمان", body: "تشفير، تحكم بالوصول، أقل صلاحيات، مراقبة، نسخ احتياطي/تعافي، تدريب." },
      { title: "11. الأطفال", body: "قد يتطلب من دون 14 عاماً موافقة ولي الأمر." },
      { title: "12. المسؤول", body: `المسؤول: ${CONTROLLER_NAME}\nالبريد: ${CONTACT_EMAIL}` },
      { title: "13. إشعار التغييرات", body: "نعلن عن التغييرات قبل 7 أيام على الأقل (و30 يوماً للتغييرات الجوهرية)." },
    ],
    footer: "ملحق: سريان من 2025-01-01",
  },
  es: {
    title: "Política de privacidad",
    effective: "Fecha de vigencia: 2025-01-01",
    sections: [
      { title: "1. General", body: "Cumplimos las leyes de privacidad aplicables (PIPA, GDPR, CCPA)." },
      {
        title: "2. Datos recabados",
        body:
          "- Registro: email, hash de contraseña, alias\n- Social: dentro del consentimiento\n- Uso: logs, IP, cookies, dispositivo/navegador\n- Pago: identificadores del procesador (no almacenamos tarjeta completa)\n- Entrada del servicio: fecha/hora/lugar de nacimiento",
      },
      { title: "3. Métodos", body: "Formularios, soporte, recopilación automática (cookies), integraciones de pago." },
      {
        title: "4. Finalidad",
        body: "Autenticación, prestación del servicio, informes personalizados, soporte, avisos, estadísticas, facturación y cumplimiento legal.",
      },
      { title: "5. Retención", body: "Cuenta hasta eliminación (máx. 5 años legales). Logs 2 años. Pagos 5 años." },
      {
        title: "6. Cesión/Encargados",
        body: "Encargados: Supabase (hosting/DB), Stripe (pagos), OpenAI (IA), Google (OAuth/Calendario), Resend/SendGrid (email).",
      },
      { title: "7. Transferencia internacional", body: "Posible transferencia a EE. UU. u otras regiones según proveedores." },
      { title: "8. Derechos", body: `Acceso, rectificación, supresión, restricción, retirada del consentimiento. Contacto: ${CONTACT_EMAIL}` },
      { title: "9. Cookies", body: "Para login y analítica. Gestión en el navegador o en Configuración de cookies." },
      { title: "10. Seguridad", body: "Cifrado, control de acceso, mínimo privilegio, monitoreo, respaldo/DR, formación." },
      { title: "11. Menores", body: "Menores de 14 pueden requerir consentimiento." },
      { title: "12. Responsable/DPO", body: `Responsable: ${CONTROLLER_NAME}\nEmail: ${CONTACT_EMAIL}` },
      { title: "13. Aviso de cambios", body: "Avisaremos con 7 días (30 días para cambios materiales)." },
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

export default function PrivacyPage() {
  const { locale } = useI18n();
  const L = privacyData[asLocale(locale)];
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