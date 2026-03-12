<template>
    <div class="flex min-h-screen bg-slate-50">
        <aside class="w-64 bg-slate-950 text-white shrink-0 flex flex-col p-8">
            <div class="mb-12">
                <h2 class="text-xl font-black tracking-tighter">BACKSTAGE</h2>
                <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-1">LLM Tracker Admin</p>
            </div>

            <nav class="flex-1 space-y-2">
                <router-link to="/admin/roadmap" class="admin-nav-item" active-class="active">Nodes
                    Control</router-link>
                <router-link to="/admin/note/create" class="admin-nav-item" active-class="active">Write
                    Note</router-link>
            </nav>

            <router-link to="/"
                class="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-[0.2em]">←
                View Site</router-link>
        </aside>

        <main class="flex-1 overflow-y-auto">
            <router-view />
        </main>
    </div>
</template>

<style scoped>
@reference "@/style.css";

.admin-nav-item {
    @apply block px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all;
}

.admin-nav-item.active {
    @apply bg-blue-600 text-white shadow-lg shadow-blue-500/20;
}
</style>