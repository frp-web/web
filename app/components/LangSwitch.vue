<template>
  <AntDropdown>
    <span cursor-pointer color-secondary transition hover:color-base>
      <span i-tabler-language text-lg />
    </span>
    <template #overlay>
      <AntMenu>
        <AntMenuItem
          v-for="loc in availableLocales"
          :key="loc.code"
          @click="switchLocale(loc.code)"
        >
          {{ loc.name }}
        </AntMenuItem>
      </AntMenu>
    </template>
  </AntDropdown>
</template>

<script setup lang="ts">
import type { LocaleCode, LocaleList } from '~/types/i18n'

const { locales, setLocale } = useI18n()

const availableLocales = locales as Ref<LocaleList>

function switchLocale(code: LocaleCode) {
  setLocale(code)
}
</script>
