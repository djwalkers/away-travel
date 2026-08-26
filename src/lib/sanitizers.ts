/**
 * Sanitizes phone numbers for WhatsApp international links (e.g. 447779289053)
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return ''
  let clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('44')) return clean
  if (clean.startsWith('0')) return '44' + clean.slice(1)
  return clean
}

/**
 * Prevents CSV / Excel Formula Injection (CSV Injection / CWE-1236)
 */
export function sanitizeCSVField(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  // If field starts with =, +, -, @, or tab, prefix with single quote
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`
  }
  return `"${str.replace(/"/g, '""')}"`
}
