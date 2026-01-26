# Lei's Personal Website

超精美的个人主页，采用 Astro + Three.js 构建，融合 3D 立体风格、打字机效果和滚动动画。

## ✨ 特性

- 🎨 **顶级设计风格** - 参考 Apple、Stripe、Linear 的设计美学
- 🎮 **3D 真实感背景** - 使用 Three.js 实现的沉浸式 3D 场景
- ⌨️ **打字机效果** - 动态展示身份标签
- 📝 **博客系统** - 基于 Astro Content Collections 的完整博客功能
- 🚀 **极致性能** - Astro Islands 架构，几乎零 JavaScript
- 📱 **响应式设计** - 完美适配各种设备

## 🛠️ 技术栈

- [Astro](https://astro.build) - 静态站点生成器
- [Three.js](https://threejs.org) - 3D 图形库
- TypeScript - 类型安全
- pnpm - 包管理器

## 📦 安装

```bash
pnpm install
```

## 🚀 开发

```bash
pnpm dev
```

访问 `http://localhost:4321`

## 🏗️ 构建

```bash
pnpm build
```

构建输出在 `dist-astro/` 目录

## 📝 写博客

在 `src/content/blog/` 目录下创建 `.md` 文件：

```markdown
---
title: '文章标题'
description: '文章描述'
pubDate: 2024-01-15
tags: ['标签1', '标签2']
draft: false
---

# 文章内容
```

## 🚢 部署

项目使用 GitHub Actions 自动部署到 GitHub Pages。

### 首次部署设置

1. 在 GitHub 仓库设置中：
   - 进入 **Settings** → **Pages**
   - 将 **Source** 设置为 **GitHub Actions**

2. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署

### 手动触发部署

在 GitHub Actions 页面点击 **Run workflow** 按钮

## 📁 项目结构

```
├── src/
│   ├── components/     # 组件
│   ├── content/        # 博客内容
│   ├── layouts/        # 布局模板
│   ├── pages/          # 页面路由
│   └── styles/         # 样式文件
├── public/             # 静态资源
├── archive/            # 旧文件存档
└── dist-astro/         # 构建输出
```

## 📄 许可证

MIT
