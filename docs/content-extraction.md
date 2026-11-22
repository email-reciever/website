# 内容截取策略 / Content extraction strategy

所有订阅源现在共用一套「先清洗 DOM → 再定位正文 → 最后清洗 Markdown」的流程:

```
RSS entry / email HTML / archived page
        │
        ▼  resolveHtml()          teaser 源(Astro、CSS-Tricks)抓正文页
        ▼  extractHtml()          删脚本/追踪/按钮 + 按源选正文节点
        ▼  html2md()              项目自带 turndown fork
        ▼  cleanMarkdown()        删订阅提示/版权/邮件页脚
        ▼  md()                   在线翻译链
        ▼  createBlog()           content/<source>/<slug>.md
```

入口在 `cores/parser/src/utils/ingest.ts#renderItem`,新文章和 `reconcile` 修复走同一条路径。

## 全局清理(所有源)

- 节点:`script / style / noscript / svg / canvas / button / form / iframe / object / embed`、隐藏元素、1×1 与 tracking 图片
- Markdown 行:`Read on the Web`、`View in browser`、`Did someone forward you this`、`Subscribe now`、`Unsubscribe`、`Change/Cancel your subscription`、`Copyright ©`、`All rights reserved`、`The post … appeared first on …`、`x min read`、`Published by Cooper Press` 等

链接会先被解包成纯文本再匹配,所以 `[Subscribe now](url)` 同样会被删掉。

## 每个源的策略

配置集中在 `packages/consts/src/content-rules.ts`,可用字段:

| 字段        | 含义                                                  |
| ----------- | ----------------------------------------------------- |
| `content`   | 正文节点选择器,**按优先级排序**,取第一个 ≥80 字的匹配 |
| `remove`    | 该源特有的垃圾节点                                    |
| `strip`     | 该源特有的 Markdown 行正则                            |
| `fetchFull` | 总是抓 `origin_url` 正文页(RSS 只有摘要)              |
| `minChars`  | RSS 正文短于该字数时抓正文页                          |

| 源                                                                                                      | 策略要点                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `javascriptweekly` / `nodeweekly` / `frontendfocus` / `reactstatus`                                     | 整期就是内容;保留原有 marker 切片,去掉 Cooper Press 页脚、编辑署名、商标声明             |
| `tyler` (Bytes)                                                                                         | 去掉谜题段、sponsor、`advertise/archives`、邮寄地址                                      |
| `cloudflareblog`                                                                                        | 只取 `.post-content`,避开 `<article>` 里的订阅组件和内联 JS                              |
| `astro`                                                                                                 | RSS 只有 **53 字**,`fetchFull: true`;取 `.prose`(而不是含相关文章的 `<main>`)            |
| `csstricks`                                                                                             | RSS 只有 **881 字**,`fetchFull: true`;取 `article / .entry-content`,去掉 newsletter 引导 |
| `typescript`                                                                                            | 取 `<main>`,去掉 `The post … appeared first on …`                                        |
| `awsml`                                                                                                 | 取博客正文,删 `.blog-author-box` 与 About the authors 段                                 |
| `importai`                                                                                              | 删开头订阅引导和结尾 `Thanks for reading!`                                               |
| `garymarcus`                                                                                            | 删按钮 / SVG / twitter embed / `Subscribe now`,保留 P.S.                                 |
| `mittechai`                                                                                             | 取 `.wp-block-post-content`,删相关阅读与订阅块                                           |
| `smashingmag`                                                                                           | 取 `.article-content`,删阅读时长、分享条、作者卡(会议票价属于正文,保留)                  |
| `svelte`                                                                                                | 取 `<article>`,删侧栏 newsletter                                                         |
| `reactdigest`                                                                                           | 删 `Read Online`、投票段和「上一期最受欢迎」尾巴                                         |
| `alexkondov`                                                                                            | 归档页本来就是全文;关键是全局删掉泄漏的 `<script>/<style>`                               |
| `mediumcom` / `producthunt` / `modular` / `arcupdate` / `insidergithub` / `syntaxfm` / `rnn` / `others` | 邮件 adapter 保留原有结构规则,叠加全局与逐源行清理                                       |
| `zhihu`                                                                                                 | 保留自有爬取逻辑,只删「发布于」尾巴                                                      |

## 验证

```bash
# 对最新 RSS 条目做 dry-run(不写文件)
NODE_USE_ENV_PROXY=1 node scripts/content-reextract.mjs --sources astro,csstricks,cloudflareblog --dry-run
```

对最新条目的实测效果(原始 → 新策略,字符数):

| 源               | 旧          | 新      | 说明                      |
| ---------------- | ----------- | ------- | ------------------------- |
| astro            | 53 / 19,850 | 100,624 | 抓到真实全文              |
| csstricks        | 468         | 5,628   | 抓到真实全文              |
| cloudflareblog   | 5,410       | 10,204  | RSS 全文不再被截半        |
| mittechai        | 2,834       | 8,064   | RSS 全文不再被截半        |
| typescript       | 24,655      | 35,582  | 补回正文 + 删 blog footer |
| importai         | 6,782       | 17,162  | 补回正文 + 删订阅提示     |
| javascriptweekly | 15,237      | 14,244  | 只减少页脚垃圾            |

## 回填已有文章

已经保存的文章用同一套规则原地重抽(本地 Chrome 翻译,不消耗 API):

```bash
NODE_USE_ENV_PROXY=1 node scripts/content-reextract.mjs --dry-run
NODE_USE_ENV_PROXY=1 node scripts/content-reextract.mjs --author csstricks --limit 3
NODE_USE_ENV_PROXY=1 node scripts/content-reextract.mjs --sources astro,csstricks --limit 1
```

脚本默认只处理有 RSS/归档源的产品(可重新抓取原始 HTML)。纯邮件源的 `origin_url` 多半是追踪跳转或首页,无法还原原始邮件,需要显式加 `--include-email` 才会尝试,且不会自动覆盖正文。

脚本会保留 frontmatter 与 slug,删除过期的 `source_hash`(规则变了,hash 已失效),并跳过比已有正文更薄的抓取结果,以免 JS 渲染页把好内容覆盖掉。
