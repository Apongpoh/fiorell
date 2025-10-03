// Shared validation & sanitization helpers

export function isObjectId(id: any): boolean {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

export function sanitizeCity(input: string): string {
  return input.replace(/[<>]/g,'').trim().slice(0,100);
}

export function sanitizeBio(input: string): string {
  const cleaned = input.replace(/\s+/g,' ').replace(/[<>]/g,'').trim();
  return cleaned.slice(0,500);
}

export function validateInterests(list: any): string[] {
  if (!Array.isArray(list)) return [];
  const unique = Array.from(new Set(list.map(i => String(i).trim()).filter(Boolean)));
  return unique.slice(0,25); // cap at 25 for safety
}
