<template>
  <view class="index">
    <!-- 装饰云朵（毛玻璃效果） -->
    <view class="cloud-deco cloud-1"></view>
    <view class="cloud-deco cloud-2"></view>
    <view class="cloud-deco cloud-3"></view>
    <view class="cloud-deco cloud-4"></view>

    <!-- 顶部用户栏 -->
    <view class="header">
      <view class="user-info">
        <!-- 自动获取用户头像 -->
        <image
          class="avatar"
          :src="userStore.userInfo?.avatar || '/static/icon/avatar.svg'"
          mode="aspectFill"
        />
        <!-- 自动获取用户昵称 -->
        <text class="user-name">{{ userStore.userInfo?.nickName || '微信用户' }}</text>
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
        <text class="header-icon">📅</text>
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
                <text class="time-icon">⏰</text>
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
        <text>✨ 暂无日程，点击右下角麦克风语音添加</text>
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

  <!-- 语音弹窗 -->
  <AiChatModal :visible="showAiModal" @close="showAiModal = false" />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getScheduleByDate, deleteScheduleApi, getScheduleByMonth } from '@/service/calendar.js'
import AddSchedulePopup from '@/components/AddSchedulePopup.vue'
import AiChatModal from '@/components/AiChatModal.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const weeks = ['日', '一', '二', '三', '四', '五', '六']
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const days = ref([])
const todaySchedules = ref([])
const selectedDate = ref('')
const eventDates = ref(new Set())
const showAddPopup = ref(false)
const showAiModal = ref(false)

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
  showAiModal.value = true
}

onMounted(() => {
  const token = uni.getStorageSync('token')
  if (!token || !userStore.userInfo.userId) {
    uni.reLaunch({ url: '/pages/login/login' })
  }
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
  background: #2b3345;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
}

.index {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(180deg, #87ceeb 0%, #b8d8f0 40%, #d4e8f5 100%);
}

/* 云朵装饰（和参考图一致） */
.cloud-deco {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}
.cloud-1 {
  top: 60px;
  left: -20px;
  width: 140px;
  height: 90px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 100px;
  filter: blur(20px);
}
.cloud-2 {
  top: 200px;
  right: -15px;
  width: 120px;
  height: 80px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 80px;
  filter: blur(18px);
}
.cloud-3 {
  bottom: 180px;
  left: -10px;
  width: 100px;
  height: 65px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 65px;
  filter: blur(15px);
}
.cloud-4 {
  bottom: 350px;
  right: 20px;
  width: 90px;
  height: 55px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 55px;
  filter: blur(16px);
}

/* 顶部用户栏 */
.header {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  padding: 50px 20px 10px;
  position: relative;
  z-index: 2;

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.8);
    padding: 8px 16px 8px 12px;
    border-radius: 40px;
    width: fit-content;

    .avatar {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #5ca0d0, #3a7eb0);
      border-radius: 50%;
    }

    .user-name {
      font-size: 15px;
      font-weight: 600;
      color: #2a5a7a;
    }
  }
}

/* 日历卡片 */
.calendar-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  border-radius: 32px;
  margin: 16px 20px 12px;
  padding: 20px 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 2;

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .arrow-btn {
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      image {
        width: 16px;
        height: 16px;
      }
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: #2a6a8a;
    }
  }

  .week-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    margin-bottom: 12px;

    .week-item {
      font-size: 13px;
      color: #2a6a8a;
      font-weight: 600;
      padding: 8px 0;
    }
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;

    .day-item {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.4);
      font-size: 15px;
      color: #2a5a7a;
      font-weight: 500;

      &.other-month {
        opacity: 0.4;
      }
      &.active {
        background: rgba(74, 154, 200, 0.8);
        color: #fff;
      }
      &.has-event::after {
        content: '';
        width: 5px;
        height: 5px;
        background: #3a8aba;
        border-radius: 50%;
        margin-top: 3px;
      }
    }
  }
}

/* 日程卡片 */
.schedule-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  border-radius: 32px;
  margin: 0 20px;
  padding: 20px 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 2;
  flex: 1;

  .card-header {
    margin-bottom: 16px;
    .header-title {
      font-weight: 700;
      color: #2a6a8a;
      font-size: 16px;
    }
    .add-btn {
      background: none;
      color: #4a9ac8;
      font-size: 14px;
      font-weight: 600;
    }
  }

  .schedule-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid rgba(200, 220, 235, 0.6);
    background: none;
    border-radius: 0;

    .time {
      font-size: 12px;
      color: #2a7a9a;
      font-weight: 500;
    }
    .title {
      font-size: 15px;
      color: #3a5a6a;
      font-weight: 600;
    }
    .desc {
      font-size: 11px;
      color: #5a8aaa;
    }
  }

  .empty-schedule {
    text-align: center;
    padding: 32px;
    color: #2a6a8a;
    font-size: 13px;
  }
}

/* 语音按钮 */
.mic-btn {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #6eb8e0, #4a9ac8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 16px rgba(60, 120, 160, 0.3),
    0 0 20px rgba(110, 184, 224, 0.6);
  z-index: 200;

  image {
    width: 26px;
    height: 26px;
  }
  &:active {
    transform: scale(0.94);
  }
}
</style>
