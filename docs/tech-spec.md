# 技术规范

## 技术选型

| 层面 | 技术 | 理由 |
|------|------|------|
| 结构 | HTML5 | 语义化标签，SEO 友好 |
| 样式 | 纯 CSS3 | 无框架依赖，加载快 |
| 交互 | 原生 JavaScript (ES6) | 无第三方库，体积小 |
| 部署 | GitHub Pages | 免费、自带 HTTPS、全球 CDN |

## 浏览器兼容

- Chrome 90+
- Safari 14+
- Firefox 90+
- Edge 90+
- 移动端 iOS Safari / Android Chrome

## 文件组织

```
足球网页/
├── index.html          # 唯一页面入口
├── css/
│   └── style.css       # 全局样式（单文件）
├── js/
│   └── main.js         # 全局脚本（单文件）
├── images/             # 图片资源
├── docs/               # 项目文档
└── devlog/             # 开发日志
```

## CSS 技术要点

- Flexbox + Grid 布局
- CSS 自定义动画（@keyframes）
- CSS 变量待引入（后续优化）
- 响应式断点：768px（平板）、400px（小手机）
- `clamp()` 函数实现流畅字号缩放

## JS 技术要点

- DOMContentLoaded 入口
- IntersectionObserver 实现滚动渐现
- requestAnimationFrame 优化滚动性能
- 事件委托处理灯箱点击

## 性能指标

- 首次内容绘制 < 0.5s（纯静态，无网络请求）
- 无外部字体、无外部图标库
- 图片懒加载（后续优化）

## 部署流程

1. 注册 GitHub 账号
2. 创建仓库（如 `jinrishuofa-team`
3. 推送代码到仓库
4. Settings → Pages → 选择分支 → 开启
5. 获得网址：`https://<用户名>.github.io/<仓库名>/`
