# UnoCSS 样式规范

项目使用 UnoCSS，必须遵循以下规范：

## Attributify 模式（优先）

### 单个样式
单个样式直接使用属性名，不需要引号：

```vue
<!-- ✅ 推荐 -->
<span text-base />

<div p-4 />

<button bg-blue-500 />

<!-- ❌ 避免 -->
<span class="text-base" />

<div class="p-4" />

<button class="bg-blue-500" />
```

**特殊情况**：使用自定义值（方括号语法）时，需要使用引号：

```vue
<!-- ✅ 推荐 -->
<div text="[var(--ant-color-text)]" />

<div bg="[#f0f0f0]" />

<!-- ❌ 避免 -->
<div text-[var(--ant-color-text)] />
```

### 多值属性合并
将相同类型的多个类合并为单个属性：

```vue
<!-- ✅ 推荐 -->
<div text="sm [var(--ant-color-text-tertiary)]" />

<div flex="~ col gap-4" />

<div m="x-4 t-2 b-6" />

<!-- ❌ 避免 -->
<div class="text-sm text-[var(--ant-color-text-tertiary)]" />
```

### 边框简写
使用 `b` 属性：

```vue
<!-- ✅ 推荐 -->
<div b="~ solid #ccc" />

<div b="t-2 solid blue" />

<div b="l r ~ solid gray-200" />

<!-- ❌ 避免 -->
<div class="border border-solid border-#ccc" />
```

### 其他常见属性

```vue
<div p="4 x-6" />              <!-- padding -->

<div m="t-4 b-8" />            <!-- margin -->

<div w="48 full@md" />         <!-- width + responsive -->

<div h="screen" />             <!-- height -->

<div rounded="lg" />           <!-- border-radius -->

<div bg="[var(--ant-color-bg-container)]" />

<div shadow="md hover:lg" />
```

## 快捷方式（Shortcuts）

优先使用 `uno.config.ts` 中定义的快捷方式。在编写样式前，请先检查 `uno.config.ts` 文件中的 `shortcuts` 配置，优先使用已有的快捷方式（如 `fcc`、`fbc`、`clickable` 等）。

**注意**：只使用已有配置，不要新增 shortcuts

## 响应式写法

```vue
<!-- Attributify 响应式 -->
<div
  flex="~ col md:row"
  gap="2 md:4"
  p="4 md:6"
  text="sm md:base"
/>

<!-- 或使用 @ 符号 -->
<div w="full md:48" />
```

## 变体组（Variant Group）

合并相同前缀的变体：

```vue
<!-- ✅ 推荐 -->
<div class="hover:(bg-blue-500 text-white scale-105)" />

<div class="md:(flex gap-4 p-6)" />

<!-- ❌ 避免 -->
<div class="hover:bg-blue-500 hover:text-white hover:scale-105" />
```

## CSS 变量引用

使用方括号语法：

```vue
<div bg="[var(--ant-color-bg-container)]" />

<div text="[var(--ant-color-text-tertiary)]" />

<div b="~ solid [var(--ant-color-border)]" />
```

## 优先级原则

1. 优先使用快捷方式（`fcc`, `fbc` 等）
2. 其次使用 Attributify 模式合并属性
3. 复杂状态使用变体组
4. 最后才考虑 `class` 属性

## 禁止行为

- ❌ 不要新增 shortcuts 配置，只使用已有的
- ❌ 不要混用 Tailwind 特有语法（UnoCSS 兼容但不推荐）
- ❌ 不要在单个元素上同时使用 `class` 和 attributify（除非必要）
