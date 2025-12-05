/**
 * @file This file contains the complete data for a 78-card Rider-Waite tarot deck.
 * Each card includes its name, image path, and interpretations for both upright and reversed positions.
 */

// Defines the structure for a single tarot card object.
export interface Card {
  id: number;
  name: string;
  image: string; // Placeholder for the card image path
  upright: {
    keywords: string[];
    meaning: string;
    advice?: string;
  };
  reversed: {
    keywords: string[];
    meaning: string;
    advice?: string;
  };
}

// Array containing all 78 tarot cards.
export const tarotDeck: Card[] = [
  // Major Arcana
  {
    id: 0,
    name: 'The Fool',
    image: '/cards/0.jpg',
    upright: {
      keywords: ['Beginnings', 'Innocence', 'Spontaneity', 'A free spirit', 'Adventure'],
      meaning: 'A new journey is beginning. Step forward with a pure heart and without fear of the unknown. Infinite possibilities are open to you.'
    },
    reversed: {
      keywords: ['Recklessness', 'Folly', 'Being taken advantage of', 'Inconsideration', 'Risk-taking'],
      meaning: 'You may be acting recklessly without enough preparation. A plan based on fantasy without facing reality could lead to dangerous outcomes. Pause and review your plans.'
    }
  },
  {
    id: 1,
    name: 'The Magician',
    image: '/cards/1.jpg',
    upright: {
      keywords: ['Manifestation', 'Resourcefulness', 'Power', 'Inspired action', 'Skill'],
      meaning: 'You have all the talents and abilities to make your desires a reality. Now is the time to turn your ideas into action. Begin with confidence.'
    },
    reversed: {
      keywords: ['Manipulation', 'Poor planning', 'Untapped talents', 'Deception', 'Lack of confidence'],
      meaning: 'You might be using your talents in the wrong places or trying to deceive others. Alternatively, a lack of confidence might be preventing you from starting anything.'
    }
  },
  {
    id: 2,
    name: 'The High Priestess',
    image: '/cards/2.jpg',
    upright: {
      keywords: ['Intuition', 'Sacred knowledge', 'Divine feminine', 'The subconscious mind', 'Wisdom'],
      meaning: 'Listen to your intuition and inner voice. There are things happening beneath the surface that are not yet clear. The answers you seek are within you.'
    },
    reversed: {
      keywords: ['Secrets', 'Disconnected from intuition', 'Withdrawal and silence', 'Hidden agendas'],
      meaning: 'You may be ignoring your intuition or there may be secrets being kept from you. It’s a time to be cautious of hidden information or gossip.'
    }
  },
  {
    id: 3,
    name: 'The Empress',
    image: '/cards/3.jpg',
    upright: {
      keywords: ['Femininity', 'Beauty', 'Nature', 'Nurturing', 'Abundance'],
      meaning: 'This card represents abundance, creativity, and maternal care. It is a time of growth and prosperity. Embrace the beauty and pleasure life has to offer.'
    },
    reversed: {
      keywords: ['Creative block', 'Dependence on others', 'Smothering', 'Emptiness', 'Insecurity'],
      meaning: 'You may feel creatively stifled or overly dependent on others. Be mindful of smothering those you care for or feeling a sense of emptiness.'
    }
  },
  {
    id: 4,
    name: 'The Emperor',
    image: '/cards/4.jpg',
    upright: {
      keywords: ['Authority', 'Establishment', 'Structure', 'A father figure', 'Leadership'],
      meaning: 'This card signifies structure, stability, and authority. It is a time for disciplined action and taking control of the situation with a clear plan.'
    },
    reversed: {
      keywords: ['Domination', 'Excessive control', 'Lack of discipline', 'Rigidity', 'Tyranny'],
      meaning: 'You may be dealing with someone who is overly controlling, or you yourself may be too rigid. A lack of self-control can lead to chaos.'
    }
  },
  {
    id: 5,
    name: 'The Hierophant',
    image: '/cards/5.jpg',
    upright: {
      keywords: ['Spiritual wisdom', 'Religious beliefs', 'Conformity', 'Tradition', 'Institutions'],
      meaning: 'This card represents tradition, established institutions, and shared beliefs. It may be time to follow a conventional path or seek guidance from a trusted mentor.'
    },
    reversed: {
      keywords: ['Personal beliefs', 'Freedom', 'Challenging the status quo', 'Non-conformity'],
      meaning: 'It is time to question traditions and think for yourself. Break free from old rules and find your own path and beliefs.'
    }
  },
  {
    id: 6,
    name: 'The Lovers',
    image: '/cards/6.jpg',
    upright: {
      keywords: ['Love', 'Harmony', 'Relationships', 'Values alignment', 'Choices'],
      meaning: 'This card represents a beautiful connection, harmony, and a choice that must be made. Your values are aligning, leading to a significant relationship or decision.'
    },
    reversed: {
      keywords: ['Disharmony', 'Imbalance', 'Misalignment of values', 'Relationship issues'],
      meaning: 'There may be a conflict in your relationships or a misalignment of personal values. A difficult choice may be causing internal or external strife.'
    }
  },
  {
    id: 7,
    name: 'The Chariot',
    image: '/cards/7.jpg',
    upright: {
      keywords: ['Control', 'Willpower', 'Victory', 'Assertion', 'Determination'],
      meaning: 'With determination and willpower, you will overcome obstacles and achieve victory. Stay focused and maintain control to steer your life in the right direction.'
    },
    reversed: {
      keywords: ['Lack of control', 'Lack of direction', 'Aggression', 'Obstacles', 'Self-discipline'],
      meaning: 'You may be losing direction or acting with aggression instead of control. Obstacles may seem overwhelming due to a lack of self-discipline.'
    }
  },
  {
    id: 8,
    name: 'Strength',
    image: '/cards/8.jpg',
    upright: {
      keywords: ['Strength', 'Courage', 'Patience', 'Control', 'Compassion'],
      meaning: 'This card represents inner strength, courage, and compassion. You can overcome challenges not with brute force, but with gentle persuasion and patience.'
    },
    reversed: {
      keywords: ['Inner turmoil', 'Weakness', 'Self-doubt', 'Lack of self-control', 'Insecurity'],
      meaning: 'You may be experiencing self-doubt or a lack of inner strength. Fear and insecurity are holding you back from achieving your potential.'
    }
  },
  {
    id: 9,
    name: 'The Hermit',
    image: '/cards/9.jpg',
    upright: {
      keywords: ['Soul-searching', 'Introspection', 'Being alone', 'Inner guidance', 'Wisdom'],
      meaning: 'It is a time for introspection and seeking wisdom from within. Step back from the busy world to find your inner light and guidance.'
    },
    reversed: {
      keywords: ['Isolation', 'Loneliness', 'Withdrawal', 'Paranoia', 'Being anti-social'],
      meaning: 'You may be feeling isolated or lonely. Be careful not to withdraw too much from the world, as it could lead to sadness or paranoia.'
    }
  },
  {
    id: 10,
    name: 'Wheel of Fortune',
    image: '/cards/10.jpg',
    upright: {
      keywords: ['Good luck', 'Karma', 'Life cycles', 'Destiny', 'A turning point'],
      meaning: 'The wheel is turning in your favor. Expect a positive change in luck or a significant turning point in your life. What goes around, comes around.'
    },
    reversed: {
      keywords: ['Bad luck', 'Resistance to change', 'Breaking cycles', 'Negative external forces'],
      meaning: 'You may be experiencing a period of bad luck or resisting an inevitable change. External forces may be working against you.'
    }
  },
  {
    id: 11,
    name: 'Justice',
    image: '/cards/11.jpg',
    upright: {
      keywords: ['Justice', 'Fairness', 'Truth', 'Cause and effect', 'Law'],
      meaning: 'This card represents fairness, truth, and the consequences of your actions. A decision will be made justly. Be accountable for your choices.'
    },
    reversed: {
      keywords: ['Unfairness', 'Lack of accountability', 'Dishonesty', 'Injustice', 'Legal disputes'],
      meaning: 'You may be facing an unfair situation or avoiding responsibility for your actions. Dishonesty could lead to negative consequences.'
    }
  },
  {
    id: 12,
    name: 'The Hanged Man',
    image: '/cards/12.jpg',
    upright: {
      keywords: ['Pause', 'Surrender', 'Letting go', 'New perspectives', 'Sacrifice'],
      meaning: 'It is a time to pause and see things from a new perspective. Surrender to the situation and let go of control to gain new insights.'
    },
    reversed: {
      keywords: ['Delays', 'Resistance', 'Stalling', 'Indecision', 'Martyrdom'],
      meaning: 'You are resisting a necessary pause, leading to delays and stagnation. Avoid making a needless sacrifice or playing the victim.'
    }
  },
  {
    id: 13,
    name: 'Death',
    image: '/cards/13.jpg',
    upright: {
      keywords: ['Endings', 'Change', 'Transformation', 'Transition', 'Letting go'],
      meaning: 'This card signifies a major ending to make way for a new beginning. Embrace this transformation, as it is a necessary part of your life\'s cycle.'
    },
    reversed: {
      keywords: ['Resistance to change', 'Holding on', 'Stagnation', 'Fear of change', 'Decay'],
      meaning: 'You are resisting a necessary ending, which is causing stagnation and preventing new growth. Fear of change is holding you in the past.'
    }
  },
  {
    id: 14,
    name: 'Temperance',
    image: '/cards/14.jpg',
    upright: {
      keywords: ['Balance', 'Moderation', 'Patience', 'Purpose', 'Harmony'],
      meaning: 'This card calls for balance, patience, and moderation in all things. By finding harmony and purpose, you can navigate life with a calm and steady hand.'
    },
    reversed: {
      keywords: ['Imbalance', 'Extremes', 'Excess', 'Lack of harmony', 'Recklessness'],
      meaning: 'You may be experiencing imbalance or going to extremes. A lack of moderation is causing conflict and discord in your life.'
    }
  },
  {
    id: 15,
    name: 'The Devil',
    image: '/cards/15.jpg',
    upright: {
      keywords: ['Addiction', 'Bondage', 'Materialism', 'Ignorance', 'Negative patterns'],
      meaning: 'You may be trapped by addiction, negative thinking, or materialism. You have the power to break free, but first, you must acknowledge your chains.'
    },
    reversed: {
      keywords: ['Breaking free', 'Detachment', 'Releasing limiting beliefs', 'Reclaiming power'],
      meaning: 'You are beginning to break free from negative patterns and attachments. By releasing what holds you back, you are reclaiming your personal power.'
    }
  },
  {
    id: 16,
    name: 'The Tower',
    image: '/cards/16.jpg',
    upright: {
      keywords: ['Sudden change', 'Upheaval', 'Chaos', 'Revelation', 'Awakening'],
      meaning: 'A sudden, dramatic change is about to occur. While it may be chaotic, this upheaval is necessary to destroy a false reality and lead to a spiritual awakening.'
    },
    reversed: {
      keywords: ['Fear of change', 'Avoiding disaster', 'Delaying the inevitable', 'Resisting destruction'],
      meaning: 'You are trying to avoid a necessary change, but this only delays the inevitable. Resisting this transformation will only prolong the suffering.'
    }
  },
  {
    id: 17,
    name: 'The Star',
    image: '/cards/17.jpg',
    upright: {
      keywords: ['Hope', 'Faith', 'Purpose', 'Renewal', 'Spirituality'],
      meaning: 'After a period of darkness, hope is renewed. This card brings a sense of peace, inspiration, and purpose. Have faith in the future.'
    },
    reversed: {
      keywords: ['Lack of faith', 'Despair', 'Discouragement', 'Disconnection', 'Insecurity'],
      meaning: 'You may be feeling hopeless or disconnected from your purpose. Do not give in to despair; the light is still there, even if you cannot see it.'
    }
  },
  {
    id: 18,
    name: 'The Moon',
    image: '/cards/18.jpg',
    upright: {
      keywords: ['Illusion', 'Fear', 'Anxiety', 'Subconscious', 'Intuition'],
      meaning: 'Things may not be as they seem. This card represents illusion and the fears that arise from the subconscious. Trust your intuition to guide you through the darkness.'
    },
    reversed: {
      keywords: ['Release of fear', 'Repressed emotion', 'Inner confusion', 'Truth revealed'],
      meaning: 'You are beginning to release your fears and see the truth behind illusions. Repressed emotions may be coming to the surface to be healed.'
    }
  },
  {
    id: 19,
    name: 'The Sun',
    image: '/cards/19.jpg',
    upright: {
      keywords: ['Positivity', 'Fun', 'Warmth', 'Success', 'Vitality'],
      meaning: 'This is a card of pure joy, success, and optimism. Embrace the warmth and positivity that surrounds you. It is a time of celebration and vitality.'
    },
    reversed: {
      keywords: ['Inner child', 'Feeling down', 'Overly optimistic', 'Lack of success', 'Pessimism'],
      meaning: 'You may be feeling temporarily sad or your optimism might be unrealistic. Don’t let a temporary setback dim your inner light.'
    }
  },
  {
    id: 20,
    name: 'Judgement',
    image: '/cards/20.jpg',
    upright: {
      keywords: ['Judgement', 'Rebirth', 'Inner calling', 'Absolution', 'Awakening'],
      meaning: 'This card represents a moment of awakening and rebirth. You are called to make a significant judgment, forgive the past, and embrace a new level of consciousness.'
    },
    reversed: {
      keywords: ['Self-doubt', 'Inner critic', 'Ignoring the call', 'Indecisiveness', 'Guilt'],
      meaning: 'You may be plagued by self-doubt or an overly harsh inner critic. Ignoring your inner calling will only lead to regret.'
    }
  },
  {
    id: 21,
    name: 'The World',
    image: '/cards/21.jpg',
    upright: {
      keywords: ['Completion', 'Integration', 'Accomplishment', 'Travel', 'Fulfillment'],
      meaning: 'This card signifies the successful completion of a cycle. You have achieved your goals and reached a state of fulfillment and integration. Celebrate your success.'
    },
    reversed: {
      keywords: ['Lack of completion', 'Lack of closure', 'Shortcuts', 'Emptiness', 'Unfinished business'],
      meaning: 'You may be feeling a lack of closure or have taken shortcuts that left things unfinished. A sense of emptiness comes from not completing what you started.'
    }
  },
  
  // Suit of Wands
  {
    id: 22,
    name: 'Ace of Wands',
    image: '/cards/22.jpg',
    upright: {
      keywords: ['Inspiration', 'New opportunities', 'Growth', 'Potential', 'Creation'],
      meaning: 'A spark of inspiration or a new opportunity has arrived. This is a moment of pure potential and creative energy. Seize this chance for growth.'
    },
    reversed: {
      keywords: ['Lack of energy', 'Lack of passion', 'Delays', 'Creative blocks', 'Missed opportunity'],
      meaning: 'You may be feeling uninspired or facing delays. A creative block is preventing you from moving forward on a new idea.'
    }
  },
  {
    id: 23,
    name: 'Two of Wands',
    image: '/cards/23.jpg',
    upright: {
      keywords: ['Future planning', 'Making decisions', 'Leaving home', 'Partnership', 'Progress'],
      meaning: 'You are at a point where you need to plan for the future. A choice must be made between staying in your comfort zone and exploring new territories.'
    },
    reversed: {
      keywords: ['Fear of change', 'Playing it safe', 'Lack of planning', 'Indecision', 'Cancelled plans'],
      meaning: 'Fear of the unknown is keeping you from moving forward. A lack of planning may lead to indecision or cancelled travel.'
    }
  },
  {
    id: 24,
    name: 'Three of Wands',
    image: '/cards/24.jpg',
    upright: {
      keywords: ['Expansion', 'Foresight', 'Overseas opportunities', 'Growth', 'Adventure'],
      meaning: 'Your plans are in motion and you are beginning to see the first signs of success. This is a time of expansion and looking toward the future with anticipation.'
    },
    reversed: {
      keywords: ['Delays', 'Obstacles', 'Lack of foresight', 'Frustration', 'Disappointment'],
      meaning: 'You are facing unexpected delays and obstacles. A lack of foresight may have led to your plans not working out as expected.'
    }
  },
  {
    id: 25,
    name: 'Four of Wands',
    image: '/cards/25.jpg',
    upright: {
      keywords: ['Celebration', 'Harmony', 'Marriage', 'Home', 'Community'],
      meaning: 'This is a card of joyful celebration, harmony, and stability. It often signifies a happy event like a wedding or a welcoming home.'
    },
    reversed: {
      keywords: ['Lack of support', 'Instability', 'Feeling unwelcome', 'Family issues', 'Disharmony'],
      meaning: 'There may be a lack of harmony in your home or community. You might feel unstable or unwelcome in your current environment.'
    }
  },
  {
    id: 26,
    name: 'Five of Wands',
    image: '/cards/26.jpg',
    upright: {
      keywords: ['Conflict', 'Competition', 'Disagreements', 'Tension', 'Rivalry'],
      meaning: 'You are in the midst of conflict or competition. While there is tension, this struggle can lead to growth and a better outcome if handled constructively.'
    },
    reversed: {
      keywords: ['Avoiding conflict', 'Internal conflict', 'Finding common ground', 'Peace', 'Resolution'],
      meaning: 'You are either avoiding a necessary conflict or have found a way to resolve disagreements. It can signify finding peace after a period of tension.'
    }
  },
  {
    id: 27,
    name: 'Six of Wands',
    image: '/cards/27.jpg',
    upright: {
      keywords: ['Success', 'Public recognition', 'Victory', 'Praise', 'Confidence'],
      meaning: 'You have achieved a significant victory and are receiving public recognition for your efforts. Enjoy this moment of success and praise.'
    },
    reversed: {
      keywords: ['Egotism', 'Lack of recognition', 'Failure', 'Disappointment', 'Arrogance'],
      meaning: 'You may be feeling a lack of recognition or have experienced a recent failure. Be wary of arrogance or letting a small success go to your head.'
    }
  },
  {
    id: 28,
    name: 'Seven of Wands',
    image: '/cards/28.jpg',
    upright: {
      keywords: ['Challenge', 'Competition', 'Perseverance', 'Defensiveness', 'Standing your ground'],
      meaning: 'You are in a position of strength but must defend it against challenges. Stand your ground and persevere, for you have the advantage.'
    },
    reversed: {
      keywords: ['Giving up', 'Overwhelmed', 'Exhaustion', 'Being attacked', 'Losing ground'],
      meaning: 'You feel overwhelmed and are on the verge of giving up. You may be losing ground in a battle due to exhaustion or feeling attacked.'
    }
  },
  {
    id: 29,
    name: 'Eight of Wands',
    image: '/cards/29.jpg',
    upright: {
      keywords: ['Speed', 'Action', 'Air travel', 'Movement', 'Swift change'],
      meaning: 'Events are moving forward with great speed. This card indicates rapid progress, communication, or even travel. Be ready for swift changes.'
    },
    reversed: {
      keywords: ['Delays', 'Frustration', 'Slowing down', 'Miscommunication', 'Resisting change'],
      meaning: 'You are experiencing frustrating delays and a loss of momentum. Things are slowing down, possibly due to miscommunication.'
    }
  },
  {
    id: 30,
    name: 'Nine of Wands',
    image: '/cards/30.jpg',
    upright: {
      keywords: ['Resilience', 'Courage', 'Persistence', 'Last stand', 'Boundaries'],
      meaning: 'You are weary from battle but still standing. This card represents resilience and the courage to face one final challenge before reaching your goal.'
    },
    reversed: {
      keywords: ['Paranoia', 'Giving up', 'Fatigue', 'Defensiveness', 'Lack of boundaries'],
      meaning: 'You are exhausted and on the verge of giving up. Paranoia and defensiveness may be causing you to push others away.'
    }
  },
  {
    id: 31,
    name: 'Ten of Wands',
    image: '/cards/31.jpg',
    upright: {
      keywords: ['Burden', 'Responsibility', 'Hard work', 'Stress', 'Overwhelmed'],
      meaning: 'You have taken on too much responsibility and are now feeling the burden. While you are close to the finish line, you are overwhelmed by the weight.'
    },
    reversed: {
      keywords: ['Letting go', 'Delegating', 'Release', 'Sharing the burden', 'Avoiding responsibility'],
      meaning: 'You are learning to delegate or release some of your burdens. However, it could also mean you are avoiding your responsibilities entirely.'
    }
  },
  {
    id: 32,
    name: 'Page of Wands',
    image: '/cards/32.jpg',
    upright: {
      keywords: ['Enthusiasm', 'Exploration', 'Discovery', 'Free spirit', 'New ideas'],
      meaning: 'This card represents a burst of creative energy and enthusiasm. You are ready to explore new ideas and embark on a passionate new adventure.'
    },
    reversed: {
      keywords: ['Creative blocks', 'Lack of direction', 'Haste', 'Feeling uninspired', 'Boredom'],
      meaning: 'You may be feeling uninspired or have lost your direction. Hasty decisions could lead to creative blocks or a sense of boredom.'
    }
  },
  {
    id: 33,
    name: 'Knight of Wands',
    image: '/cards/33.jpg',
    upright: {
      keywords: ['Energy', 'Passion', 'Adventure', 'Impulsiveness', 'Action'],
      meaning: 'Full of energy and passion, you are ready to charge forward. This card represents taking swift action and embracing adventure, though sometimes impulsively.'
    },
    reversed: {
      keywords: ['Recklessness', 'Delays', 'Frustration', 'Lack of energy', 'Haste'],
      meaning: 'You may be acting with recklessness or feeling frustrated by delays. A lack of energy is preventing you from taking action.'
    }
  },
  {
    id: 34,
    name: 'Queen of Wands',
    image: '/cards/34.jpg',
    upright: {
      keywords: ['Courage', 'Confidence', 'Independence', 'Social butterfly', 'Determination'],
      meaning: 'This card represents a confident, courageous, and independent person. You are determined and have a vibrant social energy that attracts others.'
    },
    reversed: {
      keywords: ['Selfishness', 'Jealousy', 'Insecurity', 'Demanding', 'Lack of confidence'],
      meaning: 'You may be feeling insecure or acting out of jealousy. A lack of confidence can make one demanding or overly aggressive.'
    }
  },
  {
    id: 35,
    name: 'King of Wands',
    image: '/cards/35.jpg',
    upright: {
      keywords: ['Natural-born leader', 'Vision', 'Entrepreneur', 'Honor', 'Charisma'],
      meaning: 'This card represents a visionary leader who is charismatic and honorable. You have a clear vision and the ability to inspire others to follow you.'
    },
    reversed: {
      keywords: ['Arrogance', 'Impulsiveness', 'Ruthlessness', 'High expectations', 'Tyranny'],
      meaning: 'You may be dealing with someone who is arrogant and impulsive. High expectations and a ruthless nature can lead to tyrannical behavior.'
    }
  },

  // Suit of Cups
  {
    id: 36,
    name: 'Ace of Cups',
    image: '/cards/36.jpg',
    upright: {
        keywords: ['Love', 'Compassion', 'Creativity', 'Overwhelming emotion', 'New relationship'],
        meaning: 'A new wave of emotion, creativity, and love is flowing into your life. This is the start of a new relationship or a deeper connection to your feelings.'
    },
    reversed: {
        keywords: ['Blocked emotions', 'Repressed feelings', 'Emptiness', 'Sadness', 'Creative block'],
        meaning: 'You may be blocking or repressing your emotions. This can lead to a sense of emptiness or creative stagnation.'
    }
  },
  {
    id: 37,
    name: 'Two of Cups',
    image: '/cards/37.jpg',
    upright: {
        keywords: ['Unified love', 'Partnership', 'Mutual attraction', 'Connection', 'Harmony'],
        meaning: 'This card represents a deep connection and partnership based on mutual love and respect. It signifies harmony and a strong bond between two people.'
    },
    reversed: {
        keywords: ['Break-up', 'Disharmony', 'Distrust', 'Relationship troubles', 'Misalignment'],
        meaning: 'There is a sense of disharmony or imbalance in a relationship. Distrust or a misalignment of values can lead to conflict.'
    }
  },
  {
    id: 38,
    name: 'Three of Cups',
    image: '/cards/38.jpg',
    upright: {
        keywords: ['Celebration', 'Friendship', 'Creativity', 'Community', 'Reunion'],
        meaning: 'This is a card of joyful celebration with friends and community. It signifies a happy reunion or a successful collaboration.'
    },
    reversed: {
        keywords: ['Gossip', 'Isolation', 'Overindulgence', 'Third-party interference', 'Cancelled celebration'],
        meaning: 'You may be feeling isolated or dealing with gossip within your social circle. Overindulgence or a third party could be causing problems.'
    }
  },
  {
    id: 39,
    name: 'Four of Cups',
    image: '/cards/39.jpg',
    upright: {
        keywords: ['Apathy', 'Contemplation', 'Disconnection', 'Re-evaluation', 'Missed opportunity'],
        meaning: 'You are feeling apathetic or disconnected, causing you to miss opportunities being offered. It is a time for contemplation and re-evaluating what truly matters.'
    },
    reversed: {
        keywords: ['Sudden awareness', 'Choosing happiness', 'Accepting help', 'New motivation', 'Seizing an opportunity'],
        meaning: 'You are coming out of a period of apathy and are now ready to seize new opportunities. A newfound motivation is leading you to choose happiness.'
    }
  },
  {
    id: 40,
    name: 'Five of Cups',
    image: '/cards/40.jpg',
    upright: {
        keywords: ['Loss', 'Regret', 'Disappointment', 'Sadness', 'Grief'],
        meaning: 'You are focusing on past losses and disappointments, which is preventing you from seeing the positive things that still remain. It is a time of grief and regret.'
    },
    reversed: {
        keywords: ['Moving on', 'Acceptance', 'Forgiveness', 'Finding peace', 'Healing'],
        meaning: 'You are beginning to accept your losses and are ready to move on. Forgiveness and healing are possible once you let go of regret.'
    }
  },
  {
    id: 41,
    name: 'Six of Cups',
    image: '/cards/41.jpg',
    upright: {
        keywords: ['Nostalgia', 'Childhood memories', 'Reunion', 'Innocence', 'Kindness'],
        meaning: 'This card represents a return to happy memories from the past. It can signify a reunion with someone from your childhood or a feeling of innocent joy.'
    },
    reversed: {
        keywords: ['Stuck in the past', 'Moving on', 'Leaving home', 'Rose-tinted glasses', 'Letting go of childhood'],
        meaning: 'You may be living too much in the past and idealizing it. It is time to let go of old memories and focus on the present and future.'
    }
  },
  {
    id: 42,
    name: 'Seven of Cups',
    image: '/cards/42.jpg',
    upright: {
        keywords: ['Choices', 'Illusion', 'Fantasy', 'Wishful thinking', 'Opportunities'],
        meaning: 'You are faced with many choices, but some may be illusions or fantasies. Be careful of wishful thinking and evaluate your options realistically.'
    },
    reversed: {
        keywords: ['Clarity', 'Making a decision', 'Reality check', 'Choosing a path', 'Focus'],
        meaning: 'After a period of confusion, you are gaining clarity and are ready to make a firm decision. A reality check has helped you choose a clear path.'
    }
  },
  {
    id: 43,
    name: 'Eight of Cups',
    image: '/cards/43.jpg',
    upright: {
        keywords: ['Abandonment', 'Walking away', 'Disappointment', 'Seeking something more', 'Moving on'],
        meaning: 'You are choosing to walk away from a situation that is no longer emotionally fulfilling. It is a journey of seeking deeper meaning and purpose.'
    },
    reversed: {
        keywords: ['Fear of change', 'Staying in a bad situation', 'Stagnation', 'Indecision', 'Return'],
        meaning: 'You are afraid to leave a situation that is making you unhappy. This fear of the unknown is causing you to feel stuck and stagnant.'
    }
  },
  {
    id: 44,
    name: 'Nine of Cups',
    image: '/cards/44.jpg',
    upright: {
        keywords: ['Wishes fulfilled', 'Contentment', 'Satisfaction', 'Gratitude', 'Success'],
        meaning: 'This is the "wish card," representing contentment, pleasure, and emotional fulfillment. Your wishes are coming true, and it is a time to feel satisfied.'
    },
    reversed: {
        keywords: ['Dissatisfaction', 'Unfulfilled wishes', 'Materialism', 'Greed', 'Smugness'],
        meaning: 'You are feeling dissatisfied despite having much. Materialism or greed may be preventing you from finding true happiness.'
    }
  },
  {
    id: 45,
    name: 'Ten of Cups',
    image: '/cards/45.jpg',
    upright: {
        keywords: ['Divine love', 'Happy family', 'Harmony', 'Fulfillment', 'Joy'],
        meaning: 'This card represents ultimate emotional fulfillment, often in the form of a happy and harmonious family life. It is a picture of lasting joy and divine love.'
    },
    reversed: {
        keywords: ['Broken family', 'Disharmony', 'Unhappiness', 'Misaligned values', 'Relationship issues'],
        meaning: 'There may be conflict or disharmony within your family or close relationships. A breakdown in connection is causing unhappiness.'
    }
  },
  {
    id: 46,
    name: 'Page of Cups',
    image: '/cards/46.jpg',
    upright: {
        keywords: ['Creative opportunities', 'Intuition', 'Curiosity', 'Imagination', 'A messenger of love'],
        meaning: 'A new creative or emotional opportunity is presenting itself. Listen to your intuition and approach this new beginning with curiosity and an open heart.'
    },
    reversed: {
        keywords: ['Creative blocks', 'Emotional immaturity', 'Escapism', 'Insecurity', 'Sad news'],
        meaning: 'You may be feeling creatively blocked or acting with emotional immaturity. Escapism or insecurity is preventing you from facing your feelings.'
    }
  },
  {
    id: 47,
    name: 'Knight of Cups',
    image: '/cards/47.jpg',
    upright: {
        keywords: ['Romance', 'Charming', 'Imagination', 'An offer', 'A romantic dreamer'],
        meaning: 'This card often represents a romantic proposal or the arrival of a charming and imaginative person. It is a time for following your heart.'
    },
    reversed: {
        keywords: ['Unrealistic', 'Jealousy', 'Moodiness', 'Disappointment in love', 'Emotional manipulation'],
        meaning: 'You may be dealing with someone who is emotionally manipulative or unrealistic. Be wary of jealousy and moodiness in relationships.'
    }
  },
  {
    id: 48,
    name: 'Queen of Cups',
    image: '/cards/48.jpg',
    upright: {
        keywords: ['Compassion', 'Calm', 'Intuitive', 'Nurturing', 'Emotional stability'],
        meaning: 'This card represents a compassionate and intuitive person who is in control of their emotions. It signifies emotional maturity and a nurturing presence.'
    },
    reversed: {
        keywords: ['Emotional insecurity', 'Co-dependency', 'Overly emotional', 'Needy', 'Martyrdom'],
        meaning: 'You may be feeling emotionally insecure or needy. A tendency to be overly emotional or co-dependent can cause relationship problems.'
    }
  },
  {
    id: 49,
    name: 'King of Cups',
    image: '/cards/49.jpg',
    upright: {
        keywords: ['Emotional balance', 'Compassion', 'Diplomacy', 'Control', 'Generosity'],
        meaning: 'This card represents a person who has mastered their emotions. He is a compassionate and diplomatic leader who offers calm and wise counsel.'
    },
    reversed: {
        keywords: ['Emotional manipulation', 'Moodiness', 'Volatility', 'Coldness', 'Untrustworthy'],
        meaning: 'Be wary of someone who uses emotional manipulation to control others. This person may be moody, cold, and untrustworthy.'
    }
  },

  // Suit of Swords
  {
    id: 50,
    name: 'Ace of Swords',
    image: '/cards/50.jpg',
    upright: {
      keywords: ['Breakthrough', 'Clarity', 'Sharp mind', 'Truth', 'New idea'],
      meaning: 'A moment of breakthrough brings new clarity and understanding. This card represents a powerful new idea or the revelation of a core truth.'
    },
    reversed: {
      keywords: ['Confusion', 'Miscommunication', 'Lack of clarity', 'Wrong decision', 'Clouded judgment'],
      meaning: 'You are experiencing confusion or a lack of clarity. Miscommunication or clouded judgment may lead to making the wrong decision.'
    }
  },
  {
    id: 51,
    name: 'Two of Swords',
    image: '/cards/51.jpg',
    upright: {
      keywords: ['Difficult choice', 'Indecision', 'Stalemate', 'Blocked emotions', 'A truce'],
      meaning: 'You are facing a difficult choice and are currently at a stalemate. You may be blocking your emotions to avoid making a painful decision.'
    },
    reversed: {
      keywords: ['Indecision', 'Confusion', 'Information overload', 'Stuck in the middle', 'Anxiety'],
      meaning: 'You are feeling overwhelmed and unable to make a decision. Information overload is leading to confusion and anxiety.'
    }
  },
  {
    id: 52,
    name: 'Three of Swords',
    image: '/cards/52.jpg',
    upright: {
      keywords: ['Heartbreak', 'Sorrow', 'Grief', 'Painful truth', 'Betrayal'],
      meaning: 'This card represents painful separation, heartbreak, or a sorrowful truth. While painful, this clarity is necessary for healing to begin.'
    },
    reversed: {
      keywords: ['Releasing pain', 'Optimism', 'Forgiveness', 'Healing', 'Overcoming sorrow'],
      meaning: 'You are beginning to recover from a painful experience. Forgiveness and letting go of sorrow are the first steps toward healing.'
    }
  },
  {
    id: 53,
    name: 'Four of Swords',
    image: '/cards/53.jpg',
    upright: {
      keywords: ['Rest', 'Recuperation', 'Meditation', 'Contemplation', 'A necessary pause'],
      meaning: 'It is a time for rest and recovery after a challenging period. Take a break to meditate and recharge your mental and physical energy.'
    },
    reversed: {
      keywords: ['Exhaustion', 'Burnout', 'Stagnation', 'Resuming activity', 'Forced rest'],
      meaning: 'You are on the verge of burnout and are being forced to rest. Pushing yourself further will only lead to exhaustion.'
    }
  },
  {
    id: 54,
    name: 'Five of Swords',
    image: '/cards/54.jpg',
    upright: {
      keywords: ['Conflict', 'Disagreement', 'Competition', 'Defeat', 'A hollow victory'],
      meaning: 'This card represents a conflict where there are no true winners. It signifies a victory won at too high a cost, leading to bitterness and alienation.'
    },
    reversed: {
      keywords: ['Reconciliation', 'Making amends', 'Moving on', 'Forgiveness', 'Past resentment'],
      meaning: 'It is a time for reconciliation and making amends. Letting go of past resentments is necessary to move on from conflict.'
    }
  },
  {
    id: 55,
    name: 'Six of Swords',
    image: '/cards/55.jpg',
    upright: {
      keywords: ['Transition', 'Moving on', 'Leaving behind', 'A rite of passage', 'Finding peace'],
      meaning: 'You are moving away from a difficult situation toward a calmer future. This transition may be sad, but it is a necessary journey to find peace.'
    },
    reversed: {
      keywords: ['Emotional baggage', 'Unfinished business', 'Resistance to change', 'Feeling stuck', 'Returning to trouble'],
      meaning: 'You are carrying emotional baggage that is preventing you from moving on. Resistance to change is keeping you stuck in a difficult place.'
    }
  },
  {
    id: 56,
    name: 'Seven of Swords',
    image: '/cards/56.jpg',
    upright: {
      keywords: ['Betrayal', 'Deception', 'Getting away with something', 'Theft', 'Strategy'],
      meaning: 'This card warns of deception or betrayal. Someone may be acting strategically behind your back, or you may be the one trying to get away with something.'
    },
    reversed: {
      keywords: ['Confession', 'Getting caught', 'Conscience', 'Facing the truth', 'Returning stolen goods'],
      meaning: 'A secret is about to be revealed. It is a time for confession and facing the consequences of one\'s actions.'
    }
  },
  {
    id: 57,
    name: 'Eight of Swords',
    image: '/cards/57.jpg',
    upright: {
      keywords: ['Feeling trapped', 'Imprisonment', 'Limiting beliefs', 'Victim mentality', 'Restriction'],
      meaning: 'You feel trapped and restricted, but these limitations are self-imposed. Your own negative thoughts are holding you prisoner. You have the power to free yourself.'
    },
    reversed: {
      keywords: ['Breaking free', 'Release', 'Finding solutions', 'New perspective', 'Taking control'],
      meaning: 'You are beginning to see a way out of your perceived prison. By changing your perspective, you are releasing your limiting beliefs and taking control.'
    }
  },
  {
    id: 58,
    name: 'Nine of Swords',
    image: '/cards/58.jpg',
    upright: {
      keywords: ['Anxiety', 'Worry', 'Fear', 'Depression', 'Nightmares'],
      meaning: 'This card represents deep anxiety, fear, and despair. Your worries are keeping you up at night, but these fears may be worse in your mind than in reality.'
    },
    reversed: {
      keywords: ['Hope', 'Reaching out for help', 'Recovery', 'Facing fears', 'Finding solutions'],
      meaning: 'You are beginning to find a way out of your despair. Reaching out for help and facing your fears is the first step toward recovery.'
    }
  },
  {
    id: 59,
    name: 'Ten of Swords',
    image: '/cards/59.jpg',
    upright: {
      keywords: ['Painful endings', 'Betrayal', 'Rock bottom', 'Defeat', 'Loss'],
      meaning: 'This card signifies a painful ending, betrayal, or hitting rock bottom. While devastating, this is the final blow, and the only way to go is up. Recovery can now begin.'
    },
    reversed: {
      keywords: ['Recovery', 'Resurrection', 'Healing', 'Resisting the end', 'A close call'],
      meaning: 'You are slowly recovering from a devastating event. However, it can also mean you are resisting a necessary ending, only prolonging the pain.'
    }
  },
  {
    id: 60,
    name: 'Page of Swords',
    image: '/cards/60.jpg',
    upright: {
      keywords: ['Curiosity', 'New ideas', 'Truthful', 'Energetic', 'A messenger'],
      meaning: 'Full of youthful energy and curiosity, you are eager to learn and share new ideas. This card represents a quest for knowledge and truth.'
    },
    reversed: {
      keywords: ['Gossip', 'Deception', 'Scattered energy', 'Sarcasm', 'Thoughtless words'],
      meaning: 'Be wary of spreading gossip or speaking without thinking. Scattered energy can lead to a lack of focus and unproductive communication.'
    }
  },
  {
    id: 61,
    name: 'Knight of Swords',
    image: '/cards/61.jpg',
    upright: {
      keywords: ['Ambitious', 'Action-oriented', 'Fast-thinking', 'Assertive', 'Driven'],
      meaning: 'This card represents a sharp, ambitious mind ready to charge into action. You are driven to pursue your goals with great speed and focus.'
    },
    reversed: {
      keywords: ['Reckless', 'Hasty', 'Arrogant', 'Aggressive', 'Thoughtless action'],
      meaning: 'You may be acting with haste and aggression, without fully thinking through the consequences. This reckless energy can lead to conflict.'
    }
  },
  {
    id: 62,
    name: 'Queen of Swords',
    image: '/cards/62.jpg',
    upright: {
      keywords: ['Independent', 'Unbiased judgment', 'Clear boundaries', 'Intelligent', 'Honest'],
      meaning: 'This card represents an intelligent and independent person who relies on unbiased judgment. You have clear boundaries and value honesty above all.'
    },
    reversed: {
      keywords: ['Cold', 'Bitter', 'Cynical', 'Cruel', 'Overly critical'],
      meaning: 'You may be acting with a cold and bitter heart. Past pain can make one overly critical or cruel with their words.'
    }
  },
  {
    id: 63,
    name: 'King of Swords',
    image: '/cards/63.jpg',
    upright: {
      keywords: ['Intellectual power', 'Authority', 'Truth', 'Clarity', 'Justice'],
      meaning: 'This card represents the authority of intellect and truth. You are a master of logic and can make decisions with clarity and fairness.'
    },
    reversed: {
      keywords: ['Manipulative', 'Tyrannical', 'Abuse of power', 'Cruel', 'Cold-hearted'],
      meaning: 'Be wary of someone who uses their intellect to manipulate and control. This abuse of power can be cruel and tyrannical.'
    }
  },
  
  // Suit of Pentacles
  {
    id: 64,
    name: 'Ace of Pentacles',
    image: '/cards/64.jpg',
    upright: {
      keywords: ['New opportunity', 'Prosperity', 'Manifestation', 'Abundance', 'A new job'],
      meaning: 'A new opportunity for prosperity and abundance has arrived. This is a seed of manifestation that can grow into tangible success.'
    },
    reversed: {
      keywords: ['Lost opportunity', 'Lack of planning', 'Greed', 'Financial instability', 'Poor investment'],
      meaning: 'You may have missed a financial opportunity due to poor planning. Greed or a lack of foresight can lead to instability.'
    }
  },
  {
    id: 65,
    name: 'Two of Pentacles',
    image: '/cards/65.jpg',
    upright: {
      keywords: ['Balancing', 'Adaptability', 'Time management', 'Prioritizing', 'Juggling'],
      meaning: 'You are successfully juggling multiple priorities. This card represents the need for balance and adaptability in managing your time and resources.'
    },
    reversed: {
      keywords: ['Overwhelmed', 'Poor financial decisions', 'Disorganization', 'Losing balance', 'Struggling'],
      meaning: 'You are feeling overwhelmed and struggling to keep everything in balance. Disorganization is leading to poor financial decisions.'
    }
  },
  {
    id: 66,
    name: 'Three of Pentacles',
    image: '/cards/66.jpg',
    upright: {
      keywords: ['Teamwork', 'Collaboration', 'Learning', 'Implementation', 'Skill'],
      meaning: 'This card represents successful collaboration and teamwork. By combining your unique skills, you are creating something of high quality.'
    },
    reversed: {
      keywords: ['Lack of teamwork', 'Disharmony', 'Poor quality work', 'Competition', 'Lack of skill'],
      meaning: 'A lack of teamwork or communication is leading to poor results. Competition among team members is creating disharmony.'
    }
  },
  {
    id: 67,
    name: 'Four of Pentacles',
    image: '/cards/67.jpg',
    upright: {
      keywords: ['Saving money', 'Security', 'Control', 'Conservation', 'Possessiveness'],
      meaning: 'You are holding on tightly to your possessions and security. While this brings stability, be careful not to become overly controlling or miserly.'
    },
    reversed: {
      keywords: ['Greed', 'Materialism', 'Letting go', 'Generosity', 'Financial loss'],
      meaning: 'You are either letting go of your attachment to material things or, conversely, acting with extreme greed. It can also signify an unexpected financial loss.'
    }
  },
  {
    id: 68,
    name: 'Five of Pentacles',
    image: '/cards/68.jpg',
    upright: {
      keywords: ['Financial loss', 'Poverty', 'Hard times', 'Isolation', 'Feeling left out'],
      meaning: 'You are going through a period of financial hardship and feeling isolated. Remember that help is often available, even if you don\'t see it at first.'
    },
    reversed: {
      keywords: ['Recovery', 'Finding help', 'Improved finances', 'Hope', 'End of hardship'],
      meaning: 'You are beginning to recover from a period of hardship. New opportunities or help from others is leading to financial improvement.'
    }
  },
  {
    id: 69,
    name: 'Six of Pentacles',
    image: '/cards/69.jpg',
    upright: {
      keywords: ['Generosity', 'Charity', 'Giving and receiving', 'Sharing wealth', 'Balance'],
      meaning: 'This card represents a cycle of giving and receiving. It signifies generosity, charity, and finding a healthy balance in your financial life.'
    },
    reversed: {
      keywords: ['Debt', 'Selfishness', 'One-sided charity', 'String attached', 'Abuse of generosity'],
      meaning: 'There is an imbalance in giving and receiving. Be wary of taking on debt or being taken advantage of for your generosity.'
    }
  },
  {
    id: 70,
    name: 'Seven of Pentacles',
    image: '/cards/70.jpg',
    upright: {
      keywords: ['Patience', 'Long-term view', 'Sustainable results', 'Investment', 'Perseverance'],
      meaning: 'You have worked hard and planted your seeds. Now is a time for patience, to wait for your investments to grow. Assess your progress and plan for the long term.'
    },
    reversed: {
      keywords: ['Impatience', 'Lack of long-term vision', 'Unwise investment', 'Wasted effort', 'Frustration'],
      meaning: 'You are feeling impatient with a lack of immediate results. Wasted effort on an unwise investment may be causing frustration.'
    }
  },
  {
    id: 71,
    name: 'Eight of Pentacles',
    image: '/cards/71.jpg',
    upright: {
      keywords: ['Apprenticeship', 'Mastery', 'Skill development', 'Diligence', 'Detail-oriented work'],
      meaning: 'You are dedicated to mastering your craft. Through diligent work and attention to detail, you are developing your skills and becoming an expert.'
    },
    reversed: {
      keywords: ['Perfectionism', 'Lack of ambition', 'Mediocrity', 'Repetitive work', 'Lack of focus'],
      meaning: 'You may be stuck in perfectionism or, conversely, have a lack of ambition leading to mediocre work. A lack of focus is hindering your skill development.'
    }
  },
  {
    id: 72,
    name: 'Nine of Pentacles',
    image: '/cards/72.jpg',
    upright: {
      keywords: ['Abundance', 'Luxury', 'Self-sufficiency', 'Financial independence', 'Enjoying success'],
      meaning: 'You have achieved financial independence and can now enjoy the fruits of your labor. This card represents luxury, self-sufficiency, and well-deserved success.'
    },
    reversed: {
      keywords: ['Financial dependency', 'Superficiality', 'Over-spending', 'Living beyond means', 'Hustling'],
      meaning: 'You may be living beyond your means or are financially dependent on others. Be wary of reckless spending or focusing only on superficial gains.'
    }
  },
  {
    id: 73,
    name: 'Ten of Pentacles',
    image: '/cards/73.jpg',
    upright: {
      keywords: ['Wealth', 'Family', 'Legacy', 'Inheritance', 'Long-term security'],
      meaning: 'This card represents the culmination of long-term success, often in the form of family wealth and a lasting legacy. It signifies stability and abundance for generations.'
    },
    reversed: {
      keywords: ['Family disputes', 'Financial failure', 'Loss of inheritance', 'Instability', 'Breaking tradition'],
      meaning: 'There may be disputes over family finances or inheritance. A sudden loss or financial failure is causing instability and breaking from tradition.'
    }
  },
  {
    id: 74,
    name: 'Page of Pentacles',
    image: '/cards/74.jpg',
    upright: {
      keywords: ['New opportunity', 'Manifestation', 'Diligence', 'Learning', 'A student'],
      meaning: 'A new opportunity to manifest your goals in the material world is here. Approach it with the diligence of a student, eager to learn and build something tangible.'
    },
    reversed: {
      keywords: ['Lack of progress', 'Procrastination', 'Laziness', 'Missed opportunity', 'Poor planning'],
      meaning: 'Procrastination or a lack of planning is causing you to miss opportunities. You may be feeling lazy or unmotivated to put in the work.'
    }
  },
  {
    id: 75,
    name: 'Knight of Pentacles',
    image: '/cards/75.jpg',
    upright: {
      keywords: ['Hard work', 'Responsibility', 'Routine', 'Diligence', 'Methodical'],
      meaning: 'This card represents a diligent and methodical approach to achieving your goals. Through hard work and routine, you are making steady progress.'
    },
    reversed: {
      keywords: ['Boredom', 'Stagnation', 'Perfectionism', 'Unadventurous', 'Feeling stuck'],
      meaning: 'You are feeling bored or stuck in a monotonous routine. Perfectionism may be causing you to get bogged down in details and lose momentum.'
    }
  },
  {
    id: 76,
    name: 'Queen of Pentacles',
    image: '/cards/76.jpg',
    upright: {
      keywords: ['Nurturing', 'Practical', 'Down-to-earth', 'Financial security', 'A working parent'],
      meaning: 'This card represents a nurturing and practical person who provides a secure and comfortable environment. You are skilled at managing both your home and your work.'
    },
    reversed: {
      keywords: ['Financial insecurity', 'Smothering', 'Work-life imbalance', 'Materialistic', 'Self-care issues'],
      meaning: 'You may be struggling with a work-life imbalance or feeling financially insecure. Be careful not to become overly materialistic or neglect your own self-care.'
    }
  },
  {
    id: 77,
    name: 'King of Pentacles',
    image: '/cards/77.jpg',
    upright: {
      keywords: ['Wealth', 'Business', 'Leadership', 'Security', 'Success'],
      meaning: 'This card represents an ambitious and successful leader who has mastered the material world. You have achieved wealth and security through your business acumen.'
    },
    reversed: {
      keywords: ['Greed', 'Materialistic', 'Stubborn', 'Overly cautious', 'Ruthless'],
      meaning: 'You may be dealing with someone who is overly materialistic and stubborn. Greed and a ruthless focus on the bottom line can lead to poor leadership.'
    }
  }
];

export default tarotDeck;
