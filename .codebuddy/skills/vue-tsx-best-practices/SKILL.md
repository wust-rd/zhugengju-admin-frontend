---
name: vue-tsx-best-practices
description: Vue 3 TSX/JSX best practices, syntax, and patterns based on the "better for ai" tutorial.
version: 1.2.0
---

# Vue TSX Best Practices (Better for AI)

在 Vue 3 中使用 TSX 的核心思想：**Vue 组件的本质是一个被托管的 render 函数**。TSX 写法没有隐藏任何东西，一切都很直接，TypeScript 支持完美，对 AI 极其友好。

## 一、组件基础与接口约束

### 1. 组件的本质与定义

最基础的组件形态是 `defineComponent(() => render)`。外层函数让框架初始化，返回的 render 函数交由框架在数据变化时自动运行（基于 Proxy 依赖追踪）。

```tsx
import { defineComponent, ref } from 'vue';

export default defineComponent(() => {
  // 这里是 setup 逻辑，只在初始化时运行一次
  const value = ref('');

  // 返回 render 函数，数据变化时重新运行
  return () => <input v-model={value.value} />;
});
```

### 2. 真正的组件：Props + Emits 声明

组件不仅需要 render，还需要**输入约束（props）**和**输出约束（emits）**。必须单独声明它们以获得运行时校验和完美的 TS 类型推导。

```tsx
import { defineComponent, PropType } from 'vue';

interface User {
  id: number;
  name: string;
}

export default defineComponent({
  // 输入约束
  props: {
    // 基础类型与默认值
    age: { type: Number, default: 0 },
    // 复杂类型使用 PropType
    user: { type: Object as PropType<User>, required: true }
  },
  // 输出约束
  emits: {
    // 声明事件及参数校验
    click: (payload: { time: number }) => 'time' in payload,
    // 如果 emits 的参数没有用到，使用 _ 声明防止 ts 报错
    update: (_: number) => true
  },
  // 如果 props 未被使用，请直接使用 _ 声明以防止 TS 报错
  setup(_, { emit }) {
    return () => (
      <div>
        <button onClick={() => emit('click', { time: Date.now() })}>点击</button>
      </div>
    );
  }
});
```

### 3. 组件嵌套：Slots (插槽)

插槽让组件变成"容器"。在 TSX 中，插槽本质上是传递的函数。

**声明 Slots 类型**

使用 `SlotsType` 声明插槽类型，确保类型安全：

```tsx
import { defineComponent, SlotsType } from 'vue';

const Compo = defineComponent({
  slots: {} as SlotsType<{
    default: () => void; // 默认插槽
    bar: () => void; // 具名插槽
    content: { innerData: string }; // 作用域插槽的参数类型
  }>,
  setup(_, { slots }) {
    const data = 'test';
    return () => (
      <>
        <h1>{slots.default ? slots.default() : '默认备用内容'}</h1>
        <h2>{slots.bar?.()}</h2>
        <div>{slots.content?.({ innerData: data })}</div>
      </>
    );
  }
});
```

**传递 Slots**

使用 `v-slots` 传递插槽对象：

```tsx
const Parent = defineComponent(() => {
  return () => (
    <Compo
      v-slots={{
        default: () => <div>default content</div>,
        bar: () => <span>bar content</span>,
        content: (scopedProps) => <span>{scopedProps.innerData}</span>
      }}
    />
  );
});
```

### 4. v-model 本质

`v-model` 只是 `props` 接收 + `emits` 发送的组合语法糖。

- `v-model={x}` 等价于 `:modelValue={x} + onUpdate:modelValue={(val) => x = val}`
- `v-model:name={x}` 等价于 `:name={x} + onUpdate:name={(val) => x = val}`

**自定义支持 v-model 的组件**

```tsx
const Form = defineComponent({
  props: {
    name: String,
    age: Number
  },
  emits: {
    'update:name': (value: string) => true,
    'update:age': (value: number) => true
  },
  setup(props, { emit }) {
    return () => (
      <>
        <input value={props.name} onInput={(e) => emit('update:name', (e.target as HTMLInputElement).value)} />
        <input value={props.age} onInput={(e) => emit('update:age', Number((e.target as HTMLInputElement).value))} />
      </>
    );
  }
});

// 父组件使用
const Parent = defineComponent(() => {
  const form = reactive({ name: '小明', age: 20 });
  return () => <Form v-model:name={form.name} v-model:age={form.age} />;
});
```

