<template>
  <div class="connection-panel">
    <!-- ChromaDB连接配置面板 -->
    <el-card class="connection-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>ChromaDB连接配置</span>
          <el-tag
            :type="connectionStatus.type"
            size="small"
            :icon="connectionStatus.icon"
          >
            {{ connectionStatus.text }}
          </el-tag>
        </div>
      </template>
      
      <el-form 
        :model="connectionForm" 
        label-width="60px" 
        size="default"
        @submit.prevent="handleConnect"
      >
        <el-form-item label="IP地址">
          <el-input
            v-model="connectionForm.ip"
            placeholder="127.0.0.1"
            :disabled="isConnecting"
          />
        </el-form-item>
        
        <el-form-item label="端口">
          <el-input-number
            v-model="connectionForm.port"
            :min="1"
            :max="65535"
            :disabled="isConnecting"
            style="width: 100%"
            controls-position="right"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            v-if="!isConnected"
            type="primary"
            :loading="isConnecting"
            @click="handleConnect"
            style="width: 100%"
          >
            {{ isConnecting ? '连接中...' : '连接' }}
          </el-button>
          
          <el-button
            v-else
            type="danger"
            @click="handleDisconnect"
            style="width: 100%"
          >
            断开连接
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- LLM服务连接面板 -->
    <el-card class="connection-card llm-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>LLM服务连接</span>
          <el-tag
            :type="llmStatus.type"
            size="small"
            :icon="llmStatus.icon"
          >
            {{ llmStatus.text }}
          </el-tag>
        </div>
      </template>
      
      <div class="llm-content">
        <div class="llm-description">
          <p>LLM服务用于生成文本嵌入向量，提升语义搜索效果</p>
        </div>
        
        <div class="llm-actions">
          <el-button
            v-if="!llmStatus.testing"
            type="primary"
            size="small"
            @click="testLLMConnection"
            :disabled="loading"
            style="width: 100%"
          >
            测试连接
          </el-button>
          <el-button
            v-else
            type="primary"
            size="small"
            loading
            disabled
            style="width: 100%"
          >
            测试中...
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Connection, Loading } from '@element-plus/icons-vue'

import { useConnectionStore } from '../stores/connection.js'
import { useDatabaseStore } from '../stores/database.js'
import llmService from '../services/llm.js'

export default {
  name: 'ConnectionPanel',
  setup() {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    const { 
      connectionForm, 
      isConnected, 
      isConnecting, 
      connectionError,
      collections,
      currentCollection 
    } = storeToRefs(connectionStore)
    
    const { loading: databaseLoading } = storeToRefs(databaseStore)
    
    // LLM服务状态
    const llmStatus = ref({
      type: 'info',
      text: '未测试',
      icon: Connection,
      testing: false
    })
    
    // 计算属性
    const loading = computed(() => isConnecting.value || databaseLoading.value)
    
    const connectionStatus = computed(() => {
      if (isConnected.value) {
        return {
          type: 'success',
          text: '已连接',
          icon: CircleCheck
        }
      } else if (isConnecting.value) {
        return {
          type: 'warning',
          text: '连接中...',
          icon: Loading
        }
      } else if (connectionError.value) {
        return {
          type: 'danger',
          text: '连接失败',
          icon: CircleClose
        }
      } else {
        return {
          type: 'info',
          text: '未连接',
          icon: Connection
        }
      }
    })
    
    // 方法
    const connect = async () => {
      try {
        await connectionStore.connect()
      } catch (error) {
        ElMessage.error(error.message || '连接失败')
      }
    }
    
    const disconnect = () => {
      connectionStore.disconnect()
    }
    
    const testConnection = async () => {
      try {
        await connectionStore.testConnection()
      } catch (error) {
        ElMessage.error(error.message || '测试连接失败')
      }
    }
    
    const selectCollection = async (collection) => {
      try {
        await connectionStore.selectCollection(collection)
        ElMessage.success(`已选择集合: ${collection.name}`)
      } catch (error) {
        ElMessage.error(error.message || '选择集合失败')
      }
    }
    
    // LLM服务测试
    const testLLMConnection = async () => {
      llmStatus.value.testing = true
      llmStatus.value.text = '测试中...'
      llmStatus.value.type = 'warning'
      
      try {
        const result = await llmService.testConnection()
        
        if (result.success) {
          llmStatus.value = {
            type: 'success',
            text: '连接正常',
            icon: CircleCheck,
            testing: false
          }
          
          // 根据模型情况显示不同的消息
          if (result.hasRecommendedModel) {
            ElMessage.success({
              message: `LLM服务连接正常，推荐模型可用: ${result.model}`,
              duration: 1000
            })
          } else if (result.modelCount > 0) {
            ElMessage.success({
              message: `LLM服务连接正常，可用模型: ${result.model} (共${result.modelCount}个模型)`,
              duration: 1000
            })
          } else {
            ElMessage.warning('LLM服务连接正常，但暂无可用模型')
          }
        } else {
          llmStatus.value = {
            type: 'danger',
            text: '连接失败',
            icon: CircleClose,
            testing: false
          }
          ElMessage.error(`LLM服务连接失败: ${result.error}`)
        }
      } catch (error) {
        llmStatus.value = {
          type: 'danger',
          text: '连接异常',
          icon: CircleClose,
          testing: false
        }
        ElMessage.error(`LLM服务测试失败: ${error.message}`)
      }
    }
    
    // 生命周期
    onMounted(async () => {
      // 应用启动时自动测试LLM服务连接
      testLLMConnection()
      
      // 自动连接ChromaDB
      try {
        if (!isConnected.value) {
          console.log('自动连接ChromaDB...')
          await connectionStore.connect()
          
          // 连接成功后，自动选择第二个集合
          if (collections.value && collections.value.length >= 2) {
            const secondCollection = collections.value[1]
            await connectionStore.selectCollection(secondCollection)
            ElMessage.success({
              message: `自动连接成功，已选择集合: ${secondCollection.name}`,
              duration: 1000
            })
          } else if (collections.value && collections.value.length === 1) {
            // 如果只有一个集合，选择第一个
            const firstCollection = collections.value[0]
            await connectionStore.selectCollection(firstCollection)
            ElMessage.success({
              message: `自动连接成功，已选择集合: ${firstCollection.name}`,
              duration: 1000
            })
          } else {
            ElMessage.success({
              message: '自动连接成功，但没有可用的集合',
              duration: 1000
            })
          }
        }
      } catch (error) {
        console.warn('自动连接ChromaDB失败:', error.message)
        // 不显示错误消息，避免打扰用户体验
      }
    })
    
    return {
      connectionForm,
      isConnected,
      loading,
      connectionError,
      collections,
      currentCollection,
      connectionStatus,
      llmStatus,
      connect,
      disconnect,
      handleConnect: connect,
      handleDisconnect: disconnect,
      testConnection,
      selectCollection,
      testLLMConnection
    }
  }
}
</script>

