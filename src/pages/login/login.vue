<template>
  <view class="loginPage">
    <!-- 装饰云朵（毛玻璃效果） -->
    <view class="cloud-deco cloud-1"></view>
    <view class="cloud-deco cloud-2"></view>
    <view class="cloud-deco cloud-3"></view>

    <view class="login-content">
      <!-- Logo 区域 -->
      <view class="logo-area">
        <image class="logo-icon" src="/static/images/logo.png" mode="aspectFill"></image>
        <view class="app-title">语音智能日历</view>
        <view class="app-desc">轻松管理每一天</view>
      </view>

      <!-- 登录按钮区域 -->
      <view class="login-btn-wrapper">
        <button
          class="wx-login-btn"
          :class="{ 'btn-loading': isLogining }"
          @click="wxLogin"
          :disabled="isLogining"
          hover-class="btn-hover"
          :hover-stay-time="100"
        >
          <text class="btn-text">{{ isLogining ? '登录中...' : '微信一键登录' }}</text>
        </button>
        <view class="tips">仅用于身份验证，保护隐私安全</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { myWxLogin, getUserInfo } from '@/service/user'

const userStore = useUserStore()
const isLogining = ref(false)

/**
 * 微信登录
 */
const wxLogin = () => {
  if (isLogining.value) return
  isLogining.value = true

  // 1.获取用户信息
  uni.getUserProfile({
    desc: '获取你的昵称、头像、地区及性别',
    success: (res) => {
      // 2.微信登录
      uni.login({
        provider: 'weixin',
        success: async (loginRes) => {
          // 3.调用后台接口登录
          const wxLoginRes = await myWxLogin(loginRes.code, res.encryptedData, res.iv)
          if (wxLoginRes.code === 0) {
            uni.showToast({
              title: '登录成功',
              icon: 'success',
            })
            // 4.保存token以及回退页面
            uni.setStorageSync('token', wxLoginRes.data.accessToken)
            await getLoginUserInfo()
            isLogining.value = false
            uni.switchTab({
              url: '/pages/index/index',
            })
          } else {
            uni.showToast({
              title: wxLoginRes.msg,
              icon: 'none',
            })
            isLogining.value = false
          }
        },
        fail: (err) => {
          uni.showToast({
            title: '微信登录失败',
            icon: 'none',
          })
          isLogining.value = false
        },
      })
    },
    fail: (err) => {
      uni.showToast({
        title: '获取用户信息失败',
        icon: 'none',
      })
      isLogining.value = false
    },
  })
}

/**
 * 获取登录后用户信息
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

<style lang="scss" scoped>
.loginPage {
  min-height: 100vh;
  background: linear-gradient(180deg, #87ceeb 0%, #b8d8f0 40%, #d4e8f5 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 装饰云朵 - 毛玻璃效果 */
.cloud-deco {
  position: absolute;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 100px;
  filter: blur(20px);
  z-index: 0;
}

.cloud-1 {
  top: 60px;
  left: -30px;
  width: 160px;
  height: 100px;
}

.cloud-2 {
  bottom: 150px;
  right: -25px;
  width: 140px;
  height: 85px;
}

.cloud-3 {
  top: 40%;
  left: -20px;
  width: 100px;
  height: 70px;
  opacity: 0.5;
}

/* 登录主要内容区域 */
.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 32rpx;
}

/* Logo 区域 */
.logo-area {
  text-align: center;
  margin-bottom: 100rpx;
  animation: fadeInUp 0.6s ease-out;
}

.logo-icon {
  width: 180rpx;
  height: 180rpx;
  border-radius: 60rpx;
  display: block;
  margin: 0 auto 30rpx;
  box-shadow: 0 16rpx 32rpx rgba(74, 154, 200, 0.3);
}

.app-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #2a6a8a;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}

.app-desc {
  font-size: 28rpx;
  color: #4a8aaa;
  letter-spacing: 2rpx;
}

/* 登录按钮区域 */
.login-btn-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40rpx;
  animation: fadeInUp 0.8s ease-out;
}

.wx-login-btn {
  width: 560rpx;
  padding: 32rpx 0;
  background: #12b7f5;
  border-radius: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 16rpx 32rpx rgba(18, 183, 245, 0.35);
  transition:
    transform 0.2s,
    opacity 0.2s;
  border: none;
  margin: 0;
  line-height: 1;

  // 去除小程序 button 默认样式
  &::after {
    border: none;
    background: transparent;
  }

  // 普通点击态 - 保持颜色不变，仅轻微缩放
  &.btn-hover {
    transform: scale(0.96);
    opacity: 0.9;
    background: #12b7f5;
  }

  // 加载状态
  &.btn-loading {
    opacity: 0.8;
    pointer-events: none;
  }

  .btn-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #ffffff;
  }
}

// 禁用 button 原生按下白色背景
button {
  background-color: transparent;
}

button[disabled] {
  opacity: 0.8;
  background: #12b7f5;
}

.tips {
  margin-top: 32rpx;
  font-size: 24rpx;
  color: #5a8aaa;
  text-align: center;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
