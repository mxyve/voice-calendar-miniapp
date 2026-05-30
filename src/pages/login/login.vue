<template>
  <view class="loginPage" view :style="{ paddingTop: safeAreaInsets.top + 10 + 'px' }">
    <view class="form">
      <view class="extra">
        <view class="options">
          <button type="default" size="mini" @click="wxLogin">
            <text class="icon icon-weixin">微信⼀键登录</text>
          </button>
        </view>
      </view>
      <view class="tips">登录/注册即视为你同意《服务条款》和《隐私协议》</view>
    </view>
  </view>
</template>
<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { myWxLogin, getUserInfo } from '@/service/user'

const { safeAreaInsets } = uni.getSystemInfoSync()
const userStore = useUserStore()

/**
 * 微信登录
 */
const wxLogin = () => {
  // 1.获取⽤户信息
  uni.getUserProfile({
    desc: '获取你的昵称、头像、地区及性别',
    success: (res) => {
      // 2.微信登录
      uni.login({
        provider: 'weixin',
        success: async (loginRes) => {
          // 3.调⽤后台接⼝登录
          const wxLoginRes = await myWxLogin(loginRes.code, res.encryptedData, res.iv)
          if (wxLoginRes.code === 0) {
            uni.showToast({
              title: '登录成功',
              icon: 'success',
            })
            // 4.保存token以及回退⻚⾯
            uni.setStorageSync('token', wxLoginRes.data.accessToken)
            getLoginUserInfo()
            uni.switchTab({
              url: '/pages/index/index',
            })
          } else {
            uni.showToast({
              title: wxLoginRes.msg,
              icon: 'none',
            })
            return
          }
        },
      })
    },
    fail: function (err) {
      uni.showToast({
        title: '获取⽤户信息失败',
        icon: 'none',
      })
    },
  })
}

/**
 * 获取登录后⽤户信息
 */
const getLoginUserInfo = async () => {
  const res = await getUserInfo()
  if (res.code === 0) {
    userStore.setUserInfo(res.data)
  } else {
    uni.showToast({
      title: res.msg,
      icon: 'none',
    })
  }
}
</script>

<style lang="scss" scoped></style>