<style scoped>
.connection-panel {
  margin-bottom: 8px;
}

.connection-card {
  border-radius: 4px;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  margin-bottom: 8px;
}

.connection-card:last-child {
  margin-bottom: 0;
}

.llm-card {
  border-color: #e4e7ed;
}

.connection-card :deep(.el-card__header) {
  padding: 8px 14px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.llm-card :deep(.el-card__header) {
  background-color: #fafbfc;
}

.connection-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.connection-card :deep(.el-form) {
  width: 100%;
}

.connection-card :deep(.el-form-item) {
  margin-bottom: 12px;
  width: 100%;
}

.connection-card :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.connection-card :deep(.el-form-item__label) {
  padding-right: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  width: 60px !important;
  text-align: right;
}

.connection-card :deep(.el-form-item__content) {
  margin-left: 60px !important;
  width: calc(100% - 60px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.connection-status {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-size: 12px;
  color: #606266;
  margin-right: 8px;
  font-weight: 500;
}

.llm-content {
  padding: 0;
}

.llm-description {
  margin-bottom: 12px;
}

.llm-description p {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.llm-actions {
  margin: 0;
}

.status-item .el-button--text {
  padding: 2px 4px;
  font-size: 11px;
}

.is-loading {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.connection-card :deep(.el-input) {
  height: 28px;
  width: 100%;
}

.connection-card :deep(.el-input__inner) {
  /* background-color: #ffffff; */
  border-color: #dcdfe6;
  color: #303133;
  font-size: 14px;
  height: 28px;
  padding: 0 8px;
  width: 100%;
}

.connection-card :deep(.el-input__inner:focus) {
  border-color: #d2691e;
  box-shadow: 0 0 0 1px rgba(210, 105, 30, 0.2);
}

.connection-card :deep(.el-input-number) {
  width: 100% !important;
  height: 28px;
}

.connection-card :deep(.el-input-number .el-input__inner) {
  /* background-color: #ffffff; */
  border-color: #dcdfe6;
  color: #303133;
  font-size: 14px;
  height: 28px;
  padding: 0 8px;
  width: 100%;
}

.connection-card :deep(.el-input-number__increase),
.connection-card :deep(.el-input-number__decrease) {
  height: 14px;
  line-height: 14px;
  font-size: 12px;
  width: 20px;
}

.connection-card :deep(.el-button) {
  border-radius: 4px;
  height: 32px;
  font-size: 14px;
  padding: 0 16px;
  width: 100%;
}
</style> 