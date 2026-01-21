/**
 * Tests for src/data/home.ts
 * Validates tarot deck data and service links configuration
 */
import { describe, it, expect } from 'vitest';
import {
  TAROT_DECK,
  TAROT_CARD_BACK,
  SERVICE_LINKS,
  type TarotCard,
  type ServiceLink,
} from '@/data/home';

describe('Home Data', () => {
  describe('TAROT_CARD_BACK', () => {
    it('should be a valid image path', () => {
      expect(TAROT_CARD_BACK).toBe('/images/tarot-main/back.png');
      expect(TAROT_CARD_BACK).toMatch(/\.png$/);
    });
  });

  describe('TAROT_DECK', () => {
    it('should have 78 cards (full tarot deck)', () => {
      expect(TAROT_DECK).toHaveLength(78);
    });

    it('should have 22 Major Arcana cards', () => {
      const majorArcana = TAROT_DECK.filter((card) => !card.suit);
      expect(majorArcana).toHaveLength(22);
    });

    it('should have 56 Minor Arcana cards', () => {
      const minorArcana = TAROT_DECK.filter((card) => card.suit);
      expect(minorArcana).toHaveLength(56);
    });

    describe('Major Arcana', () => {
      it('should start with The Fool (0) and end with The World (XXI)', () => {
        const majorArcana = TAROT_DECK.filter((card) => !card.suit);
        expect(majorArcana[0].name).toBe('THE FOOL');
        expect(majorArcana[0].number).toBe('0');
        expect(majorArcana[21].name).toBe('THE WORLD');
        expect(majorArcana[21].number).toBe('XXI');
      });

      it('should have star icon for all Major Arcana', () => {
        const majorArcana = TAROT_DECK.filter((card) => !card.suit);
        majorArcana.forEach((card) => {
          expect(card.icon).toBe('★');
        });
      });

      it('should include key Major Arcana cards', () => {
        const majorNames = TAROT_DECK.filter((c) => !c.suit).map((c) => c.name);
        expect(majorNames).toContain('THE MAGICIAN');
        expect(majorNames).toContain('THE HIGH PRIESTESS');
        expect(majorNames).toContain('THE EMPRESS');
        expect(majorNames).toContain('THE EMPEROR');
        expect(majorNames).toContain('DEATH');
        expect(majorNames).toContain('THE TOWER');
        expect(majorNames).toContain('THE STAR');
        expect(majorNames).toContain('THE MOON');
        expect(majorNames).toContain('THE SUN');
      });
    });

    describe('Minor Arcana - Suits', () => {
      const suits = ['WANDS', 'CUPS', 'SWORDS', 'PENTACLES'] as const;

      suits.forEach((suit) => {
        it(`should have 14 ${suit} cards`, () => {
          const suitCards = TAROT_DECK.filter((card) => card.suit === suit);
          expect(suitCards).toHaveLength(14);
        });
      });

      it('should have correct icon for Wands (lightning)', () => {
        const wands = TAROT_DECK.filter((card) => card.suit === 'WANDS');
        wands.forEach((card) => {
          expect(card.icon).toBe('⚡');
        });
      });

      it('should have correct icon for Cups (moon)', () => {
        const cups = TAROT_DECK.filter((card) => card.suit === 'CUPS');
        cups.forEach((card) => {
          expect(card.icon).toBe('☾');
        });
      });

      it('should have correct icon for Swords (crossed swords)', () => {
        const swords = TAROT_DECK.filter((card) => card.suit === 'SWORDS');
        swords.forEach((card) => {
          expect(card.icon).toBe('⚔');
        });
      });

      it('should have correct icon for Pentacles (pentagram)', () => {
        const pentacles = TAROT_DECK.filter((card) => card.suit === 'PENTACLES');
        pentacles.forEach((card) => {
          expect(card.icon).toBe('⛤');
        });
      });

      it('should have court cards (Page, Knight, Queen, King) for each suit', () => {
        suits.forEach((suit) => {
          const suitCards = TAROT_DECK.filter((card) => card.suit === suit);
          const courtCards = suitCards.filter((card) =>
            ['P', 'Kn', 'Q', 'K'].includes(card.number)
          );
          expect(courtCards).toHaveLength(4);
        });
      });

      it('should have pip cards (Ace through 10) for each suit', () => {
        suits.forEach((suit) => {
          const suitCards = TAROT_DECK.filter((card) => card.suit === suit);
          const pipCards = suitCards.filter((card) =>
            ['A', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].includes(
              card.number
            )
          );
          expect(pipCards).toHaveLength(10);
        });
      });
    });

    describe('Card Structure', () => {
      it('should have required properties for all cards', () => {
        TAROT_DECK.forEach((card: TarotCard) => {
          expect(card).toHaveProperty('name');
          expect(card).toHaveProperty('nameKo');
          expect(card).toHaveProperty('icon');
          expect(card).toHaveProperty('number');
          expect(card).toHaveProperty('image');

          expect(typeof card.name).toBe('string');
          expect(typeof card.nameKo).toBe('string');
          expect(typeof card.icon).toBe('string');
          expect(typeof card.number).toBe('string');
          expect(typeof card.image).toBe('string');
        });
      });

      it('should have valid image paths for all cards', () => {
        TAROT_DECK.forEach((card) => {
          expect(card.image).toMatch(/^\/images\/tarot-main\/.+\.png$/);
        });
      });

      it('should have non-empty Korean names for all cards', () => {
        TAROT_DECK.forEach((card) => {
          expect(card.nameKo.length).toBeGreaterThan(0);
        });
      });

      it('should have unique image paths', () => {
        const imagePaths = TAROT_DECK.map((card) => card.image);
        const uniquePaths = new Set(imagePaths);
        expect(uniquePaths.size).toBe(imagePaths.length);
      });

      it('should have unique English names', () => {
        const names = TAROT_DECK.map((card) => card.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });
    });

    describe('Korean Translations', () => {
      it('should have correct Korean name for The Fool', () => {
        const fool = TAROT_DECK.find((c) => c.name === 'THE FOOL');
        expect(fool?.nameKo).toBe('바보');
      });

      it('should have correct Korean name for Death', () => {
        const death = TAROT_DECK.find((c) => c.name === 'DEATH');
        expect(death?.nameKo).toBe('죽음');
      });

      it('should have correct Korean name for suit cards', () => {
        const aceOfWands = TAROT_DECK.find((c) => c.name === 'ACE OF WANDS');
        expect(aceOfWands?.nameKo).toBe('완드 에이스');

        const kingOfCups = TAROT_DECK.find((c) => c.name === 'KING OF CUPS');
        expect(kingOfCups?.nameKo).toBe('컵 왕');
      });
    });
  });

  describe('SERVICE_LINKS', () => {
    it('should have multiple service links', () => {
      expect(SERVICE_LINKS.length).toBeGreaterThan(0);
    });

    it('should have required properties for all links', () => {
      SERVICE_LINKS.forEach((link: ServiceLink) => {
        expect(link).toHaveProperty('key');
        expect(link).toHaveProperty('href');
        expect(link).toHaveProperty('icon');

        expect(typeof link.key).toBe('string');
        expect(typeof link.href).toBe('string');
        expect(typeof link.icon).toBe('string');
      });
    });

    it('should have valid href paths starting with /', () => {
      SERVICE_LINKS.forEach((link) => {
        expect(link.href).toMatch(/^\//);
      });
    });

    it('should have unique keys', () => {
      const keys = SERVICE_LINKS.map((link) => link.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should have unique hrefs', () => {
      const hrefs = SERVICE_LINKS.map((link) => link.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });

    it('should include core services', () => {
      const keys = SERVICE_LINKS.map((link) => link.key);
      expect(keys).toContain('destinyMap');
      expect(keys).toContain('tarot');
      expect(keys).toContain('calendar');
      expect(keys).toContain('compatibility');
    });

    it('should have emoji icons', () => {
      SERVICE_LINKS.forEach((link) => {
        // Icons should be non-empty and typically emoji
        expect(link.icon.length).toBeGreaterThan(0);
      });
    });

    it('should have comingSoon as optional boolean', () => {
      SERVICE_LINKS.forEach((link) => {
        if (link.comingSoon !== undefined) {
          expect(typeof link.comingSoon).toBe('boolean');
        }
      });
    });

    describe('Specific Service Links', () => {
      it('should have destiny-map link', () => {
        const destinyMap = SERVICE_LINKS.find((l) => l.key === 'destinyMap');
        expect(destinyMap).toBeDefined();
        expect(destinyMap?.href).toBe('/destiny-map');
      });

      it('should have tarot link', () => {
        const tarot = SERVICE_LINKS.find((l) => l.key === 'tarot');
        expect(tarot).toBeDefined();
        expect(tarot?.href).toBe('/tarot');
        expect(tarot?.icon).toContain('🔮');
      });

      it('should have calendar link', () => {
        const calendar = SERVICE_LINKS.find((l) => l.key === 'calendar');
        expect(calendar).toBeDefined();
        expect(calendar?.href).toBe('/calendar');
      });

      it('should have dream link', () => {
        const dream = SERVICE_LINKS.find((l) => l.key === 'dream');
        expect(dream).toBeDefined();
        expect(dream?.href).toBe('/dream');
        expect(dream?.icon).toContain('🌙');
      });

      it('should have compatibility link', () => {
        const compatibility = SERVICE_LINKS.find((l) => l.key === 'compatibility');
        expect(compatibility).toBeDefined();
        expect(compatibility?.href).toBe('/compatibility');
      });
    });
  });
});