### 5. Setup 参数的未使用声明

在 TSX 中，如果 `setup` 函数的 `props` 或解构出的 `emit`、`slots` 等参数没有被用到，必须直接使用 `_` 声明，以防止 TypeScript 报错：

```tsx
import { defineComponent } from 'vue';

export default defineComponent({
  setup(_, { slots }) {
    // props 未使用，用 _ 替代
    return () => <div>{slots.default?.()}</div>;
  }
});

export const AnotherComponent = defineComponent({
  setup(_, { emit }) {
    // props 未使用，用 _ 替代
    return () => <button onClick={() => emit('click')}>Click</button>;
  }
});
```

## 二、响应式与副作用管理

### 6. 响应式核心：ref 和 reactive

Vue 的响应式基于 Proxy。`get` 收集依赖，`set` 触发 render 重新运行。

- `reactive`: 封装整个对象。
- `ref`: 封装单值（内部也是 Proxy），在 TSX 中必须通过 `.value` 访问。

```tsx
import { defineComponent, ref, reactive } from 'vue';

export default defineComponent(() => {
  const state = reactive({ content: '' });
  const value = ref('');

  return () => (
    <div>
      <input v-model={value.value} />
      <input v-model={state.content} />
    </div>
  );
});
```

### 7. Computed 与 Watch

在 TSX 中，`computed` 和 `watch` 的使用与标准 Composition API 保持一致。**注意：推荐只使用 `watch` 进行显式依赖追踪，避免使用隐式的 `watchEffect`。**

**基础 Computed 与 Watch**

```tsx
import { defineComponent, ref, computed, watch } from 'vue';

export default defineComponent({
  setup() {
    const count = ref(0);

    // Computed: 派生状态
    const doubleCount = computed(() => count.value * 2);

    // Watch: 显式监听状态变化，执行副作用
    watch(count, (newVal, oldVal) => {
      console.log(`Count changed from ${oldVal} to ${newVal}`);
    });

    return () => (
      <div>
        <p>Count: {count.value}</p>
        <p>Double: {doubleCount.value}</p>
        <button onClick={() => count.value++}>Add</button>
      </div>
    );
  }
});
```

**使用 Computed 传递 v-model**

当你在子组件中想要将外部传入的 `prop` 作为内部 `v-model` 绑定到另一个组件时，可以使用**带有 getter 和 setter 的可写 computed** 完美解决。

```tsx
import { defineComponent, computed } from 'vue';

export const CustomInput = defineComponent({
  props: {
    modelValue: { type: String, required: true }
  },
  emits: {
    'update:modelValue': (val: string) => true
  },
  setup(props, { emit }) {
    // 创建一个可写的 computed 代理 prop 和 emit
    const internalValue = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val)
    });

    return () => (
      // 直接将 computed 绑定给内部的 v-model
      <input v-model={internalValue.value} />
    );
  }
});
```

### 8. 副作用管理：Watch + Cleanup (替代生命周期钩子)

在现代 Vue 3 开发中，**不推荐过度使用生命周期钩子**（如 `onMounted`, `onBeforeUnmount`）。推荐的范式是使用 `watch` 配合 `onCleanup` 来管理副作用，这样可以把"启动逻辑"和"清理逻辑"高内聚在同一个地方，避免逻辑碎片化。

