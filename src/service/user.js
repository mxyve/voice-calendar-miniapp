import { http } from '@/utils/http'

/**
 * 微信登录
 * @param code 微信登录code
 * @param encryptedData 加密数据
 * @param iv 加密算法的初始向量
 * @returns
 */
export const myWxLogin = (code, encryptedData, iv) => {
  return http({
    method: 'POST',
    url: '/auth/weChatLogin',
    data: {
      code,
      encryptedData,
      iv,
    },
  })
}

/**
 * 退出登录
 * @returns
 */
export const logout = () => {
  return http({
    method: 'POST',
    url: '/auth/logout',
  })
}

/**
 * 获取⽤户信息
 * @returns
 */
export const getUserInfo = () => {
  return http({
    method: 'GET',
    url: '/user/info',
  })
}
