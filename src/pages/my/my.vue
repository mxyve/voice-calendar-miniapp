<template>
  <view class="profile-screen">
    <!-- 装饰云朵 -->
    <view class="cloud-deco c1"></view>
    <view class="cloud-deco c2"></view>

    <!-- 顶部标题栏 -->
    <view class="top-bar">
      <view class="page-title">个人中心</view>
    </view>

    <!-- 用户信息区域 -->
    <view class="user-info">
      <!-- 头像 -->
      <image
        class="avatar"
        :src="userStore.userInfo?.avatar || '/static/icon/avatar.svg'"
        mode="widthFix"
      ></image>
      <!-- 昵称 -->
      <view class="username">
        {{ userStore.userInfo?.nickName || '微信用户' }}
      </view>
      <view class="login-type">微信登录 · 语音日历用户</view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-btn" @tap="handleQuitClick">退出登录</view>
  </view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { logout } from '@/service/user'

const userStore = useUserStore()

// 跳转到首页
const goHome = () => {
  uni.switchTab({
    url: '/pages/index/index',
  })
}

/**
 * 退出登录
 */
const handleQuitClick = () => {
  uni.showModal({
    title: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        const { code } = await logout()
        if (code === 0) {
          // 清空用户信息和token
          userStore.clearUserInfo()
          uni.removeStorageSync('token')

          uni.showToast({
            title: '退出成功',
            icon: 'success',
          })

          // 跳转到登录页
          uni.reLaunch({
            url: '/pages/login/login',
          })
        }
      }
    },
  })
}

// 未登录自动跳登录页
onMounted(() => {
  const token = uni.getStorageSync('token')
  if (!token || !userStore.userInfo.userId) {
    uni.reLaunch({ url: '/pages/login/login' })
  }
})
</script>

<style lang="scss" scoped>
/* 全局页面样式 */
page {
  background: #2b3345;
  height: 100vh;
  overflow: hidden;
}

/* 主容器 - 渐变背景 */
.profile-screen {
  min-height: 100vh;
  background: linear-gradient(180deg, #87ceeb 0%, #b8d8f0 40%, #d4e8f5 100%);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 云朵装饰 */
.cloud-deco {
  position: absolute;
  pointer-events: none;
  opacity: 0.6;
}
.c1 {
  top: 120px;
  right: -40px;
  width: 160px;
  height: 90px;
  background: white;
  border-radius: 100px;
  filter: blur(22px);
}
.c2 {
  bottom: 200px;
  left: -30px;
  width: 140px;
  height: 80px;
  background: white;
  border-radius: 100px;
  filter: blur(20px);
}

/* 顶部栏 */
.top-bar {
  padding: 20px;
  padding-top: 60px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  position: relative;
  z-index: 2;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #2a6a8a;
}

/* 用户信息 */
.user-info {
  padding: 40px 20px;
  text-align: center;
  z-index: 2;
}
.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5ca0d0, #3a7eb0);
  margin: 0 auto 20px;
  object-fit: contain;
  display: block;
}
.username {
  font-size: 22px;
  font-weight: 700;
  color: #2a5a7a;
  margin-bottom: 6px;
}
.login-type {
  font-size: 13px;
  color: #4a8aaa;
}

/* 退出按钮 */
.logout-btn {
  margin: 30px 20px;
  padding: 18px;
  background: rgba(74, 154, 200, 0.15);
  color: #4a9ac8;
  border-radius: 100px;
  text-align: center;
  font-weight: 600;
  z-index: 2;
}
</style>
