---
name: vue-sfc-best-practices
description: Vue 3 SFC (Single File Component) best practices, syntax, and patterns, inheriting the core philosophy of the TSX version.
version: 1.0.0
---

# Vue SFC Best Practices (The Ultimate Guide)

> **💡 核心认知：TSX 揭示本质，SFC 提升效率**
> 虽然我们在写 SFC（单文件组件），但必须牢记 TSX 揭示的 Vue 本质：**组件是一个被托管的 render 函数**。
> 基于这个本质，以及 JavaScript 中变量“先声明后使用”的直觉（const/let），**强烈建议将 `<script setup>` 写在 `<template>` 的上方**。这不仅符合自上而下的阅读逻辑，也完美契合了“先定义状态与逻辑，再进行渲染”的组件本质。

在 Vue 3 的单文件组件（SFC）开发中，核心思想与 TSX 保持高度一致：**组件是带有严格输入输出约束的受控渲染实体**。在 SFC 中，我们通过 `<script setup lang="ts">` 将这种思想发挥到极致，利用编译时宏（Compiler Macros）实现完美的类型推导和极简的代码结构。

## 一、组件基础与接口约束

### 1. 核心范式：`<script setup lang="ts">`

**严禁使用 Options API 或普通的 `setup()` 函数**。必须使用 `<script setup lang="ts">`，它是 Vue 3 SFC 的最终形态，提供了最佳的类型推导和最少的样板代码。

### 2. 真正的组件：Props + Emits 的纯类型声明

在 SFC 中，抛弃运行时的 `PropType`，直接使用**基于类型的声明（Type-based declaration）**。这是 SFC 的独有优势！

```vue
<script setup lang="ts">
interface User {
  id: number;
  name: string;
}

// 1. 输入约束：使用泛型 defineProps + withDefaults
const props = withDefaults(
  defineProps<{
    user: User;
    age?: number;
  }>(),
  {
    age: 0 // 默认值
  }
);
</script>
```

#### 深入理解 `defineEmits` 与 TS 对象类型声明

要彻底理解 `defineEmits`，必须先搞懂 TypeScript 中**对象类型（Object Types）**的高级声明方式。在 TS 中，对象类型不仅能声明普通的键值对，还能声明**数组、元组、函数以及函数重载**。

**前置知识：TS 对象类型的多样性**

```ts
// 这是一个普通的 TS 对象类型接口
interface MyObject {
  // 1. 普通属性
  name: string;

  // 2. 数组/元组类型（通过数字索引签名）
  [index: number]: string;

  // 3. 单一函数调用签名（让这个对象变成可调用的函数）
  (param: string): void;

  // 4. 函数重载签名（让这个对象作为函数调用时，支持多种参数组合）
  (e: 'click', payload: { time: number }): void;
  (e: 'update', id: number): void;
}
```

**`defineEmits` 的本质**
`defineEmits<T>()` 接收的泛型参数 `T`，正是利用了上述的**函数重载签名**。你传递的不是一个普通的属性对象，而是一个定义了多次调用签名的对象类型。

这种写法直接模拟了 `emit` 函数在运行时的真实行为：

```vue
<script setup lang="ts">
// 这里的泛型参数就是一个仅包含"函数重载签名"的对象类型
const emit = defineEmits<{
  (e: 'click', payload: { time: number }): void;
  (e: 'update', id: number, value: string): void;
  (e: 'close'): void;
}>();

const handleAction = () => {
  emit('click', { time: Date.now() });
  emit('update', 1, 'new value');
  emit('close');
};
</script>
```

**❌ 错误写法警告**
如果你不理解上述 TS 基础，很容易写出以下致命错误。这会让 TS 以为你在声明普通属性，而不是函数调用签名，导致类型推导完全崩溃：

```ts
// ❌ 错误：这会被解析为 emit 接收一个对象，而不是事件声明！
const emit = defineEmits<{
  click: { time: number }; // 错！这是普通属性声明
  update: number; // 错！这是普通属性声明
}>();
```

```vue
<template>
  <div>
    <p>{{ user.name }} - {{ age }}</p>
    <button @click="emit('click', { time: Date.now() })">点击</button>
  </div>
</template>
```

### 3. 组件嵌套：Slots 的类型约束

不要以为在模板里写 `<slot>` 就完事了，必须用 `defineSlots` 约束插槽的输入输出类型，保证父组件调用时的类型安全！

