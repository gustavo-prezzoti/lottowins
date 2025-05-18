/**
 * Utilitários para manipulação de URLs
 */

/**
 * Converte URLs HTTP para HTTPS para evitar problemas de conteúdo misto
 * Importante para exibição de imagens e outros recursos em páginas HTTPS
 * 
 * @param url A URL para converter
 * @returns A URL convertida para HTTPS ou null se a URL for null
 */
export function ensureHttps(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Verifica se uma URL é absoluta (começa com http:// ou https://)
 * 
 * @param url A URL para verificar
 * @returns true se a URL for absoluta, false caso contrário
 */
export function isAbsoluteUrl(url: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

/**
 * Completa uma URL relativa com a URL base
 * 
 * @param baseUrl A URL base a ser usada
 * @param url A URL relativa a ser completada ou uma URL absoluta a ser retornada
 * @returns A URL completa ou null se a URL for null
 */
export function completeUrl(baseUrl: string, url: string | null): string | null {
  if (!url) return null;
  if (isAbsoluteUrl(url)) return url;
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

/**
 * Garante que uma URL de mídia seja HTTPS e completa
 * Combina as funções ensureHttps e completeUrl
 * 
 * @param url A URL de mídia (pode ser relativa ou absoluta)
 * @param baseUrl A URL base opcional (ex: 'https://server.lottowins.online')
 * @returns A URL de mídia completa e segura (HTTPS)
 */
export function getSecureMediaUrl(url: string | null, baseUrl?: string): string | null {
  if (!url) return null;
  
  let fullUrl = url;
  if (baseUrl && !isAbsoluteUrl(url)) {
    fullUrl = completeUrl(baseUrl, url) || url;
  }
  
  return ensureHttps(fullUrl);
} 