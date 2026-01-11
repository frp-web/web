<template>
  <div max-w-md w-full rounded-lg bg-container p-8 shadow-lg>
    <div mb-8 text-center>
      <h1 mb-2 text-2xl color-base font-bold>
        {{ $t('app.title') }}
      </h1>
      <p text-sm color-secondary>
        {{ isRegisterMode ? $t('auth.registerTitle') : $t('auth.loginTitle') }}
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
        :label="$t('auth.username')"
        name="username"
        :rules="[
          { required: true, message: $t('auth.usernameRequired') },
          { min: 3, max: 20, message: $t('auth.usernameLengthRule') }
        ]"
      >
        <AntInput
          v-model:value="formData.username"
          :placeholder="$t('auth.usernamePlaceholder')"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        :label="$t('auth.password')"
        name="password"
        :rules="[
          { required: true, message: $t('auth.passwordRequired') },
          { min: 6, message: $t('auth.passwordLengthRule') }
        ]"
      >
        <AntInputPassword
          v-model:value="formData.password"
          :placeholder="$t('auth.passwordPlaceholder')"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        v-if="isRegisterMode"
        :label="$t('auth.confirmPassword')"
        name="confirmPassword"
        :rules="[
          { required: true, message: $t('auth.confirmPasswordRequired') },
          { validator: validateConfirmPassword }
        ]"
      >
        <AntInputPassword
          v-model:value="formData.confirmPassword"
          :placeholder="$t('auth.confirmPasswordPlaceholder')"
          :disabled="authStore.loading"
        />
      </AntFormItem>

      <AntFormItem
        v-if="isRegisterMode"
        :label="$t('auth.frpMode')"
        name="frpMode"
        :rules="[{ required: true, message: $t('auth.frpModeRequired') }]"
      >
        <AntRadioGroup v-model:value="formData.frpMode" :disabled="authStore.loading">
          <AntRadio value="server">
            {{ $t('auth.serverMode') }}
          </AntRadio>
          <AntRadio value="client">
            {{ $t('auth.clientMode') }}
          </AntRadio>
        </AntRadioGroup>
        <div mt-2 text-xs color-secondary>
          {{ $t('auth.modeDescription') }}
        </div>
      </AntFormItem>

      <AntFormItem>
        <AntButton
          type="primary"
          html-type="submit"
          w-full
          :loading="authStore.loading"
        >
          {{ isRegisterMode ? $t('auth.register') : $t('auth.login') }}
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

const { t } = useI18n()

function validateConfirmPassword(_rule: Rule, value: string) {
  if (value !== formData.password) {
    return Promise.reject(new Error(t('auth.passwordMismatch')))
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
