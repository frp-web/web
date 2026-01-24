<template>
  <div max-w-2xl rounded-lg bg-container p-4 shadow-sm>
    <AntForm :label-col="{ style: { width: '100px' } }" :wrapper-col="{ style: { flex: 1 } }">
      <AntFormItem label="服务器地址">
        <AntInput
          :value="modelValue?.serverAddr"
          placeholder="127.0.0.1 或 example.com"
          @update:value="updateValue('serverAddr', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          frps 服务器地址
        </div>
      </AntFormItem>

      <AntFormItem label="端口" required>
        <AntInputNumber
          :value="modelValue?.serverPort ?? 7000"
          :min="1"
          :max="65535"
          w-full
          @update:value="updateValue('serverPort', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          frps 服务器端口，默认 7000
        </div>
      </AntFormItem>

      <AntFormItem label="认证令牌">
        <AntInput
          :value="modelValue?.authToken"
          placeholder="如果服务器设置了令牌，需要在此填写"
          @update:value="updateValue('authToken', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          与服务器端设置的认证令牌保持一致
        </div>
      </AntFormItem>

      <AntDivider>其他配置</AntDivider>

      <AntFormItem label="用户名">
        <AntInput
          :value="modelValue?.user"
          placeholder="用于标识不同的客户端"
          @update:value="updateValue('user', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          客户端标识名称，方便在服务器端区分
        </div>
      </AntFormItem>

      <AntFormItem label="心跳间隔">
        <AntInputNumber
          :value="modelValue?.heartbeatInterval ?? 30"
          :min="1"
          :max="300"
          w-full
          placeholder="秒"
          @update:value="updateValue('heartbeatInterval', $event)"
        />
        <div mt-1 text-xs text-gray-500>
          向服务器发送心跳的时间间隔（秒），默认 30
        </div>
      </AntFormItem>
    </AntForm>
  </div>
</template>

<script setup lang="ts">
interface FrpcConfig {
  serverAddr?: string
  serverPort?: number
  authToken?: string
  user?: string
  heartbeatInterval?: number
}

interface Props {
  modelValue?: FrpcConfig
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: FrpcConfig]
}>()

function updateValue(key: string, value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  } as FrpcConfig)
}
</script>
