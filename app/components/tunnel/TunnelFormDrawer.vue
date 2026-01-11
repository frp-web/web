<template>
  <AntDrawer
    :open="open"
    :title="drawerTitle"
    width="600"
    @update:open="handleClose"
  >
    <AntSpin :spinning="loading">
      <AntForm
        ref="formRef"
        :model="formState"
        :rules="rules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <AntFormItem name="name" :label="t('tunnel.tunnelName')">
          <AntInput
            v-model:value="formState.name"
            :placeholder="t('tunnel.tunnelNamePlaceholder')"
          />
        </AntFormItem>

        <AntFormItem name="type" :label="t('tunnel.type')">
          <AntSelect
            v-model:value="formState.type"
            :placeholder="t('tunnel.typePlaceholder')"
            :options="typeOptions"
          />
        </AntFormItem>

        <AntFormItem
          v-if="['tcp', 'udp', 'stcp', 'xtcp', 'sudp'].includes(formState.type)"
          name="localPort"
          :label="t('tunnel.localPort')"
        >
          <AntInputNumber
            v-model:value="formState.localPort"
            :placeholder="t('tunnel.localPortPlaceholder')"
            :min="1"
            :max="65535"
            w="full"
          />
        </AntFormItem>

        <AntFormItem
          v-if="['tcp', 'udp', 'stcp', 'xtcp', 'sudp'].includes(formState.type)"
          name="localIP"
          :label="t('tunnel.localIP')"
        >
          <AntInput
            v-model:value="formState.localIP"
            :placeholder="t('tunnel.localIPPlaceholder')"
          />
        </AntFormItem>

        <AntFormItem
          v-if="['tcp', 'udp', 'stcp', 'xtcp', 'sudp', 'tcpmux'].includes(formState.type)"
          name="remotePort"
          :label="t('tunnel.remotePort')"
        >
          <AntInputNumber
            v-model:value="formState.remotePort"
            :placeholder="t('tunnel.remotePortPlaceholder')"
            :min="1"
            :max="65535"
            w="full"
          />
        </AntFormItem>

        <AntFormItem
          v-if="['http', 'https'].includes(formState.type)"
          name="localPort"
          :label="t('tunnel.localPort')"
        >
          <AntInputNumber
            v-model:value="formState.localPort"
            :placeholder="t('tunnel.localPortPlaceholder')"
            :min="1"
            :max="65535"
            w="full"
          />
        </AntFormItem>

        <AntFormItem
          v-if="formState.type === 'http'"
          name="subdomain"
          :label="t('tunnel.subdomain')"
        >
          <AntInput
            v-model:value="formState.subdomain"
            :placeholder="t('tunnel.subdomainPlaceholder')"
          />
        </AntFormItem>

        <AntFormItem
          v-if="['http', 'https'].includes(formState.type)"
          name="customDomains"
          :label="t('tunnel.customDomains')"
        >
          <AntSelect
            v-model:value="formState.customDomains"
            mode="tags"
            :placeholder="t('tunnel.customDomainsPlaceholder')"
          />
        </AntFormItem>
      </AntForm>
    </AntSpin>

    <template #footer>
      <AntSpace>
        <AntButton @click="handleClose">
          {{ t('common.cancel') }}
        </AntButton>
        <AntButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ t('common.save') }}
        </AntButton>
      </AntSpace>
    </template>
  </AntDrawer>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import { message } from 'ant-design-vue'

interface TunnelConfig {
  name: string
  type: string
  localPort?: number
  localIP?: string
  remotePort?: number
  customDomains?: string[]
  subdomain?: string
  [key: string]: any
}

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  initialTunnel?: TunnelConfig
  nodeId?: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)
const formState = ref<TunnelConfig>({
  name: '',
  type: 'tcp',
  localPort: undefined,
  localIP: '127.0.0.1',
  remotePort: undefined,
  customDomains: [],
  subdomain: undefined
})

const drawerTitle = computed(() => {
  if (props.mode === 'add') {
    return t('tunnel.addTunnel')
  }
  return t('tunnel.editTunnel')
})

const typeOptions = [
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' },
  { label: 'STCP', value: 'stcp' },
  { label: 'XTCP', value: 'xtcp' },
  { label: 'TCPMUX', value: 'tcpmux' },
  { label: 'SUDP', value: 'sudp' }
]

const rules = computed(() => ({
  name: [
    { required: true, message: t('tunnel.nameRequired'), trigger: 'blur' },
    { pattern: /^[\w-]+$/, message: t('tunnel.namePattern'), trigger: 'blur' }
  ],
  type: [
    { required: true, message: t('tunnel.typeRequired'), trigger: 'change' }
  ],
  localPort: [
    { required: true, message: t('tunnel.localPortRequired'), trigger: 'blur', type: 'number' }
  ],
  remotePort: [
    { required: true, message: t('tunnel.remotePortRequired'), trigger: 'blur', type: 'number' }
  ]
}))

const apiUrl = computed(() => {
  if (props.nodeId) {
    return `/api/node/${props.nodeId}/tunnel`
  }
  return '/api/config/tunnel'
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    const method = props.mode === 'add' ? 'POST' : 'PUT'

    const response = await $fetch<{ success: boolean, error?: { code: string, message: string } }>(
      apiUrl.value,
      {
        method,
        body: props.mode === 'add' ? formState.value : { ...formState.value, oldName: props.initialTunnel?.name }
      }
    )

    if (response.success) {
      message.success(props.mode === 'add' ? t('tunnel.addSuccess') : t('tunnel.updateSuccess'))
      emit('success')
      handleClose()
    }
    else {
      message.error(response.error?.message || (props.mode === 'add' ? t('tunnel.addFailed') : t('tunnel.updateFailed')))
    }
  }
  catch (error: any) {
    console.error('Failed to save tunnel:', error)
    if (error.errorFields) {
      return // Form validation error
    }
    message.error(props.mode === 'add' ? t('tunnel.addFailed') : t('tunnel.updateFailed'))
  }
  finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:open', false)
  formRef.value?.resetFields()
  formState.value = {
    name: '',
    type: 'tcp',
    localPort: undefined,
    localIP: '127.0.0.1',
    remotePort: undefined,
    customDomains: [],
    subdomain: undefined
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.mode === 'edit' && props.initialTunnel) {
    formState.value = { ...props.initialTunnel }
  }
  else if (isOpen && props.mode === 'add') {
    formState.value = {
      name: '',
      type: 'tcp',
      localPort: undefined,
      localIP: '127.0.0.1',
      remotePort: undefined,
      customDomains: [],
      subdomain: undefined
    }
  }
})
</script>
