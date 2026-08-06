---
name: vue-hooks-architecture
description: Vue 3 architecture thinking for modern frontend development - Hook-first design, type completeness, React vs Vue decision making, and "core first, ignore sugar" philosophy. Use when architecting Vue apps, choosing state management, or designing component logic reuse.
version: 1.0.0
---

# Vue Hooks Architecture (Modern Frontend Thinking)

> 现代前端开发的核心思想。这套思想指导你**如何架构 Vue 应用**、**何时该选 Vue/React**、**如何组织逻辑复用**，以及**如何在 AI 协作下写出高质量代码**。

## 一、React 与 Vue 没有壁垒

**核心认知：React + mobx 在本质上就等于 Vue。**

- React 自身只负责 `useState` / `useEffect` 的局部渲染管理（vdom 渲染 + 依赖追踪）。
- 一旦配合 mobx（外部全局可观察状态），就获得了与 Vue 完全相同的架构能力：响应式数据 + 全局逻辑 + 任意读取。
- 因此，React 与 Vue 的技术壁垒并不存在，真正改变选型的变量是**团队技能栈偏好**与**具体场景需求**。

### 技术选型建议

| 场景 | 推荐方案 |
|---|---|
| 需要 React 生态 | React + **jotai**（jotai 的设计哲学与 Vue 的 ref/reactive 一致，且具备全局状态能力） |
| 需要 mobx 的场景 | **直接用 Vue**（Vue 的响应式是内置的，语法更简洁） |
| 复杂 SPA（大型后台管理系统） | **禁用 React**（React 缺少全局逻辑层，复杂 SPA 会陷入状态管理泥潭） |
| Vue 项目 | Composition API + `<script setup lang="ts">` |

## 二、Hook (Composable) 是逻辑复用单位

**Hook 是开发起点、架构着力点、测试锚点。** 一切业务逻辑都应优先写成 Hook，组件只负责"拼装 Hook + 渲染"。

### 1. Hook 的三重身份

1. **开发起点**：开发一个新功能时，先写 Hook（数据 + 逻辑），再写组件（渲染）。
2. **架构着力点**：`provide/inject`、Pinia `defineStore` 都是"先写好 Hook，再把它提供给框架"。
3. **测试锚点**：Hook 是纯逻辑函数，可直接单元测试，无需挂载组件。

### 2. 先写 Hook，再提供给框架

```ts
// 1. 先写一个纯粹的业务 Hook（不依赖任何框架概念，只有逻辑）
export function useUserList() {
  const users = ref<User[]>([]);
  const loading = ref(false);

  async function fetchUsers() {
    loading.value = true;
    users.value = await api.getUsers();
    loading.value = false;
  }

  return { users, loading, fetchUsers };
}
```

```vue
<script setup lang="ts">
// 2. 组件只是 Hook 的薄封装 + 渲染
const { users, loading, fetchUsers } = useUserList();
fetchUsers();
</script>

<template>
  <div v-if="loading">Loading...</div>
  <ul v-else>
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

### 3. provide/inject = 受控共享 Hook

`provide/inject` 的最佳实践不是"传递数据"，而是**让一个 Hook 受控初始化，并在组件树中共享同一个实例**。类型通过 `InjectionKey<ReturnType<typeof useHook>>` 自动推导，无需手写 interface。

```ts
// hooks/useTheme.ts
export function useTheme() {
  const color = ref('blue');
  const isDark = computed(() => color.value === 'black');
  const changeColor = (c: string) => { color.value = c; };
  return { color, isDark, changeColor };
}
```

```ts
// providers/theme.ts
import type { InjectionKey } from 'vue';

// 直接提取 Hook 返回类型作为 InjectionKey，类型零维护
export const ThemeSymbol: InjectionKey<ReturnType<typeof useTheme>> = Symbol('Theme');
```

```vue
<!-- 祖先组件：受控初始化并共享 -->
<script setup lang="ts">
import { provide } from 'vue';
import { ThemeSymbol } from '@/providers/theme';
import { useTheme } from '@/hooks/useTheme';

const theme = useTheme();
provide(ThemeSymbol, theme);
</script>

<!-- 后代组件：inject 使用（不传默认值，强制受控） -->
<script setup lang="ts">
import { inject } from 'vue';
import { ThemeSymbol } from '@/providers/theme';