```tsx
import { defineComponent, ref, watch } from 'vue';

export default defineComponent({
  setup() {
    const isEnabled = ref(true);
    const count = ref(0);

    // 使用 watch 替代 onMounted + onBeforeUnmount
    // 只有当 isEnabled 为 true 时才开启定时器
    watch(
      isEnabled,
      (enabled, _, onCleanup) => {
        if (!enabled) return;

        // 相当于条件触发时的启动逻辑
        const timer = window.setInterval(() => {
          count.value++;
          console.log('Tick:', count.value);
        }, 1000);

        // 相当于依赖变化时的清理逻辑
        // onCleanup 会在下一次 watch 回调执行前，或者组件卸载时自动调用
        onCleanup(() => {
          clearInterval(timer);
          console.log('Timer cleaned up');
        });
      },
      { immediate: true } // 立即执行一次
    );

    return () => (
      <div>
        <p>Count: {count.value}</p>
        <button onClick={() => (isEnabled.value = !isEnabled.value)}>
          Toggle Timer: {isEnabled.value ? 'ON' : 'OFF'}
        </button>
      </div>
    );
  }
});
```

**例外情况：必须等待 DOM 挂载的副作用**

Vue 的 `watch` 配合 `{ immediate: true }` 会在组件 `setup` 阶段（即 DOM 尚未挂载时）立即执行。如果你的副作用**强依赖于真实的 DOM 节点**（例如获取元素的宽高、初始化第三方图表库），此时不能直接使用 `immediate: true`。

**正确的做法是：将带有 `immediate: true` 的 `watch` 放入 `onMounted` 中执行。**

```tsx
import { defineComponent, ref, watch, onMounted } from 'vue';

export default defineComponent({
  setup() {
    const divRef = ref<HTMLElement | null>(null);
    const someState = ref('initial');

    // 例外：需要操作真实 DOM 的副作用
    onMounted(() => {
      // 在 onMounted 内部启动 watch，确保此时 DOM 已经挂载
      watch(
        someState,
        (stateValue, _, onCleanup) => {
          if (!divRef.value) return;
          
          // 此时可以安全地操作 DOM
          console.log('DOM Width:', divRef.value.offsetWidth);
          
          // 绑定 DOM 事件
          const handler = () => console.log('Clicked', stateValue);
          divRef.value.addEventListener('click', handler);
          
          // 依然可以使用 onCleanup 进行高内聚的清理
          onCleanup(() => {
            divRef.value?.removeEventListener('click', handler);
          });
        },
        { immediate: true } // 此时的 immediate 是在 onMounted 之后立即执行
      );
    });

    return () => <div ref={divRef}>DOM Element</div>;
  }
});
```

### 9. 常见响应式工具函数

在 Vue TSX 开发中，熟练使用响应式工具函数可以极大提升代码的健壮性和可维护性。

**`toRefs` 与 `toRef`：解构响应式对象**

当你需要解构 `reactive` 对象或 `props` 时，直接解构会丢失响应式。必须使用 `toRefs` 或 `toRef`。

```tsx
import { defineComponent, reactive, toRefs, toRef } from 'vue';

export default defineComponent({
  props: {
    title: String,
    count: Number
  },
  setup(props) {
    // ❌ 错误：直接解构会丢失响应式
    // const { title } = props;

    // ✅ 正确：使用 toRefs 解构整个 props 或 reactive 对象
    const { title, count } = toRefs(props);

    // ✅ 正确：使用 toRef 提取单个属性
    const titleRef = toRef(props, 'title');

    const state = reactive({ x: 1, y: 2 });
    const { x, y } = toRefs(state);

    return () => (
      <div>
        <h1>{title.value}</h1>
        <p>Count: {count?.value}</p>
        <p>State: {x.value}, {y.value}</p>
      </div>
    );
  }
});
```

**`unref`：安全地获取值**

如果你不确定一个值是 `ref` 还是普通值，使用 `unref(val)`。它是 `val = isRef(val) ? val.value : val` 的语法糖，在编写通用 Hook（Composable）时非常有用。

```tsx
import { unref, ref } from 'vue';

function useFeature(param: string | import('vue').Ref<string>) {
  // 无论传入的是 ref 还是普通字符串，都能安全拿到值
  const value = unref(param);
  console.log(value);
}
```

**`isRef` 与 `isReactive`：类型判断**

用于判断一个数据是否是响应式的。

```tsx
import { ref, reactive, isRef, isReactive } from 'vue';

const count = ref(0);
const state = reactive({ name: 'Vue' });

console.log(isRef(count)); // true
console.log(isReactive(state)); // true
```

**`shallowRef` 与 `shallowReactive`：浅层响应式**

