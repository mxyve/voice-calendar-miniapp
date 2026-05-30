<template>
  <view class="index" :style="{ paddingTop: safeAreaInsets.top + 10 + 'px' }"> </view>
</template>
<script setup>
// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
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
