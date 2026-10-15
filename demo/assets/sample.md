---
title: KEditor Markdown 导入示例
author: demo
---

# 编辑部周报

本周完成 **Markdown 导入**，把 `.md` 文件或粘贴的文本一次性转成可直接编辑的公众号正文。

## 支持的语法

- 标题 / 段落 / 加粗 / 斜体 / ~~删除线~~
- 有序、无序、嵌套列表
- [x] 任务列表
- [ ] 待办项

| 入口 | 触发方式 | 说明 |
| --- | :-: | --- |
| 工具栏 | 尾栏「Markdown」 | 选择文件或粘贴文本 |
| 拖拽 | 拖 `.md` 进正文 | 默认替换全文 |
| 接口 | `importMarkdown` | 可指定落点 |

> 转换结果就是普通 HTML，可以继续排版、编辑、导出。

```js
const res = await editor.importMarkdown('# 标题', { mode: 'append' })
console.log(res.summary) // { headings: 1, paragraphs: 0, ... }
```

```python
def summarize(rows):
    return {k: sum(v) for k, v in rows}
```

1. 选文件或粘贴文本
2. 选落点：替换全文 / 追加文末 / 插入光标
3. 看预览与结构统计，点「导入到正文」

---

更多见 [KEditor 文档](https://agent-pilot.talkmed.com/docs)。
