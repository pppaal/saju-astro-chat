"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { allExtensions } from "@/lib/i18n/extensions";
import koDict from "./locales/ko.json";
import enDict from "./locales/en.json";

const dicts = {
  en: {
    app: { title: "destinypal", subtitle: "Unfold your destiny map with AI insights.", visitors: "Today's visitors", myJourney: "My Journey", community: "Community", back: "Back", name: "Name", namePh: "Your name", birthDate: "Birth Date", birthTime: "Birth Time", birthCity: "Birth City (English)", cityPh: "Seoul", gender: "Gender", male: "Male", female: "Female", other: "Other", preferNot: "Prefer not to say", analyze: "Analyze" },
    ui: { tipChooseCity: "Tip: choose a city to auto-set the time zone.", timeZone: "Time Zone", changeManually: "Change manually", generate: "Generate My Chart", analyzing: "Analyzing...", titleAstrology: "AI Natal Chart", subtitleAstrology: "Discover your cosmic map based on your birth information.", datePlaceholder: "yyyy-mm-dd", timePlaceholder: "--:--" },
    error: { dateRequired: "Enter a valid birth date (YYYY-MM-DD).", timeRequired: "Enter a valid birth time (HH:MM).", cityRequired: "Search and select your birth city.", timezoneRequired: "Select a time zone.", noData: "No analysis data from server.", unknown: "Unknown error." },
    notifications: {
      title: "Notifications",
      authRequired: "Please sign in to view notifications",
      markAll: "Mark all as read",
      clearAll: "Clear all",
      clearOne: "Delete notification",
      filter: {
        all: "All",
        unread: "Unread",
        like: "Likes",
        comment: "Comments",
        reply: "Replies",
        mention: "Mentions",
        system: "System",
      },
      empty: {
        unreadTitle: "All caught up!",
        noneTitle: "No notifications yet",
        unreadDesc: "You've read all your notifications",
        noneDesc: "We'll notify you when something happens",
      },
      time: {
        justNow: "Just now",
        minutesAgo: "{{m}}m ago",
        hoursAgo: "{{h}}h ago",
        daysAgo: "{{d}}d ago",
      },
    },
    community: {
      new: "New",
      top: "Top",
      login: "Log in",
      logout: "Log out",
      headerTitle: "Global Cosmic Hub",
      headerDesc: "Connect with seekers worldwide - Share insights - Find your cosmic match",
      hubTitle: "Connect to Global Communities",
      hubSubtitle: "Join millions of cosmic seekers across platforms",
      matchingTitle: "Cosmic Compatibility Matching",
      matchingDesc: "Find your perfect cosmic match based on birth charts, zodiac signs, and shared interests",
      comingSoon: "Coming Soon",
      searchPlaceholder: "Search posts, tags, or authors...",
      clearSearch: "Clear",
      categories: "Categories",
      categoryLabels: { all: "All", tarot: "Tarot", zodiac: "Zodiac", fortune: "Fortune", stars: "Stars", saju: "Saju" },
      createPost: "Create a Post",
      postGuide: "Share your insights, readings, or questions with the community",
      titleLabel: "Title",
      titlePlaceholder: "Write a clear title",
      mediaType: "Media type",
      image: "Image",
      video: "Video",
      imageUrl: "Image URL (optional)",
      videoUrl: "Video URL (YouTube/Vimeo)",
      body: "Description",
      bodyPlaceholder: "Share your thoughts and insights",
      tags: "Tags",
      post: "Post",
      loginToPost: "Log in to create posts and join the discussion",
      noPosts: "No posts yet. Be the first to share!",
      comments: "Comments",
      saved: "Saved",
      save: "Save",
      report: "Report",
      hide: "Hide",
      addComment: "Add a comment...",
      send: "Send",
      loginToComment: "Log in to comment",
      replyPlaceholder: "Reply...",
      time: { justNow: "just now", minutesAgo: "{{m}}m ago", hoursAgo: "{{h}}h ago", daysAgo: "{{d}}d ago" },
      success: {
        postCreated: "Post created successfully!",
        postLiked: "Post liked!",
        likeRemoved: "Like removed",
        commentAdded: "Comment added!",
        replyAdded: "Reply added!",
        reported: "Post reported. Thank you for keeping our community safe.",
        saved: "Post saved to bookmarks!",
        unsaved: "Post removed from bookmarks"
      },
      errors: {
        titleRequired: "Title is required"
      },
      loginRequired: "Please log in to perform this action",
      loginToLike: "Log in to like",
      externalCommunities: [
        { name: "r/astrology", platform: "Reddit", members: "1.2M", icon: "🔮" },
        { name: "r/tarot", platform: "Reddit", members: "580K", icon: "🃏" },
        { name: "#astrology", platform: "Instagram", members: "12M+", icon: "✨" },
        { name: "Astrology Twitter", platform: "Twitter/X", members: "Active", icon: "🐦" },
      ],
      seedPosts: [
        {
          author: "Orion",
          title: "Today's Tarot Spread - Major Insights",
          body: "Just finished my morning tarot reading and got some powerful cards! The Tower, The Star, and The World. What an interesting combination for starting the day.",
          category: "tarot",
          tags: ["destinypal", "tarot", "daily"],
        },
        {
          author: "Lyra",
          title: "Understanding Your Natal Chart - Beginner's Guide",
          body: "For everyone asking about how to read their birth chart! Here's a quick visual guide to the houses and what they represent.",
          category: "zodiac",
          tags: ["astrology", "guide", "natal chart"],
        },
      ],
    },
    numerology: {
      title: "Numerology Insights",
      subtitle: "Discover your life path and lucky numbers through numerology",
      formTitle: "Numerology Reading",
      formSubtitle: "Discover your life path and lucky numbers",
      nameLabel: "Full Name",
      namePlaceholder: "e.g., Jane Doe",
      birthdateLabel: "Birthdate",
      birthtimeLabel: "Time of Birth",
      birthtimeHint: "If exact time is unknown, approximate is OK.",
      timeZoneLabel: "Time Zone",
      timeZoneHint: "Auto-detected when you pick a city.",
      birthCityLabel: "Birth city",
      birthCityPlaceholder: "e.g., Seoul, KR",
      dropdownLoading: "Searching...",
      birthCityHint: "Time zone will be estimated automatically.",
      currentCityLabel: "Current city",
      currentCityPlaceholder: "e.g., Tokyo, JP",
      includeCurrentInfluence: "Include current city influence in Lucky Numbers",
      countLabel: "How many numbers?",
      countOption3: "3 numbers",
      countOption5: "5 numbers",
      countOptionCustom: "Custom",
      customCountPlaceholder: "Desired count",
      rangeLabel: "Number range",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      allowDuplicates: "Allow duplicates",
      seedLabel: "Seed (reproducibility)",
      seedOptionNameBirth: "Name + Birthdate",
      seedOptionNameBirthCityTime: "Name + Birth + Cities + Time (+TZ)",
      seedOptionRandom: "Pure random",
      buttonCalculate: "Reveal My Numbers",
      reset: "New Reading",
      resultsTitle: "Your Numerology Profile",
      resultsSubtitle: "Discover the numbers that shape your destiny",
      cardLifePath: "Life Path Number",
      cardExpression: "Expression Number",
      cardSoulUrge: "Soul Urge Number",
      cardPersonality: "Personality Number",
      luckyTitle: "Lucky Numbers",
      luckyTagFallback: "Energy",
      luckyEmpty: "Try adjusting the options and calculate again.",
      summaryTitle: "Input summary",
      summaryBirth: "Birth city",
      summaryBirthTime: "Birth time",
      summaryCurrent: "Current city",
      errors: {
        birthdate: "Please enter your birth date.",
        birthtime: "Please enter your birth time.",
        name: "Please enter your name for an accurate reading.",
        range: "Check the range: minimum must be less than maximum.",
        duplicates: "Without duplicates, count cannot exceed the range size.",
        generate: "An error occurred while generating numbers.",
      },
    },
    menu: { destinyMap: "Destiny Map", saju: "Saju", astrology: "Astrology", iching: "I Ching", tarot: "Tarot", dream: "Dream", numerology: "Numerology", compatibility: "Compatibility", personality: "Personality" },
    iching: {
      title: "Wisdom of the I Ching",
      back: "Back to Menu",
      prompt: "Calm your mind and press the button to receive guidance.",
      cast: "Cast Hexagram",
      casting: "Casting the lines...",
      castAgain: "Cast Again",
      today: "Today's Hexagram",
      judgment: "Judgment",
      image: "Image",
      changingLines: "Changing Lines",
      resulting: "Resulting Hexagram",
    },
    landing: {
      heroTitle: "Know yourself. Shape tomorrow.",
      heroSub: "Where destiny, psychology, and spirituality meet",
      statsToday: "Today",
      statsTotal: "Total",
      statsFootnote: "Live visitor count",
      servicesEyebrow: "DestinyPal Services",
      servicesTitle: "Key readings at a glance",
      servicesDesc: "Hover on a card to preview the vibe.",
      prompt1: "How is my fortune today?",
      prompt2: "I have an important decision.",
      prompt3: "What about love and relationships?",
      chatInputPlaceholder: "Ask about your destiny...",
      aiResponse: "Based on your astrological chart, today brings favorable planetary alignments. Your Saju elements show strong harmony - particularly in career and wealth sectors. The Moon's position suggests emotional clarity, while Jupiter's influence enhances opportunities for growth.",
      astrologyTitle: "Astrology",
      astrologyDesc: "Animated planets, houses, and aspects.",
      destinyTitle: "Destiny Map",
      destinyDesc: "AI blends saju, star flow, and tarot pulls into one map.",
      sajuTitle: "Saju",
      sajuDesc: "Five-element balance and great luck visualized.",
      tarotTitle: "Tarot",
      tarotDesc: "Card-pull animation for an intuitive spread.",
      astrologySectionTitle: "You Today, Astrologically",
      astrologySectionSubtitle: "See in real-time how planetary placements influence your destiny",
      sajuSectionTitle: "Five-Element Balance Through Saju",
      sajuSectionSubtitle: "Check your five-element energy distribution and find balance",
      tarotSectionTitle: "Today's Tarot Reading",
      tarotSectionSubtitle: "Listen to the message the cards bring",
      tarotDeckLabel: "78 Tarot Cards",
      tarotPast: "Past",
      tarotPresent: "Present",
      tarotFuture: "Future",
      tarotAdvice: "Advice",
      ctaTitle: "Make Better Decisions",
      ctaSubtitle: "AI reads your destiny and guides you to the best choices",
      ctaButton: "Get Started â†’",
      aiChatDemo: "AI Chat Demo",
      ascendant: "Ascendant",
      sun: "Sun",
      moon: "Moon",
      hourPillar: "Hour Pillar",
      dayPillar: "Day Pillar",
      monthPillar: "Month Pillar",
      yearPillar: "Year Pillar",
      greatFortune: "Great Fortune (Daeun)",
      elementWood: "Wood",
      elementFire: "Fire",
      elementEarth: "Earth",
      elementMetal: "Metal",
      elementWater: "Water",
      aquarius: "Aquarius",
      scorpio: "Scorpio",
      pisces: "Pisces",
      ageUnit: "years old",
      todayMessage: "Today is a favorable day for new beginnings. Creativity will shine.",
    },
    common: {
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      refunds: "Refund Policy",
      ourService: "Services",
      start: "Start",
    },
    services: {
      title: "Services",
      subtitle: "Explore your destiny",
      destinyMap: { label: "Destiny Map", desc: "AI Fortune Analysis" },
      astrology: { label: "Astrology", desc: "Western Astrology" },
      saju: { label: "Saju", desc: "Four Pillars of Destiny" },
      tarot: { label: "Tarot", desc: "Tarot Cards" },
      iching: { label: "I Ching", desc: "Book of Changes" },
      dream: { label: "Dream", desc: "Dream Interpretation" },
      numerology: { label: "Numerology", desc: "Number Analysis" },
      compatibility: { label: "Compatibility", desc: "Compatibility Analysis" },
      personality: { label: "Personality", desc: "Personality Analysis" },
    },
    success: {
      title: "Payment Successful!",
      message: "Thank you for your purchase. Your account has been upgraded and you're ready to explore your destiny.",
      orderRef: "Order Reference",
      startReading: "Start Your Reading",
      goHome: "Go to Home",
      emailNote: "A confirmation email has been sent to your registered email address.",
    },
    personality: {
      title: "Nova Persona",
      typeCode: "Type Code",
      keyMotivations: "Key Motivations",
      axes: "Axes",
      axis: {
        energy: "Energy",
        cognition: "Cognition",
        decision: "Decision",
        rhythm: "Rhythm",
        radiant: "Radiant",
        grounded: "Grounded",
        visionary: "Visionary",
        structured: "Structured",
        logic: "Logic",
        empathic: "Empathic",
        flow: "Flow",
        anchor: "Anchor",
      },
      strengthsAndChallenges: "Strengths & Watchouts",
      strengths: "Strengths",
      challenges: "Challenges",
      roles: "Recommended Roles",
      career: "Career focus",
      compatibility: "Compatibility Hint",
      guidance: "Guidance",
      tuneTitle: "Fine-tune your answers",
      tuneDesc: "Adjust responses to see how your persona evolves.",
      consistency: "Response consistency",
      consistencyLabel: {
        high: "High",
        moderate: "Moderate",
        low: "Low",
      },
      download: "Download response JSON",
      questions: {
        q1_energy_network: {
          text: "After a day full of people and meetings, you:",
          options: { A: "Feel charged and want to keep going.", B: "Need quiet space to reset." },
        },
        q2_energy_weekend: {
          text: "On a long weekend, you prefer to:",
          options: { A: "Pack the calendar with plans.", B: "Leave generous open blocks." },
        },
        q3_energy_spontaneous: {
          text: "When invited to a sudden gathering, you usually:",
          options: { A: "Say 'let'™s go' without much hesitation.", B: "Pause and decide after some thought." },
        },
        q4_energy_transit: {
          text: "During travel/wait times, you tend to:",
          options: { A: "Chat and engage with people around you.", B: "Use headphones and stay in your own zone." },
        },
        q5_energy_idealday: {
          text: "Your ideal day looks like:",
          options: { A: "Many activities/people in one day.", B: "A few set activities + ample solo time." },
        },
        q6_cog_problem: {
          text: "Facing a new problem, you first:",
          options: { A: "Spot patterns and possible models.", B: "List requirements and a checklist." },
        },
        q7_cog_explain: {
          text: "When learning, you prefer explanations that start with:",
          options: { A: "The big picture then examples.", B: "Concrete examples then the principle." },
        },
        q8_cog_evaluate: {
          text: "Evaluating an idea, you lean toward:",
          options: { A: "Novelty and potential impact.", B: "Feasibility and risks." },
        },
        q9_cog_basis: {
          text: "Decisions feel solid when they are built on:",
          options: { A: "'Why' and future scenarios.", B: "'What/when/who' and process." },
        },
        q10_cog_constraints: {
          text: "When new constraints appear, you:",
          options: { A: "Retool the concept to fit the future.", B: "Re-sequence the plan to fit realities." },
        },
        q11_decision_conflict: {
          text: "In a team conflict, you focus first on:",
          options: { A: "Principles and performance.", B: "Relationships and emotions." },
        },
        q12_decision_feedback: {
          text: "Your feedback style is usually:",
          options: { A: "Direct and fact-focused.", B: "Contextual with cushioning." },
        },
        q13_decision_resources: {
          text: "When allocating resources, you prioritize:",
          options: { A: "ROI and clear priorities.", B: "Team morale and learning." },
        },
        q14_decision_rules: {
          text: "Catching a rule break, you believe:",
          options: { A: "Consistency is fairness.", B: "Contextual flexibility is fairness." },
        },
        q15_decision_delay: {
          text: "If you postpone a decision, it is usually because:",
          options: { A: "Data/arguments feel insufficient.", B: "People/feelings need more alignment." },
        },
        q16_rhythm_deadline: {
          text: "On deadlines, you tend to:",
          options: { A: "Front-load work and finish early.", B: "Surge near the end under pressure." },
        },
        q17_rhythm_change: {
          text: "When plans change last-minute, you:",
          options: { A: "Pivot and adjust quickly.", B: "Stabilize and replan deliberately." },
        },
        q18_rhythm_workstyle: {
          text: "Your workstyle is more:",
          options: { A: "Multi-track in parallel.", B: "One track at a time." },
        },
        q19_rhythm_holiday: {
          text: "On holidays, you prefer:",
          options: { A: "Spontaneous outings/activities.", B: "Planned routines/reservations." },
        },
        q20_rhythm_feeling: {
          text: "When plans break, you mostly feel:",
          options: { A: "Curious/energized by new options.", B: "Unsettled and wanting predictability." },
        },
      },
    },
    tarot: {
      home: {
        title: "Mystical Tarot Reading",
        subtitle: "Gaze into the crystal ball and let the cards reveal your destiny",
        tapCrystal: "Tap the crystal ball to begin your journey",
        chooseTheme: "Choose Your Reading Theme",
      },
      spread: {
        chooseSpread: "Choose Your Spread",
        backToHome: "Back to Tarot Home",
      },
      reading: {
        preparing: "Preparing your cards...",
        invalidAccess: "Invalid Access",
        backToHome: "Back to Home",
        choose: "Choose",
        cards: "cards",
        revealing: "Selection Complete! Revealing your destiny...",
      },
      results: {
        subtitle: "Your cards have spoken",
        reversed: "Reversed",
        askAnother: "Ask Another Question",
      },
    },
    dream: {
      title: "Dream Interpretation",
      subtitle: "Explore the deeper meaning of your dreams with astrological insights",
      modeQuick: "Quick Select",
      modeWrite: "Write Freely",
      sectionSymbols: "Dream Symbols",
      sectionEmotions: "Emotions Felt",
      sectionTypes: "Dream Type (Optional)",
      sectionContext: "When/Context (Optional)",
      labelAdditional: "Additional Details (Optional)",
      placeholderAdditional: "Add any other details about your dream...",
      labelDetailed: "Describe Your Dream",
      placeholderDetailed: "Include key symbols, feelings, people, places, colors, and what happened...",
      shareAnonymous: "Share anonymously to the Dreamer Map",
      birthOptional: "Birth Info (Optional - for deeper insights)",
      buttonAnalyze: "Interpret Dream",
      buttonAnalyzing: "Analyzing your dream...",
      buttonReset: "Reset",
      resultSummary: "Summary",
      resultThemes: "Themes",
      resultSymbols: "Key Symbols",
      resultAstrology: "Astrology Highlights",
      resultInsights: "Cross-Insights",
      resultRecommendations: "Next Steps",
      errorMinLength: "Please describe your dream in at least 10 characters.",
      errorSelectSymbols: "Please select at least some symbols or emotions, or describe your dream.",
      errorEnterDream: "Please enter your dream.",
    },
    emoji: { sparkles: "âœ¨" },
    about: {
      heroTitle1: "Diagnose with Fate.",
      heroTitle2: "Analyze with Psychology.",
      heroTitle3: "Heal with Spirituality.",
      heroSubtitle: "Fate speaks. AI listens. You decide.",
      servicesEyebrow: "DestinyPal Services",
      servicesTitle: "9 Destiny Readings",
      servicesDesc: "Explore your destiny from multiple perspectives with each unique service",
      philosophyTitle: "Our Philosophy",
      philosophy: {
        accurate: { title: "Accurate Calculation", desc: "Reliable calculations reflecting time zones, seasons, and DST" },
        ethical: { title: "Ethical Guidance", desc: "Practical hints to help choices, not absolute predictions" },
        ui: { title: "Intuitive UI", desc: "Beautiful interface that makes complex information easy" },
        ai: { title: "AI Integration", desc: "AI-powered integration of multiple divination systems" },
      },
      ctaTitle: "Start Now",
      ctaSub: "Explore your destiny map with AI",
      ctaPrimary: "Start Destiny Map",
      ctaSecondary: "Go Home",
      tryDestinyMap: "Try Destiny Map",
      seeFeatures: "See Features",
      visualTitle: "Your personal fortune navigation, loved worldwide",
      visualDesc: "Clean interface and reliable calculation logic. Correctly reflects time zones, solar terms, DST, and translates results into easy-to-understand language.",
      discoverTitle: "Four Frames We Offer",
      discoverSubtitle: "Choose according to your question or use together to cross-verify timing and themes.",
      sajuTitle: "Saju (Four Pillars)",
      sajuDesc: "Interprets long-term cycles such as five-element balance, great fortune, and annual fortune by unfolding year, month, day, and hour into heavenly stems and earthly branches.",
      sajuStrength: "Strengths: Long-term theme transitions, energy balance",
      sajuAccuracy: "Accuracy: Precision of birth time and solar term corrections",
      sajuDetailTitle: "Details",
      sajuDetail: "If the hour pillar changes, personality and timing can differ. Solar term boundaries and regional calendar corrections are important.",
      sajuLink: "View Saju",
      astroTitle: "Astrology",
      astroDesc: "Reads planets, signs, houses, and angles in the birth chart, and observes timing through transits and returns.",
      astroStrength: "Strengths: Details by area (houses), psychological and relationship patterns",
      astroAccuracy: "Accuracy: Time, time zone/DST, house system",
      astroDetailTitle: "Details",
      astroDetail: "Even a 5-15 minute time error can change ASC/houses. Hospital records + DST reflection recommended.",
      astroLink: "View Astrology",
      ichingTitle: "I Ching",
      ichingDesc: "Captures current flow and turning points with the symbolic language of 64 hexagrams.",
      ichingStrength: "Strengths: Direction hints at decision crossroads",
      ichingAccuracy: "Accuracy: Question quality and context clarity",
      ichingDetailTitle: "Details",
      ichingDetail: "Open questions lead to clearer advice than yes/no questions.",
      ichingLink: "View I Ching",
      tarotTitle: "Tarot",
      tarotDesc: "Reveals current psychological and relationship patterns with symbolic cards, providing immediate action guidance.",
      tarotStrength: "Strengths: Quick insights, coaching-friendly",
      tarotAccuracy: "Accuracy: Question specificity, spread, re-roll strategy",
      tarotDetailTitle: "Details",
      tarotDetail: "The same card can have different messages depending on context and position. View with action scenarios.",
      tarotLink: "View Tarot",
    },
  },
  ko: koDict,
} as const;