对于大型数据结构（如从接口获取的巨大列表、复杂的第三方实例），不需要深层 Proxy 代理时，使用浅层响应式以**提升性能**。

```tsx
import { defineComponent, shallowRef, triggerRef } from 'vue';

export default defineComponent({
  setup() {
    // 只有 data.value 的重新赋值会触发更新，内部属性变化不会触发
    const hugeData = shallowRef({
      list: [/* 10000 个元素 */]
    });

    const updateList = () => {
      // ❌ 不会触发视图更新
      // hugeData.value.list.push(newItem);

      // ✅ 必须重新赋值 value 才会更新
      // hugeData.value = { list: [...hugeData.value.list, newItem] };

      // 或者使用 triggerRef 强制触发更新
      triggerRef(hugeData);
    };

    return () => <div>{hugeData.value.list.length}</div>;
  }
});
```

## 三、状态共享与架构

### 10. 依赖注入：Provide / Inject 与受控 Hook

在 Vue 3 中，`provide` / `inject` 的最佳实践**不是**为了简单地传递数据，而是为了**让一个 Hook（Composable）受控初始化，并在多个后代组件中共享同一个 Hook 实例**。

这种模式的精髓在于：先写 Hook，再用 `ReturnType<typeof useHook>` 自动推导 InjectionKey 的类型，完全不需要手动写冗长的 interface。

```tsx
import { defineComponent, provide, inject, InjectionKey, ref, computed } from 'vue';

// 1. 先写你的核心 Hook 逻辑
function useTheme() {
  const color = ref('blue');
  const isDark = computed(() => color.value === 'black');
  
  const changeColor = (c: string) => {
    color.value = c;
  };

  return { color, isDark, changeColor };
}

// 2. 极其优雅地定义 InjectionKey，直接提取 Hook 的返回类型
const ThemeSymbol: InjectionKey<ReturnType<typeof useTheme>> = Symbol('Theme');

// 3. 祖先组件：受控初始化 Hook，并 Provide 下去
export const ThemeProvider = defineComponent({
  setup(_, { slots }) {
    // 在这里初始化 Hook，整个组件树共享这一个实例
    const theme = useTheme();
    provide(ThemeSymbol, theme);

    return () => <div>{slots.default?.()}</div>;
  }
});

// 4. 后代组件：Inject 并使用
export const ThemeConsumer = defineComponent({
  setup() {
    // 完美类型推导，且强制要求上层必须 Provide（不传默认值）
    // 如果上层没 Provide，运行时会警告，符合"受控"的预期
    const theme = inject(ThemeSymbol)!;

    return () => (
      <button 
        style={{ color: theme.color.value }} 
        onClick={() => theme.changeColor('red')}
      >
        Change Theme (Dark: {theme.isDark.value ? 'Yes' : 'No'})
      </button>
    );
  }
});
```

### 11. 状态管理：Pinia Setup Store (全局受控 Hook)

在 Vue TSX 项目中，推荐使用 Pinia 的 **Setup Store** 语法。从架构思想上看，**Pinia Setup Store 实际上就是 `provide` / `inject` + 受控 Hook 思想的全局延伸**。

> **💡 核心认知**：
> Pinia Setup Store 是目前前端界**已知最好用的状态管理工具**，其架构体验超越了 Angular Service、Solid `createRoot` 以及一众 React 状态库（如 Redux、Zustand）。
> 它的核心优势在于：**完美复用组件的 Hooks 逻辑**（心智模型零切换），并且配合 Vue Devtools，其**调试支持冠绝所有框架工具**。

它具有两个极其重要的特性：
1. **惰性初始化**：Store 内部的 `setup` 逻辑只有在组件中**第一次调用** `useStore()` 时才会执行，而不是在文件加载时执行。
2. **自动响应式解包**：Store 会将你返回的所有 `ref` 和 `computed` 自动包裹进一个统一的 `reactive` 对象中。因此，在使用时**不需要写 `.value`**。