```vue
<script setup lang="ts">
// 约束插槽类型
defineSlots<{
  default(props: { msg: string }): any;
  header(): any;
}>();
</script>

<template>
  <div>
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <!-- 作用域插槽传递数据 -->
      <slot msg="Hello from child"></slot>
    </main>
  </div>
</template>
```

### 4. v-model 的终极形态：`defineModel`

在 Vue 3.4+ 中，**全面拥弃繁琐的 `props` + `emits` 手动实现 v-model**，直接使用 `defineModel` 宏！它在底层自动处理了 `modelValue` 和 `update:modelValue`。

```vue
<script setup lang="ts">
// 基础用法：双向绑定默认的 v-model
const modelValue = defineModel<string>({ required: true });

// 具名 v-model：双向绑定 v-model:age
const age = defineModel<number>('age', { default: 0 });

const updateData = () => {
  modelValue.value = 'new text'; // 直接赋值，底层自动 emit
  age.value++;
};
</script>

<template>
  <div>
    <input v-model="modelValue" />
    <input type="number" v-model="age" />
  </div>
</template>
```

## 二、响应式与副作用管理

### 5. 响应式核心与工具函数

在 Vue 中，响应式系统是基于 Proxy 实现的依赖追踪机制。

- **`ref`**：用于封装单值（如 string, number, boolean），在 `<script>` 中必须通过 `.value` 访问，但在 `<template>` 中会自动解包，无需写 `.value`。
- **`reactive`**：用于封装整个对象。
- **`toRefs` / `toRef`**：当你需要解构 `props` 或 `reactive` 对象时，**严禁直接解构**（会丢失响应式），必须使用这两个工具函数。
- **`shallowRef`**：对于大型数据结构（如从接口获取的巨大列表、复杂的第三方实例），不需要深层 Proxy 代理时，使用浅层响应式以**极大提升性能**。

> **💡 对比 TSX**：在 TSX 中，`ref` 即使在渲染函数中也必须写 `.value`，而 SFC 的 `<template>` 编译器为你省去了这一步，这是 SFC 的一大便利。

### 6. 副作用管理：Watch + Cleanup (替代生命周期)

在现代 Vue 3 开发中，**不推荐过度使用生命周期钩子（如 `onMounted`, `onBeforeUnmount`）**。推荐的范式是使用 `watch` 配合 `onCleanup` 来管理副作用，这样可以把"启动逻辑"和"清理逻辑"高内聚在同一个地方，避免逻辑碎片化。

```vue
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const isEnabled = ref(true);
const count = ref(0);
const divRef = ref<HTMLElement | null>(null);

// 1. 纯逻辑副作用：直接写在顶层
// 相当于条件触发时的启动逻辑与清理逻辑内聚
watch(
  isEnabled,
  (enabled, _, onCleanup) => {
    if (!enabled) return;
    const timer = window.setInterval(() => count.value++, 1000);

    // onCleanup 会在下一次 watch 回调执行前，或者组件卸载时自动调用
    onCleanup(() => clearInterval(timer));
  },
  { immediate: true } // 立即执行一次
);

// 2. 例外情况：强依赖 DOM 的副作用
// 最佳实践：直接 watch 模板 ref！
// 当组件挂载或卸载时，divRef 的值会从 null 变为 HTMLElement，从而触发 watch
// 这种写法不仅避免了使用 onMounted，还能完美处理 v-if 导致 DOM 动态销毁/重建的情况！
watch(
  divRef,
  (el, _, onCleanup) => {
    // 自动类型收窄：如果 el 为 null（未挂载或被 v-if 销毁），直接 return
    if (!el) return;

    // 此时 el 已经被 TS 推导为 HTMLElement，可以直接安全使用
    const handler = () => console.log('DOM Clicked, count:', count.value);
    el.addEventListener('click', handler);

    // 当 el 发生变化（如组件卸载或 v-if 切换）时，自动清理事件
    onCleanup(() => el.removeEventListener('click', handler));
  },
  { immediate: true }
);

// 3. 必须使用 onMounted 的场景：需要 DOM 渲染完毕后立即执行的响应式副作用
// 场景：页面加载后，立刻根据某个状态将内部滚动容器滚动到特定位置。
// 如果直接在顶层 watch immediate，首次执行时内部高容器可能还没渲染出高度，滚动会失效。
const scrollTarget = ref(500);
const scrollContainerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  // 放在 onMounted 内部，既保证了首次 immediate 执行时 DOM 树已完整就绪，
  // 又保留了后续响应式能力。
  // 注意：这里直接 watch 模板 ref，利用类型收窄，避免后续繁琐的非空判定！
  watch(
    scrollContainerRef,
    (el) => {
      // 自动类型收窄，el 必定是 HTMLElement
      if (!el) return;

      el.scrollTo({
        top: scrollTarget.value,
        behavior: 'smooth'
      });
    },
    { immediate: true }
  );

  // 如果 scrollTarget 也会变，可以再加一个 watch 专门监听 target
  watch(scrollTarget, (target) => {
    scrollContainerRef.value?.scrollTo({ top: target, behavior: 'smooth' });
  });
});
</script>

<template>
  <div>
    <!-- 外部容器，监听点击事件 -->
    <div ref="divRef">Count: {{ count }}</div>

    <!-- 内部滚动容器，用于演示 onMounted + watch immediate -->
    <div ref="scrollContainerRef" style="height: 200px; overflow-y: auto; border: 1px solid #ccc; margin-top: 20px;">
      <!-- 模拟超高内容 -->
      <div style="height: 2000px; background: linear-gradient(to bottom, #f9f9f9, #333);">Scrollable Content</div>
    </div>
  </div>
</template>
```