const theme = inject(ThemeSymbol)!; // 类型完美推导
</script>
```

### 4. Pinia Setup Store = 全局受控 Hook

Pinia 的 Setup Store 是 `provide/inject + 受控 Hook` 的**全局延伸**。两大特性：

1. **惰性初始化**：`setup` 逻辑只在第一次 `useStore()` 时执行。
2. **自动解包**：返回的 ref/computed 被包装进 reactive，使用时**不需要写 `.value`**。

```ts
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const name = ref('Alice');
  const isAdult = computed(() => age.value >= 18);
  function growUp() { age.value++; }
  return { name, isAdult, growUp };
});
```

```vue
<script setup lang="ts">
const userStore = useUserStore(); // 第一次调用才初始化
</script>

<template>
  <p>{{ userStore.name }} (Adult: {{ userStore.isAdult ? 'Yes' : 'No' }})</p>
  <button @click="userStore.growUp()">Grow Up</button>
</template>
```

## 三、类型完备：编译 + 运行时的双重校验

**类型完备意味着每个类型标注既服务 TypeScript 编译器，又服务 Vue 运行时。**

### 1. 输入输出约束的三件套

| 工具 | 作用 |
|---|---|
| `props` + `PropType<T>` (TSX) / `defineProps<{}>` (SFC) | 输入约束：编译期类型 + 运行时校验 |
| `emits` (TSX) / `defineEmits<{}>` (SFC) | 输出约束：事件参数类型 + 运行时校验 |
| `slots` + `SlotsType<T>` / `defineSlots<{}>` | 插槽契约：作用域插槽参数类型 |

**`PropType` 是"编译 + 运行时"双保险**：`type` 提供运行时校验，`PropType<T>` 提供编译期类型。**永远不要因为嫌麻烦而跳过类型声明**——那是 AI 协作下代码质量差的万恶之源。

### 2. ts-pattern：处理未知类型（客户端必备）

当面对联合类型 / 多分支状态时，**严禁嵌套三元运算符**。使用 `ts-pattern`：

- 提供完美类型推导（分支内自动收窄类型）。
- 强制穷尽性检查（`.exhaustive()`），类型新增后漏分支会直接编译报错。

```tsx
import { match } from 'ts-pattern';

type Status = 'loading' | 'success' | 'error' | 'idle';

const view = match(status)
  .with('idle', () => <Empty />)
  .with('loading', () => <Spinner />)
  .with('success', () => <Data />)
  .with('error', () => <Error msg={msg} />)
  .exhaustive(); // 穷尽检查，缺分支立刻报错
```

### 3. 客户端与服务端校验分工

- **ts-pattern**：客户端（浏览器）必备，处理未知 / 多分支状态。
- **zod**：服务端必备，校验 API 输入。客户端依赖字段类型声明即可，服务端必须运行时校验。

## 四、抓核心，弃分支：AI 协作的代码质量准则

**核心只有 4 件事**：`props + PropType`、`emits`、`SlotsType`、`v-model`。其他一切都是为了"人写的舒适"而存在的语法糖，对 AI 来说没有价值。

### 1. 抓核心

- **props + PropType / defineProps**：组件的输入契约。
- **emits / defineEmits**：组件的输出契约。
- **SlotsType / defineSlots**：插槽契约。
- **v-model**：props + emits 的组合语法糖。

**只要把核心 4 件事写满，组件就是类型完备的**，无论用 TSX 还是 SFC 编写，AI 都能写出高质量代码。

### 2. 弃分支（对 AI 无价值的语法糖）

以下语法糖会分散注意力，导致 AI 写出质量差的代码：

- ❌ `watchEffect`（隐式依赖追踪）→ ✅ 只用显式的 `watch`。
- ❌ Options API / `<script setup>` 之外的冗余写法。
- ❌ 为"人写起来方便"而存在、却牺牲类型安全的能力（如把 props 当响应式变量直接解构）。
- ❌ 过度拆分组件：每个组件都应该是**有严格输入输出的受控渲染实体**，不是越碎越好。

### 3. 使用规则

在 AI 协作开发中，坚持：

1. **核心优先**：每个组件/每段逻辑先写满输入输出约束。
2. **显式优于隐式**：`watch` 优于 `watchEffect`，显式 props/emits 优于黑魔法。
3. **类型优于注释**：能用类型表达契约，就不要用注释表达意图。
4. **Hook 优先**：逻辑永远先封装成 Hook，再考虑组件。

## 五、总结

- React + mobx ≈ Vue，选型看团队与场景。
- **Hook 是唯一的逻辑复用单位**：先写 Hook，再提供给框架（provide/inject、Pinia）。
- **类型完备 = 编译 + 运行时双重校验**：PropType / emits / SlotsType / ts-pattern / zod 各司其职。
- **抓核心弃分支**：核心 4 件事（props、emits、SlotsType、v-model）写满，其余语法糖忽略。
