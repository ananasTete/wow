
## 需求

1. 发送第一条消息自动创建会话
2. 天气信息会以自定义天气的方式在相应呈现；
3. 会话中根据需要会以图表来表达，客户端渲染图表。
4. 网络搜索后会在正文出现引用链接，点击可直接跳转链接；网络搜索 tool 结束后在侧边栏查看结果列表

### 网络搜索 tool 如何打开侧边栏以及显示本条消息的搜索结果？

通过访问全局状态管理 stroe: SearchPanelStore 来触发。

```ts
export const useSearchPanelStore = create<SearchPanelStore>((set) => ({
  panel: null,
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
```
