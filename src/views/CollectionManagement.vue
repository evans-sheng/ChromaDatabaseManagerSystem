<template>
  <div class="collection-management">
    <!-- 固定头部区域 -->
    <div class="management-header-fixed">
      <div class="header-top">
        <div class="header-left">
          <h3>集合管理</h3>
        </div>
        
        <div class="header-right">
          <el-button 
            type="primary" 
            size="small"
            :disabled="!isConnected"
            @click="openCreateDialog"
          >
            <el-icon><Plus /></el-icon>
            创建集合
          </el-button>
          <el-button 
            size="small"
            :disabled="!isConnected"
            :loading="loading"
            @click="refreshCollections"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 可滚动内容区域 -->
    <div class="management-content-scrollable">
      <div v-if="!isConnected" class="no-connection">
        <el-empty 
          description="请先连接数据库"
          :image-size="100"
        />
      </div>
      
      <div v-else-if="!hasCollections && !loading" class="no-data">
        <el-empty 
          description="暂无集合数据"
          :image-size="100"
        >
          <el-button type="primary" @click="openCreateDialog">
            创建第一个集合
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="collections-content">
        <!-- 集合列表表格 -->
        <el-table 
          :data="paginatedCollections" 
          v-loading="loading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="name" label="集合名称" min-width="200">
            <template #default="{ row }">
              <div class="collection-name">
                <el-tag type="info" size="small">{{ row.name }}</el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="id" label="集合ID" min-width="300">
            <template #default="{ row }">
              <div class="collection-id">
                <code>{{ row.id }}</code>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="count" label="文档数量" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getCountTagType(row.count)" size="small">
                {{ row.count || 0 }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="元数据" min-width="200">
            <template #default="{ row }">
              <div v-if="row.metadata" class="metadata-cell">
                <el-popover
                  placement="top"
                  :width="400"
                  trigger="hover"
                >
                  <template #reference>
                    <el-tag size="small" type="success">有元数据</el-tag>
                  </template>
                  <pre class="metadata-preview">{{ JSON.stringify(row.metadata, null, 2) }}</pre>
                </el-popover>
              </div>
              <div v-else class="metadata-cell">
                <el-tag size="small" type="info">无元数据</el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button 
                  size="small" 
                  type="warning"
                  plain
                  @click="openEditDialog(row)"
                >
                  详情
                </el-button>
                <el-button 
                  size="small" 
                  type="danger"
                  plain
                  @click="confirmDeleteCollection(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页组件 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 15, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
    
    <!-- 创建/详情集合对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :before-close="handleCloseDialog"
    >
      <el-form
        ref="collectionFormRef"
        :model="collectionForm"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="集合名称" prop="name">
          <el-input
            v-model="collectionForm.name"
            placeholder="请输入集合名称"
            :disabled="dialogMode === 'edit'"
            clearable
          />
          <div class="form-tip">集合名称只能包含字母、数字、下划线和连字符</div>
        </el-form-item>
        
        <el-form-item label="元数据">
          <el-input
            v-model="metadataText"
            type="textarea"
            :rows="4"
            placeholder="请输入JSON格式的元数据（可选）"
            :disabled="dialogMode === 'edit'"
            clearable
          />
          <div class="form-tip">可选，JSON格式，例如：{"description": "测试集合", "version": "1.0"}</div>
        </el-form-item>
        
        <el-form-item label="嵌入函数">
          <el-select v-model="collectionForm.configuration.embedding_function.name" :disabled="dialogMode === 'edit'" style="width: 100%">
            <el-option label="default" value="default" />
            <el-option label="sentence-transformers" value="sentence-transformers" />
            <el-option label="openai" value="openai" />
          </el-select>
          <div class="form-tip">用于生成文档嵌入向量的函数</div>
        </el-form-item>
      </el-form>
      
      <template #footer v-if="dialogMode === 'create'">
        <span class="dialog-footer">
          <el-button @click="handleCloseDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitForm" :loading="loading">
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
      :before-close="handleCloseDeleteDialog"
    >
      <div class="delete-content">
        <p>确定要删除以下集合吗？此操作不可撤销，将会删除集合中的所有文档。</p>
        <div class="collection-info">
          <el-tag type="warning">{{ collectionToDelete?.name }}</el-tag>
          <div class="collection-details">
            <p>集合ID: {{ collectionToDelete?.id }}</p>
            <p>文档数量: {{ collectionToDelete?.count || 0 }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseDeleteDialog">取消</el-button>
          <el-button type="danger" @click="handleDeleteCollection" :loading="loading">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

import { useConnectionStore } from '../stores/connection.js'
import { useCollectionStore } from '../stores/collection.js'

export default {
  name: 'CollectionManagement',
  components: {
    Plus,
    Refresh
  },
  setup() {
    const connectionStore = useConnectionStore()
    const collectionStore = useCollectionStore()
    
    const { isConnected, currentCollection } = storeToRefs(connectionStore)
    const { 
      loading, 
      collections, 
      hasCollections, 
      dialogVisible, 
      dialogTitle, 
      dialogMode,
      collectionForm,
      // 分页相关状态
      pagination,
      paginatedCollections
    } = storeToRefs(collectionStore)
    
    // 本地状态
    const collectionFormRef = ref(null)
    const deleteDialogVisible = ref(false)
    const collectionToDelete = ref(null)
    const metadataText = ref('')
    
    // 表单验证规则
    const formRules = {
      name: [
        { required: true, message: '请输入集合名称', trigger: 'blur' },
        { 
          pattern: /^[a-zA-Z0-9_-]+$/, 
          message: '集合名称只能包含字母、数字、下划线和连字符', 
          trigger: 'blur' 
        }
      ]
    }
    
    // 计算属性
    const getCountTagType = (count) => {
      if (count === 0) return 'info'
      if (count < 100) return 'success'
      if (count < 1000) return 'warning'
      return 'danger'
    }
    
    // 方法
    const refreshCollections = async () => {
      try {
        await collectionStore.loadCollections()
        ElMessage.success({
          message: '集合列表刷新成功',
          duration: 1000
        })
      } catch (error) {
        ElMessage.error(error.message || '刷新集合列表失败')
      }
    }
    
    const openCreateDialog = () => {
      collectionStore.openCreateDialog()
      metadataText.value = ''
    }
    
    const openEditDialog = (collection) => {
      collectionStore.openEditDialog(collection)
      metadataText.value = collection.metadata ? JSON.stringify(collection.metadata, null, 2) : ''
    }
    
    const handleCloseDialog = () => {
      collectionStore.closeDialog()
      metadataText.value = ''
      if (collectionFormRef.value) {
        collectionFormRef.value.resetFields()
      }
    }
    
    const handleSubmitForm = async () => {
      if (!collectionFormRef.value) return
      
      try {
        await collectionFormRef.value.validate()
        
        // 处理元数据
        let metadata = null
        if (metadataText.value.trim()) {
          try {
            metadata = JSON.parse(metadataText.value.trim())
          } catch (error) {
            ElMessage.error('元数据格式错误，请输入有效的JSON格式')
            return
          }
        }
        
        // 准备提交数据
        const submitData = {
          ...collectionForm.value,
          metadata
        }
        
        if (dialogMode.value === 'create') {
          await collectionStore.createCollection(submitData)
          ElMessage.success('集合创建成功')
        } else {
          // 详情模式：重新创建集合（因为ChromaDB没有直接的更新API）
          await collectionStore.createCollection(submitData)
          ElMessage.success('集合更新成功')
        }
        
        handleCloseDialog()
      } catch (error) {
        ElMessage.error(error.message || '操作失败')
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
    
    const confirmDeleteCollection = (collection) => {
      collectionToDelete.value = collection
      deleteDialogVisible.value = true
    }
    
    const handleCloseDeleteDialog = () => {
      deleteDialogVisible.value = false
      collectionToDelete.value = null
    }
    
    const handleDeleteCollection = async () => {
      if (!collectionToDelete.value) return
      
      try {
        await collectionStore.deleteCollection(collectionToDelete.value.name)
        ElMessage.success('集合删除成功')
        handleCloseDeleteDialog()
      } catch (error) {
        ElMessage.error(error.message || '删除集合失败')
      }
    }
    
    // 分页相关方法
    const handleSizeChange = (size) => {
      collectionStore.changePageSize(size)
    }
    
    const handleCurrentChange = (page) => {
      collectionStore.changePage(page)
    }
    
    // 监听连接状态变化
    watch(isConnected, (connected) => {
      if (connected) {
        refreshCollections()
      }
    })
    
    // 生命周期
    onMounted(() => {
      if (isConnected.value) {
        refreshCollections()
      }
    })
    
    return {
      // 状态
      loading,
      collections,
      hasCollections,
      isConnected,
      currentCollection,
      dialogVisible,
      dialogTitle,
      dialogMode,
      collectionForm,
      collectionFormRef,
      deleteDialogVisible,
      collectionToDelete,
      metadataText,
      formRules,
      
      // 分页状态
      pagination,
      paginatedCollections,
      
      // 方法
      getCountTagType,
      refreshCollections,
      openCreateDialog,
      openEditDialog,
      handleCloseDialog,
      handleSubmitForm,
      selectCollection,
      confirmDeleteCollection,
      handleCloseDeleteDialog,
      handleDeleteCollection,
      
      // 分页方法
      handleSizeChange,
      handleCurrentChange
    }
  }
}
</script>

<style scoped>
.collection-management {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.management-header-fixed {
  position: sticky;
  top: -2px;
  z-index: 10;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 4px 16px 3px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.header-left {
  flex-shrink: 0;
}

.header-right {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.header-top h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
  line-height: 1.2;
}

.management-content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.no-connection,
.no-data {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collections-content {
  flex: 1;
}

.collection-name {
  font-weight: 500;
}

.collection-id code {
  color: #606266;
  font-size: 12px;
  background-color: #f5f7fa;
  padding: 2px 4px;
  border-radius: 2px;
}

.metadata-cell {
  text-align: center;
}

.metadata-preview {
  margin: 0;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.delete-content {
  padding: 16px;
}

.collection-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
}

.collection-details {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
}

.collection-details p {
  margin: 4px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 减少表格行高 */
.collections-content :deep(.el-table .el-table__row) {
  height: 40px;
}

.collections-content :deep(.el-table .el-table__cell) {
  padding: 6px 0;
}

.collections-content :deep(.el-table .el-table__header .el-table__cell) {
  padding: 8px 0;
  height: 33px;
}

.collections-content :deep(.el-table .el-table__header-wrapper .el-table__header tr) {
  height: 33px;
}

.collections-content :deep(.el-table td),
.collections-content :deep(.el-table th) {
  padding: 1px 12px;
}
</style> 