<template>
  <div flex="~ col gap-4">
    <AntForm layout="vertical" max-w-xl>
      <AntFormItem label="管理员用户名">
        <AntInput
          :value="authStore.username ?? ''"
          disabled
        />
        <template #extra>
          <span text-sm color-secondary>当前登录的管理员账号，不可修改</span>
        </template>
      </AntFormItem>
      <AntFormItem label="新密码">
        <AntInputPassword
          v-model:value="formData.newPassword"
          placeholder="输入新密码"
          :disabled="saving"
        />
      </AntFormItem>
      <AntFormItem label="确认密码">
        <AntInputPassword
          v-model:value="formData.confirmPassword"
          placeholder="再次输入新密码"
          :disabled="saving"
        />
        <template #extra>
          <span text-sm color-secondary>留空则不修改密码</span>
        </template>
      </AntFormItem>
    </AntForm>

    <div flex="~ gap-2">
      <AntButton :disabled="!canSave" @click="handleReset">
        重置
      </AntButton>
      <AntButton type="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
        保存
      </AntButton>
    </div>

    <AntAlert v-if="error" type="error" :message="error" closable @close="error = null" />
    <AntAlert v-if="successMessage" type="success" :message="successMessage" closable @close="successMessage = null" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const formData = reactive({
  newPassword: '',
  confirmPassword: ''
})

const saving = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const canSave = computed(() => {
  return formData.newPassword.length > 0 || formData.confirmPassword.length > 0
})

function handleReset() {
  formData.newPassword = ''
  formData.confirmPassword = ''
  error.value = null
  successMessage.value = null
}

async function handleSave() {
  error.value = null
  successMessage.value = null

  if (!formData.newPassword) {
    error.value = '请输入新密码'
    return
  }

  if (formData.newPassword.length < 6) {
    error.value = '密码长度至少为 6 个字符'
    return
  }

  if (formData.newPassword !== formData.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  saving.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        newPassword: formData.newPassword
      }
    })
    successMessage.value = '密码修改成功'
    handleReset()
  }
  catch (err: any) {
    error.value = err.data?.message || '密码修改失败'
  }
  finally {
    saving.value = false
  }
}
</script>
