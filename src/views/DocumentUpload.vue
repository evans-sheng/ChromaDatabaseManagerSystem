<template>
  <div class="document-upload">
    <div class="upload-header">
      <h3>文档上传</h3>
    </div>
    
    <div v-if="!isConnected" class="no-connection">
      <el-empty 
        description="请先连接数据库并选择集合"
        :image-size="100"
      />
    </div>
    
    <div v-else class="upload-content">
      <!-- 上传配置区域 -->
      <el-card class="upload-config" shadow="hover">
        <template #header>
          <span>上传配置</span>
        </template>
        
        <el-form :model="uploadForm" label-width="120px">
          <el-form-item label="上传方式">
            <el-radio-group v-model="uploadForm.mode" @change="handleModeChange">
              <el-radio label="file">文件上传</el-radio>
              <el-radio label="text">文本输入</el-radio>
              <el-radio label="json">JSON格式</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <!-- 文件上传模式 -->
          <div v-if="uploadForm.mode === 'file'">
            <el-form-item label="选择文件">
              <el-upload
                ref="uploadRef"
                class="upload-dragger"
                drag
                :multiple="true"
                :auto-upload="false"
                :file-list="fileList"
                :on-change="handleFileChange"
                :on-remove="handleFileRemove"
                :accept="acceptedFileTypes"
                :before-upload="beforeUpload"
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  将文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    支持 .txt, .md, .json, .csv 文件，单个文件不超过 10MB
                  </div>
                </template>
              </el-upload>
            </el-form-item>
            
            <el-form-item v-if="fileList.length > 0" label="文件列表">
              <div class="file-list">
                <div 
                  v-for="file in fileList" 
                  :key="file.uid"
                  class="file-item"
                >
                  <div class="file-info">
                    <el-icon><Document /></el-icon>
                    <span class="file-name">{{ file.name }}</span>
                    <el-tag size="small" type="info">
                      {{ formatFileSize(file.size) }}
                    </el-tag>
                  </div>
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeFile(file)"
                  />
                </div>
              </div>
            </el-form-item>
          </div>
          
          <!-- 文本输入模式 -->
          <div v-if="uploadForm.mode === 'text'">
            <el-form-item label="文档内容" required>
              <el-input
                v-model="uploadForm.textContent"
                type="textarea"
                :rows="8"
                placeholder="请输入要上传的文档内容..."
                :disabled="uploading"
                show-word-limit
                :maxlength="10000"
              />
            </el-form-item>
          </div>
          
          <!-- JSON格式输入模式 -->
          <div v-if="uploadForm.mode === 'json'">
            <el-form-item label="JSON数据" required>
              <el-input
                v-model="uploadForm.jsonContent"
                type="textarea"
                :rows="12"
                placeholder='请输入JSON格式的upsert数据，例如：
{
  "ids": ["92f48952-fc8e-4557-b8d2-ca9c6cab8916"],
  "embeddings": [[1,2,3,4,5,6,7]],
  "metadatas": [
    {"topic":"AI基础","category":"定义","doc_id":0,"chunk_id":0,"total_chunks":1}
  ],
  "documents": [
    "人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统"
  ],
  "uris": null
}'
                :disabled="uploading"
                show-word-limit
                :maxlength="50000"
              />
            </el-form-item>
            <div class="form-tip">
              <p>JSON格式说明：</p>
              <ul>
                <li><strong>ids</strong>: 文档ID数组（可选，留空将自动生成UUID）</li>
                <li><strong>embeddings</strong>: 嵌入向量数组（可选，留空将调用LLM自动生成）</li>
                <li><strong>metadatas</strong>: 元数据对象数组</li>
                <li><strong>documents</strong>: 文档内容字符串数组</li>
                <li><strong>uris</strong>: URI数组（可选，通常设为null）</li>
              </ul>
              <el-button
                type="primary"
                size="small"
                @click="loadJsonExample"
                :disabled="uploading"
              >
                加载示例数据
              </el-button>
            </div>
          </div>
          
          <!-- 元数据配置 -->
          <el-form-item label="元数据配置">
            <div class="metadata-config">
              <div 
                v-for="(meta, index) in metadataList" 
                :key="index"
                class="metadata-item"
              >
                <el-input
                  v-model="meta.key"
                  placeholder="键"
                  style="width: 120px"
                  :disabled="uploading"
                />
                <el-input
                  v-model="meta.value"
                  placeholder="值"
                  style="width: 120px; margin-left: 8px"
                  :disabled="uploading"
                />
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="removeMetadata(index)"
                  :disabled="uploading"
                  style="margin-left: 8px"
                />
              </div>
              
              <el-button
                type="primary"
                size="small"
                :icon="Plus"
                @click="addMetadata"
                :disabled="uploading"
              >
                添加元数据
              </el-button>
            </div>
            <div class="form-tip">为文档添加自定义元数据信息</div>
          </el-form-item>
          
          <!-- 分块配置 -->
          <el-form-item label="分块设置">
            <div class="chunk-config">
              <el-checkbox 
                v-model="uploadForm.enableChunking"
                :disabled="uploading"
              >
                启用文档分块
              </el-checkbox>
              
              <div v-if="uploadForm.enableChunking" class="chunk-options">
                <div class="chunk-option">
                  <label>分块大小:</label>
                  <el-input-number
                    v-model="uploadForm.chunkSize"
                    :min="100"
                    :max="2000"
                    :disabled="uploading"
                    style="width: 120px"
                  />
                  <span class="form-tip">字符数</span>
                </div>
                
                <div class="chunk-option">
                  <label>重叠大小:</label>
                  <el-input-number
                    v-model="uploadForm.chunkOverlap"
                    :min="0"
                    :max="500"
                    :disabled="uploading"
                    style="width: 120px"
                  />
                  <span class="form-tip">字符数</span>
                </div>
              </div>
            </div>
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              :loading="uploading"
              @click="handleUpload"
              :disabled="!canUpload"
            >
              <el-icon><Upload /></el-icon>
              {{ uploading ? '上传中...' : '开始上传' }}
            </el-button>
            
            <el-button
              v-if="uploadResults.length > 0"
              @click="clearResults"
              :disabled="uploading"
            >
              清空结果
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 上传进度 -->
      <el-card v-if="uploading" class="upload-progress" shadow="hover">
        <template #header>
          <span>上传进度</span>
        </template>
        
        <div class="progress-info">
          <div class="progress-text">
            正在处理: {{ currentProcessingFile || '准备中...' }}
          </div>
          <el-progress 
            :percentage="uploadProgress" 
            :status="uploadProgress === 100 ? 'success' : 'active'"
          />
          <div class="progress-details">
            已处理: {{ processedCount }} / {{ totalCount }}
          </div>
        </div>
      </el-card>
      
      <!-- 上传结果 -->
      <div v-if="uploadResults.length > 0" class="upload-results">
        <div class="results-header">
          <h4>上传结果</h4>
          <el-tag :type="getResultTagType()">
            成功: {{ successCount }} / 失败: {{ failureCount }}
          </el-tag>
        </div>
        
        <div class="results-list">
          <el-card 
            v-for="(result, index) in uploadResults" 
            :key="index"
            class="result-card"
            :class="{ 'result-error': !result.success }"
            shadow="hover"
          >
            <div class="result-header">
              <div class="result-info">
                <el-icon>
                  <SuccessFilled v-if="result.success" style="color: #67c23a" />
                  <CircleCloseFilled v-else style="color: #f56c6c" />
                </el-icon>
                <span class="result-filename">{{ result.filename }}</span>
                <el-tag 
                  :type="result.success ? 'success' : 'danger'"
                  size="small"
                >
                  {{ result.success ? '成功' : '失败' }}
                </el-tag>
              </div>
              <div class="result-meta">
                <el-tag v-if="result.documentCount" type="info" size="small">
                  文档数: {{ result.documentCount }}
                </el-tag>
                <el-tag v-if="result.processingTime" type="warning" size="small">
                  耗时: {{ result.processingTime }}ms
                </el-tag>
              </div>
            </div>
            
            <div v-if="result.error" class="result-error-message">
              <el-alert
                :title="result.error"
                type="error"
                :closable="false"
                show-icon
              />
            </div>
            
            <div v-if="result.success && result.preview" class="result-preview">
              <h5>文档预览</h5>
              <div class="preview-content">
                {{ truncateText(result.preview, 200) }}
              </div>
            </div>
            
            <div v-if="result.metadata" class="result-metadata">
              <h5>元数据信息</h5>
              <div class="metadata-display">
                <el-tag 
                  v-for="(value, key) in result.metadata" 
                  :key="key"
                  size="small"
                  type="info"
                >
                  {{ key }}: {{ value }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { 
  UploadFilled, 
  Upload, 
  Plus, 
  Delete, 
  Document,
  SuccessFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'

import { useConnectionStore } from '../stores/connection.js'
import { useDatabaseStore } from '../stores/database.js'
import { truncateText } from '../utils/helpers.js'

export default {
  name: 'DocumentUpload',
  components: {
    UploadFilled,
    Upload,
    Plus,
    Delete,
    Document,
    SuccessFilled,
    CircleCloseFilled
  },
  setup() {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    const { isConnected } = storeToRefs(connectionStore)
    const { loading } = storeToRefs(databaseStore)
    
    // 本地状态
    const uploadRef = ref()
    const uploading = ref(false)
    const uploadProgress = ref(0)
    const currentProcessingFile = ref('')
    const processedCount = ref(0)
    const totalCount = ref(0)
    
    const uploadForm = reactive({
      mode: 'file', // 'file' | 'text' | 'json'
      textContent: '',
      jsonContent: '',
      enableChunking: true,
      chunkSize: 1000,
      chunkOverlap: 100
    })
    
    const fileList = ref([])
    const metadataList = ref([])
    const uploadResults = ref([])
    
    const acceptedFileTypes = '.txt,.md,.json,.csv'
    
    // 计算属性
    const canUpload = computed(() => {
      if (uploadForm.mode === 'file') {
        return fileList.value.length > 0
      } else if (uploadForm.mode === 'text') {
        return uploadForm.textContent.trim().length > 0
      } else if (uploadForm.mode === 'json') {
        return uploadForm.jsonContent.trim().length > 0
      } else {
        return false
      }
    })
    
    const successCount = computed(() => {
      return uploadResults.value.filter(r => r.success).length
    })
    
    const failureCount = computed(() => {
      return uploadResults.value.filter(r => !r.success).length
    })
    
    // 方法
    const handleModeChange = () => {
      // 清空相关数据
      fileList.value = []
      uploadForm.textContent = ''
      uploadForm.jsonContent = ''
      uploadResults.value = []
    }
    
    const handleFileChange = (file, files) => {
      fileList.value = files
    }
    
    const handleFileRemove = (file, files) => {
      fileList.value = files
    }
    
    const removeFile = (file) => {
      const index = fileList.value.findIndex(f => f.uid === file.uid)
      if (index > -1) {
        fileList.value.splice(index, 1)
      }
    }
    
    const beforeUpload = (file) => {
      // 检查文件类型
      const isValidType = acceptedFileTypes.split(',').some(type => 
        file.name.toLowerCase().endsWith(type.replace('.', ''))
      )
      
      if (!isValidType) {
        ElMessage.error('不支持的文件类型')
        return false
      }
      
      // 检查文件大小 (10MB)
      const isValidSize = file.size / 1024 / 1024 < 10
      if (!isValidSize) {
        ElMessage.error('文件大小不能超过 10MB')
        return false
      }
      
      return false // 阻止自动上传
    }
    
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    const addMetadata = () => {
      metadataList.value.push({ key: '', value: '' })
    }
    
    const removeMetadata = (index) => {
      metadataList.value.splice(index, 1)
    }
    
    const buildMetadata = () => {
      const metadata = {}
      metadataList.value.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          metadata[item.key.trim()] = item.value.trim()
        }
      })
      return metadata
    }
    
    const handleUpload = async () => {
      if (!canUpload.value) {
        ElMessage.warning('请选择文件或输入文本内容')
        return
      }
      
      uploading.value = true
      uploadProgress.value = 0
      processedCount.value = 0
      uploadResults.value = []
      
      try {
        const metadata = buildMetadata()
        
        if (uploadForm.mode === 'file') {
          await uploadFiles(metadata)
        } else if (uploadForm.mode === 'text') {
          await uploadText(metadata)
        } else {
          await uploadJson(metadata)
        }
        
        ElMessage.success(`上传完成！成功: ${successCount.value}, 失败: ${failureCount.value}`)
      } catch (error) {
        ElMessage.error(error.message || '上传失败')
      } finally {
        uploading.value = false
        uploadProgress.value = 100
        currentProcessingFile.value = ''
      }
    }
    
    const uploadFiles = async (metadata) => {
      totalCount.value = fileList.value.length
      
      for (let i = 0; i < fileList.value.length; i++) {
        const file = fileList.value[i]
        currentProcessingFile.value = file.name
        
        try {
          const startTime = Date.now()
          
          // 读取文件内容
          const content = await readFileContent(file.raw)
          
          // 处理文档
          const result = await processDocument(
            content, 
            file.name, 
            metadata
          )
          
          const processingTime = Date.now() - startTime
          
          uploadResults.value.push({
            filename: file.name,
            success: true,
            documentCount: result.documentCount,
            processingTime,
            preview: content.substring(0, 200),
            metadata: { ...metadata, filename: file.name }
          })
          
        } catch (error) {
          uploadResults.value.push({
            filename: file.name,
            success: false,
            error: error.message
          })
        }
        
        processedCount.value++
        uploadProgress.value = Math.round((processedCount.value / totalCount.value) * 100)
      }
    }
    
    const uploadText = async (metadata) => {
      totalCount.value = 1
      currentProcessingFile.value = '文本内容'
      
      try {
        const startTime = Date.now()
        
        const result = await processDocument(
          uploadForm.textContent,
          'text_input',
          metadata
        )
        
        const processingTime = Date.now() - startTime
        
        uploadResults.value.push({
          filename: '文本输入',
          success: true,
          documentCount: result.documentCount,
          processingTime,
          preview: uploadForm.textContent.substring(0, 200),
          metadata
        })
        
      } catch (error) {
        uploadResults.value.push({
          filename: '文本输入',
          success: false,
          error: error.message
        })
      }
      
      processedCount.value = 1
      uploadProgress.value = 100
    }
    
    const uploadJson = async (metadata) => {
      totalCount.value = 1
      currentProcessingFile.value = 'JSON格式'
      
      try {
        const startTime = Date.now()
        
        const result = await processJson(
          uploadForm.jsonContent,
          metadata
        )
        
        const processingTime = Date.now() - startTime
        
        uploadResults.value.push({
          filename: 'JSON格式',
          success: true,
          documentCount: result.documentCount,
          processingTime,
          preview: uploadForm.jsonContent.substring(0, 200),
          metadata
        })
        
      } catch (error) {
        uploadResults.value.push({
          filename: 'JSON格式',
          success: false,
          error: error.message
        })
      }
      
      processedCount.value = 1
      uploadProgress.value = 100
    }
    
    const readFileContent = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(new Error('文件读取失败'))
        reader.readAsText(file, 'UTF-8')
      })
    }
    
    const processDocument = async (content, filename, metadata) => {
      let documentCount = 1
      
      if (uploadForm.enableChunking && content.length > uploadForm.chunkSize) {
        // 计算分块数量
        documentCount = Math.ceil(content.length / uploadForm.chunkSize)
        
        // 对内容进行分块处理
        const chunks = []
        const chunkMetadatas = []
        
        for (let i = 0; i < documentCount; i++) {
          const start = i * uploadForm.chunkSize
          const end = Math.min(start + uploadForm.chunkSize, content.length)
          const chunkContent = content.substring(start, end)
          
          chunks.push(chunkContent)
          chunkMetadatas.push({
            ...metadata,
            chunk_id: i,
            total_chunks: documentCount,
            chunk_size: chunkContent.length,
            source_filename: filename
          })
        }
        
        // 调用store方法上传分块文档 - 使用JSON格式
        await databaseStore.uploadDocument({
          content: chunks, // 传递分块数组
          metadatas: chunkMetadatas,
          filename,
          metadata: { ...metadata, filename, total_chunks: documentCount }
        })
      } else {
        // 单个文档上传 - 使用JSON格式
        await databaseStore.uploadDocument({
          content: content, // 传递单个文档内容
          metadata: { ...metadata, filename },
          filename
        })
      }
      
      return { documentCount }
    }
    
    const processJson = async (jsonContent, metadata) => {
      try {
        // 解析JSON数据
        const jsonData = JSON.parse(jsonContent)
        
        // 验证必需字段
        if (!jsonData.documents || !Array.isArray(jsonData.documents)) {
          throw new Error('JSON数据必须包含documents字段且为数组格式')
        }
        
        const documentCount = jsonData.documents.length
        
        // 调用store方法上传JSON格式文档
        const result = await databaseStore.uploadDocument({
          content: jsonData.documents,
          metadatas: jsonData.metadatas || [],
          ids: jsonData.ids || [],
          embeddings: jsonData.embeddings || [],
          filename: 'json_input'
        })
        
        return { 
          documentCount: result.documentCount || documentCount,
          ids: result.ids
        }
        
      } catch (error) {
        if (error.name === 'SyntaxError') {
          throw new Error('JSON格式错误，请检查语法')
        }
        throw error
      }
    }
    
    const clearResults = () => {
      uploadResults.value = []
      fileList.value = []
      uploadForm.textContent = ''
      uploadForm.jsonContent = ''
      metadataList.value = []
      uploadProgress.value = 0
      processedCount.value = 0
      totalCount.value = 0
    }
    
    const getResultTagType = () => {
      if (failureCount.value === 0) return 'success'
      if (successCount.value === 0) return 'danger'
      return 'warning'
    }
    
    const loadJsonExample = () => {
      uploadForm.jsonContent = `{
  "ids": ["92f48952-fc8e-4557-b8d2-ca9c6cab8916"],
  "embeddings": [[1,2,3,4,5,6,7]],
  "metadatas": [
    {"topic":"AI基础","category":"定义","doc_id":0,"chunk_id":0,"total_chunks":1}
  ],
  "documents": [
    "人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统"
  ],
  "uris": null
}`
    }
    
    return {
      isConnected,
      loading,
      uploading,
      uploadProgress,
      currentProcessingFile,
      processedCount,
      totalCount,
      uploadForm,
      fileList,
      metadataList,
      uploadResults,
      acceptedFileTypes,
      canUpload,
      successCount,
      failureCount,
      uploadRef,
      handleModeChange,
      handleFileChange,
      handleFileRemove,
      removeFile,
      beforeUpload,
      formatFileSize,
      addMetadata,
      removeMetadata,
      handleUpload,
      clearResults,
      getResultTagType,
      truncateText,
      loadJsonExample
    }
  }
}
</script>

