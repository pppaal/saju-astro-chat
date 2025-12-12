# backend_ai/model/fusion_generate.py

import os
import re
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv

from backend_ai.app.saju_astro_rag import search_graphs

"""
Fusion Generator - Gemini-Level Quality
========================================
Production Setup:
1) Together Llama 3.3 70B (Draft) - $0.88/1M tokens
2) GPT-4o-mini (Polish) - $0.15/1M tokens

Enhanced Features:
- Hybrid RAG context (Vector + BM25 + Graph + Reranking)
- Real-time transit data
- User memory integration
"""

load_dotenv()
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MAX_OUTPUT_TOKENS = 3500

# Try to use Hybrid RAG
try:
    from backend_ai.app.hybrid_rag import build_rag_context
    HAS_HYBRID_RAG = True
except ImportError:
    HAS_HYBRID_RAG = False

# Try to use real-time transits
try:
    from backend_ai.app.realtime_astro import get_current_transits, get_transit_interpretation
    HAS_REALTIME = True
except ImportError:
    HAS_REALTIME = False


# ===============================================================
# LLM CLIENTS (Legacy fallback)
# ===============================================================
def get_together_llm():
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY is missing.")
    from together import Together
    return Together(api_key=TOGETHER_API_KEY)


def get_openai_llm():
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing.")
    from openai import OpenAI
    return OpenAI(api_key=OPENAI_API_KEY)


def get_llm():
    """Default LLM for fusion generation; fallback to OpenAI if Together key is missing."""
    try:
        return get_together_llm()
    except Exception:
        return get_openai_llm()


def _chat_with_retry(client, model: str, messages, max_tokens: int, temperature: float = 0.1, top_p: float = 0.9, retries: int = 2):
    """Simple retry/backoff for rate/5xx."""
    import time

    delay = 1.0
    last_err = None
    for attempt in range(retries + 1):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
        except Exception as e:
            last_err = e
            msg = str(e)
            if "429" in msg or "rate" in msg.lower() or "503" in msg:
                time.sleep(delay)
                delay *= 2
                continue
            break
    raise last_err


