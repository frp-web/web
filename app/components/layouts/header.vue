<template>
  <header b="0 b-1 solid" h-12 w-full flex-shrink-0 border-base bg-container>
    <div h-full fbc px-4 color-base>
      <div flex="~ items-center gap-2" text-lg font-thin>
        <span>FRP Web</span>
        <AntTooltip>
          <template #title>
            <div>
              <div>{{ frpStore.frpStatusText }}</div>
              <div v-if="frpStore.processInfo?.pid">
                PID: {{ frpStore.processInfo.pid }}
              </div>
              <div v-if="frpStore.isRunning && frpStore.currentUptime > 0">
                运行时间: {{ frpStore.uptimeText }}
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
                  GitHub
                </a>
              </AntMenuItem>
              <AntMenuItem key="logout" @click="handleLogout">
                <span flex="~ items-center gap-2">
                  <span i-carbon-logout />
                  退出登录
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
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useAuthStore } from '~/stores/auth'
import { useFrpStore } from '~/stores/frp'

import 'dayjs/locale/zh-cn'

// 配置 Day.js
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const authStore = useAuthStore()
const frpStore = useFrpStore()
const router = useRouter()

async function handleLogout() {
  authStore.logout()
  await router.push('/login')
}
</script>
