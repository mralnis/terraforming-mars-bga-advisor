// SLIM TEST DB - generated for replay verification (16 cards)
import { Card, CardType, Tag, Expansion, CardEvaluation } from '../types/index.js';

export const ALL_CARDS: Card[] = [
  { id: 40, name: 'Asteroid Mining', cost: 30, type: CardType.Automated, tags: [Tag.Jovian, Tag.Space], expansion: Expansion.Base, hasAction: false, victoryPoints: 2 },
  { id: 22, name: 'Black Polar Dust', cost: 15, type: CardType.Automated, tags: [], expansion: Expansion.Base, hasAction: false },
  { id: 16, name: 'Domed Crater', cost: 24, type: CardType.Automated, tags: [Tag.City, Tag.Building], expansion: Expansion.Base, hasAction: false, victoryPoints: 1 },
  { id: 81, name: 'Ganymede Colony', cost: 20, type: CardType.Automated, tags: [Tag.Jovian, Tag.Space, Tag.City], expansion: Expansion.Base, hasAction: false, victoryPoints: 1 },
  { id: 87, name: 'Grass', cost: 11, type: CardType.Automated, tags: [Tag.Plant], expansion: Expansion.Base, hasAction: false },
  { id: 55, name: 'Kelp Farming', cost: 17, type: CardType.Automated, tags: [Tag.Plant], expansion: Expansion.Base, hasAction: false, victoryPoints: 1 },
  { id: 1003, name: 'EcoLine', cost: 0, type: CardType.Corporation, tags: [Tag.Plant], expansion: Expansion.Base, hasAction: false },
  { id: 125, name: 'Hackers', cost: 3, type: CardType.Automated, tags: [], expansion: Expansion.CorporateEra, hasAction: false, victoryPoints: -1 },
  { id: 151, name: 'Investment Loan', cost: 3, type: CardType.Event, tags: [Tag.Earth], expansion: Expansion.CorporateEra, hasAction: false },
  { id: 86, name: 'Robotic Workforce', cost: 9, type: CardType.Automated, tags: [Tag.Science], expansion: Expansion.CorporateEra, hasAction: false },
  { id: 197, name: 'Terraforming Ganymede', cost: 33, type: CardType.Automated, tags: [Tag.Jovian, Tag.Space], expansion: Expansion.CorporateEra, hasAction: false, victoryPoints: 2 },
  { id: 1022, name: 'Valley Trust', cost: 0, type: CardType.Corporation, tags: [Tag.Earth], expansion: Expansion.Prelude, hasAction: false },
  { id: 2002, name: 'Aquifer Turbines', cost: 0, type: CardType.Prelude, tags: [Tag.Power], expansion: Expansion.Prelude, hasAction: false },
  { id: 2008, name: 'Donation', cost: 0, type: CardType.Prelude, tags: [], expansion: Expansion.Prelude, hasAction: false },
  { id: 2026, name: 'Polar Industries', cost: 0, type: CardType.Prelude, tags: [Tag.Building], expansion: Expansion.Prelude, hasAction: false },
  { id: 2031, name: 'Society Support', cost: 0, type: CardType.Prelude, tags: [], expansion: Expansion.Prelude, hasAction: false },
];

export const EVALUATIONS: CardEvaluation[] = [
  { cardId: 1003, name: 'EcoLine', tier: 'A', baseScore: 85, reasoning: '', synergies: ['Ecology Experts', 'Kelp Farming', 'Nitrophilic Moss', 'Farming', 'Gardener'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 1022, name: 'Valley Trust', tier: 'B', baseScore: 70, reasoning: '', synergies: ['Research', 'Mars University', 'Olympus Conference', 'Merger'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 2026, name: 'Polar Industries', tier: 'B', baseScore: 74, reasoning: '', synergies: ['Helion', 'Ecoline', 'Robotic Workforce', 'Nitrogen-Rich Asteroid'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 2002, name: 'Aquifer Turbines', tier: 'B', baseScore: 72, reasoning: '', synergies: ['Strip Mine', 'Electro Catapult', 'Thorgate', 'Power Infrastructure'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 2008, name: 'Donation', tier: 'D', baseScore: 45, reasoning: '', synergies: ['Io Mining Industries', 'Terraforming Ganymede', 'Large Convoy'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 2031, name: 'Society Support', tier: 'F', baseScore: 30, reasoning: '', synergies: ['Caretaker Contract', 'GHG Factories'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 55, name: 'Kelp Farming', tier: 'A', baseScore: 87, reasoning: '', synergies: ['Ecology Experts', 'Arctic Algae', 'Insects'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 197, name: 'Terraforming Ganymede', tier: 'A', baseScore: 85, reasoning: '', synergies: ['Io Mining Industries', 'Ganymede Colony', 'Jupiter Floating Station', 'Wild tags'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 81, name: 'Ganymede Colony', tier: 'B', baseScore: 75, reasoning: '', synergies: ['Io Mining Industries', 'Vesta Shipyard', 'Callisto Penal Mines'], timingBias: 10, tagSynergyWeights: {} },
  { cardId: 86, name: 'Robotic Workforce', tier: 'B', baseScore: 74, reasoning: '', synergies: ['Mohole Area', 'Fusion Power', 'Field Capped City', 'Cheung Shing Mars'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 16, name: 'Domed Crater', tier: 'C', baseScore: 67, reasoning: '', synergies: ['Ecoline', 'Immigrant City', 'Pets'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 151, name: 'Investment Loan', tier: 'C', baseScore: 64, reasoning: '', synergies: ['Earth Office', 'Media Group'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 87, name: 'Grass', tier: 'C', baseScore: 62, reasoning: '', synergies: ['Ecoline', 'Insects', 'Viral Enhancers', 'Ecological Zone'], timingBias: 10, tagSynergyWeights: {} },
  { cardId: 40, name: 'Asteroid Mining', tier: 'C', baseScore: 67, reasoning: '', synergies: ['Phobolog', 'Mass Converter', 'Advanced Alloys'], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 125, name: 'Hackers', tier: 'D', baseScore: 48, reasoning: '', synergies: [], timingBias: 0, tagSynergyWeights: {} },
  { cardId: 22, name: 'Black Polar Dust', tier: 'D', baseScore: 42, reasoning: '', synergies: ['GHG Factories', 'Caretaker Contract'], timingBias: 0, tagSynergyWeights: {} },
];