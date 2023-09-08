# mini-vue3

简版 vue3 实现

启动项目Demo：找到对应的目录下，[liveServer](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 启动 dist 目录下的 html 文件

## reactivity

- [x] reactivity
- [x] 嵌套 reactive
- [x] readonly
- [x] effect
- [x] effect.scheduler
- [x] effect.stop
- [x] computed 的实现
- [x] watch 的实现
- [x] watchEffect 的实现
- [x] watch、watchEffect回调函数 onCleanup的实现
- [x] track 依赖收集
- [x] trigger 触发依赖
- [x] isReactive
- [x] isReadonly
- [x] isProxy
- [x] toRaw
- [x] ref 的实现
- [x] effectScope 的实现
- [x] 异步更新\批处理 queueJob


## runtime-core

- [x] h函数实现
- [x] createVNode实现
- [x] renderer函数实现
- [x] 初次挂载element实现
- [x] patchElement (普通tag标签、Component、Text、Common、Fragment)
- [x] diff算法
- [x] 组件的挂载、更新流程
- [x] nextTick
- [x] 组件的setup、props、attrs、emit、expose的实现
- [x] 支持 Vue2组件的data() {}
- [x] 组件的实例属性实现 $el、$data、$proxy、$slots、.....

## runtime-dom

- [x] dom操作实现
- [x] event
- [x] class
- [x] style
- [x] props
- [x] attrs


## compiler-dom

- [x] AST


## 接入 vitest