## 三、状态共享与架构

### 7. 依赖注入：Provide / Inject 与受控 Hook

在处理跨层级组件通信时，避免繁琐的 Props 逐层透传（Prop Drilling）。最佳实践**不是**为了简单地传递数据，而是为了**让一个 Hook（Composable）受控初始化，并在多个后代组件中共享同一个 Hook 实例**。

这种模式的精髓在于：先写 Hook，再用 `ReturnType<typeof useHook>` 自动推导 InjectionKey 的类型，完全不需要手动写冗长的 interface。

```ts
// context.ts
import { InjectionKey, ref, computed } from 'vue';

// 1. 先写你的核心 Hook 逻辑
export function useTheme() {
  const color = ref('blue');
  const isDark = computed(() => color.value === 'black');
  const changeColor = (c: string) => {
    color.value = c;
  };
  return { color, isDark, changeColor };
}

// 2. 极其优雅地定义 InjectionKey，直接提取 Hook 的返回类型
export const ThemeSymbol: InjectionKey<ReturnType<typeof useTheme>> = Symbol('Theme');
```

```vue
<!-- Provider.vue (祖先组件) -->
<script setup lang="ts">
import { provide } from 'vue';
import { useTheme, ThemeSymbol } from './context';

// 受控初始化 Hook，并 Provide 下去
provide(ThemeSymbol, useTheme());
</script>

<template>
  <slot></slot>
</template>
```

```vue
<!-- Consumer.vue (后代组件) -->
<script setup lang="ts">
import { inject } from 'vue';
import { ThemeSymbol } from './context';

// 完美类型推导，且强制要求上层必须 Provide（不传默认值）
// 使用 ! 强制断言，如果上层没 Provide，运行时会警告，符合"受控"的预期
const theme = inject(ThemeSymbol)!;
</script>

<template>
  <button :style="{ color: theme.color }" @click="theme.changeColor('red')">Change Theme (Dark: {{ theme.isDark ? 'Yes' : 'No' }})</button>
</template>
```

### 8. 状态管理：Pinia Setup Store

**Pinia Setup Store 实际上就是 `provide` / `inject` + 受控 Hook 思想的全局延伸**。

- **惰性初始化**：只有第一个组件调用 `useStore()` 时才会执行。
- **自动响应式解包**：返回的 `ref` 会被包装成 `reactive`，在 `<script setup>` 中调用时，**不需要写 `.value`**（除非你解构了它）。

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 1. 先写核心的 Hook 逻辑
function useUserLogic() {
  const name = ref('Alice');
  const age = ref(20);
  const growUp = () => age.value++;
  return { name, age, growUp };
}

// 2. 塞入 defineStore
export const useUserStore = defineStore('user', useUserLogic);
```

## 四、模板与样式处理

### 9. 保持模板整洁：拒绝复杂逻辑

模板 `<template>` 应该只负责描述 UI 结构。**严禁在模板中写复杂的 JS 逻辑或嵌套三元运算符**。

- 复杂条件判断：提取到 `computed` 中。
- 多分支渲染：使用 `v-if` / `v-else-if` / `v-else`，或者在 `<script>` 中使用 `ts-pattern` 计算出结果再渲染。

```vue
<template>
  <!-- ❌ 错误：模板中包含复杂逻辑 -->
  <div :class="status === 'active' && age > 18 ? 'text-green' : 'text-red'">
    {{ list.filter((i) => i.valid).length > 0 ? 'Has Data' : 'Empty' }}
  </div>

  <!-- ✅ 正确：逻辑提取到 computed -->
  <div :class="statusClass">
    {{ displayMessage }}
  </div>
