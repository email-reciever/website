# 视觉设计规范 — vercel-mesh

> 2026-11 网站视觉重塑。基于 web-design-engineer 的 `vercel-mesh` recipe:
> 黑白精度为底,仅 hero 一处弥散渐变网格。保留原有路由、数据流、SEO 与 daisyUI 的
> `data-theme` 键(`dim` / `light`),因此是一次 **Redesign · Overhaul(视觉层)**。

## Design Read

```yaml
artifact: content reading site (list + post detail)
audience: 技术读者,开发者,中英文混排长文
visual-language: Vercel gradient-mesh era — monochrome / hairline / mono readouts
mode: overhaul (visual only; routes + content contract preserved)
visual-variance: 6
motion-intensity: 3
information-density: 6
asset-dependence: 3 (logo + source banners already exist)
brand-fidelity: 4 (new visual identity, not an existing brand spec)
```

## Tokens

| Role           | dim(默认)                                                          | light           |
| -------------- | ------------------------------------------------------------------ | --------------- |
| Ground         | `#000000`                                                          | `#fafafa`       |
| Surface        | `#0a0a0a`                                                          | `#ffffff`       |
| Hairline       | `#1f1f1f`                                                          | `#e5e5e5`       |
| Primary text   | `#ededed`                                                          | `#111111`       |
| Secondary text | `#888888`                                                          | `#666666`       |
| CTA            | 白底黑字 / 黑底白字(无渐变、无阴影)                                | 黑底白字        |
| Mesh(仅 hero)  | cyan `#0070f3` → magenta `#ff0080` → orange `#f5a623`,低饱和高羽化 | 同上,opacity .3 |

- **Typography**: Geist Variable(显示/正文,500–600)+ Geist Mono Variable(标签/日期/slug);
  Noto Sans SC Variable 作中文回退。
- **Spacing**: 4 / 8 / 16 / 24 / 40 / 64 / 96
- **Radius**: 8(小)/ 12(卡片)/ 16(大)
- **Shadow**: 组件级无阴影,靠 hairline 边框区分层级;页面"被 hero 的网格照亮"。
- **Motion**: `cubic-bezier(0.16,1,0.3,1)`,hover 200ms,布局 350–500ms,
  mesh 18s 漂移循环;遵循 `prefers-reduced-motion`。

## Signature moves

1. 列表页 hero 一整块弥散渐变网格,向下羽化到黑;全页**仅此一处**。
2. 卡片 banner 默认灰度,hover 恢复彩色并从底部透出柔和光晕(全页唯一的组件级 glow)。
3. Mono 标签(`/index`、`sources`、`TRANSLATED`、`slug`)营造工具感。
4. CTA 恒为实心高对比按钮,无彩色、无渐变、无阴影。
5. 详情页元信息卡用 hairline 边框,替代 daisyUI 的 card shadow。

## Protected contracts(未改动)

- 路由 `/`、`/post/$author/$slug` 与 `?source=&q=&page=` URL 状态
- manifest / 内容取数与缓存管线
- 源图标与 banner(`/media-source/*`)等真实素材
- daisyUI `data-theme` 键与 localStorage 持久化(`dim` / `light`)
- 搜索防抖、分页、同源推荐等交互行为与无障碍语义

## Avoid

- 高饱和紫→粉 AI 渐变、每处都发光、彩色按钮、emoji 图标。
