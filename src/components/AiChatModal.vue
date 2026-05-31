<template>
  <!-- 修改遮罩层：移除 @click.self，改用条件判断 -->
  <view class="ai-modal" v-if="visible" @click="handleMaskClick">
    <!-- 内容区域：添加 @click.stop 阻止冒泡 -->
    <view class="modal-box" @click.stop>
      <view class="modal-header">
        <text class="title">AI 语音助手</text>
        <view class="close-btn" @click="close">✕</view>
      </view>

      <scroll-view class="chat-scroll" scroll-y :scroll-top="scrollTop">
        <view class="chat-list">
          <view
            class="chat-item"
            :class="[item.role === 'user' ? 'user' : 'ai']"
            v-for="(item, idx) in messages"
            :key="idx"
          >
            <!-- 用户消息 -->
            <view class="bubble user" v-if="item.role === 'user'">
              {{ item?.content || '' }}
            </view>

            <!-- AI 消息 -->
            <view class="bubble ai" v-if="item.role === 'ai'">
              <text>{{ item?.content || '' }}</text>
              <view class="voice-row" v-if="item?.audio">
                <view class="voice-btn" @click.stop="toggleVoice(item)">
                  {{ item?.playing ? '停止' : '播放' }}
                </view>
              </view>
            </view>
          </view>

          <view class="loading" v-if="loading">AI 思考中...</view>
        </view>
      </scroll-view>

      <view class="input-bar">
        <!-- 输入框添加 @click.stop -->
        <input
          v-model="inputText"
          class="input"
          placeholder="输入问题..."
          @confirm="sendText"
          @click.stop
        />
        <view
          class="voice-input"
          @touchstart.stop="startRecord"
          @touchend.stop="stopRecord"
          @touchcancel.stop="stopRecord"
        >
          按住说话
        </view>
        <view class="send-btn" @click.stop="sendText">发送</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { aiChat } from '@/service/chat.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const handleMaskClick = () => close()
const close = () => emit('close')

const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const scrollTop = ref(0)

let recorder = null
const isRecording = ref(false)
const innerAudio = ref(null)
const playingId = ref(null)

// 初始化录音管理器
const initRecorder = () => {
  console.log('初始化录音')
  recorder = uni.getRecorderManager()

  recorder.onStop((res) => {
    uni.getFileSystemManager().readFile({
      filePath: res.tempFilePath,
      encoding: 'base64',
      success: (file) => {
        // 强制删除所有 base64 前缀
        let base64 = file.data
        base64 = base64.replace(/^data:audio\/\w+;base64,/, '') // 删掉前缀
        base64 = base64.replace(/\s+/g, '') // 去掉空格换行

        console.log('干净的 Base64 长度：', base64.length)
        sendMessage('[语音消息]', base64)
      },
    })
  })
}

// 发送文本
const sendText = async () => {
  if (!inputText.value.trim()) return
  await sendMessage(inputText.value)
  inputText.value = ''
}