const ICHING_OVERRIDES: Partial<Record<string, any>> = {
  ko: koDict.iching,
};

for (const [loc, strings] of Object.entries(ICHING_OVERRIDES)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    (dicts as any)[key].iching = {
      ...(dicts as any)[key].iching,
      ...strings,
    };
  }
}

const TAROT_OVERRIDES: Partial<Record<string, any>> = {
  en: {
    tarot: {
      topics: {
        generalInsight: "General Insight",
        generalInsightDesc: "Explore the overall energy surrounding you.",
        loveRelationships: "Love & Relationships",
        loveRelationshipsDesc: "Uncover the mysteries of your heart.",
        careerWork: "Career & Work",
        careerWorkDesc: "Find clarity on your professional journey.",
        moneyFinance: "Money & Finance",
        moneyFinanceDesc: "Seek guidance on your financial situation.",
        wellbeingHealth: "Well-being & Health",
        wellbeingHealthDesc: "Listen to the whispers of your body and mind.",
        spiritualGrowth: "Spiritual Growth",
        spiritualGrowthDesc: "Connect with your higher self.",
        dailyReading: "Daily Reading",
        dailyReadingDesc: "A quick look at the energies of your day.",
      },
    },
  },
  ko: koDict,
};

for (const [loc, strings] of Object.entries(TAROT_OVERRIDES)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    (dicts as any)[key].tarot = {
      ...(dicts as any)[key].tarot,
      ...(strings as any).tarot,
    };
  }
}

