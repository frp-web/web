<template>
  <section flex="~ col" gap-6>
    <!-- Server 模式的节点选择器 -->
    <header v-if="configStore.frpMode === 'server'" flex="~ wrap" items-center justify-between gap-4>
      <div>
        <AntSelect
          v-model:value="selectedNodeId"
          show-search
          :placeholder="t('tunnel.selectNode')"
          :options="nodeOptions"
          :loading="nodesLoading"
          :filter-option="filterNodeOption"
          style="width: 300px"
          @change="handleNodeChange"
        >
          <template #suffixIcon>
            <span i-carbon-server />
          </template>
        </AntSelect>
      </div>
    </header>

    <!-- Server 模式未选择节点时的提示 -->
    <div v-if="configStore.frpMode === 'server' && !selectedNodeId" rounded-lg bg-container p-8 text-center>
      <AntEmpty :description="t('tunnel.selectNodeFirst')">
        <template #image>
          <span i-carbon-server text-secondary text-64 />
        </template>
      </AntEmpty>
    </div>

    <!-- 隧道管理组件 -->
    <TunnelManager
      v-else
      :key="selectedNodeId || 'client'"
      :node-id="configStore.frpMode === 'server' ? selectedNodeId : undefined"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useConfigStore } from '~/stores/config'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const configStore = useConfigStore()

// 节点相关状态
const nodes = ref<any[]>([])
const nodesLoading = ref(false)
const selectedNodeId = ref<string>()

// 节点选项
const nodeOptions = computed(() =>
  nodes.value.map(node => ({
    label: `${node.hostname || node.ip} (${node.id})`,
    value: node.id,
    status: node.status
  }))
)

// 节点搜索过滤
function filterNodeOption(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 节点变化处理
function handleNodeChange(nodeId: string) {
  selectedNodeId.value = nodeId
}

// 获取节点列表
async function fetchNodes() {
  if (configStore.frpMode !== 'server') {
    return
  }

  nodesLoading.value = true
  try {
    const response = await $fetch<{
      success: boolean
      data: { items: any[] }
      error?: { code: string, message: string }
    }>('/api/node/list')

    if (response.success) {
      nodes.value = response.data.items

      // 如果没有选中的节点且节点列表不为空，默认选择第一个在线节点
      if (!selectedNodeId.value && nodes.value.length > 0) {
        const firstOnlineNode = nodes.value.find(n => n.status === 'online')
        selectedNodeId.value = (firstOnlineNode || nodes.value[0]).id
      }
    }
  }
  catch (error) {
    console.error('Failed to fetch nodes:', error)
  }
  finally {
    nodesLoading.value = false
  }
}

onMounted(() => {
  if (configStore.frpMode === 'server') {
    fetchNodes()
  }
})
</script>
