<template>
  <view class="index" :style="{ paddingTop: safeAreaInsets.top + 10 + 'px' }">
    <view>⽤户信息：{{ userStore.userInfo }}</view>
    <uni-section title="设置" type="line">
      <uni-list>
        <uni-list-item showArrow title="去登录" :to="`/pages/login/login`" />
      </uni-list>
    </uni-section>

    <button @tap="handleQuitClick" size="mini" plain type="warn">退出</button>
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { logout } from '@/service/user'

const { safeAreaInsets } = uni.getSystemInfoSync()
const userStore = useUserStore()

/**
 * 退出登录
 */
const handleQuitClick = () => {
  uni.showModal({
    title: '你确定要退出吗?',
    success: async (res) => {
      if (res.confirm) {
        const res = await logout()
        if (res.code === 0) {
          userStore.clearUserInfo()
          uni.removeStorageSync('token')
          uni.showToast({
            title: '退出登录成功',
          })
          uni.reLaunch({
            url: '/pages/login/login',
          })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
page {
  background-color: #f7f7f7;
  height: 100%;
  overflow: hidden;
}
.index {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
