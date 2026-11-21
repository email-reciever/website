# 视觉设计规范 — Active Theory

> 2026-11 二次重塑:从 vercel-mesh 切到 **Active Theory** 式电影感界面。
> 用户确认「全站 active-theory」;详情页沿用同一视觉语言,只借用
> beautiful-article 的**阅读节奏**(目录 / 进度 / 行宽 / colophon),不引入第二套系统。
> 路由、取数、SEO、主题键(`dim`/`light`)与所有交互契约保持不变。

## Design Read

```yaml
artifact: cinematic content-reading site (list + longform detail)
audience: 阅读技术通讯的开发者
visual-language: Active Theory — cinematic stage, one signature hue, zero radius
mode: overhaul (visual only)
visual-variance: 8
motion-intensity: 8
information-density: 5 (list) / 7 (detail)
asset-dependence: 4
brand-fidelity: 5
```

## Tokens

| Role           | dim(默认)                    | light               |
| -------------- | ---------------------------- | ------------------- |
| Ground         | `#000000`                    | `#f4f7f9`           |
| Surface        | `#0a0d12`                    | `#ffffff`           |
| Hairline       | `rgba(238,246,249,.12)`      | `rgba(6,18,26,.14)` |
| Primary text   | `#eef6f9`                    | `#06121a`           |
| Secondary text | `#8a97a6`(冷灰,非纯灰)       | `#5a6b76`           |
| Signature hue  | `#00e5ff` 电光青(唯一强调色) | `#007e8f`           |

- **Typography**: Geist Variable(display 全大写、字重 700、字距 -0.055em;正文 15–17px);
  Geist Mono(所有标签 / 计数 / 日期 / slug);Noto Sans SC 作中文回退。
- **Spacing**: 8 / 16 / 24 / 40 / 64 / 96 / 128
- **Radius**: **0** —— 卡片、按钮、输入框、代码块全部直角。
- **Shadow**: 无 CSS 阴影;层次来自画布光照、渐变与 hairline。
- **Motion**: `cubic-bezier(0.16,1,0.3,1)`;hover 250–600ms;滚动 = 镜头缓慢推进;
  遵循 `prefers-reduced-motion`(粒子退化为静态帧、动画关闭)。

## Signature moves

1. **一处 set-piece**:首页全屏 canvas 粒子场,指针附近有弹簧式吸附;滚动时内容上移淡出,像镜头穿过场景。全站**只有这一处**大动效。
2. 超大全大写 display(`READ THE / SIGNAL.`),第二行用电光青,带极淡光晕。
3. 卡片是"被照亮的面板":左侧青色细线在 hover 时从上往下长出,banner 从灰度恢复彩色;无圆角、无阴影。
4. 所有元数据用 mono + 大字距 + 全大写,工具感强。
5. 详情页:顶部 2px 青色阅读进度线,右侧目录轨(h2/h3 稳定锚点 + 滚动高亮),正文 68ch 行宽、1.92 行高、标题带 hairline 上边框,结尾 colophon。

## Protected contracts(未改动)

- 路由 `/`、`/post/$author/$slug` 与 `?source=&q=&page=`
- manifest / 取数 / 双层缓存管线
- 真实源图标与 banner(`/media-source/*`)
- daisyUI `data-theme` 键与 localStorage 持久化
- 搜索防抖、分页、同源推荐、主题切换

## Avoid

高饱和紫粉渐变、彩色按钮、圆角卡片、emoji 图标、拖拽式 Three.js demo(粒子场是手写 canvas)、
在内容密集处堆动效 —— 舞台只服务一个高潮时刻。

## 图标

favicon / 站点 logo 由 **Kubai Icons** skill 的 duotone 风格绘制(16 网格、浅色主体 + 品牌色点缀)。
物体选「RSS 馈源」(通用订阅符号,涵盖博客与 newsletter),主色 `#00e5ff`,辅色由 `secondary(主色)` 推导为 `#99f5ff`;
在 64/48/24/16px 下用 `check.mjs` 自检为 0 findings 后导出静态 SVG。skill 全局安装于
`~/.agents/skills/kubai-icons`。

## 配图

`docs/screenshots/` 为线上站点真实截图(Chrome headless 采集),README 直接引用。
