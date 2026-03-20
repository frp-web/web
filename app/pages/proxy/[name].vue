<template>
  <div p-4>
    <!-- 页面头部 -->
    <div fyc gap-3 m-b-4>
      <AntButton type="text" :icon="h('i', { class: 'i-carbon-arrow-left' })" @click="handleBack">
        {{ $t('common.back') }}
      </AntButton>
      <h2 flex-1 m-0 text-xl color-base font-semibold>
        {{ pageTitle }}
      </h2>
      <AntButton
        :icon="h('i', { class: 'i-carbon-refresh' })"
        :loading="loading"
        @click="handleRefresh"
      >
        {{ $t('common.refresh') }}
      </AntButton>
    </div>

    <!-- 代理关键信息卡片 -->
    <AntCard v-if="proxyInfo" m-b-4>
      <div grid grid-cols="[repeat(auto-fit,minmax(200px,1fr))]" gap-4 items-center>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('common.status') }}</span>
          <AntTag :color="proxyInfo.status === 'online' ? 'success' : 'default'">
            {{ proxyInfo.status }}
          </AntTag>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('proxy.type') }}</span>
          <AntTag :color="getTypeColor(proxyInfo.conf.type)">
            {{ proxyInfo.conf.type?.toUpperCase() }}
          </AntTag>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('proxy.remotePort') }}</span>
          <span text-sm color-base font-medium>{{ proxyInfo.conf.remotePort || '-' }}</span>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('proxy.localAddress') }}</span>
          <span text-sm color-base font-medium>{{ proxyInfo.conf.localIP }}:{{ proxyInfo.conf.localPort || '-' }}</span>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('proxy.connections') }}</span>
          <span text-sm color-base font-medium>{{ proxyInfo.curConns }}</span>
        </div>
      </div>
    </AntCard>

    <!-- 详细信息卡片 -->
    <div v-if="proxyInfo" m-t-0>
      <AntRow :gutter="[16, 16]">
        <!-- 基本信息 -->
        <AntCol :xs="24" :lg="12">
          <AntCard :title="$t('proxy.basicInfo')">
            <AntDescriptions :column="1" bordered size="small">
              <AntDescriptionsItem :label="$t('proxy.name')">
                {{ proxyInfo.name }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.type')">
                <AntTag>{{ proxyInfo.conf.type?.toUpperCase() }}</AntTag>
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.clientID')">
                <AntButton type="link" size="small" @click="goToClient">
                  {{ proxyInfo.clientID }}
                </AntButton>
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.clientVersion')">
                {{ proxyInfo.clientVersion }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('common.status')">
                <AntTag :color="proxyInfo.status === 'online' ? 'success' : 'default'">
                  {{ proxyInfo.status }}
                </AntTag>
              </AntDescriptionsItem>
            </AntDescriptions>
          </AntCard>
        </AntCol>

        <!-- 端口配置 -->
        <AntCol :xs="24" :lg="12">
          <AntCard :title="$t('proxy.portConfig')">
            <AntDescriptions :column="1" bordered size="small">
              <AntDescriptionsItem :label="$t('proxy.localIP')">
                {{ proxyInfo.conf.localIP || '-' }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.localPort')">
                {{ proxyInfo.conf.localPort || '-' }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.remotePort')">
                {{ proxyInfo.conf.remotePort || '-' }}
              </AntDescriptionsItem>
              <AntDescriptionsItem v-if="proxyInfo.conf.customDomains" :label="$t('proxy.customDomains')">
                <AntTag v-for="domain in proxyInfo.conf.customDomains" :key="domain">
                  {{ domain }}
                </AntTag>
              </AntDescriptionsItem>
              <AntDescriptionsItem v-if="proxyInfo.conf.subdomain" :label="$t('proxy.subdomain')">
                {{ proxyInfo.conf.subdomain }}
              </AntDescriptionsItem>
            </AntDescriptions>
          </AntCard>
        </AntCol>

        <!-- 流量统计 -->
        <AntCol :xs="24" :lg="12">
          <AntCard :title="$t('proxy.trafficStats')">
            <AntDescriptions :column="1" bordered size="small">
              <AntDescriptionsItem :label="$t('proxy.todayTrafficIn')">
                {{ formatBytes(proxyInfo.todayTrafficIn) }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.todayTrafficOut')">
                {{ formatBytes(proxyInfo.todayTrafficOut) }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.connections')">
                {{ proxyInfo.curConns }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.lastStartTime')">
                {{ proxyInfo.lastStartTime || '-' }}
              </AntDescriptionsItem>
              <AntDescriptionsItem :label="$t('proxy.lastCloseTime')">
                {{ proxyInfo.lastCloseTime || '-' }}
              </AntDescriptionsItem>
            </AntDescriptions>
          </AntCard>
        </AntCol>

        <!-- 高级配置 -->
        <AntCol :xs="24" :lg="12">
          <AntCard :title="$t('proxy.advancedConfig')">
            <AntDescriptions :column="1" bordered size="small">
              <!-- Transport -->
              <AntDescriptionsItem v-if="proxyInfo.conf.transport" :label="$t('proxy.bandwidthLimit')">
                {{ proxyInfo.conf.transport.bandwidthLimit || $t('common.unlimited') }}
              </AntDescriptionsItem>
              <AntDescriptionsItem v-if="proxyInfo.conf.transport" :label="$t('proxy.bandwidthLimitMode')">
                {{ proxyInfo.conf.transport.bandwidthLimitMode || '-' }}
              </AntDescriptionsItem>

              <!-- Load Balancer -->
              <AntDescriptionsItem v-if="proxyInfo.conf.loadBalancer?.group" :label="$t('proxy.loadBalancerGroup')">
                {{ proxyInfo.conf.loadBalancer.group }}
              </AntDescriptionsItem>

              <!-- Health Check -->
              <AntDescriptionsItem v-if="proxyInfo.conf.healthCheck?.type" :label="$t('proxy.healthCheckType')">
                {{ proxyInfo.conf.healthCheck.type }}
              </AntDescriptionsItem>
              <AntDescriptionsItem v-if="proxyInfo.conf.healthCheck?.intervalSeconds" :label="$t('proxy.healthCheckInterval')">
                {{ proxyInfo.conf.healthCheck.intervalSeconds }}s
              </AntDescriptionsItem>

              <!-- Plugin -->
              <AntDescriptionsItem v-if="proxyInfo.conf.plugin" :label="$t('proxy.plugin')">
                {{ proxyInfo.conf.plugin }}
              </AntDescriptionsItem>
            </AntDescriptions>
          </AntCard>
        </AntCol>

        <!-- 完整配置 -->
        <AntCol :span="24">
          <AntCard :title="$t('proxy.fullConfig')">
            <pre m-0 p-3 bg="[var(--ant-color-bg-layout)]" rounded text-xs leading-relaxed overflow-x-auto>{{ JSON.stringify(proxyInfo.conf, null, 2) }}</pre>
          </AntCard>
        </AntCol>
      </AntRow>
    </div>

    <!-- 加载失败提示 -->
    <AntEmpty v-else-if="!loading" :description="$t('proxy.notFound')" />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { h } from 'vue'

interface ProxyDetail {
  name: string
  conf: {
    name: string
    type: string
    transport?: {
      bandwidthLimit?: string
      bandwidthLimitMode?: string
    }
    loadBalancer?: {
      group?: string
    }
    healthCheck?: {
      type?: string
      intervalSeconds?: number
    }
    localIP?: string
    localPort?: number
    remotePort?: number
    customDomains?: string[]
    subdomain?: string
    plugin?: any
    [key: string]: any
  }
  clientID: string
  clientVersion: string
  todayTrafficIn: number
  todayTrafficOut: number
  curConns: number
  lastStartTime: string
  lastCloseTime: string
  status: string
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const proxyName = computed(() => route.params.name as string)
const loading = ref(false)
const proxyInfo = ref<ProxyDetail>()

const pageTitle = computed(() => {
  return proxyInfo.value?.name || proxyName.value
})

// 获取类型颜色
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    tcp: 'blue',
    udp: 'cyan',
    http: 'green',
    https: 'purple',
    stcp: 'orange',
    xtcp: 'magenta',
    sudp: 'geekblue',
    tcpmux: 'volcano'
  }
  return colors[type?.toLowerCase()] || 'default'
}

// 格式化字节数
function formatBytes(bytes: number) {
  if (!bytes || bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

// 加载代理详情
async function loadProxyDetail() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean, data: ProxyDetail }>(`/api/proxies/${proxyName.value}`)
    if (response.success && response.data) {
      proxyInfo.value = response.data
    }
  }
  catch (error: any) {
    console.error('Failed to load proxy detail:', error)
    if (error.statusCode === 404) {
      message.error(t('proxy.notFound'))
    }
    else {
      message.error(t('proxy.loadFailed'))
    }
  }
  finally {
    loading.value = false
  }
}

// 刷新数据
async function handleRefresh() {
  await loadProxyDetail()
}

// 返回
function handleBack() {
  router.back()
}

// 跳转到客户端详情
function goToClient() {
  if (proxyInfo.value?.clientID) {
    router.push(`/node/${proxyInfo.value.clientID}`)
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadProxyDetail()
})
</script>
