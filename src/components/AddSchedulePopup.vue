<template>
  <view class="popup-mask" v-if="visible" @click="close">
    <view class="popup-container" @click.stop>
      <view class="popup-header">
        <text class="title">新增日程</text>
        <view class="close-btn" @click="close">✕</view>
      </view>

      <view class="popup-content">
        <!-- 标题 -->
        <view class="form-item">
          <text class="label">标题 <text class="required">*</text></text>
          <input class="input" v-model="form.title" placeholder="请输入日程标题" />
        </view>

        <!-- 日期（使用 picker） -->
        <view class="form-item">
          <text class="label">日期 <text class="required">*</text></text>
          <picker mode="date" :value="form.scheduleDate" @change="onDateChange">
            <view class="picker-input">
              <text :class="{ placeholder: !form.scheduleDate }">
                {{ form.scheduleDate || '请选择日期' }}
              </text>
              <text class="picker-icon">📅</text>
            </view>
          </picker>
        </view>

        <!-- 时间（可选，使用 picker，每5分钟） -->
        <view class="form-item">
          <text class="label">时间</text>
          <picker
            mode="multiSelector"
            :range="timeRange"
            :value="timeIndex"
            @change="onTimeChange"
            @columnchange="onTimeColumnChange"
          >
            <view class="picker-input">
              <text :class="{ placeholder: !form.scheduleTime }">
                {{ form.scheduleTime || '请选择时间（可选）' }}
              </text>
              <text class="picker-icon">🕐</text>
            </view>
          </picker>
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <text class="label">备注</text>
          <textarea
            class="textarea"
            v-model="form.content"
            placeholder="请输入备注（可选）"
            maxlength="200"
          />
        </view>
      </view>

      <view class="popup-footer">
        <view class="btn cancel" @click="close">取消</view>
        <view class="btn confirm" @click="submit">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'
import { addSchedule } from '@/service/calendar.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  defaultDate: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'success'])

// 生成小时选项（00-23，共24小时）
const hourOptions = []
for (let h = 0; h <= 23; h++) {
  hourOptions.push(String(h).padStart(2, '0') + '时')
}

// 生成分钟选项（每5分钟，00-55）
const minuteOptions = []
for (let m = 0; m < 60; m += 5) {
  minuteOptions.push(String(m).padStart(2, '0') + '分')
}

// 先定义 timeRange（在 hourOptions 和 minuteOptions 定义之后）
const timeRange = [hourOptions, minuteOptions]
const timeIndex = ref([7, 0]) // 索引7对应07时，索引0对应00分

const form = reactive({
  title: '',
  scheduleDate: '',
  scheduleTime: '',
  content: '',
})

// 监听 defaultDate 变化
watch(
  () => props.defaultDate,
  (newVal) => {
    if (newVal && !form.scheduleDate) {
      form.scheduleDate = newVal
    }
  },
  { immediate: true },
)

// 日期选择
const onDateChange = (e) => {
  form.scheduleDate = e.detail.value
}

// 时间选择（多列选择器）
const onTimeChange = (e) => {
  const val = e.detail.value
  timeIndex.value = val
  const hour = val[0] // 直接使用索引作为小时（0-23）
  const minute = val[1] * 5 // 索引0对应0分，索引1对应5分...
  form.scheduleTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// 列变化时（可选，用于联动）
const onTimeColumnChange = (e) => {
  // 如果需要列联动可以在这里处理
  console.log('列变化', e.detail)
}

// 提交
const submit = async () => {
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入日程标题', icon: 'none' })
    return
  }

  if (!form.scheduleDate) {
    uni.showToast({ title: '请选择日期', icon: 'none' })
    return
  }

  try {
    const submitData = {
      title: form.title.trim(),
      scheduleDate: form.scheduleDate,
      scheduleTime: form.scheduleTime || null,
      content: form.content || '',
    }

    await addSchedule(submitData)
    uni.showToast({ title: '添加成功', icon: 'success' })

    // 重置表单
    form.title = ''
    form.scheduleTime = ''
    form.content = ''
    form.scheduleDate = props.defaultDate || ''
    timeIndex.value = [7, 0] // 重置时间选择到07:00

    emit('success')
    emit('close')
  } catch (error) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

// 关闭弹窗
const close = () => {
  form.title = ''
  form.scheduleTime = ''
  form.content = ''
  form.scheduleDate = props.defaultDate || ''
  timeIndex.value = [7, 0]
  emit('close')
}
</script>

<style lang="scss" scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.popup-container {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
  .close-btn {
    width: 50rpx;
    height: 50rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    color: #999;
  }
}

.popup-content {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 30rpx;
  .label {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 12rpx;
    display: block;
    .required {
      color: #ff4444;
    }
  }
  .input {
    border: 1rpx solid #e0e0e0;
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 28rpx;
    background: #f8f8f8;
  }
  .picker-input {
    border: 1rpx solid #e0e0e0;
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 28rpx;
    background: #f8f8f8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .placeholder {
      color: #999;
    }
    .picker-icon {
      font-size: 32rpx;
    }
  }
  .textarea {
    border: 1rpx solid #e0e0e0;
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 28rpx;
    background: #f8f8f8;
    min-height: 150rpx;
  }
}

.popup-footer {
  display: flex;
  padding: 20rpx 30rpx 40rpx;
  gap: 20rpx;
  .btn {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 44rpx;
    font-size: 32rpx;
    &.cancel {
      background: #f5f5f5;
      color: #666;
    }
    &.confirm {
      background: #409eff;
      color: #fff;
    }
  }
}
</style>