<style scoped>
.document-upload {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-header {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.upload-header h3 {
  margin: 0;
  color: #303133;
}

.no-connection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.upload-config {
  margin-bottom: 20px;
  border-radius: 8px;
}

.upload-dragger {
  width: 100%;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  color: #303133;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.form-tip p {
  margin: 8px 0 4px 0;
  font-weight: 500;
  color: #606266;
}

.form-tip ul {
  margin: 4px 0;
  padding-left: 16px;
}

.form-tip li {
  margin: 2px 0;
  line-height: 1.4;
}

.form-tip strong {
  color: #409eff;
  font-weight: 600;
}

.metadata-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  align-items: center;
}

.chunk-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chunk-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 24px;
}

.chunk-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chunk-option label {
  min-width: 80px;
  font-size: 14px;
  color: #606266;
}

.upload-progress {
  margin-bottom: 20px;
  border-radius: 8px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-text {
  font-weight: 500;
  color: #303133;
}

.progress-details {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.upload-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.results-header h4 {
  margin: 0;
  color: #303133;
}

.results-list {
  flex: 1;
  overflow-y: auto;
}

.result-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.result-card:last-child {
  margin-bottom: 0;
}

.result-card.result-error {
  border-color: #f56c6c;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-filename {
  font-weight: 500;
  color: #303133;
}

.result-meta {
  display: flex;
  gap: 8px;
}

.result-error-message {
  margin-bottom: 12px;
}

.result-preview h5,
.result-metadata h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.preview-content {
  line-height: 1.6;
  color: #606266;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
}

.metadata-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style> 