```tsx
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 1. 先写核心的 Hook 逻辑（与 Provide/Inject 模式完全一致）
function useUserLogic() {
  // State (内部是 ref)
  const name = ref('Alice');
  const age = ref(20);

  // Getters (内部是 computed)
  const isAdult = computed(() => age.value >= 18);

  // Actions
  function growUp() {
    age.value++;
  }

  return { name, age, isAdult, growUp };
}

// 2. 将 Hook 塞入 defineStore，使其成为全局单例并获得 Pinia 的特性
// Pinia 会在底层将 Hook 返回的 ref/computed 包装成一个 reactive 对象
export const useUserStore = defineStore('user', useUserLogic);
```

在 TSX 组件中使用：

```tsx
import { defineComponent } from 'vue';
import { useUserStore } from './store';

export default defineComponent({
  setup() {
    // 此时才触发惰性初始化！
    // 只有全应用中【第一个】调用 useUserStore() 的组件，才会真正执行 useUserLogic 内部的代码
    // 后续其他组件再调用时，直接复用已初始化的实例
    const userStore = useUserStore();

    return () => (
      <div>
        {/* 注意：不需要写 userStore.name.value，Pinia 已经做了 reactive 解包 */}
        <p>
          {userStore.name} - {userStore.age} (Adult: {userStore.isAdult ? 'Yes' : 'No'})
        </p>
        <button onClick={() => userStore.growUp()}>Grow Up</button>
      </div>
    );
  }
});
```

## 四、样式处理

### 12. TailwindCSS 与 Vue Styled Components

在 Vue TSX 中，由于没有 SFC 的 `<style scoped>`，我们采用以下策略处理样式：