const PERSONALITY_OVERRIDES: Partial<Record<string, any>> = {
  ko: koDict,
};

const PERSONALITY_PREMIUM_OVERRIDES: Partial<Record<string, any>> = {};

for (const [loc, strings] of Object.entries(PERSONALITY_OVERRIDES)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    (dicts as any)[key].personality = {
      ...(dicts as any)[key].personality,
      ...(strings as any).personality,
    };
  }
}

for (const [loc, strings] of Object.entries(PERSONALITY_PREMIUM_OVERRIDES)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    (dicts as any)[key].personality = {
      ...(dicts as any)[key].personality,
      ...(strings as any).personality,
    };
  }
}

// Merge extensions (ìƒˆ ê¸°ëŠ¥ ë²ˆì—­ - dailyRitual, psychology, meditation ë“±)
for (const [loc, namespaces] of Object.entries(allExtensions)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    for (const [ns, translations] of Object.entries(namespaces)) {
      (dicts as any)[key][ns] = {
        ...((dicts as any)[key][ns] || {}),
        ...translations,
      };
    }
  }
}

function fillMissing(base: any, target: any) {
  for (const [k, v] of Object.entries(base)) {
    if (!(k in target)) {
      (target as any)[k] = v;
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") {
      fillMissing(v, target[k]);
    }
  }
}

