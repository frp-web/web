<template>
  <div max-w-md w-full rounded-lg bg-container p-8 shadow-lg>
    <div mb-8 text-center>
      <h1 mb-2 text-2xl color-base font-bold>
        FRP Web
      </h1>
      <p text-sm color-secondary>
        {{ isRegisterMode ? '创建管理员账号' : '登录到管理面板' }}
      </p>
    </div>

    <AntAlert
      v-if="authStore.error"
      type="error"
      :message="authStore.error"
      closable
      mb-4
      @close="authStore.error = null"
    />

    <AntForm :model="formData" :label-col="{ style: { width: '80px', textAlign: 'right' } }" @finish="handleSubmit">
      <AntFormItem
        label="用户名"
        name="username"
        :rules="[
          { required: true, message: '请输入用户名' },
          { min: 3, max: 20, message: '用户名长度为 3-20 个字符' }
        ]"
      >
        <AntInput
          v-model:value="formData.username"
          placeholder="请输入用户名"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        label="密码"
        name="password"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码长度至少为 6 个字符' }
        ]"
      >
        <AntInputPassword
          v-model:value="formData.password"
          placeholder="请输入密码"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        v-if="isRegisterMode"
        label="确认密码"
        name="confirmPassword"
        :rules="[
          { required: true, message: '请再次输入密码' },
          { validator: validateConfirmPassword }
        ]"
      >
        <AntInputPassword
          v-model:value="formData.confirmPassword"
          placeholder="请再次输入密码"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        v-if="isRegisterMode"
        label="运行模式"
        name="frpMode"
        :rules="[{ required: true, message: '请选择运行模式' }]"
      >
        <AntRadioGroup v-model:value="formData.frpMode" :disabled="authStore.loading">
          <AntRadio value="server">
            服务端 (frps)
          </AntRadio>
          <AntRadio value="client">
            客户端 (frpc)
          </AntRadio>
        </AntRadioGroup>
        <div mt-2 text-xs color-secondary>
          服务端：提供公网访问入口；客户端：连接服务端进行内网穿透
        </div>
      </AntFormItem>

      <AntFormItem>
        <AntButton
          type="primary"
          html-type="submit"
          w-full
          :loading="authStore.loading"
        >
          {{ isRegisterMode ? '创建账号' : '登录' }}
        </AntButton>
      </AntFormItem>
    </AntForm>
  </div>
</template>

<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  frpMode: 'server' as 'server' | 'client'
})

const isRegisterMode = ref(false)

onMounted(async () => {
  const { hasUser } = await authStore.checkAuth()
  isRegisterMode.value = !hasUser
})

function validateConfirmPassword(_rule: Rule, value: string) {
  if (value !== formData.password) {
    return Promise.reject(new Error('两次输入的密码不一致'))
  }
  return Promise.resolve()
}

async function handleSubmit() {
  try {
    if (isRegisterMode.value) {
      await authStore.register({
        username: formData.username,
        password: formData.password,
        frpMode: formData.frpMode
      })
    }
    else {
      await authStore.login({
        username: formData.username,
        password: formData.password
      })
    }
    await router.push('/')
  }
  catch {
    // error handled by store
  }
}
</script>
