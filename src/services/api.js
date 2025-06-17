/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import axios from 'axios'

// 创建axios实例
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    console.log('Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  error => {
    // 对请求错误做些什么
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    console.log('Response:', response.status, response.config.url)
    return response.data
  },
  error => {
    // 对响应错误做点什么
    console.error('Response Error:', error.response?.status, error.message)
    
    // 统一错误处理
    const errorMessage = error.response?.data?.message || error.message || '请求失败'
    
    // 这里可以添加全局错误提示
    // ElMessage.error(errorMessage)
    
    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data
    })
  }
)

// 设置基础URL
export function setBaseURL(baseURL) {
  api.defaults.baseURL = baseURL
}

// 导出api实例
export default api 