// Merge translations from JSON files (landing, common, app, about)
const jsonOverrides: Record<string, any> = {
  en: enDict,
  ko: koDict,
};

for (const [locale, jsonData] of Object.entries(jsonOverrides)) {
  const target = (dicts as any)[locale];
  if (target) {
    if (jsonData.landing) {
      if (!target.landing) target.landing = {};
      Object.assign(target.landing, jsonData.landing);
    }
    if (jsonData.common) {
      if (!target.common) target.common = {};
      Object.assign(target.common, jsonData.common);
    }
    if (jsonData.app) {
      if (!target.app) target.app = {};
      Object.assign(target.app, jsonData.app);
    }
    if (jsonData.about) {
      if (!target.about) target.about = {};
      Object.assign(target.about, jsonData.about);
    }
    if (jsonData.services) {
      if (!target.services) target.services = {};
      Object.assign(target.services, jsonData.services);
    }
    if (jsonData.calendar) {
      if (!target.calendar) target.calendar = {};
      Object.assign(target.calendar, jsonData.calendar);
    }
    // Merge tarot translations from JSON
    if (jsonData.tarot) {
      if (!target.tarot) target.tarot = {};
      // Deep merge tarot object
      for (const [key, value] of Object.entries(jsonData.tarot)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (!target.tarot[key]) target.tarot[key] = {};
          Object.assign(target.tarot[key], value);
        } else {
          target.tarot[key] = value;
        }
      }
    }
    // Merge iching translations from JSON
    if (jsonData.iching) {
      if (!target.iching) target.iching = {};
      Object.assign(target.iching, jsonData.iching);
    }
    // Merge dream translations from JSON
    if (jsonData.dream) {
      if (!target.dream) target.dream = {};
      Object.assign(target.dream, jsonData.dream);
    }
    // Merge form translations from JSON
    if (jsonData.form) {
      if (!target.form) target.form = {};
      Object.assign(target.form, jsonData.form);
    }
    // Merge pricing translations from JSON
    if (jsonData.pricing) {
      if (!target.pricing) target.pricing = {};
      for (const [key, value] of Object.entries(jsonData.pricing)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (!target.pricing[key]) target.pricing[key] = {};
          Object.assign(target.pricing[key], value);
        } else {
          target.pricing[key] = value;
        }
      }
    }
    // Merge history translations from JSON
    if (jsonData.history) {
      if (!target.history) target.history = {};
      for (const [key, value] of Object.entries(jsonData.history)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (!target.history[key]) target.history[key] = {};
          Object.assign(target.history[key], value);
        } else {
          target.history[key] = value;
        }
      }
    }
    // Merge myjourney translations from JSON
    if (jsonData.myjourney) {
      if (!target.myjourney) target.myjourney = {};
      for (const [key, value] of Object.entries(jsonData.myjourney)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (!target.myjourney[key]) target.myjourney[key] = {};
          Object.assign(target.myjourney[key], value);
        } else {
          target.myjourney[key] = value;
        }
      }
    }
    // Merge success translations from JSON
    if (jsonData.success) {
      if (!target.success) target.success = {};
      Object.assign(target.success, jsonData.success);
    }
    // Merge destinyPal translations from JSON
    if (jsonData.destinyPal) {
      if (!target.destinyPal) target.destinyPal = {};
      Object.assign(target.destinyPal, jsonData.destinyPal);
    }
  }
}

