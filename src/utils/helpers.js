/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

/**
 * 截断文本到指定长度
 * @param {string} text - 要截断的文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀，默认为 '...'
 * @returns {string} 截断后的文本
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  if (text.length <= maxLength) {
    return text
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数，默认为2
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 格式化数字，添加千分位分隔符
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的数字字符串
 */
export function formatNumber(num) {
  if (typeof num !== 'number') {
    return '0'
  }
  
  return num.toLocaleString()
}

/**
 * 格式化大数字为可读形式（如 1.2K, 3.4M）
 * @param {number} num - 要格式化的数字
 * @param {number} decimals - 小数位数，默认为1
 * @returns {string} 格式化后的数字字符串
 */
export function formatLargeNumber(num, decimals = 1) {
  if (typeof num !== 'number') {
    return '0'
  }
  
  if (num < 1000) {
    return num.toString()
  }
  
  const units = ['', 'K', 'M', 'B', 'T']
  const unitIndex = Math.floor(Math.log10(num) / 3)
  const scaledNum = num / Math.pow(1000, unitIndex)
  
  return scaledNum.toFixed(decimals) + units[unitIndex]
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  
  return obj
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait, immediate = false) {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeout
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func.apply(this, args)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 生成随机ID
 * @param {number} length - ID长度，默认为8
 * @returns {string} 随机ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * 验证IP地址格式
 * @param {string} ip - IP地址
 * @returns {boolean} 是否为有效的IP地址
 */
export function isValidIP(ip) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip) || ip === 'localhost'
}

/**
 * 验证端口号
 * @param {number} port - 端口号
 * @returns {boolean} 是否为有效的端口号
 */
export function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * 格式化时间戳
 * @param {number|string|Date} timestamp - 时间戳
 * @param {string} format - 格式，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
export function formatTimestamp(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  const date = new Date(timestamp)
  
  if (isNaN(date.getTime())) {
    return '无效时间'
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 计算相对时间
 * @param {number|string|Date} timestamp - 时间戳
 * @returns {string} 相对时间字符串
 */
export function getRelativeTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (isNaN(date.getTime())) {
    return '无效时间'
  }
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)
  
  if (years > 0) return `${years}年前`
  if (months > 0) return `${months}个月前`
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  if (seconds > 0) return `${seconds}秒前`
  
  return '刚刚'
}

/**
 * 检查对象是否为空
 * @param {any} obj - 要检查的对象
 * @returns {boolean} 是否为空
 */
export function isEmpty(obj) {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {any} defaultValue - 默认值
 * @returns {any} 解析结果或默认值
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    return defaultValue
  }
}

/**
 * 安全的JSON字符串化
 * @param {any} obj - 要字符串化的对象
 * @param {string} defaultValue - 默认值
 * @returns {string} JSON字符串或默认值
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    return defaultValue
  }
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名（不包含点）
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return ''
  }
  
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return ''
  }
  
  return filename.substring(lastDotIndex + 1).toLowerCase()
}

/**
 * 检查文件类型是否被支持
 * @param {string} filename - 文件名
 * @param {string[]} supportedTypes - 支持的文件类型数组
 * @returns {boolean} 是否支持
 */
export function isSupportedFileType(filename, supportedTypes) {
  const extension = getFileExtension(filename)
  return supportedTypes.includes(extension)
}

/**
 * 高亮搜索关键词
 * @param {string} text - 原文本
 * @param {string} keyword - 关键词
 * @param {string} className - 高亮样式类名
 * @returns {string} 高亮后的HTML字符串
 */
export function highlightKeyword(text, keyword, className = 'highlight') {
  if (!text || !keyword) {
    return text
  }
  
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, `<span class="${className}">$1</span>`)
}

/**
 * 计算向量相似度（余弦相似度）
 * @param {number[]} vectorA - 向量A
 * @param {number[]} vectorB - 向量B
 * @returns {number} 相似度值（0-1之间）
 */
export function calculateCosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length !== vectorB.length) {
    return 0
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    normA += vectorA[i] * vectorA[i]
    normB += vectorB[i] * vectorB[i]
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  
  if (magnitude === 0) {
    return 0
  }
  
  return dotProduct / magnitude
}

/**
 * 将距离转换为相似度
 * @param {number} distance - 距离值
 * @param {string} metric - 距离度量方式 ('cosine', 'euclidean', 'manhattan')
 * @returns {number} 相似度值
 */
export function distanceToSimilarity(distance, metric = 'cosine') {
  switch (metric) {
    case 'cosine':
      return 1 - distance
    case 'euclidean':
      return 1 / (1 + distance)
    case 'manhattan':
      return 1 / (1 + distance)
    default:
      return 1 - distance
  }
}

/**
 * 生成UUID (RFC 4122 version 4)
 * @returns {string} UUID字符串
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // 回退到手动生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
} 