1. **首选方案**：使用 **TailwindCSS** 的原子类（Utility Classes）进行快速、响应式的样式开发。
2. **后备方案**：当需要覆盖第三方 UI 库（如 Element Plus、Ant Design Vue）的内部深层样式，或者需要高度动态的 CSS-in-JS 能力时，使用 **[vue-styled-components](https://vue-styled-components.com/zh/)**。

**基础样式 (TailwindCSS)**

直接在 TSX 中使用 `class` 属性编写 Tailwind 类名：

```tsx
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    return () => (
      <div class="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-lg shadow-md">
        <h1 class="text-2xl font-bold text-blue-600 mb-2">Hello Tailwind</h1>
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Click Me</button>
      </div>
    );
  }
});
```

**覆盖第三方组件样式 (Vue Styled Components)**

当 Tailwind 无法穿透第三方组件的内部 DOM 结构时，使用 `vue-styled-components`。它通过 CSS-in-JS 提供封装性，防止样式泄漏。

```tsx
import { defineComponent } from 'vue';
import styled from 'vue3-styled-components';
import { ElButton } from 'element-plus';

// 1. 样式化原生 HTML 元素
const StyledWrapper = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;

  /* 支持嵌套语法 */
  &:hover {
    background-color: #e0e0e0;
  }
`;

// 2. 覆盖第三方组件内部样式
// 传入第三方组件，并在模板字符串中编写 CSS
const CustomElButton = styled(ElButton)`
  /* 覆盖 Element Plus 按钮的默认样式 */
  background-color: #ff4757 !important;
  border-color: #ff4757 !important;
  color: white !important;

  /* 穿透修改其内部的 span 标签 */
  & > span {
    font-weight: bold;
    letter-spacing: 1px;
  }

  &:hover {
    background-color: #ff6b81 !important;
    border-color: #ff6b81 !important;
  }
`;

// 3. 基于 Props 的动态样式
const DynamicBox = styled('div', { primary: Boolean })`
  color: ${(props) => (props.primary ? 'white' : 'black')};
  background: ${(props) => (props.primary ? '#3498db' : 'transparent')};
  padding: 10px;
  border: 1px solid #3498db;
`;

export default defineComponent({
  setup() {
    return () => (
      <StyledWrapper>
        <h2 class="text-xl mb-4">Styled Components Demo</h2>

        {/* 使用覆盖了样式的第三方组件 */}
        <CustomElButton type="primary">Custom Element Button</CustomElButton>

        {/* 使用动态样式的组件 */}
        <DynamicBox primary={true} class="mt-4">
          Primary Box
        </DynamicBox>
      </StyledWrapper>
    );
  }
});
```

## 六、TSX 独有坑点与避坑指南

在 Vue TSX 中，由于脱离了模板编译器的保护，有一些特殊的坑点需要特别注意：

### 13. 指令的替代方案 (v-if / v-for / v-show)

TSX 中没有 `v-if` 和 `v-for`，必须使用原生 JS 语法。

- **`v-if`**：使用三元运算符 `? :` 或逻辑与 `&&`。
- **`v-for`**：使用 `Array.prototype.map`。
- **`v-show`**：TSX 原生支持 `v-show={condition}` 指令。

```tsx
import { defineComponent, ref } from 'vue';

export default defineComponent({
  setup() {
    const isVisible = ref(true);
    const list = ref([{ id: 1, text: 'A' }, { id: 2, text: 'B' }]);

    return () => (
      <div>
        {/* ❌ 错误：TSX 没有 v-if */}
        {/* <div v-if={isVisible.value}>...</div> */}

        {/* ✅ 正确：v-if 替代方案 */}
        {isVisible.value ? <div>Visible</div> : <div>Hidden</div>}
        {isVisible.value && <div>Only Visible</div>}

        {/* ✅ 正确：v-for 替代方案（注意 key 的绑定） */}
        <ul>
          {list.value.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>

        {/* ✅ 正确：v-show 是支持的 */}
        <div v-show={isVisible.value}>Toggled by CSS display</div>
      </div>
    );
  }
});
```

### 14. 事件修饰符 (Event Modifiers)

在 SFC 模板中，我们可以写 `@click.stop.prevent`。在 TSX 中，必须使用 Vue 提供的 `withModifiers` 工具函数。

```tsx
import { defineComponent, withModifiers } from 'vue';

export default defineComponent({
  setup() {
    const handleClick = () => console.log('Clicked');
    const handleEnter = () => console.log('Enter pressed');

    return () => (
      <div onClick={withModifiers(handleClick, ['stop', 'prevent'])}>
        Click Me (Stop & Prevent)
      </div>
    );
  }
});
```

*注：对于按键修饰符（如 `.enter`），在 TSX 中通常直接在事件名上体现，如 `onKeyupEnter={handleEnter}`，或者在回调中手动判断 `e.key === 'Enter'`。*

### 15. 复杂条件渲染：拒绝嵌套三元，拥抱 `ts-pattern`

在 TSX 中，当遇到多分支的条件渲染时，**严禁使用嵌套的三元运算符**（如 `a ? b : c ? d : e`），这会极大地破坏代码可读性。

推荐使用 **`ts-pattern`** 库进行模式匹配，它不仅能提供完美的类型推导，还能强制进行穷尽性检查（Exhaustiveness Checking），确保你处理了所有可能的状态。

```tsx
import { defineComponent, ref } from 'vue';
import { match } from 'ts-pattern';

type Status = 'loading' | 'success' | 'error' | 'idle';

export default defineComponent({
  setup() {
    const status = ref<Status>('idle');
    const errorMessage = ref('Network timeout');

    return () => (
      <div class="p-4">
        {/* ❌ 错误：嵌套三元，可读性极差 */}
        {/* {status.value === 'loading' ? <Spinner /> : status.value === 'error' ? <Error msg={errorMessage.value} /> : status.value === 'success' ? <Data /> : <Empty />} */}

        {/* ✅ 正确：使用 ts-pattern 进行优雅的模式匹配 */}
        {match(status.value)
          .with('idle', () => <div class="text-gray-500">Please start the request</div>)
          .with('loading', () => <div class="text-blue-500 animate-pulse">Loading...</div>)
          .with('success', () => <div class="text-green-500">Data loaded successfully!</div>)
          .with('error', () => <div class="text-red-500">Error: {errorMessage.value}</div>)
          .exhaustive() // 强制穷尽检查，如果 Status 增加新类型但这里没写，TS 会直接报错！
        }
      </div>
    );
  }
});
```

## 七、总结核心类型工具

- `PropType<T>`: 声明 props 的复杂类型。
- `slots: {} as SlotsType<T>`: 声明 slot 的类型。
- `() => void`: render 函数类型（不在意返回值，已灌入 VDOM）。