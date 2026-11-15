// Themed Diceware Passphrase Generator

export type PassphraseTheme = 'scifi' | 'fantasy' | 'cooking' | 'cyberpunk' | 'nature';

const WORD_LISTS: Record<PassphraseTheme, string[]> = {
  scifi: [
    'laser', 'orbit', 'matrix', 'quantum', 'pulsar', 'nebula', 'warp', 'android', 'photon', 'vortex',
    'titan', 'starlight', 'chrono', 'beacon', 'cruiser', 'galaxy', 'hyper', 'zenith', 'plasma', 'relay',
    'cosmic', 'neutron', 'stellar', 'horizon', 'solaris', 'cyborg', 'quasar', 'shuttle', 'station', 'gravity',
    'void', 'cluster', 'astral', 'vector', 'thruster', 'probe', 'module', 'interstellar', 'eclipse', 'teleport',
    'singularity', 'capsule', 'docking', 'pulsing', 'ion', 'nanite', 'subspace', 'sensor', 'core', 'warpfield'
  ],
  fantasy: [
    'goblin', 'dagger', 'ancient', 'frost', 'dragon', 'paladin', 'elven', 'castle', 'potion', 'mystic',
    'chalice', 'shield', 'crystal', 'sorcerer', 'tavern', 'knight', 'grimoire', 'crown', 'arcane', 'sword',
    'dungeon', 'whisper', 'shadow', 'lantern', 'ranger', 'spire', 'citadel', 'phoenix', 'ember', 'cleric',
    'monarch', 'scepter', 'mythic', 'amulet', 'forest', 'alchemy', 'scroll', 'quiver', 'bastion', 'relic',
    'spell', 'valkyrie', 'enchant', 'blade', 'cavern', 'forge', 'chasm', 'helm', 'sanctum', 'wraith'
  ],
  cooking: [
    'basil', 'simmer', 'crispy', 'garlic', 'saffron', 'pepper', 'roast', 'truffle', 'caramel', 'whisk',
    'cinnamon', 'vanilla', 'olive', 'parmesan', 'ginger', 'honey', 'citrus', 'basting', 'thyme', 'paprika',
    'braise', 'sizzle', 'brioche', 'hazelnut', 'custard', 'glaze', 'rosemary', 'fondue', 'panfry', 'cider',
    'shallot', 'zest', 'bacon', 'oregano', 'marinade', 'croissant', 'clove', 'butter', 'fennel', 'almond',
    'sauce', 'drizzle', 'skillet', 'casserole', 'barbecue', 'nutmeg', 'pastry', 'risotto', 'poach', 'tarragon'
  ],
  cyberpunk: [
    'glitch', 'neon', 'terminal', 'phantom', 'daemon', 'synapse', 'neural', 'proxy', 'chrome', 'bypass',
    'subgrid', 'datagram', 'override', 'uplink', 'sector', 'crypto', 'shadow', 'protocol', 'circuit', 'fiber',
    'backdoor', 'payload', 'buffer', 'packet', 'kernel', 'silicon', 'tracer', 'vector', 'breach', 'mainframe',
    'corridor', 'sublevel', 'keychain', 'rootkit', 'hexcode', 'bitmask', 'node', 'firewall', 'cipher', 'socket',
    'matrix', 'synthetic', 'hardwire', 'decoder', 'signal', 'exploit', 'stream', 'cascade', 'splice', 'nexus'
  ],
  nature: [
    'summit', 'river', 'willow', 'thunder', 'canyon', 'meadow', 'pebble', 'glacier', 'forest', 'breeze',
    'quartz', 'valley', 'fossil', 'geyser', 'cascade', 'horizon', 'monsoon', 'evergreen', 'tundra', 'boulder',
    'lagoon', 'stream', 'autumn', 'ridge', 'crater', 'lichen', 'solstice', 'timber', 'prairie', 'bluff',
    'rapids', 'wildwood', 'tempest', 'rainstorm', 'bamboo', 'estuary', 'moss', 'granite', 'ravine', 'savanna',
    'watershed', 'plateau', 'cedar', 'cliff', 'current', 'delta', 'highland', 'foothill', 'creek', 'drift'
  ]
};

export function generateThemedPassphrase(
  theme: PassphraseTheme = 'scifi',
  wordCount = 4,
  separator = '-',
  includeNumber = true
): string {
  const list = WORD_LISTS[theme] || WORD_LISTS.scifi;
  const pickedWords: string[] = [];

  // Cryptographically random word selection
  const randomBuffer = new Uint32Array(wordCount);
  globalThis.crypto.getRandomValues(randomBuffer);

  for (let i = 0; i < wordCount; i++) {
    const idx = randomBuffer[i] % list.length;
    pickedWords.push(list[idx]);
  }

  let result = pickedWords.join(separator);
  if (includeNumber) {
    const numBuffer = new Uint16Array(1);
    globalThis.crypto.getRandomValues(numBuffer);
    const suffix = (numBuffer[0] % 900) + 100; // 3 digits
    result += `${separator}${suffix}`;
  }

  return result;
}
