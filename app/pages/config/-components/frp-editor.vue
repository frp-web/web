<template>
  <div ref="container" b="~ solid" h-96 w-full overflow-hidden border-base rounded bg-container />
</template>

<script setup lang="ts">
import loader from '@monaco-editor/loader'
import { ColorMode } from '~/utils/color-mode'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'ini'
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === ColorMode.Dark ? 'vs-dark' : 'vs')

const container = ref<HTMLElement | null>(null)
const editorInstance = shallowRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
let unsubscribeResize: (() => void) | null = null
let suppressChange = false

onMounted(async () => {
  const monaco = await loader.init()
  if (!container.value) {
    return
  }

  editorInstance.value = monaco.editor.create(container.value, {
    language: props.language,
    value: props.modelValue,
    readOnly: props.readOnly,
    theme: monacoTheme.value,
    automaticLayout: true,
    minimap: { enabled: false },
    tabSize: 2
  })

  editorInstance.value.onDidChangeModelContent(() => {
    if (suppressChange) {
      return
    }
    const value = editorInstance.value?.getValue() ?? ''
    emit('update:modelValue', value)
  })

  const observer = new ResizeObserver(() => {
    requestAnimationFrame(() => editorInstance.value?.layout())
  })
  observer.observe(container.value)
  unsubscribeResize = () => observer.disconnect()
})

onBeforeUnmount(() => {
  unsubscribeResize?.()
  editorInstance.value?.dispose()
  editorInstance.value = null
})

watch(
  () => props.modelValue,
  (value) => {
    const editor = editorInstance.value
    if (!editor) {
      return
    }
    if (value !== editor.getValue()) {
      suppressChange = true
      editor.setValue(value)
      suppressChange = false
    }
  }
)

watch(
  () => props.readOnly,
  (value) => {
    editorInstance.value?.updateOptions({ readOnly: value })
  }
)

watch(
  () => props.language,
  (value) => {
    const editor = editorInstance.value
    if (!editor) {
      return
    }
    const model = editor.getModel()
    if (model) {
      loader.init().then(monaco => monaco.editor.setModelLanguage(model, value))
    }
  }
)

watch(
  monacoTheme,
  (value) => {
    loader.init().then(monaco => monaco.editor.setTheme(value))
  }
)
</script>
