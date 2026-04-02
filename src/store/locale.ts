import { defineStore } from 'pinia'

export type AppLocale = 'zh-CN' | 'en-US'

const STORAGE_KEY = 'appLocale'

const resolveInitialLocale = (): AppLocale => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'zh-CN' || stored === 'en-US') {
    return stored
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: resolveInitialLocale() as AppLocale,
  }),

  getters: {
    isChinese: (state) => state.locale === 'zh-CN',
  },

  actions: {
    setLocale(locale: AppLocale) {
      this.locale = locale
      localStorage.setItem(STORAGE_KEY, locale)
    },

    toggleLocale() {
      this.setLocale(this.locale === 'zh-CN' ? 'en-US' : 'zh-CN')
    },
  },
})