def _generate_with_together(prompt: str, max_tokens: int = MAX_OUTPUT_TOKENS, temperature: float = 0.15) -> str:
    """Generate using Together Llama 3.3 70B (production setup)."""
    client = get_llm()
    resp = _chat_with_retry(
        client,
        model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content


# ===============================================================
# PRESETS (theme tone) - Detailed guidance for each theme
# ===============================================================
PRESETS = {
    "life_path": """
[THEME: Life Path & Destiny 인생경로]
TONE: Wise mentor sharing ancient wisdom. Balanced between encouragement and realistic guidance.
STRUCTURE:
- Open with their core elemental nature and how it shapes their life journey
- Discuss the interplay of their Four Pillars (년주/월주/일주/시주) and what each reveals
- Connect planetary transits to current life phase and upcoming shifts
- Identify their unique strengths from birth chart (hidden talents, natural gifts)
- Address potential obstacles as growth opportunities, not limitations
- Provide 3-5 year vision with key turning points
INCLUDE: Element balance (오행 균형), Ten Gods relationships (십성), Day Master strength (일간 강약)
AVOID: Fatalistic language, absolute predictions, discouraging tone
""",

    "career": """
[THEME: Career & Professional Growth 사업운/직업운]
TONE: Strategic advisor with business acumen. Confident, practical, action-oriented.
STRUCTURE:
- Analyze their professional archetype based on Day Master and Ten Gods
- Identify optimal career fields aligned with their elemental nature
- Discuss current transit influences on work and opportunities
- Pinpoint best timing windows for: job changes, negotiations, launches, investments
- Reveal collaboration dynamics - who to partner with (element compatibility)
- Provide concrete monthly/quarterly action steps
INCLUDE: Wealth stars (재성), Authority stars (관성), favorable industries by element, timing cycles
SPECIAL: For 사업운, emphasize business timing, partnerships, financial cycles
""",

    "relationship": """
[THEME: Relationships & Social Harmony 대인관계]
TONE: Warm counselor with deep empathy. Understanding yet clear about boundaries.
STRUCTURE:
- Describe their relational nature from Day Master perspective
- Analyze relationship patterns from their Four Pillars
- Discuss current planetary influences on social connections
- Identify who they naturally harmonize with (element combinations)
- Address potential friction points and how to navigate them
- Provide guidance on deepening meaningful connections
INCLUDE: Relationship palace (배우자궁), Friend/Sibling stars, element harmony principles
FOCUS: Communication styles, trust building, conflict resolution timing
""",

    "love": """
[THEME: Love & Romance 연애운/결혼운]
TONE: Romantic yet grounded advisor. Hopeful but realistic about matters of the heart.
STRUCTURE:
- Reveal their love language and romantic nature from birth chart
- Analyze Marriage Palace (배우자궁) for partnership insights
- Discuss Venus/relationship planetary transits and their timing
- Identify optimal periods for meeting someone, deepening bonds, or commitment
- Address any challenging aspects with constructive solutions
- Paint a vision of their ideal relationship dynamics
INCLUDE: Spouse star (정재/정관), Peach Blossom stars (도화), timing for romance
SPECIAL: For 결혼운, focus on marriage timing, compatibility factors, commitment readiness
""",

    "health": """
[THEME: Health & Wellness 건강운]
TONE: Caring wellness guide. Preventive focus, holistic perspective.
STRUCTURE:
- Connect their elemental balance to body constitution (오행과 체질)
- Identify which organs/systems may need attention based on element weakness
- Discuss seasonal wellness aligned with their chart
- Recommend lifestyle adjustments (not medical treatments)
- Suggest optimal rest/activity balance based on their energy pattern
- Provide stress management insights based on their nature
INCLUDE: Element-organ connections (목-간, 화-심, 토-비, 금-폐, 수-신)
CRITICAL: Entertainment only. Always recommend professional medical consultation for health concerns.
""",

    "family": """
[THEME: Family & Home Life 가정운]
TONE: Wise family elder. Nurturing, practical, harmony-focused.
STRUCTURE:
- Analyze family dynamics from their chart's relationship houses
- Discuss parent-child connections and generational patterns
- Identify communication styles that work for their family configuration
- Address timing for family decisions, moves, or major purchases
- Provide guidance on creating harmonious home environment
- Suggest ways to strengthen family bonds based on element harmony
INCLUDE: Parents palace, Children palace, Home/Property indicators
FOCUS: Multi-generational harmony, domestic peace, family legacy
""",

    "daily": """
[THEME: Daily Guidance 오늘의 운세]
TONE: Friendly morning advisor. Concise, actionable, motivating.
STRUCTURE:
- 2-3 sentences on today's overall energy
- One specific opportunity to watch for
- One caution or thing to be mindful of
- Lucky elements/colors/directions for today
- Brief closing encouragement
FORMAT: Keep under 200 words. Direct and immediately useful.
FOCUS: What can they do TODAY to maximize positive energy?
""",

    "monthly": """
[THEME: Monthly Overview 이달의 운세]
TONE: Strategic monthly planner. Organized, specific, forward-looking.
STRUCTURE:
- Month's dominant energy theme based on monthly stem/branch
- Week-by-week breakdown of energy shifts
- Key dates to watch (favorable and challenging)
- Best days for important activities (meetings, decisions, starts)
- Areas of life highlighted this month
- Practical monthly focus recommendations
INCLUDE: Monthly pillar influence, planetary transits, clash/harmony days
FORMAT: Clear week markers, specific dates when relevant
""",

    "new_year": """
[THEME: New Year Forecast 신년운세]
TONE: Visionary guide. Inspiring, comprehensive, milestone-focused.
STRUCTURE:
- Year's overall theme and energy signature
- How the Year Pillar interacts with their chart
- Quarter-by-quarter energy flow and focus areas
- Major opportunity windows throughout the year
- Potential challenges and how to navigate them
- Key months for different life areas (career, love, health, etc.)
- Year-end vision and goals to work toward
INCLUDE: Annual pillar analysis, major planetary movements, seasonal considerations
SCOPE: Big-picture arc with enough detail to plan ahead
""",

    "next_year": """
[THEME: Next Year Preview 내년 운세]
TONE: Strategic forecaster. Preparatory, anticipatory, practical.
STRUCTURE:
- Preview of upcoming year's energy signature
- How it differs from current year
- What to complete/wrap up before year's end
- What to prepare/plant seeds for
- Key transitions to anticipate
- Early opportunity signals to watch for
- Recommended areas of focus and development
INCLUDE: Next year's pillar preview, transition guidance, preparation steps
FOCUS: Bridge between now and future, actionable preparation
""",
}


# ===============================================================
# GPT-5-mini refinement - Supports ALL 10 languages
# ===============================================================
REFINE_PROMPTS = {
    "ko": {
        "system": """당신은 한국 최고의 운세 컨텐츠 에디터입니다. 다음 원칙을 따라 텍스트를 다듬어주세요:

[톤 & 스타일]
- 친근하면서도 전문적인 어조 유지 ("~하실 수 있어요", "~해보시는 것도 좋겠네요")
- 과도한 경어나 딱딱한 표현 피하기
- 자연스러운 대화체와 문어체의 적절한 균형
- 읽는 사람이 마음이 편안해지면서도 신뢰가 가는 느낌

[내용 개선]
- 사주/점성술 전문 용어는 괄호로 쉬운 설명 추가 (예: "정재(正財, 안정적인 재물운)")
- 추상적 표현을 구체적으로 변환 (예: "좋은 일이 있을 것" → "3월 중순경 기대하던 소식이")
- 각 문단의 흐름이 자연스럽게 연결되도록
- 마무리는 희망적이면서도 현실적인 조언으로

[주의사항]
- 의료/법률/재정 조언은 절대 금지 (엔터테인먼트/자기계발 콘텐츠)
- 구조와 분량은 유지하면서 퀄리티만 높이기
- 원본의 구체적인 날짜, 숫자, 원소 정보는 반드시 유지
- 반드시 100% 한국어로만 작성하세요""",
        "user": "테마: {theme}\n\n아래 초안을 한국인 독자를 위해 자연스럽고 설득력 있게 다듬어주세요.\n- 구조와 길이는 유지\n- 한국어 표현을 더 자연스럽게\n- 전문 용어에 쉬운 설명 추가\n- 구체적인 정보(날짜, 원소 등)는 반드시 유지\n\n[초안]\n{raw_text}"
    },
    "ja": {
        "system": """あなたはプロの運勢エディターです。以下の原則に従ってテキストを洗練させてください:
- 丁寧で温かみのある日本語
- 専門用語には簡潔な説明を追加
- 具体的な日付や要素の情報は維持
- 読者が安心感と信頼感を持てるトーン
- 必ず100%日本語で記述してください""",
        "user": "テーマ: {theme}\n\n以下の原稿を洗練させてください。構造と長さは維持しつつ、より自然で説得力のある表現に:\n\n{raw_text}"
    },
    "zh": {
        "system": """您是专业的运势内容编辑。请按以下原则润色文本:
- 使用自然流畅的中文表达
- 专业术语添加简洁解释
- 保持具体日期和元素信息
- 温暖而专业的语调
- 必须100%使用中文撰写""",
        "user": "主题: {theme}\n\n请润色以下初稿，保持结构和长度，使表达更自然有说服力:\n\n{raw_text}"
    },
    "es": {
        "system": """Eres un editor profesional de contenido de horóscopo. Sigue estos principios:
- Usa español natural y fluido
- Añade explicaciones breves para términos especializados
- Mantén las fechas y elementos específicos
- Tono cálido pero profesional
- Escribe todo el texto 100% en español""",
        "user": "Tema: {theme}\n\nPule este borrador para lectores hispanohablantes. Mantén la estructura y longitud, mejora la claridad:\n\n{raw_text}"
    },
    "fr": {
        "system": """Vous êtes un éditeur professionnel de contenu horoscope. Suivez ces principes:
- Utilisez un français naturel et fluide
- Ajoutez de brèves explications pour les termes spécialisés
- Conservez les dates et éléments spécifiques
- Ton chaleureux mais professionnel
- TOUT le texte doit être 100% en français""",
        "user": "Thème: {theme}\n\nPolissez ce brouillon pour les lecteurs francophones. Gardez la structure et la longueur, améliorez la clarté:\n\n{raw_text}"
    },
    "de": {
        "system": """Sie sind ein professioneller Horoskop-Inhaltseditor. Befolgen Sie diese Prinzipien:
- Verwenden Sie natürliches, fließendes Deutsch
- Fügen Sie kurze Erklärungen für Fachbegriffe hinzu
- Behalten Sie spezifische Daten und Elemente bei
- Warmer aber professioneller Ton
- Der GESAMTE Text muss 100% auf Deutsch sein""",
        "user": "Thema: {theme}\n\nVerbessern Sie diesen Entwurf für deutschsprachige Leser. Behalten Sie Struktur und Länge bei, verbessern Sie die Klarheit:\n\n{raw_text}"
    },
    "pt": {
        "system": """Você é um editor profissional de conteúdo de horóscopo. Siga estes princípios:
- Use português natural e fluente
- Adicione explicações breves para termos especializados
- Mantenha datas e elementos específicos
- Tom caloroso mas profissional
- Escreva todo o texto 100% em português""",
        "user": "Tema: {theme}\n\nAperfeiçoe este rascunho para leitores lusófonos. Mantenha estrutura e comprimento, melhore a clareza:\n\n{raw_text}"
    },
    "ru": {
        "system": """Вы профессиональный редактор гороскопов. Следуйте этим принципам:
- Используйте естественный, беглый русский язык
- Добавляйте краткие пояснения к специальным терминам
- Сохраняйте конкретные даты и элементы
- Тёплый, но профессиональный тон
- ВЕСЬ текст должен быть на 100% на русском языке""",
        "user": "Тема: {theme}\n\nОтредактируйте этот черновик для русскоязычных читателей. Сохраните структуру и длину, улучшите ясность:\n\n{raw_text}"
    },
    "ar": {
        "system": """أنت محرر محترف لمحتوى الأبراج. اتبع هذه المبادئ:
- استخدم اللغة العربية الطبيعية والسلسة
- أضف شروحات موجزة للمصطلحات المتخصصة
- حافظ على التواريخ والعناصر المحددة
- نبرة دافئة لكن مهنية
- يجب أن يكون النص بالكامل 100% باللغة العربية""",
        "user": "الموضوع: {theme}\n\nقم بتحسين هذه المسودة للقراء العرب. حافظ على الهيكل والطول، حسّن الوضوح:\n\n{raw_text}"
    },
    "en": {
        "system": """You are a professional fortune content editor. Follow these principles:

[Tone & Style]
- Warm yet professional voice
- Balance between accessible and authoritative
- Engaging and easy to read
- Builds trust while feeling personalized

[Content Enhancement]
- Add brief explanations for specialized terms
- Transform vague statements into specific insights
- Ensure smooth transitions between paragraphs
- End with hopeful yet realistic advice

[Guidelines]
- No medical/legal/financial claims (entertainment/self-help only)
- Maintain structure and length
- Preserve all specific dates, numbers, and elemental references""",
        "user": "Theme: {theme}\n\nPolish this draft for a general audience. Keep structure and length, enhance clarity and engagement:\n\n{raw_text}"
    }
}


def refine_with_gpt5mini(raw_text: str, theme: str, locale: str = "en") -> str:
    """Polish the Llama draft with GPT-4o-mini. Supports all 10 languages."""
    try:
        gpt = get_openai_llm()

        prompts = REFINE_PROMPTS.get(locale, REFINE_PROMPTS["en"])
        system_prompt = prompts["system"]
        user_prompt = prompts["user"].format(theme=theme, raw_text=raw_text)

        resp = _chat_with_retry(
            gpt,
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=MAX_OUTPUT_TOKENS,
            temperature=0.2,
            top_p=0.9,
        )
        return resp.choices[0].message.content.strip()

    except Exception as e:
        print(f"[refine_with_gpt5mini] Error: {e}")
        return raw_text


# ===============================================================
# Fusion Report Generator
# ===============================================================
def generate_fusion_report(
    model,
    saju_text: str,
    astro_text: str,
    theme: str,
    locale: str = "en",
    user_prompt: str = "",
    dataset_text: str = "",
    tarot_text: str = "",
    fast_mode: bool = False,  # GPT polish enabled for quality (default)
):
    """Blend saju + astro + graph + rules with Llama draft then GPT mini polish.

    Args:
        fast_mode: If True, skip Step2 GPT polishing (saves ~15-20s). Default False for quality.
    """
    try:
        print("[FusionGenerate] Step1: Together LLM request start")

        query_parts = [saju_text, astro_text]
        if tarot_text:
            query_parts.append(tarot_text)
        query_parts.append(theme)
        query = "\n".join(query_parts)
        graph_context = search_graphs(query, top_k=12)

        preset_text = PRESETS.get(theme, PRESETS["life_path"])
        safe_user_prompt = (user_prompt or "").strip()
        if len(safe_user_prompt) > 1200:
            safe_user_prompt = safe_user_prompt[:1200] + "\n...[truncated]"
        dataset_summary = f"\n\n[Dataset context]\n{dataset_text.strip()}\n" if dataset_text else ""
        extra_user = (
            f"\n\n[User instructions - may be in {locale}]\n{safe_user_prompt}\n" if safe_user_prompt else ""
        )
        tarot_block = f"\n\n[TAROT summary]\n{tarot_text}" if tarot_text else ""

        # Enhanced comprehensive prompt with detailed guidance for ALL 10 supported languages
        LANGUAGE_INSTRUCTIONS = {
            "ko": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN KOREAN (한국어) ⚠️

[언어 & 톤 지침 - 한국어]
- 반드시 처음부터 끝까지 100% 자연스러운 한국어로 작성하세요
- 영어 단어나 문장을 절대 사용하지 마세요
- 친근하면서도 신뢰감 있는 어조 사용 (예: "~하실 수 있어요", "~해보세요")
- 사주/점성술 용어는 적절히 풀어서 설명 (예: "정재(正財)는 안정적인 재물을 의미하며...")
- 구체적인 숫자, 날짜, 시기를 언급하여 개인화된 느낌 제공
- 문단 사이에 자연스러운 연결어 사용
- 마무리는 희망적이면서도 실천 가능한 조언으로
""",
            "ja": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN JAPANESE (日本語) ⚠️

[言語指示 - 日本語]
- 必ず最初から最後まで100%自然な日本語で記述してください
- 英語の単語や文を絶対に使用しないでください
- 丁寧で温かみのある日本語で記述
- 敬語を適切に使用しながらも親しみやすく
- 具体的な日付や時期を含めて個人化
- 四柱推命・占星術の用語は分かりやすく説明
""",
            "zh": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN CHINESE (中文) ⚠️

[语言指示 - 中文]
- 必须从头到尾使用100%自然流畅的中文
- 绝对不要使用英语单词或句子
- 结合传统命理术语与现代解读
- 具体提及日期和时机
- 温暖而专业的语调
- 对专业术语提供简洁解释
""",
            "es": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN SPANISH (Español) ⚠️

[Instrucciones de idioma - Español]
- Escribe todo completamente en español natural y fluido
- NO uses palabras o frases en inglés bajo ninguna circunstancia
- Usa un tono cálido pero profesional
- Incluye fechas y momentos específicos
- Explica los términos de astrología/saju de manera accesible
- Adapta las referencias culturales al público hispanohablante
""",
            "fr": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN FRENCH (Français) ⚠️

[Instructions linguistiques - Français]
- Écris TOUT entièrement en français naturel et fluide
- N'utilise JAMAIS de mots ou phrases en anglais
- Adopte un ton chaleureux mais professionnel
- Inclus des dates et moments précis
- Explique les termes d'astrologie/saju de manière accessible
- Adapte les références culturelles au public francophone
""",
            "de": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN GERMAN (Deutsch) ⚠️

[Sprachanweisungen - Deutsch]
- Schreibe ALLES vollständig in natürlichem, flüssigem Deutsch
- Verwende NIEMALS englische Wörter oder Sätze
- Nutze einen warmen aber professionellen Ton
- Füge spezifische Daten und Zeitangaben hinzu
- Erkläre Astrologie/Saju-Begriffe verständlich
- Passe kulturelle Referenzen für deutschsprachige Leser an
""",
            "pt": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN PORTUGUESE (Português) ⚠️

[Instruções de idioma - Português]
- Escreva TUDO completamente em português natural e fluente
- NUNCA use palavras ou frases em inglês
- Use um tom caloroso mas profissional
- Inclua datas e momentos específicos
- Explique os termos de astrologia/saju de forma acessível
- Adapte referências culturais para o público lusófono
""",
            "ru": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN RUSSIAN (Русский) ⚠️

[Языковые инструкции - Русский]
- Пишите ВСЁ полностью на естественном, беглом русском языке
- НИКОГДА не используйте английские слова или фразы
- Используйте тёплый, но профессиональный тон
- Включайте конкретные даты и временные периоды
- Объясняйте термины астрологии/саджу доступно
- Адаптируйте культурные отсылки для русскоязычной аудитории
""",
            "ar": """
⚠️ CRITICAL: YOU MUST RESPOND ENTIRELY IN ARABIC (العربية) ⚠️

[تعليمات اللغة - العربية]
- اكتب كل شيء بالكامل باللغة العربية الطبيعية والسلسة
- لا تستخدم أبداً كلمات أو عبارات إنجليزية
- استخدم نبرة دافئة ولكن مهنية
- أدرج تواريخ وأوقات محددة
- اشرح مصطلحات الفلك/ساجو بطريقة مفهومة
- الكتابة من اليمين إلى اليسار
""",
            "en": """
[Language Instruction - English]
- Write entirely in natural, fluent English
- Use a warm but professional tone
- Include specific dates and timing references
- Explain astrology/saju terms accessibly
"""
        }
        locale_instruction = LANGUAGE_INSTRUCTIONS.get(locale, LANGUAGE_INSTRUCTIONS["en"])

        # Current date context for time-relevant advice
        now = datetime.now()
        weekday_names = {
            "ko": ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
            "ja": ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
            "zh": ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
            "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        }
        season_names = {
            "ko": ["겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"],
            "ja": ["冬", "冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬"],
            "zh": ["冬", "冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬"],
            "en": ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Fall", "Fall", "Fall", "Winter"]
        }
        wd = weekday_names.get(locale, weekday_names["en"])[now.weekday()]
        season = season_names.get(locale, season_names["en"])[now.month - 1]

        if locale == "ko":
            current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({wd}), {season}"
        elif locale == "ja":
            current_date_str = f"本日: {now.year}年{now.month}月{now.day}日 ({wd}), {season}"
        elif locale == "zh":
            current_date_str = f"今天: {now.year}年{now.month}月{now.day}日 ({wd}), {season}"
        else:
            current_date_str = f"Today: {now.strftime('%B %d, %Y')} ({wd}), {season}"

        # Get real-time transit data if available
        realtime_transit_text = ""
        if HAS_REALTIME:
            try:
                transits = get_current_transits()
                realtime_transit_text = get_transit_interpretation(transits, locale)
            except Exception as e:
                print(f"[FusionGenerate] Realtime transit error: {e}")

        # Get enhanced context from Hybrid RAG if available
        hybrid_context = ""
        if HAS_HYBRID_RAG:
            try:
                hybrid_context = build_rag_context(query, top_k=10)
            except Exception as e:
                print(f"[FusionGenerate] Hybrid RAG error: {e}")

        comprehensive_prompt = f"""
{preset_text}

{locale_instruction}

═══════════════════════════════════════════════════════════
                    ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════

Create a deeply personalized fortune analysis following the theme structure above.

CONTENT REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PERSONALIZATION: Reference specific elements from their chart
   - Mention their Day Master element and its characteristics
   - Connect their Four Pillars to current life situations
   - Use their actual planetary positions for timing guidance

2. SPECIFICITY: Avoid generic statements
   ❌ "You may face challenges"
   ✅ "Between March and May, when Mars squares your natal Saturn..."
   ❌ "Good opportunities ahead"
   ✅ "Your Wood element strengthens in spring, making April ideal for..."

3. DEPTH: Integrate multiple systems
   - Weave saju (四柱) insights with Western astrology
   - Reference the graph knowledge for deeper interpretation
   - Connect celestial patterns to practical life advice

4. STRUCTURE: Clear, scannable format
   - Use meaningful section headers
   - Include bullet points for key insights
   - Highlight important dates or periods
   - End with actionable recommendations

5. LENGTH: 800-1200 words (adjust for daily/monthly themes)

═══════════════════════════════════════════════════════════
                    CURRENT DATE & TIME CONTEXT
═══════════════════════════════════════════════════════════
{current_date_str}

Use this date to provide time-relevant advice:
- Reference "this week", "this month", "this season" appropriately
- Give specific timing recommendations based on current period
- Connect astrological transits to the current timeframe

═══════════════════════════════════════════════════════════
                    SOURCE MATERIALS
═══════════════════════════════════════════════════════════

[SAJU 사주 분석 데이터]
{saju_text}

[ASTRO 점성술 분석 데이터]
{astro_text}

{f"[REALTIME TRANSITS 현재 천체 배치]{chr(10)}{realtime_transit_text}" if realtime_transit_text else ""}

[KNOWLEDGE GRAPH 참조 지식]
{graph_context}

{f"[HYBRID RAG CONTEXT]{chr(10)}{hybrid_context}" if hybrid_context else ""}
{tarot_block}
{dataset_summary}
{extra_user}

═══════════════════════════════════════════════════════════
                    IMPORTANT NOTES
═══════════════════════════════════════════════════════════
- This is entertainment/self-help content only
- Avoid medical, legal, or financial claims
- Be encouraging but realistic
- Respect the user's agency and free will
- Ground mystical concepts in practical wisdom

⚠️ FINAL REMINDER: YOUR ENTIRE RESPONSE MUST BE IN {locale.upper()} LANGUAGE ⚠️
Do NOT mix languages. Do NOT write in English unless locale is 'en'.
"""

        print("[FusionGenerate] Step1: Together Llama 3.3 70B generation...")

        # Use Together Llama 3.3 70B (stable production setup)
        llama_report = _generate_with_together(comprehensive_prompt.strip(), MAX_OUTPUT_TOKENS, 0.15)
        llama_report = re.sub(r"\n{3,}", "\n\n", llama_report)

        # Step 2: Optional GPT polishing (skip in fast_mode for ~15-20s speedup)
        if fast_mode:
            print("[FusionGenerate] FAST_MODE: Skipping GPT polish step")
            refined_report = llama_report
        else:
            print("[FusionGenerate] Step2: GPT-mini polishing")
            refined_report = refine_with_gpt5mini(llama_report, theme, locale)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": refined_report,
            "graph_context": graph_context,
            "realtime_transits": realtime_transit_text if realtime_transit_text else None,
            "fast_mode": fast_mode,
        }

    except Exception as e:
        print(f"[FusionGenerate] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
            "fusion_layer": "",
            "graph_context": "",
        }