for (const [locale, data] of Object.entries(dicts)) {
  if (locale === "en") continue;
  fillMissing(dicts.en, data);
}

type Locale = keyof typeof dicts;

type I18nContextType = {
  locale: Locale;
  language: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, fallback?: string) => string;
  translate: (path: string, fallback?: string) => string;
  dir: "ltr" | "rtl";
  hydrated: boolean;
};

export const DICTS = dicts;

const I18nContext = createContext<I18nContextType | null>(null);

// Only support en/ko
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ko'];
const isRtl = (_l: Locale) => false; // No RTL languages supported

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = localStorage.getItem("locale") as Locale | null;
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        setLocale(stored);
        return;
      }
    } catch {}
    try {
      const nav2 = navigator.language?.slice(0, 2) as Locale | undefined;
      if (nav2 && SUPPORTED_LOCALES.includes(nav2)) setLocale(nav2);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("locale", locale);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
    }
  }, [locale]);

  const t = useMemo(() => {
    const getter = (obj: unknown, path: string) => {
      if (!path) return undefined;
      const parts = path.split(".");
      let cur: unknown = obj;
      for (const k of parts) {
        if (cur !== null && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[k];
        } else {
          return undefined;
        }
      }
      return cur;
    };

    const isLikelyCorrupted = (value: string) =>
      /[\u0400-\u04FF]/.test(value) || value.includes("�");

    return (path: string, fallback?: string) => {
      const got = getter(dicts[locale], path);
      if (typeof got === "string") {
        // Some locale files were corrupted (Cyrillic/�). If detected, fall back to English.
        if (locale === "ko" && isLikelyCorrupted(got)) {
          const fb = getter(dicts.en, path);
          if (typeof fb === "string") return fb;
          if (fallback) return fallback;
          return path.split(".").pop() || path;
        }
        return got;
      }

      const fb = getter(dicts.en, path);
      if (typeof fb === "string") return fb;

      if (fallback) return fallback;

      return path.split(".").pop() || path;
    };
  }, [locale]);

  const value = useMemo<I18nContextType>(
    () => ({ locale, language: locale, setLocale, t, translate: t, dir: isRtl(locale) ? "rtl" : "ltr", hydrated }),
    [locale, t, hydrated]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

