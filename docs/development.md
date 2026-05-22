# 开发执行规范

## 开发流程

### 每次开发前
1. 确认当前需求（参考 `docs/requirements.md`）
2. 检查 `devlog/` 最新日志，了解上次进度和待办

### 开发中
1. 先改数据，再改结构，最后调样式
2. 每次只改一个功能点，改完刷新浏览器验证
3. 保持代码简约，不引入不必要的抽象

### 开发后
1. 更新 `devlog/YYYY-MM-DD.md` 开发日志
2. 确认不影响已有功能
3. 如需变更需求，同步更新 `docs/requirements.md`

## 文件修改指引

| 要改什么 | 改哪个文件 |
|----------|-----------|
| 队员信息（姓名、号码、位置） | `js/main.js` → `renderRoster()` 中的 `players` 数组 |
| 比赛记录 | `js/main.js` → `renderFixtures()` 中的 `results` 和 `upcoming` 数组 |
| 球队口号 | `index.html` → `.hero-subtitle` 段落 |
| 球队介绍文字 | `index.html` → `#about` 区块 |
| 联系方式、地址 | `index.html` → `#contact` 页脚区块 |
| 颜色主题 | `css/style.css` → 搜索替换色值 |
| 添加/删除区块 | `index.html` 改结构 + `css/style.css` 改样式 |
| 添加图片 | 放入 `images/` 文件夹，在对应位置引用 |

## 数据修改示例

队员数据在 `js/main.js` 中，格式如下：

```javascript
{ number: 10, name: "张队", role: "前锋 · 队长", captain: true }
```

- `number`: 球衣号码
- `name`: 姓名
- `role`: 场上位置
- `captain`: `true` 表示队长（显示金色边框和 CAPTAIN 徽章）

赛程数据格式：

```javascript
{ date: "2024.12.08", home: "今日说法", away: "老男孩FC", score: "3:1", result: "win" }
```

- `result`: `"win"` / `"draw"` / `"loss"`（决定比分颜色）

## Git 提交规范

```
feat: 新增xxx功能
fix: 修复xxx问题
style: 调整xxx样式
docs: 更新文档
refactor: 重构xxx
```

## 部署上线步骤

1. 注册 [GitHub](https://github.com) 账号
2. 创建新仓库，仓库名随意
3. 上传所有文件到仓库（拖拽或命令行）
4. 进入仓库 Settings → Pages
5. Source 选择 `main` 分支，点 Save
6. 等待 1-2 分钟，获得公开网址
