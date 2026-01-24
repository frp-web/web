<template>
  <ClientOnly>
    <AntTabs v-model:active-key="activeKey" :animated="false" destroy-inactive-tab-pane>
      <AntTabPane key="general" tab="常规设置">
        <GeneralTab />
      </AntTabPane>
      <AntTabPane key="frp" tab="FRP 配置">
        <FrpConfigTab />
      </AntTabPane>
      <AntTabPane key="account" tab="帐号设置">
        <AccountTab />
      </AntTabPane>
    </AntTabs>
  </ClientOnly>
</template>

<script setup lang="ts">
import AccountTab from './account.vue'
import GeneralTab from './general.vue'
import FrpConfigTab from './preset.vue'

const activeKey = ref('general')
</script>
