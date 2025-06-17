<template>
  <div class="database-info">
    <el-card class="info-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据库信息</span>
        </div>
      </template>
      
      <div v-if="!isConnected" class="no-connection">
        <el-empty 
          description="请先连接数据库"
          :image-size="80"
        />
      </div>
      
      <div v-else class="info-content">
        <!-- 数据库配置 -->
        <div class="info-section">
          <h4>数据库配置</h4>
          <div class="config-item">
            <span class="label">租户:</span>
            <el-select
              v-model="databaseForm.tenant"
              placeholder="选择租户"
              size="small"
              style="width: 100%"
              @change="updateDatabaseConfig"
            >
              <el-option
                label="default_tenant"
                value="default_tenant"
              />
            </el-select>
          </div>
          <div class="config-item">
            <span class="label">数据库:</span>
            <el-select
              v-model="databaseForm.database"
              placeholder="选择数据库"
              size="small"
              style="width: 100%"
              @change="updateDatabaseConfig"
            >
              <el-option
                label="default_database"
                value="default_database"
              />
            </el-select>
          </div>
          <div class="config-item">
            <span class="label">集合:</span>
            <el-select
              v-model="selectedCollection"
              placeholder="请选择集合"
              size="small"
              style="width: 100%"
              @change="handleCollectionChange"
            >
              <el-option
                v-for="collection in collections"
                :key="collection.name"
                :label="collection.name"
                :value="collection.name"
              />
            </el-select>
          </div>
        </div>
        
        <!-- 连接信息 -->
        <div class="info-section">
          <h4>连接信息</h4>
          <div class="info-item">
            <span class="label">地址:</span>
            <span class="value">{{ connectionConfig.ip }}:{{ connectionConfig.port }}</span>
          </div>
          <div class="info-item">
            <span class="label">租户:</span>
            <span class="value">{{ connectionConfig.tenant }}</span>
          </div>
          <div class="info-item">
            <span class="label">数据库:</span>
            <span class="value">{{ connectionConfig.database }}</span>
          </div>
        </div>
        
        <!-- 集合信息 -->
        <div class="info-section" v-if="currentCollection">
          <h4>当前集合</h4>
          <div class="info-item">
            <span class="label">名称:</span>
            <span class="value">{{ currentCollection.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">ID:</span>
            <span class="value">{{ currentCollection.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">维度:</span>
            <span class="value">{{ currentCollection.dimension }}</span>
          </div>
          <div class="info-item">
            <span class="label">文档数量:</span>
            <span class="value">{{ formatNumber(currentCollection.count) }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from '../stores/connection.js'

export default {
  name: 'DatabaseInfo',
  setup() {
    const connectionStore = useConnectionStore()
    
    const {
      connectionForm: connectionConfig,
      collections,
      currentCollection,
      isConnected
    } = storeToRefs(connectionStore)
    
    // 本地状态
    const databaseForm = ref({
      tenant: connectionConfig?.value?.tenant || 'default_tenant',
      database: connectionConfig?.value?.database || 'default_database'
    })
    const selectedCollection = ref('')
    
    // 监听连接配置变化
    watch(connectionConfig, (newConfig) => {
      if (newConfig) {
        databaseForm.value.tenant = newConfig.tenant || 'default_tenant'
        databaseForm.value.database = newConfig.database || 'default_database'
      }
    }, { deep: true })
    
    // 监听当前集合变化
    watch(currentCollection, (newCollection) => {
      if (newCollection) {
        selectedCollection.value = newCollection.name
      }
    })
    
    // 方法
    const formatNumber = (num) => {
      // 处理undefined、null或非数字值
      if (num === undefined || num === null || isNaN(num)) {
        return '0'
      }
      
      // 确保num是数字类型
      const numValue = Number(num)
      
      if (numValue >= 1000000) {
        return (numValue / 1000000).toFixed(1) + 'M'
      } else if (numValue >= 1000) {
        return (numValue / 1000).toFixed(1) + 'K'
      }
      return numValue.toString()
    }
    
    const updateDatabaseConfig = () => {
      try {
        connectionStore.updateConnectionForm(databaseForm.value)
        ElMessage.success('配置已更新')
      } catch (error) {
        ElMessage.error('更新配置失败')
      }
    }
    
    const handleCollectionChange = async (collectionName) => {
      if (!collectionName) return
      
      try {
        const collection = collections.value.find(col => col.name === collectionName)
        if (collection) {
          await connectionStore.selectCollection(collection)
          ElMessage.success(`已选择集合: ${collectionName}`)
        }
      } catch (error) {
        ElMessage.error(error.message || '选择集合失败')
      }
    }
    
    return {
      connectionConfig,
      collections,
      currentCollection,
      isConnected,
      databaseForm,
      selectedCollection,
      formatNumber,
      updateDatabaseConfig,
      handleCollectionChange
    }
  }
}
</script>

<style scoped>
.database-info {
  margin-bottom: 0;
}

.info-card {
  border-radius: 4px;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
}

.info-card :deep(.el-card__header) {
  padding: 6px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.info-card :deep(.el-card__body) {
  padding: 8px 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.no-connection {
  text-align: center;
  padding: 8px;
}

.no-connection :deep(.el-empty__description) {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
}

.no-connection :deep(.el-empty__image) {
  width: 60px !important;
  height: 60px !important;
}

.info-content {
  padding: 0;
}

.info-section {
  margin-bottom: 8px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h4 {
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 2px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
  padding: 1px 0;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.value {
  font-size: 12px;
  color: #303133;
  font-weight: 400;
  word-break: break-all;
}

.collections-list {
  max-height: 100px;
  overflow-y: auto;
}

.collection-item {
  padding: 2px 6px;
  border: 1px solid #ebeef5;
  border-radius: 2px;
  margin-bottom: 2px;
  transition: all 0.3s;
  cursor: pointer;
  background-color: #ffffff;
}

.collection-item:last-child {
  margin-bottom: 0;
}

.collection-item:hover {
  border-color: #d2691e;
  background-color: #f0f9ff;
  box-shadow: 0 1px 2px rgba(210, 105, 30, 0.1);
}

.collection-item.active {
  border-color: #d2691e;
  background-color: #ecf5ff;
  box-shadow: 0 1px 4px rgba(210, 105, 30, 0.2);
}

.collection-name {
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 1px;
}

.collection-stats {
  display: flex;
  gap: 2px;
}

.collection-stats .el-tag {
  font-size: 10px;
  padding: 0 3px;
  height: 14px;
  line-height: 12px;
}

.config-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  gap: 4px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item .label {
  min-width: 40px;
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.config-item .el-input,
.config-item .el-select {
  flex: 1;
}

.config-item :deep(.el-input__inner) {
  font-size: 12px;
  padding: 0 6px;
  height: 22px;
  background-color: #ffffff;
  border-color: #dcdfe6;
  color: #303133;
}

.config-item :deep(.el-input__inner:focus) {
  border-color: #d2691e;
  box-shadow: 0 0 0 1px rgba(210, 105, 30, 0.2);
}

.config-item :deep(.el-select .el-input__inner) {
  font-size: 12px;
  height: 22px;
  background-color: #ffffff;
  border-color: #dcdfe6;
  color: #303133;
}

.config-item :deep(.el-select__caret) {
  font-size: 12px;
}
</style> 