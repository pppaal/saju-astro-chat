import { Card } from "./tarot.types";

type AdviceText = { en: string; ko?: string };
type AdviceEntry = { upright: AdviceText; reversed: AdviceText };

// Curated, action-focused advice for every card and orientation.
// Keep strings concise; translators can fill ko later for i18n.
export const CARD_ADVICE_MAP: Record<string, AdviceEntry> = {
  "The Fool": {
    upright: { en: "Say yes to a fresh start; take the first step with light prep and curiosity." },
    reversed: { en: "Pause the leap; check basics, secure footing, and reduce careless risk." },
  },
  "The Magician": {
    upright: { en: "Pick one goal and execute; use the tools you already have with confidence." },
    reversed: { en: "Avoid tricks or scattered effort; ground the plan and align with ethics." },
  },
  "The High Priestess": {
    upright: { en: "Trust your inner signal; observe quietly and let intuition guide timing." },
    reversed: { en: "Clear noise and secrets; reconnect to your intuition before acting." },
  },
  "The Empress": {
    upright: { en: "Nurture and create; invest in comfort, beauty, and steady growth." },
    reversed: { en: "Release over-giving; refill yourself and ease control to let things grow." },
  },
  "The Emperor": {
    upright: { en: "Lead with structure; set rules, boundaries, and a firm but fair plan." },
    reversed: { en: "Ease rigidity; listen, delegate, and avoid power struggles." },
  },
  "The Hierophant": {
    upright: { en: "Use proven methods; seek guidance from mentors and solid traditions." },
    reversed: { en: "Question outdated rules; adapt the tradition to fit your truth." },
  },
  "The Lovers": {
    upright: { en: "Choose in line with values; commit openly to what you truly want." },
    reversed: { en: "Resolve split desires; be honest, heal imbalance, and realign choices." },
  },
  "The Chariot": {
    upright: { en: "Pick a lane and drive; channel willpower, remove distractions, show progress." },
    reversed: { en: "Regain control; adjust direction, slow reckless speed, and align both hands on the reins." },
  },
  "Strength": {
    upright: { en: "Lead with calm courage and compassion; steady the room by example." },
    reversed: { en: "Soothe inner fear; rebuild confidence with gentle self-talk and patience." },
  },
  "The Hermit": {
    upright: { en: "Take quiet time to think; study, reflect, and return with distilled insight." },
    reversed: { en: "Do not isolate too long; share what you know and reconnect." },
  },
  "Wheel of Fortune": {
    upright: { en: "Ride the cycle; stay adaptable, ready for quick shifts, and grab timely openings." },
    reversed: { en: "Stop resisting change; reset plans, release control, and prepare for the turn." },
  },
  "Justice": {
    upright: { en: "Balance the scales; be transparent, fair, and make decisions on facts." },
    reversed: { en: "Correct imbalance; own mistakes, fix unfairness, and restore integrity." },
  },
  "The Hanged Man": {
    upright: { en: "Pause and reframe; surrender old angles and let a new perspective emerge." },
    reversed: { en: "End the stall; choose, move, and stop clinging to limbo." },
  },
  "Death": {
    upright: { en: "Close what is over; clear space and allow the new chapter to begin." },
    reversed: { en: "Release resistance; end the lingering attachment and accept transition." },
  },
  "Temperance": {
    upright: { en: "Blend at a sustainable pace; moderate, balance, and integrate patiently." },
    reversed: { en: "Reduce extremes; simplify, slow down, and restore steady rhythm." },
  },
  "The Devil": {
    upright: { en: "Name the binding habit; set one boundary to regain your power." },
    reversed: { en: "Break the chain; detach from the unhealthy pact and choose freedom." },
  },
  "The Tower": {
    upright: { en: "Stabilize essentials; let false structures fall and rebuild on truth." },
    reversed: { en: "Prepare for correction; make safe exits and redesign on solid ground." },
  },
  "The Star": {
    upright: { en: "Restore hope; rest, hydrate, and feed the vision with gentle care." },
    reversed: { en: "Guard hope; clear discouragement and rekindle a small, bright goal." },
  },
  "The Moon": {
    upright: { en: "Fact-check fears; move slowly, follow intuition, and verify reality." },
    reversed: { en: "Cut through fog; seek clear evidence and pause major moves until sure." },
  },
  "The Sun": {
    upright: { en: "Step into visibility; celebrate wins and share warmth confidently." },
    reversed: { en: "Open the curtains; clear doubts and let optimism back in." },
  },
  "Judgement": {
    upright: { en: "Answer the call; review the past, accept the lesson, act on renewal." },
    reversed: { en: "Stop self-doubt; make the decision and move forward with resolve." },
  },
  "The World": {
    upright: { en: "Finish well; close the loop, celebrate, then plan the next horizon." },
    reversed: { en: "Complete the unfinished; tie loose ends before starting anew." },
  },
  "Ace of Wands": {
    upright: { en: "Light the spark; start the project now and follow the energy." },
    reversed: { en: "Reignite focus; clear blocks and reconnect to why you care." },
  },
  "Two of Wands": {
    upright: { en: "Plan boldly; choose a direction and prepare the next move." },
    reversed: { en: "Stop overplanning; decide and take a concrete step." },
  },
  "Three of Wands": {
    upright: { en: "Expand; ship it, explore new lanes, and look ahead with confidence." },
    reversed: { en: "Adjust expectations; refine the plan before scaling." },
  },
  "Four of Wands": {
    upright: { en: "Celebrate milestones; honor teamwork and stability." },
    reversed: { en: "Fix foundation issues; resolve tension at home or team level." },
  },
  "Five of Wands": {
    upright: { en: "Engage the competition; learn by sparring and set fair rules." },
    reversed: { en: "End petty fights; collaborate or exit unproductive conflict." },
  },
  "Six of Wands": {
    upright: { en: "Claim the win; share success and thank your supporters." },
    reversed: { en: "Stay humble; correct ego drift and credit the team." },
  },
  "Seven of Wands": {
    upright: { en: "Hold your ground; defend priorities and set clear boundaries." },
    reversed: { en: "Pick your battles; avoid burnout from constant defense." },
  },
  "Eight of Wands": {
    upright: { en: "Move fast; send messages, decide, and ride the momentum." },
    reversed: { en: "Slow the rush; check details and avoid hasty errors." },
  },
  "Nine of Wands": {
    upright: { en: "Protect your progress; set limits and finish strong." },
    reversed: { en: "Release hyper-vigilance; rest and ask for support." },
  },
  "Ten of Wands": {
    upright: { en: "Lighten the load; delegate and drop what is not essential." },
    reversed: { en: "Stop over-carrying; renegotiate burdens and reset scope." },
  },
  "Page of Wands": {
    upright: { en: "Stay curious; test ideas playfully and follow inspiration." },
    reversed: { en: "Ground the spark; avoid impulsive pivots without plan." },
  },
  "Knight of Wands": {
    upright: { en: "Charge ahead; act boldly but keep a map in hand." },
    reversed: { en: "Rein in recklessness; finish what you start before jumping." },
  },
  "Queen of Wands": {
    upright: { en: "Lead with charisma; inspire others and act with warmth." },
    reversed: { en: "Balance confidence with humility; avoid controlling others." },
  },
  "King of Wands": {
    upright: { en: "Set the vision; decide, delegate, and model courage." },
    reversed: { en: "Check impatience; listen to feedback and refine the vision." },
  },
  "Ace of Cups": {
    upright: { en: "Open your heart; share feelings and welcome new emotional starts." },
    reversed: { en: "Unblock the heart; self-soothe, then express safely." },
  },
  "Two of Cups": {
    upright: { en: "Build mutual trust; offer honest connection and reciprocity." },
    reversed: { en: "Restore balance; address unequal effort and set fair exchange." },
  },
  "Three of Cups": {
    upright: { en: "Celebrate together; lean on friends and enjoy community." },
    reversed: { en: "Avoid overindulgence; focus on genuine support, not gossip." },
  },
  "Four of Cups": {
    upright: { en: "Re-engage; notice the opportunity in front of you." },
    reversed: { en: "Leave stagnation; accept the new offer and move." },
  },
  "Five of Cups": {
    upright: { en: "Feel it, then pivot; learn from loss and turn toward what remains." },
    reversed: { en: "Allow recovery; forgive yourself and rejoin life." },
  },
  "Six of Cups": {
    upright: { en: "Enjoy simple kindness; reconnect with supportive memories." },
    reversed: { en: "Release the past; stay present and avoid living in nostalgia." },
  },
  "Seven of Cups": {
    upright: { en: "Clarify options; pick one vision and act to test it." },
    reversed: { en: "Cut illusion; simplify choices and commit." },
  },
  "Eight of Cups": {
    upright: { en: "Walk away from what is empty; seek deeper fulfillment." },
    reversed: { en: "Consider before leaving; ensure you are not escaping work that matters." },
  },
  "Nine of Cups": {
    upright: { en: "Appreciate the wins; share your joy and gratitude." },
    reversed: { en: "Avoid complacency; align pleasure with purpose." },
  },
  "Ten of Cups": {
    upright: { en: "Invest in harmony; nurture family or chosen tribe with care." },
    reversed: { en: "Address cracks; have the needed talk to rebuild trust." },
  },
  "Page of Cups": {
    upright: { en: "Be open-hearted; express creativity and gentle curiosity." },
    reversed: { en: "Temper moodiness; ground feelings before reacting." },
  },
  "Knight of Cups": {
    upright: { en: "Lead with empathy; make the heartfelt offer or invitation." },
    reversed: { en: "Check escapism; match feelings with consistent action." },
  },
  "Queen of Cups": {
    upright: { en: "Hold space; listen deeply and care for emotional tides." },
    reversed: { en: "Protect your energy; set boundaries against emotional drain." },
  },
  "King of Cups": {
    upright: { en: "Lead with emotional maturity; stay calm and steady in support." },
    reversed: { en: "Avoid suppression; speak feelings plainly and avoid manipulation." },
  },
  "Ace of Swords": {
    upright: { en: "Cut to clarity; decide, speak truth, and start with a clear plan." },
    reversed: { en: "Untangle confusion; check facts and rephrase the message." },
  },
  "Two of Swords": {
    upright: { en: "Make a choice; gather data, drop denial, and decide." },
    reversed: { en: "Unblock; remove blindfolds and address the issue directly." },
  },
  "Three of Swords": {
    upright: { en: "Acknowledge pain; process it, learn, and set healing boundaries." },
    reversed: { en: "Begin healing; release resentment and seek support." },
  },
  "Four of Swords": {
    upright: { en: "Rest and reset; step back to recover clarity." },
    reversed: { en: "Do not over-rest; take one restorative action now." },
  },
  "Five of Swords": {
    upright: { en: "Avoid hollow victory; seek de-escalation and fair terms." },
    reversed: { en: "Make amends; drop the fight and repair trust." },
  },
  "Six of Swords": {
    upright: { en: "Move to calmer waters; transition with support and patience." },
    reversed: { en: "Face what you avoid; plan the move instead of drifting." },
  },
  "Seven of Swords": {
    upright: { en: "Be strategic; act with discretion but stay ethical." },
    reversed: { en: "Choose transparency; confess, correct, and rebuild trust." },
  },
  "Eight of Swords": {
    upright: { en: "Challenge the limiting story; take one small freeing step." },
    reversed: { en: "Cut loose; stop self-binding and act on the exit." },
  },
  "Nine of Swords": {
    upright: { en: "Stop the spiral; ground in facts and seek reassurance." },
    reversed: { en: "Release anxiety; ask for help and break the rumination loop." },
  },
  "Ten of Swords": {
    upright: { en: "End the painful cycle; accept the closure and rise anew." },
    reversed: { en: "Recovery starts; learn the lesson and rebuild carefully." },
  },
  "Page of Swords": {
    upright: { en: "Study and speak clearly; test ideas with honest dialogue." },
    reversed: { en: "Curb gossip; verify before speaking and stay concise." },
  },
  "Knight of Swords": {
    upright: { en: "Act decisively; communicate fast and stay on mission." },
    reversed: { en: "Slow the charge; avoid rash words and collateral damage." },
  },
  "Queen of Swords": {
    upright: { en: "Lead with clarity; set boundaries and speak truth with grace." },
    reversed: { en: "Ease harshness; add empathy and listen fully." },
  },
  "King of Swords": {
    upright: { en: "Decide logically; use expertise and deliver a fair verdict." },
    reversed: { en: "Check bias; invite other views and avoid cold detachment." },
  },
  "Ace of Pentacles": {
    upright: { en: "Start the practical build; invest, save, or plant the seed." },
    reversed: { en: "Stabilize finances; fix leaks before new spending." },
  },
  "Two of Pentacles": {
    upright: { en: "Balance resources; prioritize and keep workflow agile." },
    reversed: { en: "Reduce juggling; simplify commitments to regain control." },
  },
  "Three of Pentacles": {
    upright: { en: "Collaborate; align roles, standards, and shared craft." },
    reversed: { en: "Fix misalignment; clarify expectations and quality bars." },
  },
  "Four of Pentacles": {
    upright: { en: "Protect assets; budget wisely and build a secure base." },
    reversed: { en: "Loosen the grip; invest where it truly matters." },
  },
  "Five of Pentacles": {
    upright: { en: "Ask for help; seek resources and step into the warm doorway." },
    reversed: { en: "Recovery is near; accept support and rebuild steadily." },
  },
  "Six of Pentacles": {
    upright: { en: "Give and receive fairly; set clear terms of support." },
    reversed: { en: "Avoid strings; ensure giving or receiving is balanced." },
  },
  "Seven of Pentacles": {
    upright: { en: "Assess progress; keep what works and prune what does not." },
    reversed: { en: "Stop over-waiting; adjust strategy or pivot to better soil." },
  },
  "Eight of Pentacles": {
    upright: { en: "Master your craft; practice with focus and improve details." },
    reversed: { en: "Avoid perfection trap; step back and recalibrate." },
  },
  "Nine of Pentacles": {
    upright: { en: "Enjoy earned comfort; maintain healthy independence." },
    reversed: { en: "Watch isolation or overspending; balance freedom with support." },
  },
  "Ten of Pentacles": {
    upright: { en: "Plan legacy; secure family, assets, and long-term stability." },
    reversed: { en: "Prevent strain; resolve family/finance rifts before they widen." },
  },
  "Page of Pentacles": {
    upright: { en: "Learn by doing; start the course, build the prototype, stay diligent." },
    reversed: { en: "Avoid procrastination; focus on one skill and practice." },
  },
  "Knight of Pentacles": {
    upright: { en: "Work steadily; follow the checklist and build reliable results." },
    reversed: { en: "Break stagnation; tweak the routine and move forward." },
  },
  "Queen of Pentacles": {
    upright: { en: "Provide grounded care; blend practicality with warmth." },
    reversed: { en: "Self-care first; do not deplete yourself to sustain others." },
  },
  "King of Pentacles": {
    upright: { en: "Lead with stability; invest wisely and create dependable value." },
    reversed: { en: "Avoid rigidity or greed; share success and adapt strategy." },
  },
};

export function getCardAdviceLocalized(card: Card, isReversed: boolean, locale: string = "en"): string | undefined {
  const entry = CARD_ADVICE_MAP[card.name];
  if (!entry) return undefined;
  const text = isReversed ? entry.reversed : entry.upright;
  if (locale === "ko" && text.ko) return text.ko;
  return text.en || text.ko;
}
