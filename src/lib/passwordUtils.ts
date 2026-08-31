export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export const generatePassword = (options: PasswordOptions): string => {
  const charSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
  };

  let validChars = '';
  if (options.uppercase) validChars += charSets.uppercase;
  if (options.lowercase) validChars += charSets.lowercase;
  if (options.numbers) validChars += charSets.numbers;
  if (options.symbols) validChars += charSets.symbols;

  // Fallback if user unchecks everything
  if (!validChars) {
    validChars = charSets.lowercase;
  }

  let generated = '';
  const array = new Uint32Array(options.length);
  window.crypto.getRandomValues(array);
  
  for (let i = 0; i < options.length; i++) {
    generated += validChars[array[i] % validChars.length];
  }
  
  return generated;
};

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * A highly simplified entropy calculator for password strength.
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak';
  
  let entropy = 0;
  if (/[a-z]/.test(password)) entropy += 26;
  if (/[A-Z]/.test(password)) entropy += 26;
  if (/[0-9]/.test(password)) entropy += 10;
  if (/[^a-zA-Z0-9]/.test(password)) entropy += 32;
  
  // Bits of entropy = length * log2(pool_size)
  const bits = password.length * Math.log2(entropy || 1);
  
  if (bits < 40) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 80) return 'good';
  return 'strong';
};

