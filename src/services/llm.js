/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import api from './api.js'

/**
 * LLM服务，用于生成文本嵌入向量
 * 基于OLLAMA服务器的deepseek-r1:1.5b模型
 */
class LLMService {
  constructor() {
    this.baseURL = 'http://127.0.0.1:11434'
    this.model = 'deepseek-r1:1.5b'
    this.temperature = 0.7
  }

  /**
   * 生成文本的嵌入向量
   * @param {string} text - 要转换为向量的文本
   * @returns {Promise<Array<number>>} - 返回嵌入向量数组
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('文本内容不能为空')
    }

    try {
      console.log('正在生成文本嵌入向量:', text)
      
      // 使用OLLAMA的embeddings API
      const response = await fetch(`${this.baseURL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text
        })
      })

      if (!response.ok) {
        throw new Error(`LLM服务请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('LLM服务返回的嵌入向量格式不正确')
      }

      console.log(`成功生成嵌入向量，维度: ${data.embedding.length}`)
      return data.embedding

    } catch (error) {
      console.error('生成嵌入向量失败:', error)
      
      // 如果是网络错误，提供更友好的错误信息
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('无法连接到LLM服务器，请检查网络连接或服务器状态')
      }
      
      throw error
    }
  }

  /**
   * 测试LLM服务连接
   * @returns {Promise<Object>} - 返回连接测试结果
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return {
          success: false,
          error: `服务器响应错误: ${response.status} ${response.statusText}`
        }
      }

      const data = await response.json()
      const models = data.models || []
      
      // 检查是否有推荐的模型
      const hasRecommendedModel = models.some(model => 
        model.name && model.name.includes('deepseek-r1:1.5b')
      )

      return {
        success: true,
        models: models,
        modelCount: models.length,
        hasRecommendedModel,
        model: hasRecommendedModel ? 'deepseek-r1:1.5b' : (models.length > 0 ? models[0].name : '无可用模型')
      }

    } catch (error) {
      console.warn('LLM服务连接测试失败:', error)
      return {
        success: false,
        error: error.message || '网络连接失败'
      }
    }
  }

  /**
   * 获取可用的模型列表
   * @returns {Promise<Array>} - 返回模型列表
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`)
      }

      const data = await response.json()
      return data.models || []

    } catch (error) {
      console.error('获取模型列表失败:', error)
      throw error
    }
  }

  /**
   * 设置LLM服务配置
   * @param {Object} config - 配置对象
   * @param {string} config.baseURL - 服务器地址
   * @param {string} config.model - 模型名称
   * @param {number} config.temperature - 温度参数
   */
  setConfig(config) {
    if (config.baseURL) {
      this.baseURL = config.baseURL
    }
    if (config.model) {
      this.model = config.model
    }
    if (config.temperature !== undefined) {
      this.temperature = config.temperature
    }
  }

  /**
   * 获取当前配置
   * @returns {Object} - 当前配置
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      model: this.model,
      temperature: this.temperature
    }
  }
}

// 创建单例实例
export default new LLMService() 