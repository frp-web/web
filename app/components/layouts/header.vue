<template>
  <header b="0 b-1 solid" h-12 w-full flex-shrink-0 border-base bg-container>
    <div h-full fbc px-4 color-base>
      <div flex="~ items-center gap-2" text-lg font-thin>
        <span>{{ $t('app.title') }}</span>
        <AntTooltip>
          <template #title>
            <div>
              <div>{{ statusText }}</div>
              <div v-if="frpStore.processInfo?.pid">
                PID: {{ frpStore.processInfo.pid }}
              </div>
              <div v-if="frpStore.isRunning && frpStore.currentUptime > 0">
                {{ $t('dashboard.uptime') }}: {{ formattedUptime }}
              </div>
            </div>
          </template>
          <span
            :class="frpStore.frpStatusIndicatorClass"
            inline-block h-2 w-2 rounded-full transition-colors
          />
        </AntTooltip>
      </div>
      <div flex="~ items-center gap-4">
        <LangSwitch />
        <ThemeToggle />
        <AntDropdown>
          <span cursor-pointer color-secondary transition hover:color-base>
            {{ authStore.username }}
          </span>
          <template #overlay>
            <AntMenu>
              <AntMenuItem key="github">
                <a
                  href="https://github.com/frp-web/web"
                  target="_blank"
                  rel="noopener noreferrer"
                  flex="~ items-center gap-2"
                  text-inherit
                  no-underline
                >
                  <span i-carbon-logo-github />
                  {{ $t('app.github') }}
                </a>
              </AntMenuItem>
              <AntMenuItem key="logout" @click="handleLogout">
                <span flex="~ items-center gap-2">
                  <span i-carbon-logout />
                  {{ $t('auth.logout') }}
                </span>
              </AntMenuItem>
            </AntMenu>
          </template>
        </AntDropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useFrpStore } from '~/stores/frp'

const { t } = useI18n()
const authStore = useAuthStore()
const frpStore = useFrpStore()
const router = useRouter()

// 格式化运行时间
const formattedUptime = computed(() => {
  if (!frpStore.isRunning || frpStore.currentUptime <= 0)
    return ''
  return formatUptime(frpStore.currentUptime, t)
})

// 翻译状态文本
const statusText = computed(() => t(frpStore.frpStatusText))

async function handleLogout() {
  authStore.logout()
  await router.push('/login')
}
</script>