// 发送消息
const sendMessage = async (content, audio = '') => {
  if (!content && !audio) return

  // 判断是否是语音消息
  const isVoice = !!audio

  // 临时消息内容（语音消息先显示"识别中..."）
  const tempContent = isVoice ? '识别中...' : content

  // 添加临时用户消息
  const userMsgIndex = messages.value.length
  messages.value.push({ role: 'user', content: tempContent })

  loading.value = true
  scrollToBottom()

  try {
    const params = {}
    if (isVoice) {
      params.audio = audio
    } else {
      params.content = content
    }

    const res = await aiChat(params)
    const data = res?.data || {}

    // 后端返回结构：
    // { response: "AI回复", audio: "base64...", recognizedText: "用户语音识别文字" }

    // 获取识别后的文字（语音输入时后端返回 recognizedText）
    const recognizedText = data.recognizedText || content
    // 获取 AI 回复内容
    const aiText = data.response || data.text || '收到'
    // 获取 AI 语音
    const aiAudio = data.audio || ''

    // 更新用户消息为识别后的文字
    if (messages.value[userMsgIndex]) {
      messages.value[userMsgIndex].content = recognizedText
    }

    // 添加 AI 回复
    messages.value.push({
      role: 'ai',
      content: aiText,
      audio: aiAudio,
      playing: false,
    })

    // 自动播放 AI 语音
    if (aiAudio) {
      setTimeout(() => playVoice(aiAudio, messages.value.length - 1), 500)
    }
  } catch (err) {
    // 更新失败时的用户消息
    if (messages.value[userMsgIndex]) {
      messages.value[userMsgIndex].content = '语音识别失败'
    }
    messages.value.push({ role: 'ai', content: '请求失败' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

// 开始录音
const startRecord = () => {
  console.log('开始录音')
  if (!recorder) initRecorder()
  isRecording.value = true
  recorder.start({
    sampleRate: 16000,
    format: 'mp3',
    numberOfChannels: 1,
    encodeBitRate: 48000,
    duration: 60000,
  })
  uni.showToast({ icon: 'none', title: '录音中...', duration: 60000 })
}

// 结束录音
const stopRecord = () => {
  console.log('结束录音')
  isRecording.value = false
  recorder.stop()
  uni.hideToast()
}

// 播放语音
const playVoice = (base64, idx) => {
  stopAllVoice()
  const path = `${uni.env.USER_DATA_PATH}/voice_${Date.now()}.mp3`

  uni.getFileSystemManager().writeFile({
    filePath: path,
    data: base64,
    encoding: 'base64',
    success: () => {
      const audio = uni.createInnerAudioContext()
      audio.src = path
      audio.play()
      innerAudio.value = audio
      playingId.value = idx
      messages.value[idx].playing = true

      audio.onEnded(() => {
        messages.value[idx].playing = false
        innerAudio.value = null
        playingId.value = null
      })
    },
  })
}

// 停止语音
const stopAllVoice = () => {
  if (innerAudio.value) {
    innerAudio.value.stop()
    innerAudio.value.destroy()
    innerAudio.value = null
  }
  if (playingId.value !== null) {
    messages.value[playingId.value].playing = false
    playingId.value = null
  }
}

// 切换播放
const toggleVoice = (item) => {
  const idx = messages.value.indexOf(item)
  item.playing ? stopAllVoice() : playVoice(item.audio, idx)
}

const scrollToBottom = () => {
  nextTick(() => {
    setTimeout(() => {
      scrollTop.value = 999999
    }, 50)
  })
}

watch(
  () => props.visible,
  (val) => {
    if (!val) stopAllVoice()
    else if (!recorder) initRecorder()
  },
)
</script>

<style lang="scss" scoped>
.ai-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  width: 90%;
  height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 24rpx;
  background: #409eff;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  .title {
    font-size: 32rpx;
    font-weight: bold;
  }

  .close-btn {
    font-size: 40rpx;
    line-height: 1;
    padding: 0 16rpx;
  }
}

.chat-scroll {
  flex: 1;
  height: 0;
  padding: 20rpx;
  background: #f5f5f5;
  box-sizing: border-box;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.chat-item {
  max-width: 75%;
  display: flex;

  &.user {
    justify-content: flex-end;
  }

  &.ai {
    justify-content: flex-start;
  }
}

.bubble {
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.5;
  position: relative;
  word-break: break-all;
  white-space: pre-wrap;
  max-width: 100%;

  &.user {
    background: #409eff;
    color: #fff;
    border-radius: 16rpx 16rpx 4rpx 16rpx;
  }

  &.ai {
    background: #fff;
    color: #333;
    border: 1rpx solid #eee;
    border-radius: 16rpx 16rpx 16rpx 4rpx;
  }
}

.voice-row {
  margin-top: 12rpx;
}

.voice-btn {
  background: #409eff;
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  display: inline-block;
}

.loading {
  text-align: center;
  color: #999;
  padding: 20rpx;
  font-size: 24rpx;
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  gap: 16rpx;
  border-top: 1rpx solid #eee;
  background: #fff;
  flex-shrink: 0;

  .input {
    flex: 1;
    height: 70rpx;
    background: #f5f5f5;
    border-radius: 35rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
  }

  .voice-input {
    padding: 16rpx 24rpx;
    background: #eee;
    border-radius: 30rpx;
    font-size: 24rpx;
    white-space: nowrap;
  }

  .send-btn {
    background: #409eff;
    color: #fff;
    padding: 16rpx 24rpx;
    border-radius: 30rpx;
    font-size: 24rpx;
    white-space: nowrap;
  }
}
</style>
