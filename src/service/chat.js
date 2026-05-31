import { http } from '@/utils/http'

/**
 * AI 语音对话（文字+语音）
 * @param {Object} data - content 文本 / audio 语音base64
 */
export const aiChat = (data) => {
  return http({
    method: 'POST',
    url: '/ai/chat',
    data,
  })
}
