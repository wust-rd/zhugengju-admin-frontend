import { defineComponent } from 'vue';

export const ProjectTabContent = defineComponent({
  props: {
    /** 抽屉内展示的背景大图 */
    bgImage: { type: String, required: true },
    /** 上方按钮点击后弹窗展示的图片（留空即不显示按钮） */
    topImage: { type: String, default: '' },
    /** 中间按钮点击后弹窗展示的图片（留空即不显示按钮） */
    middleImage: { type: String, default: '' },
    /** 下方按钮点击后弹窗展示的图片（留空即不显示按钮） */
    bottomImage: { type: String, default: '' },
  },
  emits: {
    preview: (src: string) => typeof src === 'string',
  },
  setup(props, { emit }) {
    const handleClick = (src: string) => {
      if (src) emit('preview', src);
    };

    /** 按钮共用样式 */
    const btnClass = 'absolute w-76px right-24px h-34px cursor-pointer';

    return () => (
      <div class="relative w-full">
        {/* 背景图 */}
        <img src={props.bgImage} alt="项目情况" class="w-full rounded-lg" />

        {/* 上方按钮 */}
        {props.topImage && <div class={`${btnClass} top-80px`} onClick={() => handleClick(props.topImage)}></div>}

        {/* 中间按钮 */}
        {props.middleImage && (
          <div class={`${btnClass} top-458px`} onClick={() => handleClick(props.middleImage)}></div>
        )}

        {/* 下方按钮 */}
        {props.bottomImage && (
          <div class={`${btnClass} top-718px`} onClick={() => handleClick(props.bottomImage)}></div>
        )}
      </div>
    );
  },
});
