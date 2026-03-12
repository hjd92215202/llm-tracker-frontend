<!-- src/App.vue -->
<template>
  <router-view />
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%; 
  background-color: #ffffff;
  
  /* 💡 核心：针对 Firefox */
  scrollbar-width: none; 
  /* 💡 核心：针对 IE/Edge */
  -ms-overflow-style: none; 
}

/* 💡 核心：针对 Chrome, Safari, Edge (Webkit) */
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
}

#app {
  width: 100%;
}

/* 保持滚动功能，但移除视觉干扰 */
body {
  overflow-y: auto;
}
</style>