</template>
```

### 10. 样式处理：TailwindCSS、`:deep()` 与 `v-bind()`

在 SFC 中，我们拥有 `<style scoped>` 这个大杀器，并且 Vue 3 提供了极强的 CSS 动态绑定能力。

1. **首选方案**：直接在 `<template>` 中使用 **TailwindCSS** 原子类。
2. **覆盖第三方组件**：当 Tailwind 无法穿透第三方 UI 库（如 Element Plus）时，使用 `<style scoped>` 配合 **`:deep()`** 伪类。这是 SFC 替代 `vue-styled-components` 的原生方案！
3. **CSS 变量绑定**：使用 **`v-bind()`** 直接在 `<style>` 中绑定 `<script>` 里的响应式变量，实现完美的 CSS-in-JS 体验。

```vue
<script setup lang="ts">
import { ref } from 'vue';

// 定义一个响应式的主题颜色
const themeColor = ref('#ff4757');

const toggleTheme = () => {
  themeColor.value = themeColor.value === '#ff4757' ? '#3498db' : '#ff4757';
};
</script>

<template>
  <div class="p-4 bg-gray-100 rounded-lg">
    <el-button class="custom-btn" type="primary" @click="toggleTheme"> Click Me </el-button>
    <p class="dynamic-text">This text changes color dynamically!</p>
  </div>
</template>

<style scoped>
/* 1. 使用 v-bind() 绑定响应式变量 */
.dynamic-text {
  /* Vue 会在底层自动将其编译为 CSS 变量 (var(--xxx)) */
  color: v-bind(themeColor);
  font-weight: bold;
  transition: color 0.3s ease;
}

/* 2. 使用 :deep() 强行穿透覆盖 Element Plus 内部样式 */
.custom-btn :deep(span) {
  font-weight: bold;
  letter-spacing: 1px;
}

.custom-btn:hover :deep(span) {
  /* 同样可以在 :deep 内部使用 v-bind */
  color: v-bind(themeColor);
}
</style>
```

## 五、组件拆分与架构原则

> **💡 核心认知：SFC 的类型局限与 Hook 封装**
> 尽管 `<script setup>` 提供了编译时宏，但 SFC 本身对 TypeScript 的支持（尤其是在复杂泛型、模板推导和跨文件类型共享上）**依然不够完善，很难做到像 TSX 那样 100% 的类型完备**。
> 因此，**强烈建议：除了必须在 SFC 中使用的 Vue 宏（如 `defineProps`）和极简的 UI 绑定外，将核心业务逻辑、状态管理和复杂计算大量封装到单独的 `.ts` 文件（Composables / Hooks）中！** 这不仅能获得最纯粹的 TS 类型支持，还能极大提升代码的复用性和可测试性。

参考官方最佳实践，在 SFC 开发中必须遵循以下组件拆分原则：

### 11. 保持组件专注 (Single Responsibility)

> **💡 跨框架的共识**：
> 很多成熟的现代框架（如 Angular）在架构上**严禁在组件（视图层）中直接书写复杂的业务逻辑**，逻辑必须保存在独立的 Service 或 Hook 中。Vue 3 的 Composition API 正是为此而生，SFC 应该仅仅作为“状态与视图的粘合剂”。

当一个组件满足以下**任意一个**条件时，必须进行拆分：

1. **职责过多**：同时拥有复杂的状态编排逻辑和大量的 UI 渲染代码。
2. **UI 区域过多**：包含 3 个以上的独立 UI 区块（如：表单区、过滤区、列表区、状态栏）。
3. **可复用性**：模板中出现了重复的结构（如列表项、卡片），或者未来可能被复用。

**拆分策略**：

- **UI 拆分**：将独立的 UI 区块抽离为子组件（Props 进，Events 出）。
- **逻辑拆分**：将复杂的状态和副作用抽离为纯 TS 的 Composables（`useXxx()`）。

## 六、总结核心类型宏

- `defineProps<T>()`: 声明 Props 类型。
- `defineEmits<T>()`: 声明 Emits 类型。
- `defineSlots<T>()`: 声明 Slots 类型。
- `defineModel<T>()`: 声明双向绑定 Model 类型。
