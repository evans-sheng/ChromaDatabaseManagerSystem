<template>
  <div class="loading-container">
    <el-loading
      v-loading="true"
      element-loading-text="加载中..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    />
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner'
}
</script>

<style scoped>
.loading-container {
  position: relative;
  min-height: 200px;
  width: 100%;
}
</style> 