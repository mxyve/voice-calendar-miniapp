<template>
  <view class="index" :style="{ paddingTop: safeAreaInsets.top + 10 + 'px' }">
    <!-- 顶部用户栏 -->
    <view class="header">
      <view class="user-info">
        <image class="avatar" src="/static/icon/avatar.svg" mode="aspectFill" />
        <text class="user-name">小云</text>
      </view>
    </view>

    <!-- 日历卡片 -->
    <view class="calendar-card">
      <view class="calendar-header">
        <view class="arrow-btn" @click="prevMonth">
          <image src="/static/icon/arrow-left.svg" mode="aspectFill" />
        </view>
        <text class="title">{{ currentYear }}年{{ currentMonth }}月</text>
        <view class="arrow-btn" @click="nextMonth">
          <image src="/static/icon/arrow-right.svg" mode="aspectFill" />
        </view>
      </view>

      <!-- 星期头 -->
      <view class="week-header">
        <text class="week-item" v-for="w in weeks" :key="w">{{ w }}</text>
      </view>

      <!-- 日期网格 -->
      <view class="days-grid">
        <view
          class="day-item"
          v-for="(day, index) in days"
          :key="index"
          :class="{
            'other-month': day.otherMonth,
            active: day.active,
            'has-event': day.hasEvent,
          }"
          @click="selectDay(day)"
        >
          {{ day.day }}
        </view>
      </view>
    </view>

    <!-- 日程卡片 -->
    <view class="schedule-card">
      <view class="card-header">
        <image src="/static/icon/schedule.svg" mode="aspectFill" class="header-icon" />
        <text class="header-title">{{ selectedDateTitle }}日程</text>
        <view style="flex: 1"></view>
        <view class="add-btn" @click="goAddPage">+ 新增</view>
      </view>

      <!-- 使用 uni-swipe-action 实现左滑删除 -->
      <uni-swipe-action v-for="item in todaySchedules" :key="item.id" :auto-close="true">
        <uni-swipe-action-item
          :right-options="[{ text: '删除', type: 'error' }]"
          @click="deleteSchedule(item.id)"
        >
          <view class="schedule-item">
            <view class="item-left">
              <view class="time">
                <image src="/static/icon/clock.svg" mode="aspectFill" class="time-icon" />
                <text>{{ item.scheduleTime ? item.scheduleTime.substring(0, 5) : '全天' }}</text>
              </view>
              <text class="title">{{ item.title }}</text>
              <text class="desc">{{ item.content }}</text>
            </view>
          </view>
        </uni-swipe-action-item>
      </uni-swipe-action>

      <!-- 空状态 -->
      <view v-if="todaySchedules.length === 0" class="empty-schedule">
        <text>暂无日程，点击右上角新增～</text>
      </view>
    </view>

    <!-- 语音按钮 -->
    <view class="mic-btn" @click="openVoiceModal">
      <image src="/static/icon/mic.svg" mode="aspectFill" />
    </view>
  </view>

  <!-- 日程弹窗 -->
  <AddSchedulePopup
    :visible="showAddPopup"
    :defaultDate="selectedDate"
    @close="showAddPopup = false"
    @success="onAddSuccess"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getScheduleByDate, deleteScheduleApi, getScheduleByMonth } from '@/service/calendar.js'
import AddSchedulePopup from '@/components/AddSchedulePopup.vue'

const { safeAreaInsets } = uni.getSystemInfoSync()

const weeks = ['日', '一', '二', '三', '四', '五', '六']
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const days = ref([])
const todaySchedules = ref([])
const selectedDate = ref('')
const eventDates = ref(new Set())
const showAddPopup = ref(false)

// 计算属性：将 selectedDate 转换为显示格式
const selectedDateTitle = computed(() => {
  if (!selectedDate.value) return '今日'
  const parts = selectedDate.value.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
})

// 日历渲染
const renderCalendar = () => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const prevMonthLastDay = new Date(year, month - 1, 0)
  const list = []

  const firstDayWeek = firstDay.getDay()
  for (let i = firstDayWeek; i > 0; i--) {
    list.push({
      day: prevMonthLastDay.getDate() - i + 1,
      otherMonth: true,
      active: false,
      hasEvent: false,
      fullDate: `${year}-${String(month - 1).padStart(2, '0')}-${String(prevMonthLastDay.getDate() - i + 1).padStart(2, '0')}`,
    })
  }

  const today = new Date()
  for (let i = 1; i <= lastDay.getDate(); i++) {
    list.push({
      day: i,
      otherMonth: false,
      active:
        year === today.getFullYear() && month === today.getMonth() + 1 && i === today.getDate(),
      hasEvent: false,
      fullDate: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    })
  }

  const rest = 42 - list.length
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  for (let i = 1; i <= rest; i++) {
    list.push({
      day: i,
      otherMonth: true,
      active: false,
      hasEvent: false,
      fullDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    })
  }
  days.value = list
  updateDaysHasEvent()
}

// 切换月份
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  renderCalendar()
  loadMonthEventDates()
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  renderCalendar()
  loadMonthEventDates()
}

