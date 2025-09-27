// 1. 타입을 tarot.types.ts에서 가져옵니다.
import { TarotTheme } from "./tarot.types"; 

// 2. 파일 내의 중복된 타입 정의는 삭제합니다.

// 3. tarotThemes 데이터에 각 스프레드별로 positions 배열을 추가합니다.
export const tarotThemes: TarotTheme[] = [
  {
    id: 'general-insight',
    category: 'General Insight',
    description: 'Explore the overall energy surrounding you.',
    spreads: [
      { 
        id: 'quick-reading', 
        title: 'Quick Reading', 
        cardCount: 1, 
        description: 'A quick, clear piece of advice or a core insight into your current situation.',
        positions: [
          { title: 'Core Insight' }
        ]
      },
      { 
        id: 'past-present-future', 
        title: 'Past, Present, Future', 
        cardCount: 3, 
        description: 'Examine the flow of time: the cause from the past, the current situation, and the likely future.',
        positions: [
          { title: 'The Past' },
          { title: 'The Present' },
          { title: 'The Future' }
        ]
      },
      { 
        id: 'celtic-cross', 
        title: 'The Celtic Cross', 
        cardCount: 10, 
        description: 'A deep and comprehensive reading that covers all aspects of your situation in great detail.',
        positions: [
          { title: 'The Present' }, { title: 'The Challenge' }, { title: 'The Past' },
          { title: 'The Future' }, { title: 'Above (Conscious)' }, { title: 'Below (Subconscious)' },
          { title: 'Advice' }, { title: 'External Influences' }, { title: 'Hopes and Fears' },
          { title: 'The Outcome' }
        ]
      }
    ]
  },
  {
    id: 'love-relationships',
    category: 'Love & Relationships',
    description: 'Uncover the mysteries of your heart.',
    spreads: [
      { 
        id: 'relationship-check-in', 
        title: 'Relationship Check-in', 
        cardCount: 2, 
        description: 'A snapshot of you and your partner\'s energies within the relationship.',
        positions: [
          { title: 'Your Energy' },
          { title: 'Partner\'s Energy' }
        ]
      },
      { 
        id: 'relationship-cross', 
        title: 'Relationship Cross', 
        cardCount: 5, 
        description: 'An in-depth analysis of your connection, challenges, and future direction.',
        positions: [
          { title: 'You' }, { title: 'Your Partner' }, { title: 'The Connection' },
          { title: 'The Challenge' }, { title: 'The Outcome' }
        ]
      },
      { 
        id: 'finding-a-partner', 
        title: 'Finding a Partner', 
        cardCount: 4, 
        description: 'Gain clarity on what you seek, what blocks you, and how to attract love.',
        positions: [
          { title: 'What You Seek' }, { title: 'What Blocks You' },
          { title: 'How to Attract' }, { title: 'Potential Partner' }
        ]
      }
    ]
  },
  {
    id: 'career-work',
    category: 'Career & Work',
    description: 'Find clarity on your professional journey.',
    spreads: [
      { 
        id: 'quick-guidance', 
        title: 'Quick Guidance', 
        cardCount: 1, 
        description: 'A single point of focus or advice for your professional life today.',
        positions: [
          { title: 'Key Focus' }
        ]
      },
      { 
        id: 'career-path', 
        title: 'Career Path', 
        cardCount: 3, 
        description: 'Understand your current role, your next step, and your ultimate career potential.',
        positions: [
          { title: 'Current Role' }, { title: 'Next Step' }, { title: 'Long-term Potential' }
        ]
      },
      { 
        id: 'work-life-balance', 
        title: 'Work-Life Balance', 
        cardCount: 5, 
        description: 'Explore the dynamics between your career, personal life, and overall well-being.',
        positions: [
          { title: 'Work Energy' }, { title: 'Life Energy' }, { title: 'The Conflict' },
          { title: 'Path to Harmony' }, { title: 'Ideal State' }
        ]
      }
    ]
  },
  {
    id: 'money-finance',
    category: 'Money & Finance',
    description: 'Seek guidance on your financial situation.',
    spreads: [
      { 
        id: 'financial-snapshot', 
        title: 'Financial Snapshot', 
        cardCount: 1, 
        description: 'The core energy surrounding your financial situation right now.',
        positions: [
          { title: 'Current Situation' }
        ]
      },
      { 
        id: 'path-to-abundance', 
        title: 'Path to Abundance', 
        cardCount: 3, 
        description: 'Identify your financial blocks, the action to take, and the potential outcome.',
        positions: [
          { title: 'Your Blockage' }, { title: 'Action to Take' }, { title: 'Potential Outcome' }
        ]
      },
      { 
        id: 'investment-potential', 
        title: 'Investment Potential', 
        cardCount: 4, 
        description: 'Assess the potential risks and rewards of a financial decision.',
        positions: [
          { title: 'The Opportunity' }, { title: 'Potential Risk' },
          { title: 'Potential Reward' }, { title: 'Final Advice' }
        ]
      }
    ]
  },
  {
    id: 'well-being-health',
    category: 'Well-being & Health',
    description: 'Listen to the whispers of your body and mind.',
    spreads: [
      { 
        id: 'energy-check', 
        title: 'Energy Check', 
        cardCount: 1, 
        description: 'A quick look at your current state of mental or physical energy.',
        positions: [
          { title: 'Your Energy' }
        ]
      },
      { 
        id: 'mind-body-spirit', 
        title: 'Mind, Body, Spirit', 
        cardCount: 3, 
        description: 'An overview of your health on the mental, physical, and spiritual planes.',
        positions: [
          { title: 'Mind' }, { title: 'Body' }, { title: 'Spirit' }
        ]
      },
      { 
        id: 'path-to-healing', 
        title: 'Path to Healing', 
        cardCount: 4, 
        description: 'Guidance on what needs attention and the steps toward recovery and balance.',
        positions: [
          { title: 'What Needs Healing' }, { title: 'Path to Recovery' },
          { title: 'Inner Strength' }, { title: 'Outcome' }
        ]
      }
    ]
  },
  {
    id: 'spiritual-growth',
    category: 'Spiritual Growth',
    description: 'Connect with your higher self.',
    spreads: [
      { 
        id: 'message-from-higher-self', 
        title: 'Message from Higher Self', 
        cardCount: 1, 
        description: 'Receive a direct message that your soul wants you to hear now.',
        positions: [
          { title: 'The Message' }
        ]
      },
      { 
        id: 'your-spiritual-path', 
        title: 'Your Spiritual Path', 
        cardCount: 3, 
        description: 'Explore your past spiritual lessons, current challenges, and future growth.',
        positions: [
          { title: 'Past Lessons' }, { title: 'Current Challenge' }, { title: 'Future Growth' }
        ]
      },
      { 
        id: 'unlocking-potential', 
        title: 'Unlocking Potential', 
        cardCount: 5, 
        description: 'Discover your hidden strengths and the keys to unlocking your spiritual gifts.',
        positions: [
          { title: 'Hidden Strength' }, { title: 'The Blockage' }, { title: 'The Key' },
          { title: 'Action to Take' }, { title: 'Unlocked Potential' }
        ]
      }
    ]
  },
  {
    id: 'daily-reading',
    category: 'Daily Reading',
    description: 'A quick look at the energies of your day.',
    spreads: [
      { 
        id: 'morning-energy', 
        title: 'Morning Energy', 
        cardCount: 1, 
        description: 'Set the tone for your day with a single guiding card.',
        positions: [
          { title: 'Energy for the Day' }
        ]
      },
      { 
        id: 'daily-focus', 
        title: 'Daily Focus', 
        cardCount: 2, 
        description: 'What to embrace and what to avoid as you go through your day.',
        positions: [
          { title: 'Embrace This' },
          { title: 'Avoid This' }
        ]
      },
      { 
        id: 'the-days-journey', 
        title: 'The Day\'s Journey', 
        cardCount: 3, 
        description: 'A look at the energies of your morning, afternoon, and evening.',
        positions: [
          { title: 'Morning' }, { title: 'Afternoon' }, { title: 'Evening' }
        ]
      }
    ]
  }
];