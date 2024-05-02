import { createRouter, createWebHashHistory } from "vue-router";

// 定义路由
const routes = [
  {
    path: "/",
    name: "主页",
    component: () => import("@/pages/main/Container.vue"),
  },
  {
    path: "/about",
    name: "关于",
    component: () => import("@/pages/about/About.vue"),
  },
  {
    path: "/svg",
    name: "svg",
    component: () => import("@/pages/setting/ShowSvg.vue"),
  },
  {
    path: "/link",
    name: "link",
    component: () => import("@/pages/setting/Link.vue"),
  },
];

// 创建router实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
