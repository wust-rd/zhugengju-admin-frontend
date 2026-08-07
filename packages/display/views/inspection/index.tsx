import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DisplayInspection',
  setup() {
    return () => (
      <>
        <img
          src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/首页/首页drawer.webp"
          alt=""
          class="h-full object-fill"
        />

        <img
          src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/首页/底图.webp"
          alt=""
          class="flex-1 h-full object-fill"
        />
      </>
    );
  },
});
