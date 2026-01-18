"""
Theme-specific section generation for destiny-map.
Generates detailed sections for 9 different themes.
"""
from typing import Dict, Any, List
from datetime import datetime

from ..data import DAY_MASTER_PROFILES, SIBSIN_MEANINGS, ZODIAC_PROFILES
from ..builders import normalize_day_master, get_sibsin_value

def get_theme_sections(theme: str, saju: Dict, astro: Dict, locale: str = "ko") -> List[Dict[str, Any]]:
    """Generate theme-specific sections for 9 themes - 구체적이고 재미있는 내용!
    Supports locale: 'ko' (Korean), 'en' (English)
    """
    is_en = locale == "en"
    day_master, day_el = normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    mc = astro.get("mc", {})
    asc = astro.get("ascendant", {})
    sun_s, moon_s = sun.get("sign", ""), moon.get("sign", "")
    venus_s, mars_s = venus.get("sign", ""), mars.get("sign", "")
    sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"사수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
    el_ko = {"목":"목(木)","화":"화(火)","토":"토(土)","금":"금(金)","수":"수(水)"}
    now = datetime.now()
    dow = ["월","화","수","목","금","토","일"][now.weekday()]
    unse = saju.get("unse", {})
    daeun = unse.get("daeun", [])
    annual = unse.get("annual", [])

    # 일간 프로필 가져오기
    dm_profile = DAY_MASTER_PROFILES.get(day_master, {})
    zodiac_sun = ZODIAC_PROFILES.get(sun_s, {})
    zodiac_venus = ZODIAC_PROFILES.get(venus_s, {})
    zodiac_moon = ZODIAC_PROFILES.get(moon_s, {})

    # DEBUG logging removed to avoid Windows encoding errors

    # Calculate user age from birthDate in facts
    # birthDate can be in saju.facts.birthDate OR saju.birthDate (direct)
    user_age = 30  # default
    birth_year = None
    facts = saju.get("facts", {})
    birth_date = facts.get("birthDate") or saju.get("birthDate") or ""

    # Also try to infer from first daeun entry if birthDate is missing
    if not birth_date and daeun:
        # First daeun age helps us calculate birth year
        first_daeun_age = daeun[0].get("age", 0)
        # First daeun typically starts at age 1-10
        # We can estimate birth year if we know current age from annual data
        if annual:
            first_annual_year = annual[0].get("year", now.year)
            # Rough estimate: current year is first annual year
            # So user is approximately (first_annual_year - birth_year) years old
            # But we don't know birth year... try estimating from daeun list
            pass

    if birth_date and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
            user_age = now.year - birth_year
        except (ValueError, TypeError):
            pass
    else:
        # Fallback: try to infer user_age from daeun ages
        # If we have daeun data, find the most likely current daeun
        # based on reasonable age assumptions (20-60)
        if daeun and len(daeun) >= 3:
            # Pick middle-range daeun as likely current
            mid_idx = min(3, len(daeun) - 1)  # age 33 typically
            estimated_age = daeun[mid_idx].get("age", 30) + 2  # +2 years into the daeun
            user_age = estimated_age

    # Find current daeun by age (each daeun covers 10 years from its start age)
    cur_daeun = {}
    next_daeun = {}
    for i, d in enumerate(daeun):
        d_age = d.get("age", 0)
        if d_age <= user_age < d_age + 10:
            cur_daeun = d
            if i + 1 < len(daeun):
                next_daeun = daeun[i + 1]
            break

    # 현재/내년 세운 가져오기
    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    next_annual = next((a for a in annual if a.get("year") == now.year + 1), {})

    # 현재 대운 십신 (문자열 또는 객체 형태 모두 지원)
    cur_daeun_sibsin = cur_daeun.get("sibsin", {})
    if isinstance(cur_daeun_sibsin, str):
        # 문자열이면 십신 이름 직접 사용
        cur_cheon = cur_daeun_sibsin
        cur_ji = ""
    else:
        cur_cheon = cur_daeun_sibsin.get("cheon", "") if cur_daeun_sibsin else ""
        cur_ji = cur_daeun_sibsin.get("ji", "") if cur_daeun_sibsin else ""
    sibsin_info = SIBSIN_MEANINGS.get(cur_cheon, {})

    # 세운 십신 (문자열 또는 객체 형태 모두 지원)
    annual_sibsin = cur_annual.get("sibsin", {})
    if isinstance(annual_sibsin, str):
        annual_cheon = annual_sibsin
    else:
        annual_cheon = annual_sibsin.get("cheon", "") if annual_sibsin else ""
    annual_sibsin_info = SIBSIN_MEANINGS.get(annual_cheon, {})

    if theme == "fortune_today":
        # 일진 가져오기
        iljin = unse.get("iljin", [])
        today_iljin = next((i for i in iljin if i.get("day") == now.day and i.get("month") == now.month), {})
        iljin_sibsin = today_iljin.get("sibsin", {})
        if isinstance(iljin_sibsin, str):
            iljin_cheon = iljin_sibsin
        else:
            iljin_cheon = iljin_sibsin.get("cheon", "") if iljin_sibsin else ""
        is_gwiin = today_iljin.get("isCheoneulGwiin", False)

        daily_tip = SIBSIN_MEANINGS.get(iljin_cheon, {}).get("timing", "평온한 하루")
        gwiin_msg = "🌟 천을귀인일! 귀인의 도움이 있는 날" if is_gwiin else ""

        # 구체적인 일진 해석
        iljin_ganji = f"{today_iljin.get('heavenlyStem','')}{today_iljin.get('earthlyBranch','')}"
        iljin_detail = SIBSIN_MEANINGS.get(iljin_cheon, {})

        # 오늘의 구체적 행동 가이드
        today_career = iljin_detail.get("career", "업무에 집중하기 좋은 날")
        today_love = iljin_detail.get("love", "소통이 중요한 날")
        today_wealth = iljin_detail.get("wealth", "지출 관리에 신경 쓰세요")

        # 월운 기반 이번 달 흐름
        monthly = unse.get("monthly", [])
        cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
        month_cheon = get_sibsin_value(cur_month.get("sibsin"), "cheon", "")

        # 점성학 달 에너지 (문페이즈 간단 추정)
        moon_day = now.day
        moon_phase = "초승달" if moon_day < 8 else "상현달" if moon_day < 15 else "보름달" if moon_day < 22 else "하현달"
        moon_energy = {
            "초승달": "새로운 시작, 계획 수립",
            "상현달": "적극 실행, 추진력 발휘",
            "보름달": "결실, 완성, 인간관계 활발",
            "하현달": "정리, 휴식, 성찰"
        }

        return [
            {"id":"summary","icon":"☀️","title":"오늘 한줄요약","titleEn":"Summary","content":f"{dow}요일, {iljin_ganji}일 - {iljin_cheon} 에너지가 흐르는 날.\n{gwiin_msg}\n**이번 달 흐름**: {month_cheon}의 달 중 {now.day}일째"},
            {"id":"energy","icon":"⚡","title":"오늘의 에너지","titleEn":"Energy","content":f"**사주**: {daily_tip}\n**점성**: {moon_phase} ({moon_energy.get(moon_phase, '')})\n두 시스템 모두 {'활동적인' if iljin_cheon in ['비견','겁재','식신'] else '신중한'} 에너지를 말하고 있어요!"},
            {"id":"timing","icon":"⏰","title":"좋은 시간대","titleEn":"Best Times","content":f"**오전 9-11시**: {iljin_detail.get('career', '중요 업무 처리')}\n**오후 2-4시**: {iljin_detail.get('love', '소통과 미팅')}\n**저녁 7-9시**: 자기계발, {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '관심사'} 관련 활동"},
            {"id":"action","icon":"🎯","title":"오늘 행동 가이드","titleEn":"Action","content":f"**커리어**: {today_career}\n**연애/관계**: {today_love}\n**재물**: {today_wealth}\n\n당신의 강점({dm_profile.get('strengths','').split(',')[0] if dm_profile.get('strengths') else '강점'})을 오늘 특히 발휘하세요!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 오늘은 {iljin_cheon} 에너지 - {iljin_detail.get('meaning', '특별한 날')}\n**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)}, 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_sun.get('trait','') if zodiac_sun else '당신의 본성'}\n**종합**: 일간 {day_master}({dm_profile.get('element','')})과 오늘 에너지가 {'조화로워요' if iljin_cheon in ['식신','정재','정인'] else '긴장감이 있어요'}"},
            {"id":"reminder","icon":"💫","title":"오늘의 리마인더","titleEn":"Reminder","content":f"⚠️ {dm_profile.get('weaknesses', '과욕').split(',')[0] if dm_profile.get('weaknesses') else '주의점'} 조심!\n✅ {iljin_detail.get('timing', '오늘의 흐름을 타세요')}\n💪 긍정 에너지로 하루를 시작하면 좋은 결과가 따라와요!"}]

    elif theme == "fortune_monthly":
        # 월운 가져오기
        monthly = unse.get("monthly", [])
        cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
        month_cheon = get_sibsin_value(cur_month.get("sibsin"), "cheon", "")
        month_info = SIBSIN_MEANINGS.get(month_cheon, {})

        # 다음 달 미리보기
        next_month_data = next((m for m in monthly if m.get("month") == now.month + 1 and m.get("year") == now.year), {})
        next_month_cheon = get_sibsin_value(next_month_data.get("sibsin"), "cheon", "")

        # 이번 달 간지
        month_ganji = f"{cur_month.get('heavenlyStem','')}{cur_month.get('earthlyBranch','')}"

        # 세운 에너지와 월운 에너지 비교
        year_energy = annual_sibsin_info.get("meaning", "")
        month_energy = month_info.get("meaning", "")

        # 점성학: 태양 별자리 (현재 달 기준)
        sun_trait = zodiac_sun.get("trait", "") if zodiac_sun else ""

        # 구체적인 주간 가이드 (십신 기반)
        week_guide = {
            "식신": {"week1": "새 아이디어 떠올리기", "week2": "창작/기획 본격화", "week3": "협업 진행", "week4": "결과물 완성"},
            "상관": {"week1": "변화 계획 세우기", "week2": "과감한 시도", "week3": "수정 보완", "week4": "새로운 방향 정리"},
            "편재": {"week1": "기회 포착", "week2": "투자 검토", "week3": "수익 실현", "week4": "재정 점검"},
            "정재": {"week1": "예산 수립", "week2": "안정적 수입 관리", "week3": "저축 실행", "week4": "재무 점검"},
            "편관": {"week1": "도전 준비", "week2": "적극 추진", "week3": "난관 극복", "week4": "성과 확인"},
            "정관": {"week1": "계획 정리", "week2": "체계적 실행", "week3": "인정받기", "week4": "책임 완수"},
            "편인": {"week1": "학습 시작", "week2": "정보 수집", "week3": "응용 연습", "week4": "실전 적용"},
            "정인": {"week1": "멘토 만남", "week2": "조언 수용", "week3": "성장 체감", "week4": "감사 표현"},
            "비견": {"week1": "동료 파악", "week2": "협업 시작", "week3": "경쟁/협력", "week4": "성과 나누기"},
            "겁재": {"week1": "목표 설정", "week2": "과감한 도전", "week3": "리스크 관리", "week4": "결과 수용"}
        }
        weeks = week_guide.get(month_cheon, {"week1": "계획 수립", "week2": "적극 실행", "week3": "조율/수정", "week4": "마무리/정리"})

        return [
            {"id":"theme","icon":"🗓️","title":"월간 한줄테마","titleEn":"Theme","content":f"{now.month}월({month_ganji}월)은 **{month_cheon}** 에너지의 달!\n\n💫 {month_info.get('meaning', '변화와 성장의 기회')}\n📊 **세운 흐름**: {annual_cheon}의 해 중 {month_cheon}의 달 - {'에너지가 일치해요!' if annual_cheon == month_cheon else '다른 에너지가 교차해요'}"},
            {"id":"career","icon":"💼","title":"이달 커리어","titleEn":"Career","content":f"**전망**: {month_info.get('career', '꾸준한 노력이 빛나는 시기')}\n**행동**: {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '본업'} 관련 전문성 강화\n**주의**: {dm_profile.get('weaknesses','').split(',')[0] if dm_profile.get('weaknesses') else '과욕'} 조심"},
            {"id":"love","icon":"💖","title":"이달 연애","titleEn":"Love","content":f"**분위기**: {month_info.get('love', '진심 어린 소통이 관계를 깊게 합니다')}\n**스타일**: 금성 {sign_ko.get(venus_s,venus_s)} - {zodiac_venus.get('love','') if zodiac_venus else '당신만의 사랑법'}\n**타이밍**: {dm_profile.get('love_timing','좋은 인연을 기다리는 중').split('.')[0] if dm_profile.get('love_timing') else '인연의 시기'}"},
            {"id":"wealth","icon":"💰","title":"이달 재물","titleEn":"Wealth","content":f"**재물운**: {month_info.get('wealth', '계획적인 지출과 저축 추천')}\n**수입 스타일**: {dm_profile.get('wealth_style','안정 추구').split('.')[0] if dm_profile.get('wealth_style') else '재물 관리'}\n**조언**: {'적극 투자 검토' if month_cheon in ['편재','편관'] else '안정적 저축 우선'}"},
            {"id":"weeks","icon":"📅","title":"주간 가이드","titleEn":"Weeks","content":f"**1주차**: {weeks['week1']}\n**2주차**: {weeks['week2']}\n**3주차**: {weeks['week3']}\n**4주차**: {weeks['week4']}\n\n💡 이번 달은 특히 {weeks['week2']} 시기가 중요해요!"},
            {"id":"nextmonth","icon":"🔮","title":"다음 달 미리보기","titleEn":"Next Month","content":f"**{now.month+1}월**: {next_month_cheon} 에너지\n{SIBSIN_MEANINGS.get(next_month_cheon, {}).get('meaning', '새로운 기회')}\n\n미리 준비하면 더 좋은 결과를 만들 수 있어요!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 이달은 {month_cheon} 에너지 - {month_energy}\n**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)} - {sun_trait}\n**종합**: 일간 {day_master}({dm_profile.get('element','')})에게 이번 달은 {'순조로운' if month_cheon in ['식신','정재','정인'] else '도전적인'} 시기. {'적극 추진!' if month_cheon in ['비견','겁재','편재'] else '신중하게 진행!'}"},
            {"id":"reminder","icon":"💫","title":"이달의 리마인더","titleEn":"Reminder","content":f"✅ {month_info.get('timing', '이번 달의 흐름을 타세요')}\n⚠️ {dm_profile.get('weaknesses','주의사항').split(',')[0] if dm_profile.get('weaknesses') else '균형'} 유지 필요\n💪 {now.month}월을 {month_cheon} 에너지로 잘 마무리하세요!"}]

    elif theme == "fortune_new_year" or theme == "fortune_next_year":
        monthly = unse.get("monthly", [])
        target_year = now.year if theme == "fortune_new_year" else now.year + 1
        target_annual = cur_annual if theme == "fortune_new_year" else next_annual
        target_cheon = get_sibsin_value(target_annual.get("sibsin"), "cheon", "")
        target_info = SIBSIN_MEANINGS.get(target_cheon, {})
        ganji = f"{target_annual.get('heavenlyStem','')}{target_annual.get('earthlyBranch','')}"

        # 대운 확인 - 올해가 대운 전환기인지
        is_daeun_change = False
        daeun_change_msg = ""
        for d in daeun:
            if d.get("age") == user_age:
                is_daeun_change = True
                new_daeun_sibsin = get_sibsin_value(d.get("sibsin"), "cheon", "")
                daeun_change_msg = f"🔥 **중요**: 올해는 대운 전환기! {new_daeun_sibsin} 에너지 시작 - 인생의 새로운 10년이 열려요."
                break

        # 구체적인 분기별 흐름 (십신 기반)
        quarter_guide = {
            "식신": {"q1": "창의적 아이디어 발굴", "q2": "프로젝트 본격화", "q3": "결과물 완성", "q4": "성과 공유 및 수입화"},
            "상관": {"q1": "변화 계획 수립", "q2": "과감한 도전", "q3": "방향 수정", "q4": "새로운 길 확립"},
            "편재": {"q1": "기회 탐색", "q2": "투자 결정", "q3": "수익 실현", "q4": "재투자 계획"},
            "정재": {"q1": "연간 재정 계획", "q2": "안정적 수입 확보", "q3": "저축 강화", "q4": "자산 점검"},
            "편관": {"q1": "목표 설정", "q2": "적극 도전", "q3": "난관 극복", "q4": "성과 확인"},
            "정관": {"q1": "체계적 준비", "q2": "조직 내 인정", "q3": "책임 완수", "q4": "승진/보상"},
            "편인": {"q1": "학습 계획", "q2": "전문 지식 습득", "q3": "실전 적용", "q4": "자격/경력 확보"},
            "정인": {"q1": "멘토 찾기", "q2": "도움 받기", "q3": "성장 체감", "q4": "독립 준비"},
            "비견": {"q1": "네트워크 구축", "q2": "협업 시작", "q3": "경쟁/협력", "q4": "성과 공유"},
            "겁재": {"q1": "과감한 목표", "q2": "전력 투구", "q3": "리스크 관리", "q4": "결과 수용"}
        }
        quarters = quarter_guide.get(target_cheon, {"q1": "준비/계획", "q2": "본격 추진", "q3": "조율/보완", "q4": "결실/마무리"})

        # 올해 주요 월 찾기 (같은 십신 에너지가 겹치는 달)
        key_months = []
        for m in monthly[:12]:
            if m.get("year") == target_year:
                m_sibsin = get_sibsin_value(m.get("sibsin"), "cheon", "")
                if m_sibsin == target_cheon:
                    key_months.append(f"{m.get('month')}월")
        key_months_str = ", ".join(key_months[:3]) if key_months else "연중 고르게"

        nl = "\n"
        daeun_status = "10년 주기가 바뀌는 전환점!" if is_daeun_change else f'대운 {user_age - cur_daeun.get("age", user_age) + 1}년째 - 안정기'
        reminder_status = "대운 전환기 - 새로운 10년을 준비하세요!" if is_daeun_change else "꾸준함이 성공의 열쇠!"

        return [
            {"id":"theme","icon":"🎊","title":"연간 한줄테마","titleEn":"Theme","content":f"{target_year}년 {ganji}년!{nl}**{target_cheon}** 에너지의 해{nl}{nl}💫 {target_info.get('meaning', '새로운 기회의 해')}{nl}{daeun_change_msg if is_daeun_change else ''}"},
            {"id":"daeun","icon":"📅","title":"대운 흐름","titleEn":"Daeun","content":f"**현재 대운**: {cur_cheon} ({cur_daeun.get('age',user_age)}~{cur_daeun.get('age',user_age)+9}세){nl}**의미**: {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '현재의 에너지')}{nl}{nl}{daeun_status}"},
            {"id":"career","icon":"💼","title":"올해 커리어","titleEn":"Career","content":f"**전망**: {target_info.get('career', '꾸준한 성장이 기대되는 해')}{nl}**적합 분야**: {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '본업'}{nl}**행동**: {'적극 추진' if target_cheon in ['비견','겁재','편관'] else '꾸준히 쌓기'}{nl}**주요 시기**: {key_months_str}"},
            {"id":"love","icon":"💖","title":"올해 연애","titleEn":"Love","content":f"**분위기**: {target_info.get('love', '인연의 변화가 있는 해')}{nl}**당신의 매력**: {dm_profile.get('love_style','진심 어린 사랑').split('.')[0] if dm_profile.get('love_style') else '사랑법'}{nl}**연애 시기**: {dm_profile.get('love_timing','좋은 인연').split('.')[0] if dm_profile.get('love_timing') else '인연의 때'}{nl}**주요 월**: {key_months_str} 특히 주목!"},
            {"id":"wealth","icon":"💰","title":"올해 재물","titleEn":"Wealth","content":f"**재물운**: {target_info.get('wealth', '재정 관리가 중요한 해')}{nl}**재물 스타일**: {dm_profile.get('wealth_style','').split('.')[0] if dm_profile.get('wealth_style') else '안정 추구'}{nl}**전략**: {'공격적 투자 검토' if target_cheon in ['편재','겁재'] else '안정적 축적 우선'}{nl}**주의**: {'과욕 경계' if target_cheon in ['편재','겁재'] else '기회 놓치지 않기'}"},
            {"id":"quarters","icon":"📊","title":"분기별 흐름","titleEn":"Quarters","content":f"**1분기(1-3월)**: {quarters['q1']}{nl}**2분기(4-6월)**: {quarters['q2']}{nl}**3분기(7-9월)**: {quarters['q3']}{nl}**4분기(10-12월)**: {quarters['q4']}{nl}{nl}💡 특히 2분기({quarters['q2']})가 핵심!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: {ganji}년 {target_cheon} 에너지가 일간 {day_master}({dm_profile.get('element','')})와 만남{nl}**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)} - {zodiac_sun.get('trait','') if zodiac_sun else '본성'}{nl}**종합**: {'에너지가 조화로워 순조로운 해!' if target_cheon in ['식신','정재','정인'] else '도전적이지만 성장하는 해!'}"},
            {"id":"reminder","icon":"💫","title":"연간 리마인더","titleEn":"Reminder","content":f"✅ {target_info.get('timing', '올해의 흐름을 타고 성장하세요')}{nl}⚠️ {dm_profile.get('weaknesses','').split(',')[0] if dm_profile.get('weaknesses') else '약점'} 보완 필요{nl}🎯 {target_year}년은 {target_cheon} 에너지를 활용하는 해!{nl}💪 {reminder_status}"}]

    elif theme == "focus_career":
        mc_s = mc.get("sign","")
        mc_careers = {
            "Aries": "리더십, 스포츠, 군/경찰, 스타트업",
            "Taurus": "금융, 부동산, 예술, 요식업",
            "Gemini": "미디어, 마케팅, 교육, IT",
            "Cancer": "의료, 복지, 요식업, 상담",
            "Leo": "엔터테인먼트, 경영, 패션, 정치",
            "Virgo": "의료, IT, 편집, 품질관리",
            "Libra": "법률, 외교, 디자인, 예술",
            "Scorpio": "심리학, 수사, 금융, 연구",
            "Sagittarius": "교육, 여행, 출판, 무역",
            "Capricorn": "경영, 정치, 건축, 관리직",
            "Aquarius": "IT, 과학, 사회운동, 방송",
            "Pisces": "예술, 의료, 영성, 사회복지"
        }
        career_timing = sibsin_info.get("career", "현재 운에서 커리어 기회 모색")

        # 대운 시기별 커리어 전망
        career_daeun = []
        for d in daeun[:5]:
            d_age = d.get("age", 0)
            d_sibsin = get_sibsin_value(d.get("sibsin"), "cheon", "")
            if d_sibsin in ["정관", "편관"]:
                career_daeun.append(f"{d_age}~{d_age+9}세: 승진/인정받는 시기")
            elif d_sibsin in ["정재", "편재"]:
                career_daeun.append(f"{d_age}~{d_age+9}세: 수입 증가 시기")

        return [
            {"id":"summary","icon":"💼","title":"커리어 적성","titleEn":"Aptitude","content":f"**당신의 적성**: {dm_profile.get('career_fit', '다양한 분야 적성')}\n**별자리로 보면**: {mc_careers.get(mc_s, '전문 분야')} 적성"},
            {"id":"current","icon":"📍","title":"현재 커리어운","titleEn":"Current","content":f"**지금 시기**: {career_timing}"},
            {"id":"timing","icon":"⏰","title":"주요 시기","titleEn":"Timing","content":"\n".join(career_daeun[:3]) if career_daeun else "꾸준한 노력이 쌓이는 시기"},
            {"id":"strength","icon":"💪","title":"강점 활용","titleEn":"Strength","content":f"{dm_profile.get('strengths', '당신만의 강점')}을 살린 커리어 전략!\n{zodiac_sun.get('trait', '')} 에너지 활용"},
            {"id":"action","icon":"🎯","title":"액션 플랜","titleEn":"Action","content":f"**단기**: 현재 역량 강화\n**중기**: 전문성 확보, 네트워크 확장\n**장기**: {mc_careers.get(mc_s, '목표 분야')} 전문가"},
            {"id":"cross","icon":"✨","title":"동서양 종합","titleEn":"Cross","content":f"**동양**: 당신의 {dm_profile.get('element','성향')} 특성\n**서양**: {sign_ko.get(mc_s,'')} 직업 성향"},
            {"id":"caution","icon":"⚠️","title":"주의점","titleEn":"Caution","content":f"{dm_profile.get('weaknesses', '단점')} 경계!\n완급 조절과 협업 능력도 중요"}]

    elif theme == "focus_love":
        v_s = venus.get("sign","")

        # 연애 시기 찾기
        love_years = []
        for a in annual[:5]:
            a_sibsin = get_sibsin_value(a.get("sibsin"), "cheon", "")
            if a_sibsin in ["정관", "정재"]:
                love_years.append(f"{a.get('year')}년: 결혼/진지한 인연 가능")
            elif a_sibsin in ["편관", "편재"]:
                love_years.append(f"{a.get('year')}년: 새로운 만남 많음")

        # 궁합 좋은 일간
        good_match = {
            "甲": "己(기토) - 갑기합! 서로를 완성시키는 인연",
            "乙": "庚(경금) - 을경합! 강렬한 끌림",
            "丙": "辛(신금) - 병신합! 열정적 만남",
            "丁": "壬(임수) - 정임합! 깊은 교감",
            "戊": "癸(계수) - 무계합! 안정적 인연",
            "己": "甲(갑목) - 기갑합! 성장하는 관계",
            "庚": "乙(을목) - 경을합! 서로 보완",
            "辛": "丙(병화) - 신병합! 빛나는 만남",
            "壬": "丁(정화) - 임정합! 지적 교감",
            "癸": "戊(무토) - 계무합! 든든한 인연",
        }

        return [
            {"id":"summary","icon":"💖","title":"연애 스타일","titleEn":"Style","content":f"**당신의 사랑법**: {dm_profile.get('love_style', '진심 어린 사랑')}\n**별자리로 보면**: {zodiac_venus.get('love', '독특한 사랑 방식')}"},
            {"id":"ideal","icon":"👫","title":"이상형 & 궁합","titleEn":"Ideal","content":f"**이상형**: {dm_profile.get('ideal_partner', '마음이 통하는 사람')}\n**천생연분**: {good_match.get(day_master, '서로 성장하는 인연')}"},
            {"id":"timing","icon":"⏰","title":"연애 시기","titleEn":"Timing","content":f"{dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n" + "\n".join(love_years[:3]) if love_years else dm_profile.get('love_timing', '좋은 인연의 시기')},
            {"id":"current","icon":"📍","title":"현재 연애운","titleEn":"Current","content":f"**지금 시기**: {sibsin_info.get('love', '연애에 변화가 있는 시기')}\n**올해**: {annual_sibsin_info.get('love', '새로운 인연을 기대해도 좋아요')}"},
            {"id":"comm","icon":"💬","title":"소통 스타일","titleEn":"Communication","content":f"**감정 표현**: {zodiac_moon.get('love', '감성적 교감')}\n감정 표현과 공감이 관계의 열쇠!"},
            {"id":"cross","icon":"✨","title":"동서양 종합","titleEn":"Cross","content":f"**동양**: 당신의 연애 성향 분석\n**서양**: {sign_ko.get(v_s,'')} 금성이 말하는 사랑법"},
            {"id":"advice","icon":"💝","title":"연애 조언","titleEn":"Advice","content":f"✅ {dm_profile.get('strengths', '강점').split(',')[0]} 어필하기\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0]} 주의\n💕 상대의 입장에서 생각하기"}]

    elif theme == "focus_family":
        # 가족 관계 분석
        family_style = {
            "목": "성장을 돕는 부모/자녀. 교육에 관심 많고 독립심 키워줌.",
            "화": "활기찬 가정. 함께 활동하는 시간이 중요. 때로 다툼도.",
            "토": "안정적인 가정. 전통을 중시하고 가족 모임 챙김.",
            "금": "원칙 있는 가정. 규율이 있지만 정이 깊음.",
            "수": "유연한 가정. 대화가 많고 서로 존중하는 분위기.",
        }

        # 사주 pillars로 가족 관계 분석
        pillars = saju.get("pillars", {})
        year_pillar = pillars.get("year", {})
        month_pillar = pillars.get("month", {})
        time_pillar = pillars.get("time", {})

        # 년주 (Year Pillar) - 조상/부모/사회적 환경
        year_stem = year_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(year_pillar, dict) else ""
        year_analysis = "조상/부모로부터 물려받은 기질이 강합니다" if year_stem else "가문의 영향을 받는 성향"

        # 월주 (Month Pillar) - 부모/형제/직업적 기반
        month_stem = month_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(month_pillar, dict) else ""
        month_sibsin = month_pillar.get("sibsin", {}) if isinstance(month_pillar, dict) else {}
        month_sibsin_cheon = get_sibsin_value(month_sibsin, "cheon", "")

        parent_relation = {
            "정인": "부모에게 많은 도움을 받는 관계. 교육과 지원이 풍부.",
            "편인": "독특한 방식의 양육. 자유로운 분위기.",
            "정관": "엄격하지만 체계적인 가정. 규율과 책임감.",
            "편관": "도전적인 환경. 강하게 성장.",
            "정재": "안정적인 가정. 경제적 여유.",
            "편재": "활동적인 가정. 다양한 경험.",
            "식신": "창의적 분위기. 표현의 자유.",
            "상관": "자유로운 환경. 독립심 강조.",
            "비견": "형제자매와 경쟁/협력. 동등한 관계.",
            "겁재": "강한 경쟁 환경. 독립적 성장."
        }
        parent_msg = parent_relation.get(month_sibsin_cheon, "부모와의 관계가 당신의 성장에 영향을 줍니다")

        # 시주 (Time Pillar) - 자녀/말년/창조적 결실
        time_stem = time_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(time_pillar, dict) else ""
        time_sibsin = time_pillar.get("sibsin", {}) if isinstance(time_pillar, dict) else {}
        time_sibsin_cheon = get_sibsin_value(time_sibsin, "cheon", "")

        children_relation = {
            "식신": "자녀와 창의적 교감. 재능 개발 지원.",
            "상관": "자녀에게 자유 존중. 독립적 양육.",
            "편재": "자녀에게 다양한 경험 제공.",
            "정재": "자녀에게 안정적 환경 제공.",
            "편관": "자녀에게 도전 격려. 강하게 키움.",
            "정관": "자녀에게 규율과 책임감 교육.",
            "편인": "자녀에게 독특한 교육 방식.",
            "정인": "자녀에게 전통적 교육. 학업 강조.",
            "비견": "자녀와 친구 같은 관계.",
            "겁재": "자녀의 독립성 강조."
        }
        children_msg = children_relation.get(time_sibsin_cheon, "자녀와의 관계에서 당신의 특성이 나타납니다")

        # 점성학 4하우스 (가정/뿌리)
        houses = astro.get("houses", [])
        house4_sign = houses[3].get("sign", "") if len(houses) > 3 else ""
        house4_analysis = {
            "Aries": "활동적이고 독립적인 가정 환경 선호",
            "Taurus": "안정적이고 편안한 가정 중시",
            "Gemini": "소통 많은 가정, 지적 교류",
            "Cancer": "전통적 가정, 깊은 유대감",
            "Leo": "따뜻하고 관대한 가정 분위기",
            "Virgo": "실용적이고 체계적인 가정",
            "Libra": "조화롭고 균형 잡힌 가정",
            "Scorpio": "깊은 정서적 유대, 비밀스러운 가정",
            "Sagittarius": "자유롭고 개방적인 가정",
            "Capricorn": "전통과 책임 중시하는 가정",
            "Aquarius": "독특하고 진보적인 가정",
            "Pisces": "감성적이고 직관적인 가정"
        }

        return [
            {"id":"summary","icon":"👪","title":"가족 관계 성향","titleEn":"Style","content":f"**당신의 가정**: {family_style.get(day_el, '조화로운 가정')}\n**감정 스타일**: 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_moon.get('trait', '감정의 뿌리')}\n**가정 환경**: 4하우스 {sign_ko.get(house4_sign,house4_sign)} - {house4_analysis.get(house4_sign, '특별한 가정 분위기')}"},
            {"id":"pillars","icon":"🏛️","title":"사주 가족 구조","titleEn":"Pillars","content":f"**년주(조상/부모)**: {year_stem} - {year_analysis}\n**월주(부모 관계)**: {month_stem} {month_sibsin_cheon} - {parent_msg}\n**시주(자녀)**: {time_stem} {time_sibsin_cheon} - {children_msg}"},
            {"id":"role","icon":"🏠","title":"가정에서의 역할","titleEn":"Role","content":f"**성격**: {dm_profile.get('personality', '').split('.')[0] if dm_profile.get('personality') else '당신의 본성'}. 가정에서도 이 성향이 나타나요.\n**강점**: {dm_profile.get('strengths', '강점')}이 가족에게 힘이 됩니다.\n**역할**: 일간 {day_master} - {dm_profile.get('name','')} 특성이 가족 관계의 핵심"},
            {"id":"parent","icon":"👨‍👩‍👧","title":"부모/자녀 관계","titleEn":"Parent","content":f"**부모로서**: {children_msg.split('.')[0]}\n**자녀로서**: {parent_msg.split('.')[0]}\n**주의**: {dm_profile.get('weaknesses', '').split(',')[0] if dm_profile.get('weaknesses') else '균형'} 때문에 갈등 가능"},
            {"id":"comm","icon":"💬","title":"소통 포인트","titleEn":"Communication","content":f"✅ 경청하고 공감 표현하기\n✅ 서로의 입장 이해하기\n✅ 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_moon.get('love','감성적 소통') if zodiac_moon else '마음의 교류'}\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0] if dm_profile.get('weaknesses') else '감정 조절'} 자제"},
            {"id":"timing","icon":"⏰","title":"가정 관련 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '가정에 집중하기 좋은 때')}\n**올해**: {annual_cheon} - {annual_sibsin_info.get('meaning', '가족과의 시간')}\n**특징**: {'가족 관계가 중요한 시기' if cur_cheon in ['정인','식신'] else '독립과 가족의 균형'}"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 월주 {month_sibsin_cheon} - {parent_msg.split('.')[0]}\n**점성 분석**: 달 {sign_ko.get(moon_s,moon_s)} + 4하우스 {sign_ko.get(house4_sign,house4_sign)}\n**종합**: 일간 {day_master}의 {dm_profile.get('element','')} 성향이 가족 관계에 {'조화롭게' if day_el in ['토','수'] else '활기차게'} 작용"},
            {"id":"advice","icon":"💝","title":"가족 관계 조언","titleEn":"Advice","content":f"✅ 함께하는 시간을 소중히!\n✅ 작은 관심과 표현이 관계를 깊게 합니다\n✅ {month_sibsin_cheon} 에너지 - {parent_msg.split('.')[0]}\n💕 {children_msg.split('.')[0]}"}]

    elif theme == "focus_health":
        m_s = mars.get("sign","")

        # 오행별 건강 루틴
        health_routine = {
            "목": {"exercise": "스트레칭, 요가, 산책", "food": "녹색 채소, 신맛 나는 음식", "caution": "스트레스, 분노 조절"},
            "화": {"exercise": "유산소, 수영, 심호흡", "food": "쓴맛, 수분 섭취", "caution": "과로, 흥분 자제"},
            "토": {"exercise": "걷기, 등산, 규칙적 운동", "food": "규칙적 식사, 단맛 적당히", "caution": "과식, 불규칙한 식사"},
            "금": {"exercise": "호흡 운동, 명상, 등산", "food": "매운맛 적당히, 백색 음식", "caution": "건조함, 피부 관리"},
            "수": {"exercise": "수영, 요가, 충분한 수면", "food": "검은 음식, 짠맛 적당히", "caution": "냉증, 과로 피하기"},
        }
        hr = health_routine.get(day_el, {"exercise": "균형 잡힌 운동", "food": "균형 식단", "caution": "무리하지 않기"})

        # 오행 균형으로 건강 분석
        five_elements = saju.get("fiveElements") or saju.get("facts", {}).get("fiveElements", {})
        weak_elements = [k for k, v in five_elements.items() if v == 0] if five_elements else []
        strong_elements = [k for k, v in five_elements.items() if v >= 3] if five_elements else []

        element_organs = {
            "wood": "간/담낭", "fire": "심장/소장", "earth": "위장/비장",
            "metal": "폐/대장", "water": "신장/방광",
            "목": "간/담낭", "화": "심장/소장", "토": "위장/비장",
            "금": "폐/대장", "수": "신장/방광"
        }
        weak_organs = ", ".join([element_organs.get(e, e) for e in weak_elements[:2]]) if weak_elements else "없음"
        strong_organs = ", ".join([element_organs.get(e, e) for e in strong_elements[:1]]) if strong_elements else day_el

        # 점성학 6하우스 (건강/일상)
        houses = astro.get("houses", [])
        house6_sign = houses[5].get("sign", "") if len(houses) > 5 else ""
        house6_health = {
            "Aries": "두통, 열성 질환 주의. 활동적 운동 필요.",
            "Taurus": "목/갑상선 관리. 규칙적 식사 중요.",
            "Gemini": "호흡기, 신경계 관리. 스트레스 해소.",
            "Cancer": "소화기 건강. 감정과 위장 연결.",
            "Leo": "심장, 등 관리. 과로 주의.",
            "Virgo": "소화기, 장 건강. 규칙적 생활.",
            "Libra": "신장, 허리 관리. 균형 유지.",
            "Scorpio": "생식기, 배설계. 정기 검진.",
            "Sagittarius": "간, 허벅지. 과음/과식 주의.",
            "Capricorn": "뼈, 관절, 피부 관리.",
            "Aquarius": "순환계, 발목. 규칙적 생활.",
            "Pisces": "발, 면역계. 충분한 휴식."
        }

        # Chiron (카이론) - 상처와 치유
        chiron_data = data.get("extraPoints", {}).get("chiron") if hasattr(data, 'get') else {}
        if not chiron_data and astro:
            # astro 내부에서 찾기
            extra = astro.get("extraPoints", {})
            chiron_data = extra.get("chiron", {}) if extra else {}

        chiron_sign = chiron_data.get("sign", "") if isinstance(chiron_data, dict) else ""
        chiron_meaning = {
            "Aries": "자신감 회복이 치유의 열쇠",
            "Taurus": "자기 가치 인정이 건강의 기반",
            "Gemini": "소통과 표현이 치유 방법",
            "Cancer": "감정 돌봄이 건강의 시작",
            "Leo": "자기 표현이 활력의 원천",
            "Virgo": "완벽주의 내려놓기가 치유",
            "Libra": "관계 균형이 건강 회복",
            "Scorpio": "깊은 감정 해소가 치유",
            "Sagittarius": "의미 찾기가 건강 회복",
            "Capricorn": "책임감 내려놓기가 휴식",
            "Aquarius": "고립 벗어나기가 치유",
            "Pisces": "경계 세우기가 건강 지킴"
        }
        chiron_msg = chiron_meaning.get(chiron_sign, "자기 돌봄이 건강의 기본")

        return [
            {"id":"summary","icon":"💊","title":"체질 & 건강 포인트","titleEn":"Constitution","content":f"**당신의 체질**: {dm_profile.get('health_focus', '전반적인 건강 관리')}\n**에너지 스타일**: 화성 {sign_ko.get(m_s,m_s)}\n**6하우스**: {sign_ko.get(house6_sign,house6_sign)} - {house6_health.get(house6_sign, '건강 관리 필요')}"},
            {"id":"organs","icon":"🫀","title":"주의 기관","titleEn":"Organs","content":f"**일간 체질**: {dm_profile.get('health_focus', '체질에 맞는 건강 관리')}\n**취약 오행**: {weak_organs} 관리 필요\n**강한 오행**: {strong_organs} 활력의 원천"},
            {"id":"chiron","icon":"💫","title":"카이론 - 치유 포인트","titleEn":"Chiron","content":f"**카이론 {sign_ko.get(chiron_sign,chiron_sign)}**: {chiron_msg}\n\n상처를 이해하고 받아들이면 그것이 오히려 치유의 힘이 됩니다. 당신만의 방식으로 회복하세요."},
            {"id":"routine","icon":"🏃","title":"추천 루틴","titleEn":"Routine","content":f"**운동**: {hr['exercise']}\n**음식**: {hr['food']}\n**주의**: {hr['caution']}\n\n{'취약 오행 ' + weak_organs + ' 보강 필요!' if weak_elements else '오행 균형 양호!'}"},
            {"id":"stress","icon":"🧘","title":"스트레스 관리","titleEn":"Stress","content":f"**스트레스 원인**: {dm_profile.get('weaknesses', '').split(',')[0] if dm_profile.get('weaknesses') else '과로'} 성향\n**해소법**: 명상, 취미 활동, {hr['exercise']}\n**정서 치유**: {chiron_msg}"},
            {"id":"timing","icon":"⏰","title":"건강 주의 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '건강 관리 필요')}\n**올해**: {annual_cheon} - {'활력 넘치는 해' if annual_cheon in ['비견','겁재','식신'] else '휴식 필요한 해'}\n과로 피하고 규칙적인 생활 유지!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 일간 {day_master} {day_el} 체질 - {dm_profile.get('health_focus','').split('.')[0] if dm_profile.get('health_focus') else '건강 관리'}\n**점성 분석**: 6하우스 {sign_ko.get(house6_sign,house6_sign)} + 카이론 {sign_ko.get(chiron_sign,chiron_sign)}\n**종합**: {'취약 부위 관리 필수' if weak_elements else '전반적 건강 양호'}, {chiron_msg}"},
            {"id":"reminder","icon":"💫","title":"건강 리마인더","titleEn":"Reminder","content":f"✅ 예방이 최선! 규칙적인 생활과 적당한 운동\n✅ 충분한 수면이 건강의 기본\n⚠️ {weak_organs} 정기 검진 권장\n💪 {chiron_msg}"}]

    else:  # focus_overall / life
        asc_s = asc.get("sign","")

        # 10년 주기 운세 (쉬운 말로)
        # 십신을 쉬운 말로 변환
        sibsin_easy = {
            "비견": "경쟁과 협력의 시기",
            "겁재": "도전과 추진의 시기",
            "식신": "창의력이 빛나는 시기",
            "상관": "자유와 변화의 시기",
            "편재": "재물 기회가 많은 시기",
            "정재": "안정적 수입의 시기",
            "편관": "도전과 성장의 시기",
            "정관": "인정받는 시기",
            "편인": "배움과 변화의 시기",
            "정인": "도움받는 시기",
        }
        daeun_forecast = []
        if daeun:
            for d in daeun[:6]:
                d_age = d.get("age", 0)
                d_sibsin = get_sibsin_value(d.get("sibsin"), "cheon", "")
                is_current = d_age <= user_age < d_age + 10
                marker = "👉 " if is_current else ""
                easy_meaning = sibsin_easy.get(d_sibsin, "변화의 시기")
                daeun_forecast.append(f"{marker}**{d_age}~{d_age+9}세**: {easy_meaning}")
        else:
            # 데이터가 없을 때 대략적인 전망
            el_life = {
                "목": ["20대: 성장과 도전", "30대: 확장과 발전", "40대: 결실의 시작", "50대: 안정과 지혜"],
                "화": ["20대: 열정의 시기", "30대: 성과와 인정", "40대: 성숙과 조율", "50대: 내면의 빛"],
                "토": ["20대: 기반 다지기", "30대: 꾸준한 성장", "40대: 안정의 절정", "50대: 지혜의 축적"],
                "금": ["20대: 재능 연마", "30대: 전문성 확립", "40대: 결실과 성과", "50대: 통찰의 시기"],
                "수": ["20대: 탐색과 학습", "30대: 지혜의 축적", "40대: 유연한 적응", "50대: 깊은 통찰"],
            }
            daeun_forecast = el_life.get(day_el, ["인생의 흐름이 자연스럽게 전개됩니다"])

        # 현재 10년 운세 (쉬운 말로)
        if cur_daeun:
            cur_easy = sibsin_easy.get(cur_cheon, "변화의 시기")
            current_daeun_text = f"**지금 10년 운세**: {cur_easy}\n{sibsin_info.get('meaning', '새로운 기회가 찾아오는 시기입니다.')}"
        else:
            el_now = {
                "목": "성장과 발전의 에너지가 흐르는 시기입니다. 새로운 도전에 적극적으로 나서세요.",
                "화": "열정과 표현의 에너지가 강한 시기입니다. 적극적인 활동이 좋은 결과를 가져옵니다.",
                "토": "안정과 축적의 에너지가 흐르는 시기입니다. 꾸준한 노력이 빛을 발합니다.",
                "금": "결단과 정리의 에너지가 흐르는 시기입니다. 중요한 결정을 내리기 좋습니다.",
                "수": "지혜와 유연함의 에너지가 흐르는 시기입니다. 직관을 믿고 흐름을 타세요.",
            }
            current_daeun_text = f"**현재 흐름**: {el_now.get(day_el, '변화의 시기를 지나고 있습니다.')}"

        # 올해 운세 (쉬운 말로)
        if cur_annual:
            annual_easy = sibsin_easy.get(annual_cheon, "변화")
            annual_text = f"**{now.year}년 운세**: {annual_easy}\n{annual_sibsin_info.get('timing', '좋은 흐름이 이어집니다.')}"
        else:
            annual_text = f"**{now.year}년**: 꾸준한 노력이 좋은 결과로 이어지는 해입니다."

        # 별자리 성향 텍스트 (쉬운 말로)
        if sun_s or moon_s or asc_s:
            astro_combo = f"\n\n**별자리로 보는 성향**\n- {sign_ko.get(sun_s,'')} (핵심 성격): {zodiac_sun.get('trait', '당신다움')}\n- {sign_ko.get(moon_s,'')} (감정 스타일): {zodiac_moon.get('trait', '내면의 감성')}\n- {sign_ko.get(asc_s,'')} (첫인상): 주변에서 느끼는 당신의 이미지"
        else:
            el_traits = {
                "목": "봄의 기운처럼 성장과 창의성이 넘칩니다. 새로운 시작과 발전에 강합니다.",
                "화": "여름의 열정처럼 밝고 적극적입니다. 주변을 밝히는 카리스마가 있습니다.",
                "토": "대지의 안정감처럼 듬직하고 신뢰감 있습니다. 중심을 잡아주는 존재입니다.",
                "금": "가을의 결실처럼 결단력과 추진력이 있습니다. 완성과 성과에 강합니다.",
                "수": "겨울의 깊이처럼 지혜롭고 통찰력이 있습니다. 유연함과 적응력이 뛰어납니다.",
            }
            astro_combo = f"\n\n**성격 특성**: {el_traits.get(day_el, '균형 잡힌 성향입니다.')}"

        # 종합 인사이트 (쉬운 말로)
        if sun_s:
            cross_text = f"**동양+서양 성격 분석**\n\n당신은 '{type_name_ko}'의 성향과 '{sign_ko.get(sun_s,'')}' 별자리의 특성을 함께 가지고 있어요.\n\n🔮 **핵심 메시지**\n동양의 지혜와 서양의 통찰이 만나 더 깊은 이해를 제공합니다.\n성장형 에너지와 {sign_ko.get(sun_s,'')}의 특성이 조화를 이뤄요."
        else:
            el_fusion = {
                "목": "성장을 추구하는 에너지가 당신의 핵심입니다. 나무가 하늘을 향해 자라듯, 끊임없는 발전과 확장이 삶의 테마입니다. 새로운 아이디어와 시작에 강하며, 리더십과 창의성이 빛납니다.",
                "화": "빛과 열정의 에너지가 당신을 정의합니다. 태양처럼 주변을 밝히고, 적극적인 행동력으로 목표를 향해 나아갑니다. 표현력과 카리스마가 뛰어나며, 사람들에게 영감을 줍니다.",
                "토": "안정과 포용의 에너지가 당신의 중심입니다. 대지처럼 듬직하고 신뢰감 있으며, 주변 사람들의 버팀목이 됩니다. 균형과 조화를 추구하며, 꾸준한 노력으로 성과를 이룹니다.",
                "금": "결단과 완성의 에너지가 당신을 이끕니다. 날카로운 판단력과 추진력으로 목표를 향해 직진합니다. 정의감이 강하고, 완벽을 추구하며, 성과 지향적입니다.",
                "수": "지혜와 유연함의 에너지가 당신의 본질입니다. 물처럼 어디서든 적응하며, 깊은 통찰력으로 상황을 꿰뚫습니다. 직관력이 뛰어나고, 변화에 유연하게 대응합니다.",
            }
            cross_text = f"**심층 성격 분석**\n\n🔮 **당신의 핵심**\n{el_fusion.get(day_el, '당신만의 독특한 에너지가 흐르고 있습니다.')}\n\n💫 이 분석을 통해 당신만의 길을 찾아보세요."

        # 풍부한 조언 생성
        strengths = dm_profile.get('strengths', '강점').split(',')
        weaknesses = dm_profile.get('weaknesses', '약점').split(',')
        strength1 = strengths[0].strip() if strengths else "장점"
        weakness1 = weaknesses[0].strip() if weaknesses else "단점"

        el_advice = {
            "목": "🌱 **성장의 조언**: 새로운 도전을 두려워하지 마세요. 당신의 성장 에너지는 멈추지 않는 강입니다.\n🎯 **주의점**: 너무 빠른 확장은 뿌리를 흔들 수 있어요. 기반을 다지며 나아가세요.\n✨ **행운의 키워드**: 시작, 창의성, 리더십",
            "화": "🔥 **열정의 조언**: 당신의 빛을 아끼지 마세요. 주변을 밝히는 것이 당신의 사명입니다.\n🎯 **주의점**: 과한 열정은 타버릴 수 있어요. 적절한 휴식을 취하세요.\n✨ **행운의 키워드**: 표현, 열정, 인정",
            "토": "🏔️ **안정의 조언**: 당신의 든든함이 주변에 힘이 됩니다. 중심을 잡고 나아가세요.\n🎯 **주의점**: 변화를 두려워하지 마세요. 때로는 움직임이 필요합니다.\n✨ **행운의 키워드**: 신뢰, 안정, 포용",
            "금": "⚔️ **결단의 조언**: 당신의 판단력을 믿으세요. 결정적 순간에 빛을 발합니다.\n🎯 **주의점**: 지나친 완벽주의는 자신을 지치게 해요. 유연함도 필요합니다.\n✨ **행운의 키워드**: 성취, 완성, 정의",
            "수": "💧 **지혜의 조언**: 흐름을 읽고 때를 기다리세요. 당신의 직관은 정확합니다.\n🎯 **주의점**: 너무 수동적이면 기회를 놓칠 수 있어요. 때로는 먼저 움직이세요.\n✨ **행운의 키워드**: 통찰, 적응, 지혜",
        }
        advice_text = el_advice.get(day_el, f"✅ {strength1} 최대한 활용하기\n⚠️ {weakness1} 경계하기\n💫 때를 기다리며 실력 쌓기")

        # ============ 풍부한 섹션 내용 생성 ============
        # English element names
        el_name_en = {"목": "Wood", "화": "Fire", "토": "Earth", "금": "Metal", "수": "Water"}.get(day_el, day_el)
        # 쉬운 성격 타입 이름 (전문용어 제거)
        type_name_ko = {"목": "성장형", "화": "열정형", "토": "안정형", "금": "완벽형", "수": "지혜형"}.get(day_el, "균형형")
        type_name_en = {"목": "Growth Type", "화": "Passion Type", "토": "Stability Type", "금": "Perfectionist Type", "수": "Wisdom Type"}.get(day_el, "Balanced Type")

        # 1. 정체성 섹션 - 전문용어 없이 쉽게
        if is_en:
            identity_intro = {
                "목": f"🌳 You're the '{type_name_en}'!\n\nLike a tree, you grow steadily and persistently. New ideas sprout in your mind like spring buds. You have strong leadership and the power to guide people around you.\n\n🎯 **Your Keywords**: Growth, Creativity, Leadership, Patience\n\nYou have the persistence to never give up even in tough situations. Initially you may seem quiet, but over time you become someone who provides support for others.",
                "화": f"🔥 You're the '{type_name_en}'!\n\nBright and warm like the sun. You become the life of the party wherever you go, and people naturally gather around you. Your passionate and proactive nature is your charm.\n\n🎯 **Your Keywords**: Passion, Expression, Charisma, Vitality\n\nEven when standing still, your presence shines! Every word and action captures attention. You shine brightest on stage.",
                "토": f"🏔️ You're the '{type_name_en}'!\n\nSolid like a mountain. Being around you makes people feel secure. You don't rush, moving forward steadily. Trust is your weapon.\n\n🎯 **Your Keywords**: Stability, Trust, Acceptance, Persistence\n\nYou maintain your own pace without following trends. You're the first person people turn to when they're struggling.",
                "금": f"⚔️ You're the '{type_name_en}'!\n\nSharp and decisive. You say what needs to be said and get things done properly. Strong sense of justice and a true professional!\n\n🎯 **Your Keywords**: Decisiveness, Precision, Principles, Clarity\n\nAmbiguity is your enemy! You're black and white with clear standards. You value promises and once decided, you see things through.",
                "수": f"💧 You're the '{type_name_en}'!\n\nFlexible and adaptable. You handle any situation with excellent intuition. You quietly assess situations and show your power at the critical moment.\n\n🎯 **Your Keywords**: Adaptability, Wisdom, Flexibility, Insight\n\nCalm on the outside but deep inside. You read people's hearts well and navigate complex situations with wisdom.",
            }
            str1 = dm_profile.get('strengths', 'Various abilities')
            identity_content = f"{identity_intro.get(day_el, 'Unique charm')}\n\n✅ **Strengths**: {str1}\n⚠️ **Weaknesses**: {dm_profile.get('weaknesses', 'Watch out')}\n\n💬 **Friends see you as**: \"A {str1.split(',')[0].strip() if str1 else 'great'} person! Reliable to be around.\""
        else:
            identity_intro = {
                "목": f"🌳 당신은 '{type_name_ko}'이에요!\n\n나무처럼 꿋꿋하게 성장하는 당신. 봄에 새싹이 돋듯이 새로운 아이디어가 끊임없이 샘솟아요. 리더십이 강하고 주변 사람들을 이끄는 힘이 있죠.\n\n🎯 **당신의 키워드**: 성장, 창의력, 리더십, 인내\n\n어려운 상황에서도 포기하지 않고 끈기 있게 나아가요. 처음엔 조용해 보여도, 시간이 지나면 주변에 힘이 되어주는 사람이에요.",
                "화": f"🔥 당신은 '{type_name_ko}'이에요!\n\n태양처럼 밝고 따뜻한 당신. 어디서든 분위기 메이커가 되고, 사람들이 당신 주변에 모여들어요. 열정적이고 적극적인 게 매력이에요.\n\n🎯 **당신의 키워드**: 열정, 표현력, 카리스마, 활력\n\n가만히 있어도 존재감이 뿜뿜! 말 한마디, 행동 하나하나가 사람들의 시선을 끌어요. 무대 위에서 가장 빛나는 타입이죠.",
                "토": f"🏔️ 당신은 '{type_name_ko}'이에요!\n\n산처럼 듬직한 당신. 옆에 있으면 든든해지는 사람이에요. 급하게 서두르지 않고 꾸준히 나아가는 스타일. 신뢰가 당신의 무기예요.\n\n🎯 **당신의 키워드**: 안정, 신뢰, 포용력, 끈기\n\n유행을 쫓지 않고 본인만의 페이스를 유지해요. 사람들이 힘들 때 가장 먼저 찾는 사람이 바로 당신이에요.",
                "금": f"⚔️ 당신은 '{type_name_ko}'이에요!\n\n날카롭고 결단력 있는 당신. 할 말은 하고, 해야 할 일은 확실하게 해요. 정의감이 강하고 완벽을 추구하는 프로페셔널!\n\n🎯 **당신의 키워드**: 결단력, 정확함, 원칙, 깔끔함\n\n애매한 건 딱 질색! 기준이 확실해요. 약속을 중요하게 생각하고, 한번 정하면 끝까지 지키는 사람이에요.",
                "수": f"💧 당신은 '{type_name_ko}'이에요!\n\n물처럼 유연한 당신. 어떤 상황에도 적응하고, 직감이 뛰어나요. 조용히 상황을 파악하다가 결정적 순간에 힘을 발휘하는 타입이에요.\n\n🎯 **당신의 키워드**: 적응력, 지혜, 유연함, 통찰력\n\n겉으론 조용해 보여도 속은 깊어요. 사람 마음을 잘 읽고, 복잡한 상황도 술술 풀어나가는 지혜가 있어요.",
            }
            identity_content = f"{identity_intro.get(day_el, dm_profile.get('personality', '독특한 매력의 소유자'))}\n\n✅ **장점**: {dm_profile.get('strengths', '다양한 능력')}\n⚠️ **단점**: {dm_profile.get('weaknesses', '주의할 점')}\n\n💬 **친구들이 보는 당신**: \"{dm_profile.get('strengths', '멋진').split(',')[0].strip() if dm_profile.get('strengths') else '멋진'} 사람이야! 옆에 있으면 든든해.\""

        # 2. 인생 로드맵 - 10년 대운 설명
        if is_en:
            # English daeun forecast
            daeun_forecast_en = []
            if daeun:
                for d in daeun[:6]:
                    d_age = d.get("age", 0)
                    d_stem = d.get("heavenlyStem", "")
                    d_branch = d.get("earthlyBranch", "")
                    d_sibsin = get_sibsin_value(d.get("sibsin"), "cheon", "")
                    d_info = SIBSIN_MEANINGS.get(d_sibsin, {})
                    is_current = d_age <= user_age < d_age + 10
                    marker = "👉 " if is_current else ""
                    sibsin_en = SIBSIN_EN.get(d_sibsin, d_sibsin)
                    daeun_forecast_en.append(f"{marker}**Age {d_age}~{d_age+9}** ({d_stem}{d_branch}): {sibsin_en}")
            if daeun_forecast_en:
                lifepath_content = "📅 **Your Life Timeline**\n\n" + "\n".join(daeun_forecast_en)
                lifepath_content += "\n\n💡 Different energy flows at each stage. Strategy that matches your current period is key! Know your destiny, prepare for it, and opportunities will come."
            else:
                lifepath_content = "Your life's journey is unfolding. Wait for the right moment while preparing. Opportunities come to those who are ready."
        else:
            if daeun_forecast:
                lifepath_content = "📅 **당신의 인생 시간표**\n\n" + "\n".join(daeun_forecast)
                lifepath_content += "\n\n💡 각 시기마다 다른 에너지가 흘러요. 지금 시기에 맞는 전략이 중요해요! 운명을 알면 대비할 수 있고, 대비하면 기회가 됩니다."
            else:
                lifepath_content = "인생의 큰 흐름이 펼쳐지고 있어요. 때를 기다리며 준비하세요. 준비된 사람에게 기회가 옵니다."

        # 3. 커리어 & 재물 - 구체적인 조언 + 확장
        if is_en:
            career_tips_en = {
                "목": "Startups, education, and leadership roles suit you. You excel at starting new projects or leading teams. Consulting and planning fields are also great!",
                "화": "Careers on stage suit you best. YouTuber, speaker, sales star... Your energy is your competitive edge! Entertainment, advertising, and events fit you well.",
                "토": "Stable fields like real estate, finance, or civil service are ideal. You shine brighter the longer you work. Agriculture, construction, and distribution also suit you.",
                "금": "Professional careers like law, medicine, or engineering fit you. Perfectionism is an asset in these fields! IT, financial analysis, and quality control are also good.",
                "수": "Research, consulting, and arts let you shine. Deep-dive work suits you best. Psychology, marketing analysis, and writing are also great matches.",
            }
            money_tips_en = {
                "목": "Grow wealth through business expansion rather than investment. Think big picture! Partnerships and franchises are worth considering.",
                "화": "Your network is your net worth! Opportunities come through relationships. Invest time in networking and money will follow.",
                "토": "Build wealth steadily without rushing. Real estate and savings are your financial tools. Physical assets bring fortune.",
                "금": "Analyze and make informed investment decisions. Your intuition is accurate. A systematic portfolio builds wealth.",
                "수": "Create multiple income streams. Side businesses, investments, various channels! Digital assets and intellectual property are worth watching.",
            }
            career_warning_en = {
                "목": "💡 Note: Spreading too thin drains energy. Focus and prioritize!",
                "화": "💡 Note: Chasing short-term wins makes you miss the big picture. Stay calm!",
                "토": "💡 Note: Resisting change too much can leave you behind. Embrace new things.",
                "금": "💡 Note: Perfectionism can hold you back. 80% is good enough!",
                "수": "💡 Note: Thinking without acting won't work. Build execution skills!",
            }
            career_content = f"💼 **Perfect Career Fit**\n{dm_profile.get('career_fit', 'Various fields')}\n\n{career_tips_en.get(day_el, '')}\n\n💰 **Money-Making Style**\n{money_tips_en.get(day_el, 'Steady accumulation')}\n\n{career_warning_en.get(day_el, '')}"
        else:
            career_tips = {
                "목": "창업, 스타트업, 교육 분야에서 빛나요. 새로운 프로젝트를 시작하거나 팀을 이끄는 역할이 잘 맞아요. 교육, 컨설팅, 기획 분야도 추천!",
                "화": "무대 위에서 빛나는 직업이 좋아요. 유튜버, 강사, 영업왕... 당신의 에너지가 곧 경쟁력! 엔터테인먼트, 광고, 이벤트 분야도 적성에 맞아요.",
                "토": "부동산, 금융, 공무원처럼 안정적인 분야가 맞아요. 오래 일할수록 빛나는 타입이에요. 농업, 건설, 유통 분야도 좋아요.",
                "금": "법률, 의료, 엔지니어링 같은 전문직이 어울려요. 완벽주의가 장점이 되는 분야로! IT, 금융 분석, 품질관리도 추천!",
                "수": "연구, 컨설팅, 예술 분야에서 재능을 발휘해요. 깊이 파고드는 일이 잘 맞아요. 심리상담, 마케팅 분석, 작가도 어울려요.",
            }
            money_tips = {
                "목": "투자보다는 사업 확장으로 돈을 벌어요. 큰 그림을 그리세요! 파트너십이나 프랜차이즈도 고려해볼 만해요.",
                "화": "인맥이 곧 재산! 사람들과의 관계에서 기회가 와요. 네트워킹에 시간을 투자하면 돈이 따라와요.",
                "토": "조급하지 않게 모아가세요. 부동산, 적금이 당신의 재테크. 땅이나 건물 같은 실물자산이 복을 불러요.",
                "금": "분석하고 판단해서 투자하세요. 당신의 직감은 정확해요. 체계적인 포트폴리오가 부를 만들어요.",
                "수": "다양한 수입원을 만드세요. 부업, 투자 등 여러 갈래로! 디지털 자산, 지적재산권도 눈여겨보세요.",
            }
            career_warning = {
                "목": "💡 주의: 너무 이것저것 벌리면 힘 빠져요. 선택과 집중이 필요해요!",
                "화": "💡 주의: 단기적 성과에 급급하면 큰 그림을 놓쳐요. 차분하게!",
                "토": "💡 주의: 변화를 너무 꺼리면 뒤처질 수 있어요. 새로운 것도 받아들이세요.",
                "금": "💡 주의: 완벽주의가 때로는 발목을 잡아요. 80%도 충분해요!",
                "수": "💡 주의: 생각만 하고 행동하지 않으면 안 돼요. 실행력을 키우세요!",
            }
            career_content = f"💼 **딱 맞는 직업**\n{dm_profile.get('career_fit', '다양한 분야')}\n\n{career_tips.get(day_el, '')}\n\n💰 **돈 버는 스타일**\n{money_tips.get(day_el, dm_profile.get('wealth_style', '꾸준한 축적'))}\n\n{career_warning.get(day_el, '')}"

        # 4. 연애 & 결혼 - 재미있는 연애 분석 + 확장
        if is_en:
            love_intro_en = {
                "목": "🌹 In love, you... commit fully once you give your heart! But sometimes you try too hard to do things your way, which can frustrate your partner. Leading is great, but listen to their opinion too!",
                "화": "🌹 In love, you... are romantic like a drama protagonist! But like a flame, you might burn bright then cool off... Consistency is key. Small gestures are nice, but everyday tenderness matters more!",
                "토": "🌹 In love, you... are slow but sure. Once you date, relationships last long! Even if you're not good with words, you show it through actions. Sometimes express it verbally too - it reassures your partner!",
                "금": "🌹 In love, you... seem cool and chic but are warm inside. You're devoted but don't show it. Try expressing affection sometimes - it makes your partner happy!",
                "수": "🌹 In love, you... are emotional and perceptive. You read your partner's heart well, but sometimes you accommodate too much and get tired. Express your own feelings honestly too!",
            }
            love_warning_en = {
                "목": "⚠️ Love tip: Being stubborn about being 'right' causes fights. Compromising is also cool!",
                "화": "⚠️ Love tip: Emotional ups and downs tire your partner. Practice emotional regulation!",
                "토": "⚠️ Love tip: Being too unresponsive makes your partner anxious. Show more reactions!",
                "금": "⚠️ Love tip: No criticizing! Give more compliments instead.",
                "수": "⚠️ Love tip: Being too passive makes things fizzle. Take the lead sometimes!",
            }
            love_content = f"{love_intro_en.get(day_el, 'Sincere love')}\n\n💍 **Marriage Timing**\n{dm_profile.get('love_timing', 'Waiting for the right connection')}\n\n👫 **Compatible Partner**\n{dm_profile.get('ideal_partner', 'Someone you connect with')}\n\n{love_warning_en.get(day_el, '')}"
        else:
            love_intro = {
                "목": "🌹 연애할 때 당신은... 한번 마음 주면 끝까지 책임지는 스타일! 근데 가끔 너무 내 방식대로 하려고 해서 상대가 답답할 수 있어요. 리드하는 건 좋지만, 상대 의견도 들어보세요!",
                "화": "🌹 연애할 때 당신은... 드라마 주인공처럼 로맨틱해요! 근데 불꽃처럼 확 타오르다 식을 수도... 꾸준함이 필요해요. 작은 이벤트도 좋지만 일상의 다정함이 더 중요해요!",
                "토": "🌹 연애할 때 당신은... 느리지만 확실해요. 한번 사귀면 오래가는 타입! 표현은 서툴러도 행동으로 보여줘요. 가끔은 말로도 표현해주세요, 상대가 안심해요!",
                "금": "🌹 연애할 때 당신은... 쿨하고 시크해 보이지만 속은 따뜻해요. 상대에게 헌신적이지만 티를 안 내요. 가끔은 애정표현도 해보세요, 상대가 행복해해요!",
                "수": "🌹 연애할 때 당신은... 감성적이고 눈치 빨라요. 상대 마음을 잘 읽지만, 가끔 너무 맞춰주다 지칠 수 있어요. 본인 감정도 솔직하게 표현하세요!",
            }
            love_warning = {
                "목": "⚠️ 연애 주의점: '내가 옳아' 고집 부리다 싸워요. 양보하는 것도 멋있어요!",
                "화": "⚠️ 연애 주의점: 감정 기복이 심하면 상대가 힘들어해요. 감정 조절 연습!",
                "토": "⚠️ 연애 주의점: 너무 무반응하면 상대가 불안해해요. 리액션 해주세요!",
                "금": "⚠️ 연애 주의점: 지적질은 금물! 칭찬을 더 자주 해주세요.",
                "수": "⚠️ 연애 주의점: 너무 수동적이면 흐지부지 돼요. 가끔은 리드하세요!",
            }
            love_content = f"{love_intro.get(day_el, dm_profile.get('love_style', '진심 어린 사랑'))}\n\n💍 **결혼 타이밍**\n{dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n👫 **이런 사람이 잘 맞아요**\n{dm_profile.get('ideal_partner', '마음이 통하는 사람')}\n\n{love_warning.get(day_el, '')}"

        # 5. 건강 포인트 - 실용적인 건강 조언 + 확장
        if is_en:
            health_tips_en = {
                "목": "Watch your liver, eyes, and muscles. Stress causes eye fatigue and muscle tension. Stretching and walks are your medicine!",
                "화": "Watch your heart and blood pressure! Too much excitement strains your heart. Regular cardio and hydration are key.",
                "토": "Digestive health is crucial. Irregular meals and overeating are forbidden! Eat on time and chew slowly.",
                "금": "Take care of lungs, skin, and intestines. Dry environments are bad. Use moisturizer and drink lots of water!",
                "수": "Watch kidneys, bladder, and reproductive health! Keep your body warm and avoid cold foods. Foot baths recommended!",
            }
            health_food_en = {
                "목": "🥗 Recommended foods: Green vegetables like spinach, broccoli / Chrysanthemum tea",
                "화": "🥗 Recommended foods: Hydrating fruits like watermelon, cucumber / Schisandra tea",
                "토": "🥗 Recommended foods: Mixed grains, sweet potato, pumpkin / Jujube tea, ginger tea",
                "금": "🥗 Recommended foods: Pear, radish, lotus root / Pear juice",
                "수": "🥗 Recommended foods: Black beans, seaweed, nuts / Black sesame tea",
            }
            health_exercise_en = {
                "목": "🏃 Recommended exercise: Yoga, Pilates, hiking - loosen those tight muscles!",
                "화": "🏃 Recommended exercise: Swimming, jogging - sweat it out and feel refreshed!",
                "토": "🏃 Recommended exercise: Walking, golf - steady and gentle is best!",
                "금": "🏃 Recommended exercise: Gym, climbing - set goals and challenge yourself!",
                "수": "🏃 Recommended exercise: Meditation, stretching, swimming - be friends with water!",
            }
            health_content = f"🏥 **Areas to Watch**\n{dm_profile.get('health_focus', 'Overall health management')}\n\n🍎 **Health Tips**\n{health_tips_en.get(day_el, 'Regular lifestyle and exercise are fundamental!')}\n\n{health_food_en.get(day_el, '')}\n\n{health_exercise_en.get(day_el, '')}"
        else:
            health_tips = {
                "목": "간, 눈, 근육 건강에 신경 쓰세요. 스트레스 받으면 눈이 피로해지고 근육이 뭉쳐요. 스트레칭과 산책이 보약!",
                "화": "심장, 혈압 주의! 너무 흥분하면 심장에 무리가 와요. 규칙적인 유산소 운동과 충분한 수분 섭취가 중요해요.",
                "토": "위장, 소화기 건강이 관건이에요. 불규칙한 식사와 과식은 금물! 제때 먹고, 천천히 씹어 드세요.",
                "금": "폐, 피부, 대장 건강 챙기세요. 건조한 환경이 안 좋아요. 수분 크림 바르고, 물 많이 마시세요!",
                "수": "신장, 방광, 생식기 건강 주의! 몸을 따뜻하게 유지하고, 찬 음식은 피하세요. 족욕 추천!",
            }
            health_food = {
                "목": "🥗 추천 음식: 시금치, 브로콜리 등 초록 채소 / 결명자차, 국화차",
                "화": "🥗 추천 음식: 수박, 오이 등 수분 많은 과일 / 오미자차, 연근차",
                "토": "🥗 추천 음식: 잡곡밥, 고구마, 호박 / 대추차, 생강차",
                "금": "🥗 추천 음식: 배, 도라지, 무 / 도라지차, 배즙",
                "수": "🥗 추천 음식: 검은콩, 해조류, 견과류 / 두충차, 흑임자차",
            }
            health_exercise = {
                "목": "🏃 추천 운동: 요가, 필라테스, 등산 - 뭉친 근육을 풀어주세요!",
                "화": "🏃 추천 운동: 수영, 조깅 - 땀을 쫙 빼면 상쾌해져요!",
                "토": "🏃 추천 운동: 걷기, 골프 - 과격하지 않게 꾸준히!",
                "금": "🏃 추천 운동: 헬스, 클라이밍 - 목표 세우고 도전하세요!",
                "수": "🏃 추천 운동: 명상, 스트레칭, 수영 - 물과 친해지세요!",
            }
            health_content = f"🏥 **주의할 부분**\n{dm_profile.get('health_focus', '전반적인 건강 관리')}\n\n🍎 **건강 꿀팁**\n{health_tips.get(day_el, '규칙적인 생활과 운동이 기본!')}\n\n{health_food.get(day_el, '')}\n\n{health_exercise.get(day_el, '')}"

        # 6. 현재 운세 흐름 - 더 구체적으로 + 확장
        if is_en:
            current_tips_en = {
                "목": "Now is a great time to start new challenges. Invest in learning!",
                "화": "A high-energy period! But avoid overreaching. Balance is key.",
                "토": "A time to build foundations. Don't rush, be steady!",
                "금": "Time to organize and decide. Let go of what's unnecessary.",
                "수": "Be flexible. Adapting to change brings opportunities.",
            }
            # Generate English daeun text
            if cur_daeun:
                cur_daeun_sibsin_en = SIBSIN_EN.get(cur_cheon, cur_cheon)
                current_daeun_text_en = f"**Current Decade Luck**: {cur_daeun.get('heavenlyStem','')}{cur_daeun.get('earthlyBranch','')} ({cur_daeun_sibsin_en})"
            else:
                current_daeun_text_en = f"**Current Flow**: {day_master} Day Master ({el_name_en})"
            if cur_annual:
                annual_sibsin_en = SIBSIN_EN.get(annual_cheon, annual_cheon)
                annual_text_en = f"**{now.year} Fortune**: {cur_annual.get('heavenlyStem','')}{cur_annual.get('earthlyBranch','')} ({annual_sibsin_en})"
            else:
                annual_text_en = f"**{now.year}**: A year of steady progress."
            current_content = f"🌊 **Your 10-Year Luck Cycle**\n{current_daeun_text_en}\n\n📆 **{now.year} Fortune**\n{annual_text_en}\n\n🔑 **How to Use Your Fortune**\n{current_tips_en.get(day_el, 'Prepare while waiting for the right time!')}\n\n💫 Make the most of this period and transform your life! Those who know their destiny shape their destiny."
        else:
            current_tips = {
                "목": "지금은 새로운 도전을 시작하기 좋은 시기예요. 배움에 투자하세요!",
                "화": "에너지가 넘치는 시기! 단, 과욕은 금물. 적당히 조절하세요.",
                "토": "기반을 다지는 시기예요. 급하게 서두르지 말고 착실하게!",
                "금": "정리하고 결단할 때예요. 불필요한 건 과감히 버리세요.",
                "수": "유연하게 대처하세요. 변화에 적응하면 기회가 와요.",
            }
            current_content = f"🌊 **지금 10년 운세**\n{current_daeun_text}\n\n📆 **{now.year}년 운세**\n{annual_text}\n\n🔑 **운세 활용법**\n{current_tips.get(day_el, '때를 기다리며 준비하세요!')}\n\n💫 지금 이 시기를 잘 활용하면 인생이 달라져요! 운을 아는 사람이 운을 만듭니다."

        # 7. 종합 인사이트 - 확장
        if is_en:
            cross_simple_en = {
                "목": "Full of energy for new beginnings. Don't hesitate - take on challenges!",
                "화": "This is your time to shine. Step forward without hesitation!",
                "토": "A time to build foundations. Don't rush, take it step by step!",
                "금": "Time for decisions and organization. Let go of attachments!",
                "수": "Ride the flow. Your intuition will guide you to the right answer!",
            }
            cross_life_lesson_en = {
                "목": "🌱 **Life Lesson**: Trees don't grow overnight. Consistency wins in the end. Don't be impatient - grow a little each day!",
                "화": "🔥 **Life Lesson**: Fire illuminates others while shining itself. Don't try to shine alone - learn to shine together! Your light brightens the world.",
                "토": "🏔️ **Life Lesson**: Mountains don't move, yet everyone comes to them. You're the same. Stand firm without wavering!",
                "금": "⚔️ **Life Lesson**: Even a sharp blade dulls without sharpening. Keep refining yourself. Pursue growth over perfection!",
                "수": "💧 **Life Lesson**: Water finds another way when blocked, but eventually reaches the sea. Be flexible, but never lose sight of your goal!",
            }
            # English cross_text
            el_fusion_en = {
                "목": "The energy of Wood (growth) is your core. Like a tree reaching for the sky, endless development and expansion are your life's theme. Strong in new ideas and beginnings, with leadership and creativity that shine.",
                "화": "The energy of Fire (passion) defines you. Bright like the sun, you illuminate surroundings with active drive toward goals. Excellent expression and charisma that inspire people.",
                "토": "The energy of Earth (stability) is your center. Solid and trustworthy like the ground, you're the anchor for those around you. Pursuing balance and harmony, achieving through steady effort.",
                "금": "The energy of Metal (decision) guides you. Sharp judgment and drive push you straight toward goals. Strong sense of justice, pursuing perfection, result-oriented.",
                "수": "The energy of Water (wisdom) is your essence. Adapting anywhere like water, piercing situations with deep insight. Excellent intuition, flexible in responding to change.",
            }
            cross_text_en = f"【Deep Saju Analysis】{day_master} Day Master ({el_name_en})\n\n🔮 **Core of Your Destiny**\n{el_fusion_en.get(day_el, 'A unique energy flows through you.')}\n\n💫 Draw your destiny map with the wisdom of the Five Elements."
            cross_content = f"🔮 **Your Personal Key Message**\n\n{cross_simple_en.get(day_el, 'Walk your own path!')}\n\n{cross_life_lesson_en.get(day_el, '')}\n\n{cross_text_en}"
        else:
            cross_simple = {
                "목": "새로운 시작의 에너지가 가득해요. 망설이지 말고 도전하세요!",
                "화": "당신이 빛나는 시기예요. 주저하지 말고 나서세요!",
                "토": "기반을 다지는 시기예요. 조급해하지 말고 차근차근!",
                "금": "결단하고 정리할 때예요. 미련은 버리세요!",
                "수": "흐름을 타세요. 직감이 정답을 알려줄 거예요!",
            }
            cross_life_lesson = {
                "목": "🌱 **인생 교훈**: 나무는 하루아침에 크지 않아요. 꾸준함이 결국 승리합니다. 조급해하지 말고, 매일 조금씩 성장하세요!",
                "화": "🔥 **인생 교훈**: 불은 다른 사람을 밝히면서 자신도 빛나요. 혼자 빛나려 하지 말고, 함께 빛나는 법을 배우세요! 당신의 빛이 세상을 밝힙니다.",
                "토": "🏔️ **인생 교훈**: 산은 움직이지 않아도 모두가 찾아와요. 당신도 그래요. 흔들리지 말고 묵묵히 자리를 지키세요!",
                "금": "⚔️ **인생 교훈**: 날카로운 칼도 갈지 않으면 무뎌져요. 끊임없이 자신을 갈고닦으세요. 완벽보다 성장을 추구하세요!",
                "수": "💧 **인생 교훈**: 물은 막히면 돌아가지만, 결국 바다에 닿아요. 유연하게, 하지만 목표는 잃지 마세요!",
            }
            cross_content = f"🔮 **당신만을 위한 핵심 메시지**\n\n{cross_simple.get(day_el, '당신만의 길을 가세요!')}\n\n{cross_life_lesson.get(day_el, '')}\n\n{cross_text}"

        # 8. 인생 조언 - 추가 확장
        if is_en:
            el_advice_en = {
                "목": "🌱 **Growth Advice**: Don't fear new challenges. Your growth energy is an unstoppable river.\n🎯 **Watch out**: Too rapid expansion can shake your roots. Build foundations as you advance.\n✨ **Lucky Keywords**: Beginning, Creativity, Leadership",
                "화": "🔥 **Passion Advice**: Don't hold back your light. Illuminating others is your mission.\n🎯 **Watch out**: Too much passion can burn you out. Take appropriate rest.\n✨ **Lucky Keywords**: Expression, Passion, Recognition",
                "토": "🏔️ **Stability Advice**: Your dependability empowers those around you. Stay centered and move forward.\n🎯 **Watch out**: Don't fear change. Sometimes movement is necessary.\n✨ **Lucky Keywords**: Trust, Stability, Acceptance",
                "금": "⚔️ **Decision Advice**: Trust your judgment. You shine in decisive moments.\n🎯 **Watch out**: Excessive perfectionism can exhaust you. Flexibility is also needed.\n✨ **Lucky Keywords**: Achievement, Completion, Justice",
                "수": "💧 **Wisdom Advice**: Read the flow and wait for the right time. Your intuition is accurate.\n🎯 **Watch out**: Being too passive can make you miss opportunities. Sometimes move first.\n✨ **Lucky Keywords**: Insight, Adaptation, Wisdom",
            }
            advice_action_en = {
                "목": "\n\n📝 **This Month's To-Do**: Learn something new, morning stretching, get a green item!",
                "화": "\n\n📝 **This Month's To-Do**: Express yourself on social media, cardio exercise, add red accents!",
                "토": "\n\n📝 **This Month's To-Do**: Organize and declutter, eat regularly, place yellow items!",
                "금": "\n\n📝 **This Month's To-Do**: Declutter unnecessary items, meditate, wear white often!",
                "수": "\n\n📝 **This Month's To-Do**: Drink lots of water, follow your intuition, use black items!",
            }
            advice_text = el_advice_en.get(day_el, "✅ Maximize your strengths\n⚠️ Watch your weaknesses\n💫 Build skills while waiting for the right time") + advice_action_en.get(day_el, "")
        else:
            advice_action = {
                "목": "\n\n📝 **이번 달 할 일**: 새로운 것 하나 배우기, 아침 스트레칭, 초록색 아이템 갖기!",
                "화": "\n\n📝 **이번 달 할 일**: SNS에 자신 표현하기, 유산소 운동, 빨간색 포인트 주기!",
                "토": "\n\n📝 **이번 달 할 일**: 정리정돈하기, 규칙적인 식사, 노란색 소품 두기!",
                "금": "\n\n📝 **이번 달 할 일**: 불필요한 물건 정리, 명상하기, 흰색 옷 자주 입기!",
                "수": "\n\n📝 **이번 달 할 일**: 물 많이 마시기, 직감 따르기, 검은색 아이템 활용하기!",
            }
            advice_text = advice_text + advice_action.get(day_el, "")

        return [
            {"id":"identity","icon":"🌟","title":"당신은 누구인가","titleEn":"Identity","content":identity_content},
            {"id":"lifepath","icon":"🛤️","title":"인생 로드맵","titleEn":"Life Path","content":lifepath_content},
            {"id":"career","icon":"💼","title":"커리어 & 재물","titleEn":"Career","content":career_content},
            {"id":"love","icon":"💖","title":"연애 & 결혼","titleEn":"Love","content":love_content},
            {"id":"health","icon":"💊","title":"건강 포인트","titleEn":"Health","content":health_content},
            {"id":"current","icon":"📍","title":"현재 운세 흐름","titleEn":"Current","content":current_content},
            {"id":"cross","icon":"✨","title":"종합 인사이트","titleEn":"Insight","content":cross_content},
            {"id":"advice","icon":"💝","title":"인생 조언","titleEn":"Advice","content":advice_text}]


