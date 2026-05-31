import { http } from '@/utils/http'

// 添加日程
export const addSchedule = (data) => {
  return http({
    method: 'POST',
    url: '/schedule/add',
    data,
  })
}

// 按日期查询
export const getScheduleByDate = (date, time) => {
  const data = { date }
  // 只有 time 存在且有值时，才添加到请求参数中
  if (time && time !== undefined && time !== null && time !== '') {
    data.time = time
  }
  return http({
    method: 'GET',
    url: '/schedule/date',
    data,
  })
}

// 删除日程
export const deleteScheduleApi = (id) => {
  return http({
    method: 'DELETE',
    url: `/schedule/${id}`,
  })
}

// 按月份查询有日程的日期
export const getScheduleByMonth = (year, month) => {
  return http({
    method: 'GET',
    url: '/schedule/month',
    data: { year, month },
  })
}
