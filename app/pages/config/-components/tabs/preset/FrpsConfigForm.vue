<template>
  <div max-w-2xl rounded-lg bg-container p-4 shadow-sm>
    <AntForm :label-col="{ style: { width: '100px' } }" :wrapper-col="{ style: { flex: 1 } }">
      <AntFormItem label="绑定端口" required>
        <AntInputNumber
          :value="modelValue?.bindPort ?? 7000"
          :min="1"
          :max="65535"
          w-full
          @update:value="updateValue('bindPort', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          frps 绑定端口，默认 7000
        </div>
      </AntFormItem>

      <AntFormItem label="HTTP 端口" required>
        <AntInputNumber
          :value="modelValue?.vhostHTTPPort ?? 7000"
          :min="1"
          :max="65535"
          w-full
          @update:value="updateValue('vhostHTTPPort', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          HTTP 虚拟主机端口，通常与绑定端口相同
        </div>
      </AntFormItem>

      <AntFormItem label="HTTPS 端口">
        <AntInputNumber
          :value="modelValue?.vhostHTTPSPort"
          :min="1"
          :max="65535"
          w-full
          placeholder="默认 443"
          @update:value="updateValue('vhostHTTPSPort', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          HTTPS 虚拟主机端口
        </div>
      </AntFormItem>

      <AntDivider>Dashboard 配置</AntDivider>

      <AntFormItem label="端口">
        <AntInputNumber
          :value="modelValue?.dashboardPort ?? 7500"
          :min="1"
          :max="65535"
          w-full
          @update:value="updateValue('dashboardPort', $event)"
        />
      </AntFormItem>

      <AntFormItem label="用户">
        <AntInput
          :value="modelValue?.dashboardUser ?? 'admin'"
          @update:value="updateValue('dashboardUser', $event)"
        />
      </AntFormItem>

      <AntFormItem label="密码">
        <AntInput
          :value="modelValue?.dashboardPassword"
          @update:value="updateValue('dashboardPassword', $event)"
        />
      </AntFormItem>

      <AntDivider>其他配置</AntDivider>

      <AntFormItem label="认证令牌">
        <AntInput
          :value="modelValue?.authToken"
          placeholder="设置后客户端需要提供相同令牌"
          @update:value="updateValue('authToken', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          用于验证客户端身份的令牌
        </div>
      </AntFormItem>

      <AntFormItem label="服务器域名">
        <AntInput
          :value="modelValue?.domain"
          placeholder="example.com"
          @update:value="updateValue('domain', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          用于配置子域名的服务器域名
        </div>
      </AntFormItem>

      <AntFormItem label="子域名">
        <AntInput
          :value="modelValue?.subdomainHost"
          placeholder="*.example.com"
          @update:value="updateValue('subdomainHost', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          子域名解析的泛域名
        </div>
      </AntFormItem>
    </AntForm>
  </div>
</template>

<script setup lang="ts">
interface FrpsConfig {
  bindPort?: number
  vhostHTTPPort?: number
  vhostHTTPSPort?: number
  domain?: string
  subdomainHost?: string
  dashboardPort?: number
  dashboardUser?: string
  dashboardPassword?: string
  authToken?: string
}

interface Props {
  modelValue?: FrpsConfig
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: FrpsConfig]
}>()

function updateValue(key: string, value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  } as FrpsConfig)
}
</script>