// 获取当月有日程的日期（用于显示小红点）
const loadMonthEventDates = async () => {
  try {
    const res = await getScheduleByMonth(currentYear.value, currentMonth.value)
    const dates = res.data || []
    eventDates.value = new Set(dates)
    updateDaysHasEvent()
  } catch (error) {
    console.error('获取月份日程失败', error)
  }
}

// 更新日历中每一天的 hasEvent 标记
const updateDaysHasEvent = () => {
  days.value.forEach((day) => {
    if (!day.otherMonth && day.fullDate) {
      day.hasEvent = eventDates.value.has(day.fullDate)
    } else {
      day.hasEvent = false
    }
  })
}

// 查询日程
const selectDay = async (day) => {
  if (day.otherMonth) return
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
  selectedDate.value = dateStr

  try {
    const res = await getScheduleByDate(dateStr)
    console.log('查询日程', res)
    todaySchedules.value = (res.data || []).map((item) => ({
      ...item,
      translateX: 0,
    }))
  } catch (error) {
    console.error('查询日程失败', error)
    todaySchedules.value = []
  }
}

// 删除日程
const deleteSchedule = async (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个日程吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteScheduleApi(id)
          await selectDay({
            day: parseInt(selectedDate.value.split('-')[2]),
            otherMonth: false,
          })
          await loadMonthEventDates()
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

// 去新增页面打开弹窗
const goAddPage = () => {
  showAddPopup.value = true
}

// 添加成功回调
const onAddSuccess = () => {
  selectDay({
    day: parseInt(selectedDate.value.split('-')[2]),
    otherMonth: false,
  })
  loadMonthEventDates()
}

// 语音
const openVoiceModal = () => {
  uni.showToast({ title: '语音功能开发中', icon: 'none' })
}

onMounted(() => {
  renderCalendar()
  loadMonthEventDates()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  selectedDate.value = todayStr
  selectDay({
    day: today.getDate(),
    otherMonth: false,
    fullDate: todayStr,
  })
})
</script>

<style lang="scss" scoped>
page {
  background-color: #e0f0ff;
  height: 100%;
  overflow: hidden;
}
.index {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50rpx;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
  .user-info {
    display: flex;
    align-items: center;
    gap: 16rpx;
    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      background: #cce5ff;
    }
    .user-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
}

.calendar-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 32rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    .arrow-btn {
      width: 60rpx;
      height: 60rpx;
      background: #f0f7ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      image {
        width: 30rpx;
        height: 30rpx;
      }
    }
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }
  .week-header {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20rpx;
    .week-item {
      font-size: 28rpx;
      color: #666;
      width: 10%;
      text-align: center;
    }
  }
  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 10rpx;
    .day-item {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      border-radius: 50%;
      position: relative;
      &.other-month {
        color: #ccc;
      }
      &.active {
        background: #409eff;
        color: #fff;
      }
      &.has-event::after {
        content: '';
        position: absolute;
        bottom: 8rpx;
        width: 8rpx;
        height: 8rpx;
        background: #409eff;
        border-radius: 50%;
      }
    }
  }
}

.schedule-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 32rpx;
  padding: 30rpx;
  flex: 1;
  overflow-y: auto;
  margin-top: 20rpx;

  .card-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
    .header-icon {
      width: 40rpx;
      height: 40rpx;
    }
    .header-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    .add-btn {
      background: #409eff;
      color: #fff;
      font-size: 26rpx;
      padding: 8rpx 20rpx;
      border-radius: 30rpx;
    }
  }

  .schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

    .item-left {
      flex: 1;
      .time {
        display: flex;
        align-items: center;
        gap: 8rpx;
        margin-bottom: 8rpx;
        .time-icon {
          width: 32rpx;
          height: 32rpx;
        }
        text {
          font-size: 26rpx;
          color: #666;
        }
      }
      .title {
        display: block;
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }
      .desc {
        display: block;
        font-size: 26rpx;
        color: #999;
      }
    }
  }

  .empty-schedule {
    text-align: center;
    padding: 60rpx 0;
    color: #999;
    font-size: 28rpx;
  }
}

.schedule-list {
  .schedule-item-wrapper {
    overflow: hidden;
    position: relative;

    .schedule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #eee;
      background: rgba(255, 255, 255, 0);
      transition: transform 0.2s ease;
      position: relative;
      z-index: 2;

      .item-left {
        flex: 1;
        .time {
          display: flex;
          align-items: center;
          gap: 8rpx;
          margin-bottom: 8rpx;
          .time-icon {
            width: 32rpx;
            height: 32rpx;
          }
          text {
            font-size: 26rpx;
            color: #666;
          }
        }
        .title {
          display: block;
          font-size: 30rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 8rpx;
        }
        .desc {
          display: block;
          font-size: 26rpx;
          color: #999;
        }
      }
    }
  }

  .empty-schedule {
    text-align: center;
    padding: 60rpx 0;
    color: #999;
    font-size: 28rpx;
  }
}

.mic-btn {
  position: fixed;
  right: 40rpx;
  bottom: 140rpx;
  width: 120rpx;
  height: 120rpx;
  background: #409eff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(64, 158, 255, 0.3);
  image {
    width: 60rpx;
    height: 60rpx;
  }
}
</style>
